import { NextRequest } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { query, withTransaction } from "@/lib/db";
import { fail, getSearchParams, ok, paginate } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { page, limit, offset, search, status } = getSearchParams(request);
    const where: string[] = ["1=1"];
    const params: unknown[] = [];
    if (search) {
      where.push("(so.invoice_number LIKE ? OR c.customer_name LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("so.status = ?");
      params.push(status);
    }
    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM sales_orders so
       INNER JOIN customers c ON c.id = so.customer_id WHERE ${whereSql}`,
      params,
    );
    const rows = await query<RowDataPacket[]>(
      `SELECT so.*, c.customer_code, c.customer_name, w.warehouse_name
       FROM sales_orders so
       INNER JOIN customers c ON c.id = so.customer_id
       INNER JOIN warehouses w ON w.id = so.warehouse_id
       WHERE ${whereSql}
       ORDER BY so.id DESC
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );
    return ok({
      items: rows,
      pagination: paginate(Number(countRows[0]?.total || 0), page, limit),
    });
  } catch (error) {
    console.error(error);
    return fail("Unable to load sales", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const body = await request.json();
    const customer_id = Number(body.customer_id);
    const warehouse_id = Number(body.warehouse_id || 2);
    const invoice_date = body.invoice_date || new Date().toISOString().slice(0, 10);
    const items = Array.isArray(body.items) ? body.items : [];

    if (!customer_id || !items.length) {
      return fail("customer_id and items are required", 400);
    }

    const result = await withTransaction(async (conn) => {
      let total_amount = 0;
      const datePart = String(invoice_date).replace(/-/g, "");
      const [cnt] = await conn.execute<RowDataPacket[]>(
        `SELECT COUNT(*) AS c FROM sales_orders WHERE invoice_number LIKE ?`,
        [`INV-${datePart}-%`],
      );
      const invoice_number = `INV-${datePart}-${String(Number(cnt[0].c) + 1).padStart(3, "0")}`;

      const [soResult] = await conn.execute<ResultSetHeader>(
        `INSERT INTO sales_orders
         (invoice_number, customer_id, invoice_date, warehouse_id, total_amount, status, created_by)
         VALUES (?, ?, ?, ?, 0, 'CONFIRMED', ?)`,
        [invoice_number, customer_id, invoice_date, warehouse_id, session?.id || null],
      );
      const soId = soResult.insertId;

      for (const item of items) {
        const quantity = Number(item.quantity);
        const unit_price = Number(item.unit_price || 0);
        const batch_id = Number(item.batch_id);
        const product_id = Number(item.product_id);
        if (!quantity || !batch_id || !product_id) {
          throw new Error("Each item needs product_id, batch_id and quantity");
        }

        const [batchRows] = await conn.execute<RowDataPacket[]>(
          `SELECT * FROM batches WHERE id = ? FOR UPDATE`,
          [batch_id],
        );
        if (!batchRows.length) throw new Error("Batch not found");
        const batch = batchRows[0];
        if (batch.status !== "RELEASED") {
          throw new Error(`Batch ${batch.batch_number} is not RELEASED and cannot be sold`);
        }
        if (new Date(batch.expiry_date) < new Date(new Date().toDateString())) {
          throw new Error(`Batch ${batch.batch_number} is expired and cannot be sold`);
        }

        const [invRows] = await conn.execute<RowDataPacket[]>(
          `SELECT * FROM inventory WHERE batch_id = ? AND warehouse_id = ? FOR UPDATE`,
          [batch_id, warehouse_id],
        );
        if (!invRows.length || Number(invRows[0].quantity) < quantity) {
          throw new Error(`Insufficient stock for batch ${batch.batch_number}`);
        }

        const newQty = Number(invRows[0].quantity) - quantity;
        await conn.execute(`UPDATE inventory SET quantity = ? WHERE id = ?`, [
          newQty,
          invRows[0].id,
        ]);

        if (newQty === 0) {
          await conn.execute(`UPDATE batches SET status = 'SOLD_OUT' WHERE id = ?`, [batch_id]);
        }

        const lineTotal = quantity * unit_price;
        total_amount += lineTotal;

        await conn.execute(
          `INSERT INTO sales_order_items
           (sales_order_id, product_id, batch_id, quantity, unit_price, total_price)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [soId, product_id, batch_id, quantity, unit_price, lineTotal],
        );

        await conn.execute(
          `INSERT INTO inventory_transactions
           (transaction_type, reference_type, reference_id, warehouse_id, product_id, batch_id,
            quantity, transaction_date, created_by, remarks)
           VALUES ('SALES_ISSUE', 'SALES_ORDER', ?, ?, ?, ?, ?, NOW(), ?, ?)`,
          [
            soId,
            warehouse_id,
            product_id,
            batch_id,
            -quantity,
            session?.id || null,
            `Sale ${invoice_number}`,
          ],
        );
      }

      await conn.execute(`UPDATE sales_orders SET total_amount = ? WHERE id = ?`, [
        total_amount,
        soId,
      ]);

      return { id: soId, invoice_number, total_amount };
    });

    await writeAudit({
      user: session,
      action: "CREATE",
      entity_type: "sales_order",
      entity_id: result.id,
      entity_code: result.invoice_number,
      summary: `Sales invoice ${result.invoice_number} created`,
      after: { total_amount: result.total_amount, customer_id, warehouse_id },
      request,
    });

    return ok(result, "Sales order created successfully", 201);
  } catch (error) {
    console.error(error);
    return fail(error instanceof Error ? error.message : "Unable to create sales order", 500);
  }
}

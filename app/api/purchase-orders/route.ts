import { NextRequest } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { query, withTransaction } from "@/lib/db";
import { fail, getSearchParams, ok, paginate } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { ensurePurchaseTxnSchema } from "@/lib/ensure-phase18";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { page, limit, offset, search, status } = getSearchParams(request);
    const where: string[] = ["1=1"];
    const params: unknown[] = [];
    if (search) {
      where.push("(po.po_number LIKE ? OR s.supplier_name LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("po.status = ?");
      params.push(status);
    }
    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM purchase_orders po
       INNER JOIN suppliers s ON s.id = po.supplier_id WHERE ${whereSql}`,
      params,
    );
    const rows = await query<RowDataPacket[]>(
      `SELECT po.*, s.supplier_code, s.supplier_name, w.warehouse_name
       FROM purchase_orders po
       INNER JOIN suppliers s ON s.id = po.supplier_id
       LEFT JOIN warehouses w ON w.id = po.warehouse_id
       WHERE ${whereSql}
       ORDER BY po.id DESC
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );
    return ok({
      items: rows,
      pagination: paginate(Number(countRows[0]?.total || 0), page, limit),
    });
  } catch (error) {
    console.error(error);
    return fail("Unable to load purchase orders", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensurePurchaseTxnSchema();
    const session = await getSession();
    const body = await request.json();
    const supplier_id = Number(body.supplier_id);
    const warehouse_id = Number(body.warehouse_id || 1);
    const order_date = body.order_date || new Date().toISOString().slice(0, 10);
    const items = Array.isArray(body.items) ? body.items : [];
    if (!supplier_id || !items.length) {
      return fail("supplier_id and items are required", 400);
    }

    const data = await withTransaction(async (conn) => {
      const datePart = String(order_date).replace(/-/g, "");
      const [cnt] = await conn.execute<RowDataPacket[]>(
        `SELECT COUNT(*) AS c FROM purchase_orders WHERE po_number LIKE ?`,
        [`PO-${datePart}-%`],
      );
      const po_number = `PO-${datePart}-${String(Number(cnt[0].c) + 1).padStart(3, "0")}`;
      let total_amount = 0;

      const [poResult] = await conn.execute<ResultSetHeader>(
        `INSERT INTO purchase_orders
         (po_number, supplier_id, order_date, expected_date, warehouse_id, status, total_amount, created_by)
         VALUES (?, ?, ?, ?, ?, 'PENDING', 0, ?)`,
        [
          po_number,
          supplier_id,
          order_date,
          body.expected_date || null,
          warehouse_id,
          session?.id || null,
        ],
      );
      const poId = poResult.insertId;

      for (const item of items) {
        const qty = Number(item.ordered_quantity);
        const price = Number(item.unit_price || 0);
        const total = qty * price;
        total_amount += total;
        await conn.execute(
          `INSERT INTO purchase_order_items
           (purchase_order_id, raw_material_id, ordered_quantity, unit, unit_price, total_price, expected_date, remarks)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            poId,
            item.raw_material_id,
            qty,
            item.unit || "kg",
            price,
            total,
            item.expected_date || body.expected_date || null,
            item.remarks || null,
          ],
        );
      }

      await conn.execute(`UPDATE purchase_orders SET total_amount = ? WHERE id = ?`, [
        total_amount,
        poId,
      ]);

      return { id: poId, po_number, total_amount };
    });

    await writeAudit({
      user: session,
      action: "CREATE",
      entity_type: "purchase_order",
      entity_id: data.id,
      entity_code: data.po_number,
      summary: `Purchase order ${data.po_number} created`,
      after: { total_amount: data.total_amount, supplier_id, warehouse_id },
      request,
    });

    return ok(data, "Purchase order created successfully", 201);
  } catch (error) {
    console.error(error);
    return fail(error instanceof Error ? error.message : "Unable to create purchase order", 500);
  }
}

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
      where.push("(mo.mo_number LIKE ? OR p.product_name LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("mo.status = ?");
      params.push(status);
    }
    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM manufacturing_orders mo
       INNER JOIN products p ON p.id = mo.product_id WHERE ${whereSql}`,
      params,
    );
    const rows = await query<RowDataPacket[]>(
      `SELECT mo.*, p.product_code, p.product_name, f.formula_code, f.version AS formula_version
       FROM manufacturing_orders mo
       INNER JOIN products p ON p.id = mo.product_id
       INNER JOIN formulas f ON f.id = mo.formula_id
       WHERE ${whereSql}
       ORDER BY mo.id DESC
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );
    return ok({
      items: rows,
      pagination: paginate(Number(countRows[0]?.total || 0), page, limit),
    });
  } catch (error) {
    console.error(error);
    return fail("Unable to load manufacturing orders", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const body = await request.json();
    const product_id = Number(body.product_id);
    const planned_quantity = Number(body.planned_quantity);
    const warehouse_id = Number(body.warehouse_id || 2);

    if (!product_id || !planned_quantity) {
      return fail("product_id and planned_quantity are required", 400);
    }

    const formulas = await query<RowDataPacket[]>(
      `SELECT * FROM formulas WHERE product_id = ? AND status = 'ACTIVE' LIMIT 1`,
      [product_id],
    );
    if (!formulas.length) return fail("No active formula found for product", 400);

    const formula = formulas[0];
    const items = await query<RowDataPacket[]>(
      `SELECT * FROM formula_items WHERE formula_id = ? ORDER BY sequence_no`,
      [formula.id],
    );
    if (!items.length) return fail("Formula has no items", 400);

    const scale = planned_quantity / Number(formula.batch_size);
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM manufacturing_orders WHERE mo_number LIKE ?`,
      [`MO-${today}-%`],
    );
    const mo_number = `MO-${today}-${String(Number(countRows[0].c) + 1).padStart(3, "0")}`;

    const data = await withTransaction(async (conn) => {
      const [moResult] = await conn.execute<ResultSetHeader>(
        `INSERT INTO manufacturing_orders
         (mo_number, product_id, formula_id, planned_quantity, planned_start_date, warehouse_id, status, created_by)
         VALUES (?, ?, ?, ?, CURDATE(), ?, 'PLANNED', ?)`,
        [mo_number, product_id, formula.id, planned_quantity, warehouse_id, session?.id || null],
      );
      const moId = moResult.insertId;

      for (const item of items) {
        const planned = Number(item.quantity) * scale;
        await conn.execute(
          `INSERT INTO manufacturing_order_items
           (manufacturing_order_id, raw_material_id, planned_quantity, reserved_quantity, unit)
           VALUES (?, ?, ?, 0, ?)`,
          [moId, item.raw_material_id, planned, item.unit],
        );
      }

      return { id: moId, mo_number };
    });

    await writeAudit({
      user: session,
      action: "CREATE",
      entity_type: "manufacturing_order",
      entity_id: data.id,
      entity_code: data.mo_number,
      summary: `Manufacturing order ${data.mo_number} created`,
      after: { product_id, planned_quantity, warehouse_id, formula_id: formula.id },
      request,
    });

    return ok(data, "Manufacturing order created successfully", 201);
  } catch (error) {
    console.error(error);
    return fail(error instanceof Error ? error.message : "Unable to create manufacturing order", 500);
  }
}

import { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, ok } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const rows = await query<RowDataPacket[]>(
      `SELECT mo.*, p.product_code, p.product_name, f.formula_code, f.version AS formula_version, f.batch_size
       FROM manufacturing_orders mo
       INNER JOIN products p ON p.id = mo.product_id
       INNER JOIN formulas f ON f.id = mo.formula_id
       WHERE mo.id = ? LIMIT 1`,
      [id],
    );
    if (!rows.length) return fail("Manufacturing order not found", 404);

    const items = await query<RowDataPacket[]>(
      `SELECT moi.*, rm.material_code, rm.material_name,
        COALESCE((
          SELECT SUM(available_quantity) FROM raw_material_batches rmb
          WHERE rmb.raw_material_id = moi.raw_material_id
            AND rmb.status = 'AVAILABLE' AND rmb.expiry_date >= CURDATE()
        ),0) AS available_stock
       FROM manufacturing_order_items moi
       INNER JOIN raw_materials rm ON rm.id = moi.raw_material_id
       WHERE moi.manufacturing_order_id = ?
       ORDER BY moi.id`,
      [id],
    );

    return ok({ ...rows[0], items });
  } catch (error) {
    console.error(error);
    return fail("Unable to load manufacturing order", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    if (!body.status) return fail("status is required", 400);
    const result = await execute(`UPDATE manufacturing_orders SET status = ? WHERE id = ?`, [
      body.status,
      id,
    ]);
    if (result.affectedRows === 0) return fail("Manufacturing order not found", 404);
    return ok(null, "Manufacturing order updated");
  } catch (error) {
    console.error(error);
    return fail("Unable to update manufacturing order", 500);
  }
}

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
      `SELECT f.*, p.product_code, p.product_name
       FROM formulas f INNER JOIN products p ON p.id = f.product_id
       WHERE f.id = ? LIMIT 1`,
      [id],
    );
    if (!rows.length) return fail("Formula not found", 404);
    const items = await query<RowDataPacket[]>(
      `SELECT fi.*, rm.material_code, rm.material_name
       FROM formula_items fi
       INNER JOIN raw_materials rm ON rm.id = fi.raw_material_id
       WHERE fi.formula_id = ?
       ORDER BY fi.sequence_no`,
      [id],
    );
    return ok({ ...rows[0], items });
  } catch (error) {
    console.error(error);
    return fail("Unable to load formula", 500);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    if (body.status === "ACTIVE" && body.product_id) {
      await execute(
        `UPDATE formulas SET status = 'INACTIVE' WHERE product_id = ? AND status = 'ACTIVE' AND id <> ?`,
        [body.product_id, id],
      );
    }
    const result = await execute(
      `UPDATE formulas SET formula_code = ?, version = ?, batch_size = ?, unit = ?, status = ? WHERE id = ?`,
      [
        body.formula_code,
        body.version || "1.0",
        body.batch_size,
        body.unit || "units",
        body.status || "DRAFT",
        id,
      ],
    );
    if (result.affectedRows === 0) return fail("Formula not found", 404);
    return ok(null, "Formula updated successfully");
  } catch (error) {
    console.error(error);
    return fail("Unable to update formula", 500);
  }
}

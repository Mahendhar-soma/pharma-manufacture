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
      `SELECT rm.*,
        COALESCE((
          SELECT SUM(available_quantity) FROM raw_material_batches rmb
          WHERE rmb.raw_material_id = rm.id AND rmb.status = 'AVAILABLE' AND rmb.expiry_date >= CURDATE()
        ), 0) AS current_stock
       FROM raw_materials rm WHERE rm.id = ? LIMIT 1`,
      [id],
    );
    if (!rows.length) return fail("Raw material not found", 404);
    return ok(rows[0]);
  } catch (error) {
    console.error(error);
    return fail("Unable to load raw material", 500);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const result = await execute(
      `UPDATE raw_materials SET
        material_code = ?, material_name = ?, material_type = ?, unit = ?,
        reorder_level = ?, description = ?, status = ?
       WHERE id = ?`,
      [
        body.material_code,
        body.material_name,
        body.material_type || "OTHER",
        body.unit || "kg",
        Number(body.reorder_level || 0),
        body.description || null,
        body.status || "ACTIVE",
        id,
      ],
    );
    if (result.affectedRows === 0) return fail("Raw material not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM raw_materials WHERE id = ?", [id]);
    return ok(rows[0], "Raw material updated successfully");
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === "ER_DUP_ENTRY") return fail("Material code already exists", 409);
    console.error(error);
    return fail("Unable to update raw material", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const result = await execute(`UPDATE raw_materials SET status = 'INACTIVE' WHERE id = ?`, [id]);
    if (result.affectedRows === 0) return fail("Raw material not found", 404);
    return ok(null, "Raw material deactivated successfully");
  } catch (error) {
    console.error(error);
    return fail("Unable to deactivate raw material", 500);
  }
}

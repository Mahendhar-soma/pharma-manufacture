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
    const rows = await query<RowDataPacket[]>("SELECT * FROM warehouses WHERE id = ? LIMIT 1", [id]);
    if (!rows.length) return fail("Warehouse not found", 404);
    return ok(rows[0]);
  } catch (error) {
    console.error(error);
    return fail("Unable to load warehouse", 500);
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
      `UPDATE warehouses SET warehouse_code = ?, warehouse_name = ?, location = ?, warehouse_type = ?, status = ?
       WHERE id = ?`,
      [
        body.warehouse_code,
        body.warehouse_name,
        body.location || null,
        body.warehouse_type,
        body.status || "ACTIVE",
        id,
      ],
    );
    if (result.affectedRows === 0) return fail("Warehouse not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM warehouses WHERE id = ?", [id]);
    return ok(rows[0], "Warehouse updated successfully");
  } catch (error) {
    console.error(error);
    return fail("Unable to update warehouse", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const result = await execute(`UPDATE warehouses SET status = 'INACTIVE' WHERE id = ?`, [id]);
    if (result.affectedRows === 0) return fail("Warehouse not found", 404);
    return ok(null, "Warehouse deactivated successfully");
  } catch (error) {
    console.error(error);
    return fail("Unable to deactivate warehouse", 500);
  }
}

import { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";
import { fail, ok } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const rows = await query<RowDataPacket[]>(
      `SELECT i.*, w.warehouse_name, w.warehouse_code, w.warehouse_type,
        rm.material_code, rm.material_name,
        p.product_code, p.product_name,
        rmb.batch_number AS rm_batch_number, rmb.expiry_date AS rm_expiry_date, rmb.status AS rm_batch_status,
        b.batch_number AS fg_batch_number, b.expiry_date AS fg_expiry_date, b.status AS fg_batch_status
       FROM inventory i
       INNER JOIN warehouses w ON w.id = i.warehouse_id
       LEFT JOIN raw_materials rm ON rm.id = i.raw_material_id
       LEFT JOIN products p ON p.id = i.product_id
       LEFT JOIN raw_material_batches rmb ON rmb.id = i.raw_material_batch_id
       LEFT JOIN batches b ON b.id = i.batch_id
       WHERE i.id = ?
       LIMIT 1`,
      [id],
    );
    if (!rows.length) return fail("Inventory line not found", 404);
    return ok(rows[0]);
  } catch (error) {
    console.error(error);
    return fail("Unable to load inventory line", 500);
  }
}

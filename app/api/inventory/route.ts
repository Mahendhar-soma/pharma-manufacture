import { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";
import { fail, getSearchParams, ok, paginate } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { page, limit, offset, search } = getSearchParams(request);
    const warehouseId = new URL(request.url).searchParams.get("warehouse_id") || "";
    const where: string[] = ["i.quantity > 0"];
    const params: unknown[] = [];

    if (search) {
      where.push(
        "(rm.material_name LIKE ? OR p.product_name LIKE ? OR rmb.batch_number LIKE ? OR b.batch_number LIKE ?)",
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (warehouseId) {
      where.push("i.warehouse_id = ?");
      params.push(warehouseId);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM inventory i
       LEFT JOIN raw_materials rm ON rm.id = i.raw_material_id
       LEFT JOIN products p ON p.id = i.product_id
       LEFT JOIN raw_material_batches rmb ON rmb.id = i.raw_material_batch_id
       LEFT JOIN batches b ON b.id = i.batch_id
       WHERE ${whereSql}`,
      params,
    );

    const rows = await query<RowDataPacket[]>(
      `SELECT i.*, w.warehouse_name, w.warehouse_code,
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
       WHERE ${whereSql}
       ORDER BY i.id DESC
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({
      items: rows,
      pagination: paginate(Number(countRows[0]?.total || 0), page, limit),
    });
  } catch (error) {
    console.error(error);
    return fail("Unable to load inventory", 500);
  }
}

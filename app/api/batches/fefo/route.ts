import { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";
import { fail, ok } from "@/lib/api";

export const runtime = "nodejs";

/** FEFO recommendation for finished goods or raw materials */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("product_id");
    const rawMaterialId = searchParams.get("raw_material_id");
    const quantity = Number(searchParams.get("quantity") || 0);

    if (productId) {
      const rows = await query<RowDataPacket[]>(
        `SELECT b.*, p.product_code, p.product_name,
          COALESCE((SELECT quantity FROM inventory i WHERE i.batch_id = b.id LIMIT 1), 0) AS available_qty
         FROM batches b
         INNER JOIN products p ON p.id = b.product_id
         WHERE b.product_id = ?
           AND b.status = 'RELEASED'
           AND b.expiry_date >= CURDATE()
         ORDER BY b.expiry_date ASC, b.id ASC`,
        [productId],
      );
      const recommended = rows.filter((r) => Number(r.available_qty) > 0);
      const items = recommended.map((r) => ({
        ...r,
        available_quantity: Number(r.available_qty),
      }));
      return ok({
        mode: "FINISHED_GOODS",
        // only RELEASED non-expired batches with stock (sales QC gate)
        recommended: items[0] || null,
        recommendation: items[0] || null,
        candidates: items,
        items,
        required_quantity: quantity || null,
        note: "Only RELEASED batches are eligible for sale (QC gate)",
      });
    }

    if (rawMaterialId) {
      const rows = await query<RowDataPacket[]>(
        `SELECT rmb.*, rm.material_code, rm.material_name, s.supplier_name
         FROM raw_material_batches rmb
         INNER JOIN raw_materials rm ON rm.id = rmb.raw_material_id
         LEFT JOIN suppliers s ON s.id = rmb.supplier_id
         WHERE rmb.raw_material_id = ?
           AND rmb.status = 'AVAILABLE'
           AND rmb.expiry_date >= CURDATE()
           AND rmb.available_quantity > 0
         ORDER BY rmb.expiry_date ASC, rmb.id ASC`,
        [rawMaterialId],
      );
      return ok({
        mode: "RAW_MATERIAL",
        recommended: rows[0] || null,
        candidates: rows,
        required_quantity: quantity || null,
      });
    }

    return fail("product_id or raw_material_id is required", 400);
  } catch (error) {
    console.error(error);
    return fail("Unable to load FEFO recommendations", 500);
  }
}

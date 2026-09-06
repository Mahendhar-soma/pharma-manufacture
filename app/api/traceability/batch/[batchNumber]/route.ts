import { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";
import { fail, ok } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ batchNumber: string }> },
) {
  try {
    const { batchNumber } = await context.params;
    const batches = await query<RowDataPacket[]>(
      `SELECT b.*, p.product_code, p.product_name, w.warehouse_name, mo.mo_number, mo.formula_id,
        f.formula_code, f.version AS formula_version
       FROM batches b
       INNER JOIN products p ON p.id = b.product_id
       INNER JOIN warehouses w ON w.id = b.warehouse_id
       LEFT JOIN manufacturing_orders mo ON mo.id = b.manufacturing_order_id
       LEFT JOIN formulas f ON f.id = mo.formula_id
       WHERE b.batch_number = ?
       LIMIT 1`,
      [batchNumber],
    );
    if (!batches.length) return fail("Finished batch not found", 404);
    const batch = batches[0];

    const materials = await query<RowDataPacket[]>(
      `SELECT bmc.*, rm.material_code, rm.material_name, rmb.batch_number AS rm_batch_number,
        rmb.manufacturing_date AS rm_mfg_date, rmb.expiry_date AS rm_expiry_date,
        s.supplier_code, s.supplier_name, rmb.goods_receipt_id,
        gr.grn_number, po.po_number, po.id AS purchase_order_id
       FROM batch_material_consumption bmc
       INNER JOIN raw_materials rm ON rm.id = bmc.raw_material_id
       INNER JOIN raw_material_batches rmb ON rmb.id = bmc.raw_material_batch_id
       LEFT JOIN suppliers s ON s.id = rmb.supplier_id
       LEFT JOIN goods_receipts gr ON gr.id = rmb.goods_receipt_id
       LEFT JOIN purchase_orders po ON po.id = gr.purchase_order_id
       WHERE bmc.batch_id = ?`,
      [batch.id],
    );

    const sales = await query<RowDataPacket[]>(
      `SELECT so.invoice_number, so.invoice_date, so.status, c.customer_code, c.customer_name,
        soi.quantity, soi.unit_price, soi.total_price
       FROM sales_order_items soi
       INNER JOIN sales_orders so ON so.id = soi.sales_order_id
       INNER JOIN customers c ON c.id = so.customer_id
       WHERE soi.batch_id = ?`,
      [batch.id],
    );

    return ok({
      product: {
        id: batch.product_id,
        product_code: batch.product_code,
        product_name: batch.product_name,
      },
      finished_batch: batch,
      manufacturing_order: batch.mo_number
        ? { mo_number: batch.mo_number, formula_id: batch.formula_id }
        : null,
      formula: batch.formula_code
        ? { formula_code: batch.formula_code, version: batch.formula_version }
        : null,
      raw_materials: materials,
      sales,
    });
  } catch (error) {
    console.error(error);
    return fail("Unable to load traceability", 500);
  }
}

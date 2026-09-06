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
    const rmBatches = await query<RowDataPacket[]>(
      `SELECT rmb.*, rm.material_code, rm.material_name, s.supplier_code, s.supplier_name,
        w.warehouse_name, gr.grn_number, po.po_number, po.id AS purchase_order_id
       FROM raw_material_batches rmb
       INNER JOIN raw_materials rm ON rm.id = rmb.raw_material_id
       LEFT JOIN suppliers s ON s.id = rmb.supplier_id
       INNER JOIN warehouses w ON w.id = rmb.warehouse_id
       LEFT JOIN goods_receipts gr ON gr.id = rmb.goods_receipt_id
       LEFT JOIN purchase_orders po ON po.id = gr.purchase_order_id
       WHERE rmb.batch_number = ?
       LIMIT 1`,
      [batchNumber],
    );
    if (!rmBatches.length) return fail("Raw material batch not found", 404);
    const rmBatch = rmBatches[0];

    const finishedBatches = await query<RowDataPacket[]>(
      `SELECT DISTINCT b.id, b.batch_number, b.manufacturing_date, b.expiry_date, b.status,
        p.product_code, p.product_name, mo.mo_number, bmc.actual_quantity
       FROM batch_material_consumption bmc
       INNER JOIN batches b ON b.id = bmc.batch_id
       INNER JOIN products p ON p.id = b.product_id
       LEFT JOIN manufacturing_orders mo ON mo.id = b.manufacturing_order_id
       WHERE bmc.raw_material_batch_id = ?`,
      [rmBatch.id],
    );

    const sales = finishedBatches.length
      ? await query<RowDataPacket[]>(
          `SELECT so.invoice_number, so.invoice_date, c.customer_code, c.customer_name,
            soi.quantity, b.batch_number, p.product_name
           FROM sales_order_items soi
           INNER JOIN sales_orders so ON so.id = soi.sales_order_id
           INNER JOIN customers c ON c.id = so.customer_id
           INNER JOIN batches b ON b.id = soi.batch_id
           INNER JOIN products p ON p.id = soi.product_id
           WHERE soi.batch_id IN (${finishedBatches.map(() => "?").join(",")})`,
          finishedBatches.map((b) => b.id),
        )
      : [];

    return ok({
      supplier: {
        supplier_code: rmBatch.supplier_code,
        supplier_name: rmBatch.supplier_name,
      },
      purchase_order: rmBatch.po_number
        ? { po_number: rmBatch.po_number, id: rmBatch.purchase_order_id }
        : null,
      goods_receipt: rmBatch.grn_number ? { grn_number: rmBatch.grn_number } : null,
      raw_material_batch: rmBatch,
      manufacturing_batches: finishedBatches,
      customers_sales: sales,
    });
  } catch (error) {
    console.error(error);
    return fail("Unable to load reverse traceability", 500);
  }
}

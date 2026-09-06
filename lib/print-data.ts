import "server-only";
import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";

/** Loose print document row (MySQL columns + nested collections). */
export type PrintDoc = Record<string, unknown> & {
  items?: RowDataPacket[];
  consumption?: RowDataPacket[];
  formula_items?: RowDataPacket[];
};

function asDoc(row: RowDataPacket, extra: Record<string, unknown> = {}): PrintDoc {
  return { ...(row as Record<string, unknown>), ...extra };
}

export async function getPurchaseOrderPrint(id: number): Promise<PrintDoc | null> {
  const rows = await query<RowDataPacket[]>(
    `SELECT po.*, s.supplier_code, s.supplier_name, s.address AS supplier_address,
      s.phone AS supplier_phone, s.email AS supplier_email, s.gst_number AS supplier_gst,
      w.warehouse_code, w.warehouse_name, u.name AS created_by_name
     FROM purchase_orders po
     INNER JOIN suppliers s ON s.id = po.supplier_id
     LEFT JOIN warehouses w ON w.id = po.warehouse_id
     LEFT JOIN users u ON u.id = po.created_by
     WHERE po.id = ? LIMIT 1`,
    [id],
  );
  if (!rows.length) return null;
  const items = await query<RowDataPacket[]>(
    `SELECT poi.*, rm.material_code, rm.material_name
     FROM purchase_order_items poi
     INNER JOIN raw_materials rm ON rm.id = poi.raw_material_id
     WHERE poi.purchase_order_id = ?
     ORDER BY poi.id`,
    [id],
  );
  return asDoc(rows[0], { items });
}

export async function getGoodsReceiptPrint(id: number): Promise<PrintDoc | null> {
  const rows = await query<RowDataPacket[]>(
    `SELECT gr.*, po.po_number, s.supplier_code, s.supplier_name,
      w.warehouse_code, w.warehouse_name, u.name AS created_by_name
     FROM goods_receipts gr
     INNER JOIN purchase_orders po ON po.id = gr.purchase_order_id
     INNER JOIN suppliers s ON s.id = po.supplier_id
     INNER JOIN warehouses w ON w.id = gr.warehouse_id
     LEFT JOIN users u ON u.id = gr.created_by
     WHERE gr.id = ? LIMIT 1`,
    [id],
  );
  if (!rows.length) return null;
  const items = await query<RowDataPacket[]>(
    `SELECT gri.*, rm.material_code, rm.material_name
     FROM goods_receipt_items gri
     INNER JOIN raw_materials rm ON rm.id = gri.raw_material_id
     WHERE gri.goods_receipt_id = ?
     ORDER BY gri.id`,
    [id],
  );
  return asDoc(rows[0], { items });
}

export async function getBatchRecordPrint(id: number): Promise<PrintDoc | null> {
  const rows = await query<RowDataPacket[]>(
    `SELECT b.*, p.product_code, p.product_name, p.generic_name, p.dosage_form, p.strength,
      p.shelf_life_months, w.warehouse_code, w.warehouse_name,
      mo.mo_number, mo.planned_quantity AS mo_planned_quantity, mo.formula_id,
      f.formula_code, f.version AS formula_version, f.batch_size
     FROM batches b
     INNER JOIN products p ON p.id = b.product_id
     INNER JOIN warehouses w ON w.id = b.warehouse_id
     LEFT JOIN manufacturing_orders mo ON mo.id = b.manufacturing_order_id
     LEFT JOIN formulas f ON f.id = mo.formula_id
     WHERE b.id = ? LIMIT 1`,
    [id],
  );
  if (!rows.length) return null;

  const consumption = await query<RowDataPacket[]>(
    `SELECT bmc.*, rm.material_code, rm.material_name, rmb.batch_number AS rm_batch_number,
      rmb.expiry_date AS rm_expiry_date, s.supplier_name
     FROM batch_material_consumption bmc
     INNER JOIN raw_materials rm ON rm.id = bmc.raw_material_id
     INNER JOIN raw_material_batches rmb ON rmb.id = bmc.raw_material_batch_id
     LEFT JOIN suppliers s ON s.id = rmb.supplier_id
     WHERE bmc.batch_id = ?
     ORDER BY bmc.id`,
    [id],
  );

  const formulaItems = rows[0].formula_id
    ? await query<RowDataPacket[]>(
        `SELECT fi.*, rm.material_code, rm.material_name
         FROM formula_items fi
         INNER JOIN raw_materials rm ON rm.id = fi.raw_material_id
         WHERE fi.formula_id = ?
         ORDER BY fi.sequence_no, fi.id`,
        [rows[0].formula_id],
      )
    : [];

  return asDoc(rows[0], { consumption, formula_items: formulaItems });
}

export async function getCoaPrint(batchId: number) {
  const batch = await getBatchRecordPrint(batchId);
  if (!batch) return null;

  const samples = await query<RowDataPacket[]>(
    `SELECT s.* FROM samples s WHERE s.batch_id = ? ORDER BY s.id`,
    [batchId],
  );

  const tests = samples.length
    ? await query<RowDataPacket[]>(
        `SELECT st.*, s.sample_code
         FROM sample_tests st
         INNER JOIN samples s ON s.id = st.sample_id
         WHERE s.batch_id = ?
         ORDER BY st.id`,
        [batchId],
      )
    : [];

  const results = tests.length
    ? await query<RowDataPacket[]>(
        `SELECT tr.*, st.test_name, s.sample_code
         FROM test_results tr
         INNER JOIN sample_tests st ON st.id = tr.sample_test_id
         INNER JOIN samples s ON s.id = st.sample_id
         WHERE s.batch_id = ?
         ORDER BY tr.id`,
        [batchId],
      )
    : [];

  const status = String(batch.status || "");
  const hasFail = results.some((r) => r.pass_fail === "FAIL");
  const hasPass = results.some((r) => r.pass_fail === "PASS");
  const disposition =
    status === "RELEASED"
      ? "APPROVED / RELEASED"
      : status === "REJECTED" || hasFail
        ? "REJECTED"
        : hasPass
          ? "UNDER REVIEW"
          : "PENDING TESTING";

  return {
    batch,
    samples,
    tests,
    results,
    disposition,
  };
}

export async function getSalesInvoicePrint(id: number): Promise<PrintDoc | null> {
  const rows = await query<RowDataPacket[]>(
    `SELECT so.*, c.customer_code, c.customer_name, c.address AS customer_address,
      c.phone AS customer_phone, c.email AS customer_email, c.gst_number AS customer_gst,
      w.warehouse_code, w.warehouse_name, u.name AS created_by_name
     FROM sales_orders so
     INNER JOIN customers c ON c.id = so.customer_id
     INNER JOIN warehouses w ON w.id = so.warehouse_id
     LEFT JOIN users u ON u.id = so.created_by
     WHERE so.id = ? LIMIT 1`,
    [id],
  );
  if (!rows.length) return null;

  const items = await query<RowDataPacket[]>(
    `SELECT soi.*, p.product_code, p.product_name, p.unit, b.batch_number, b.expiry_date
     FROM sales_order_items soi
     INNER JOIN products p ON p.id = soi.product_id
     INNER JOIN batches b ON b.id = soi.batch_id
     WHERE soi.sales_order_id = ?
     ORDER BY soi.id`,
    [id],
  );

  return asDoc(rows[0], { items });
}

import "server-only";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { query } from "@/lib/db";
import { ensurePurchaseTxnSchema } from "@/lib/ensure-phase18";

export type PoReceiveLine = {
  purchase_order_item_id: number;
  raw_material_id: number;
  material_code: string;
  material_name: string;
  ordered_quantity: number;
  received_quantity: number;
  remaining_quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  expected_date: string | null;
  remarks: string | null;
};

/** Ordered vs already-received balances — item-wise (by PO line). */
export async function getPoReceiveBalances(
  purchaseOrderId: number,
  conn?: PoolConnection,
): Promise<PoReceiveLine[]> {
  await ensurePurchaseTxnSchema();
  const linesSql = `
    SELECT
      poi.id AS purchase_order_item_id,
      poi.raw_material_id,
      rm.material_code,
      rm.material_name,
      poi.ordered_quantity,
      poi.unit,
      poi.unit_price,
      poi.total_price,
      poi.expected_date,
      poi.remarks
    FROM purchase_order_items poi
    INNER JOIN raw_materials rm ON rm.id = poi.raw_material_id
    WHERE poi.purchase_order_id = ?
    ORDER BY poi.id
  `;

  const detailSql = `
    SELECT
      gri.purchase_order_item_id,
      gri.raw_material_id,
      SUM(gri.quantity) AS qty
    FROM goods_receipt_items gri
    INNER JOIN goods_receipts gr ON gr.id = gri.goods_receipt_id
    WHERE gr.purchase_order_id = ?
    GROUP BY gri.purchase_order_item_id, gri.raw_material_id
  `;

  const rows = conn
    ? (await conn.execute<RowDataPacket[]>(linesSql, [purchaseOrderId]))[0]
    : await query<RowDataPacket[]>(linesSql, [purchaseOrderId]);

  const detailRows = conn
    ? (await conn.execute<RowDataPacket[]>(detailSql, [purchaseOrderId]))[0]
    : await query<RowDataPacket[]>(detailSql, [purchaseOrderId]);

  const linked = new Map<number, number>();
  const unlinkedByMaterial = new Map<number, number>();
  for (const d of detailRows) {
    const qty = Number(d.qty || 0);
    if (d.purchase_order_item_id != null) {
      linked.set(Number(d.purchase_order_item_id), (linked.get(Number(d.purchase_order_item_id)) || 0) + qty);
    } else {
      const mid = Number(d.raw_material_id);
      unlinkedByMaterial.set(mid, (unlinkedByMaterial.get(mid) || 0) + qty);
    }
  }

  const usedUnlinked = new Map<number, number>();
  return rows.map((row) => {
    const itemId = Number(row.purchase_order_item_id);
    const mid = Number(row.raw_material_id);
    const ordered = Number(row.ordered_quantity || 0);
    let received = linked.get(itemId) || 0;
    const leftover = (unlinkedByMaterial.get(mid) || 0) - (usedUnlinked.get(mid) || 0);
    if (leftover > 0) {
      const take = Math.min(Math.max(0, ordered - received), leftover);
      received += take;
      usedUnlinked.set(mid, (usedUnlinked.get(mid) || 0) + take);
    }
    const remaining = Math.max(0, ordered - received);
    const unitPrice = Number(row.unit_price || 0);
    return {
      purchase_order_item_id: itemId,
      raw_material_id: mid,
      material_code: String(row.material_code),
      material_name: String(row.material_name),
      ordered_quantity: ordered,
      received_quantity: received,
      remaining_quantity: remaining,
      unit: String(row.unit || "kg"),
      unit_price: unitPrice,
      total_price: Number(row.total_price || ordered * unitPrice),
      expected_date: row.expected_date ? String(row.expected_date).slice(0, 10) : null,
      remarks: row.remarks != null ? String(row.remarks) : null,
    };
  });
}

export function remainingByPoItem(lines: PoReceiveLine[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const line of lines) {
    map.set(line.purchase_order_item_id, line.remaining_quantity);
  }
  return map;
}

export type PoStatusCode = "PENDING" | "PARTIALLY_RECEIVED" | "FULLY_RECEIVED";

export function computePoReceiveStatus(lines: PoReceiveLine[]): PoStatusCode {
  const totalOrdered = lines.reduce((s, l) => s + l.ordered_quantity, 0);
  const totalReceived = lines.reduce((s, l) => s + l.received_quantity, 0);
  if (totalReceived <= 0) return "PENDING";
  if (totalReceived + 1e-9 >= totalOrdered) return "FULLY_RECEIVED";
  return "PARTIALLY_RECEIVED";
}

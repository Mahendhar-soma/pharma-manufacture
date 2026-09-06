import "server-only";
import type { PoolConnection, ResultSetHeader } from "mysql2/promise";
import { execute } from "@/lib/db";

export {
  TXN_TYPES,
  TXN_TYPE_LABELS,
  txnTypeAliases,
  formatPoStatus,
} from "@/lib/txn-labels";

export type InsertTxnInput = {
  transaction_type: string;
  reference_type?: string | null;
  reference_id?: number | null;
  warehouse_id: number;
  raw_material_id?: number | null;
  raw_material_batch_id?: number | null;
  product_id?: number | null;
  batch_id?: number | null;
  quantity: number;
  unit_cost?: number | null;
  total_cost?: number | null;
  lot_number?: string | null;
  supplier_id?: number | null;
  purchase_order_id?: number | null;
  purchase_order_item_id?: number | null;
  created_by?: number | null;
  remarks?: string | null;
  transaction_date?: string | null;
};

export async function insertInventoryTxn(
  input: InsertTxnInput,
  conn?: PoolConnection,
): Promise<number> {
  const sql = `
    INSERT INTO inventory_transactions
      (transaction_type, reference_type, reference_id, warehouse_id,
       raw_material_id, raw_material_batch_id, product_id, batch_id,
       quantity, unit_cost, total_cost, lot_number, supplier_id,
       purchase_order_id, purchase_order_item_id,
       transaction_date, created_by, remarks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()), ?, ?)
  `;
  const params = [
    input.transaction_type,
    input.reference_type ?? null,
    input.reference_id ?? null,
    input.warehouse_id,
    input.raw_material_id ?? null,
    input.raw_material_batch_id ?? null,
    input.product_id ?? null,
    input.batch_id ?? null,
    input.quantity,
    input.unit_cost ?? null,
    input.total_cost ??
      (input.unit_cost != null ? Number(input.unit_cost) * Number(input.quantity) : null),
    input.lot_number ?? null,
    input.supplier_id ?? null,
    input.purchase_order_id ?? null,
    input.purchase_order_item_id ?? null,
    input.transaction_date ?? null,
    input.created_by ?? null,
    input.remarks ?? null,
  ];

  if (conn) {
    const [result] = await conn.execute<ResultSetHeader>(sql, params);
    return result.insertId;
  }
  const result = await execute(sql, params);
  return result.insertId;
}

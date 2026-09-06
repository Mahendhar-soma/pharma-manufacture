import "server-only";
import { execute } from "@/lib/db";

let ensured = false;

/** Best-effort schema upgrades for Phase 18 (safe to call repeatedly). */
export async function ensurePurchaseTxnSchema(): Promise<void> {
  if (ensured) return;
  const stmts = [
    `ALTER TABLE purchase_order_items ADD COLUMN expected_date DATE NULL`,
    `ALTER TABLE purchase_order_items ADD COLUMN remarks VARCHAR(500) NULL`,
    `ALTER TABLE goods_receipt_items ADD COLUMN purchase_order_item_id BIGINT UNSIGNED NULL`,
    `ALTER TABLE purchase_orders MODIFY COLUMN status ENUM('DRAFT','PENDING','ORDERED','PARTIALLY_RECEIVED','FULLY_RECEIVED','RECEIVED','CANCELLED') NOT NULL DEFAULT 'PENDING'`,
    `ALTER TABLE inventory_transactions MODIFY COLUMN transaction_type VARCHAR(50) NOT NULL`,
    `ALTER TABLE inventory_transactions ADD COLUMN unit_cost DECIMAL(14,4) NULL`,
    `ALTER TABLE inventory_transactions ADD COLUMN total_cost DECIMAL(14,2) NULL`,
    `ALTER TABLE inventory_transactions ADD COLUMN lot_number VARCHAR(100) NULL`,
    `ALTER TABLE inventory_transactions ADD COLUMN supplier_id BIGINT UNSIGNED NULL`,
    `ALTER TABLE inventory_transactions ADD COLUMN purchase_order_id BIGINT UNSIGNED NULL`,
    `ALTER TABLE inventory_transactions ADD COLUMN purchase_order_item_id BIGINT UNSIGNED NULL`,
  ];
  for (const sql of stmts) {
    try {
      await execute(sql);
    } catch {
      // ignore duplicate / unsupported
    }
  }
  ensured = true;
}

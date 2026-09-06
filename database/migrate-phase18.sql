-- Phase 18: item-wise PO receiving + enriched inventory transactions
-- Applied via migrate-phase18.js (statement-by-statement, ignores duplicate column errors)

ALTER TABLE purchase_order_items ADD COLUMN expected_date DATE NULL AFTER total_price;
ALTER TABLE purchase_order_items ADD COLUMN remarks VARCHAR(500) NULL AFTER expected_date;

ALTER TABLE goods_receipt_items ADD COLUMN purchase_order_item_id BIGINT UNSIGNED NULL AFTER goods_receipt_id;
ALTER TABLE goods_receipt_items ADD KEY idx_gri_poi (purchase_order_item_id);

ALTER TABLE purchase_orders
  MODIFY COLUMN status ENUM(
    'DRAFT',
    'PENDING',
    'ORDERED',
    'PARTIALLY_RECEIVED',
    'FULLY_RECEIVED',
    'RECEIVED',
    'CANCELLED'
  ) NOT NULL DEFAULT 'PENDING';

UPDATE purchase_orders SET status = 'PENDING' WHERE status IN ('DRAFT', 'ORDERED');
UPDATE purchase_orders SET status = 'FULLY_RECEIVED' WHERE status = 'RECEIVED';

ALTER TABLE inventory_transactions MODIFY COLUMN transaction_type VARCHAR(50) NOT NULL;

ALTER TABLE inventory_transactions ADD COLUMN unit_cost DECIMAL(14,4) NULL AFTER quantity;
ALTER TABLE inventory_transactions ADD COLUMN total_cost DECIMAL(14,2) NULL AFTER unit_cost;
ALTER TABLE inventory_transactions ADD COLUMN lot_number VARCHAR(100) NULL AFTER total_cost;
ALTER TABLE inventory_transactions ADD COLUMN supplier_id BIGINT UNSIGNED NULL AFTER lot_number;
ALTER TABLE inventory_transactions ADD COLUMN purchase_order_id BIGINT UNSIGNED NULL AFTER supplier_id;
ALTER TABLE inventory_transactions ADD COLUMN purchase_order_item_id BIGINT UNSIGNED NULL AFTER purchase_order_id;

UPDATE inventory_transactions SET transaction_type = 'PURCHASE_RECEIVED' WHERE transaction_type IN ('RECEIPT', 'PURCHASE');
UPDATE inventory_transactions SET transaction_type = 'STOCK_TRANSFER' WHERE transaction_type = 'TRANSFER';
UPDATE inventory_transactions SET transaction_type = 'STOCK_ADJUSTMENT' WHERE transaction_type = 'ADJUSTMENT';
UPDATE inventory_transactions SET transaction_type = 'MANUFACTURING_CONSUMPTION' WHERE transaction_type = 'PRODUCTION_CONSUMPTION';
UPDATE inventory_transactions SET transaction_type = 'MANUFACTURING_OUTPUT' WHERE transaction_type = 'PRODUCTION_OUTPUT';
UPDATE inventory_transactions SET transaction_type = 'SALES_ISSUE' WHERE transaction_type = 'SALE';
UPDATE inventory_transactions SET transaction_type = 'MATERIAL_RETURN' WHERE transaction_type = 'RETURN';

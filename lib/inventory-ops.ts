import "server-only";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import { withTransaction } from "@/lib/db";

export type InventoryLine = RowDataPacket & {
  id: number;
  warehouse_id: number;
  raw_material_id: number | null;
  raw_material_batch_id: number | null;
  product_id: number | null;
  batch_id: number | null;
  quantity: number;
  unit: string;
};

async function lockInventory(
  conn: PoolConnection,
  inventoryId: number,
): Promise<InventoryLine> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT * FROM inventory WHERE id = ? FOR UPDATE`,
    [inventoryId],
  );
  if (!rows.length) throw new Error("Inventory line not found");
  return rows[0] as InventoryLine;
}

async function assertNotExpiredForMove(
  conn: PoolConnection,
  line: InventoryLine,
  toWarehouseId?: number,
) {
  if (line.raw_material_batch_id) {
    const [rmb] = await conn.execute<RowDataPacket[]>(
      `SELECT batch_number, expiry_date, status, available_quantity, warehouse_id
       FROM raw_material_batches WHERE id = ? FOR UPDATE`,
      [line.raw_material_batch_id],
    );
    if (!rmb.length) throw new Error("Raw material batch not found");
    const expired = new Date(String(rmb[0].expiry_date)) < new Date(new Date().toDateString());
    if (expired || rmb[0].status === "EXPIRED") {
      if (toWarehouseId) {
        const [wh] = await conn.execute<RowDataPacket[]>(
          `SELECT warehouse_type FROM warehouses WHERE id = ? LIMIT 1`,
          [toWarehouseId],
        );
        if (!wh.length) throw new Error("Destination warehouse not found");
        if (wh[0].warehouse_type !== "REJECTED") {
          throw new Error(
            `Expired RM batch ${rmb[0].batch_number} can only transfer to REJECTED warehouse`,
          );
        }
      } else {
        throw new Error(`Cannot adjust expired RM batch ${rmb[0].batch_number} upward; mark/handle as expired`);
      }
    }
    if (["REJECTED", "CONSUMED"].includes(String(rmb[0].status)) && toWarehouseId) {
      const [wh] = await conn.execute<RowDataPacket[]>(
        `SELECT warehouse_type FROM warehouses WHERE id = ? LIMIT 1`,
        [toWarehouseId],
      );
      if (wh[0]?.warehouse_type !== "REJECTED") {
        throw new Error(`Batch status ${rmb[0].status} cannot transfer to non-REJECTED warehouse`);
      }
    }
    return rmb[0];
  }

  if (line.batch_id) {
    const [fg] = await conn.execute<RowDataPacket[]>(
      `SELECT batch_number, expiry_date, status FROM batches WHERE id = ? FOR UPDATE`,
      [line.batch_id],
    );
    if (!fg.length) throw new Error("Finished batch not found");
    const expired = new Date(String(fg[0].expiry_date)) < new Date(new Date().toDateString());
    if (expired || fg[0].status === "EXPIRED") {
      if (toWarehouseId) {
        const [wh] = await conn.execute<RowDataPacket[]>(
          `SELECT warehouse_type FROM warehouses WHERE id = ? LIMIT 1`,
          [toWarehouseId],
        );
        if (wh[0]?.warehouse_type !== "REJECTED") {
          throw new Error(
            `Expired FG batch ${fg[0].batch_number} can only transfer to REJECTED warehouse`,
          );
        }
      }
    }
    if (
      toWarehouseId &&
      ["QUARANTINE", "QC_PENDING", "REJECTED"].includes(String(fg[0].status))
    ) {
      const [wh] = await conn.execute<RowDataPacket[]>(
        `SELECT warehouse_type FROM warehouses WHERE id = ? LIMIT 1`,
        [toWarehouseId],
      );
      // Allow moving quarantine/QC to another FG or REJECTED warehouse, but not treat as available sale stock
      if (
        fg[0].status === "REJECTED" &&
        wh[0]?.warehouse_type !== "REJECTED"
      ) {
        throw new Error("Rejected finished batches can only move to REJECTED warehouse");
      }
    }
    return fg[0];
  }

  return null;
}

async function upsertDestination(
  conn: PoolConnection,
  line: InventoryLine,
  toWarehouseId: number,
  qty: number,
) {
  let destRows: RowDataPacket[];

  if (line.raw_material_batch_id) {
    [destRows] = await conn.execute<RowDataPacket[]>(
      `SELECT id, quantity FROM inventory
       WHERE warehouse_id = ? AND raw_material_batch_id = ?
       FOR UPDATE`,
      [toWarehouseId, line.raw_material_batch_id],
    );
  } else if (line.batch_id) {
    [destRows] = await conn.execute<RowDataPacket[]>(
      `SELECT id, quantity FROM inventory
       WHERE warehouse_id = ? AND batch_id = ?
       FOR UPDATE`,
      [toWarehouseId, line.batch_id],
    );
  } else {
    throw new Error("Inventory line must reference a batch");
  }

  if (destRows.length) {
    await conn.execute(`UPDATE inventory SET quantity = quantity + ? WHERE id = ?`, [
      qty,
      destRows[0].id,
    ]);
    return Number(destRows[0].id);
  }

  const [ins] = await conn.execute<ResultSetHeader>(
    `INSERT INTO inventory
      (warehouse_id, raw_material_id, raw_material_batch_id, product_id, batch_id, quantity, unit)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      toWarehouseId,
      line.raw_material_id,
      line.raw_material_batch_id,
      line.product_id,
      line.batch_id,
      qty,
      line.unit,
    ],
  );
  return ins.insertId;
}

export async function transferStock(args: {
  inventoryId: number;
  toWarehouseId: number;
  quantity: number;
  remarks?: string;
  userId?: number | null;
}) {
  const qty = Number(args.quantity);
  if (!Number.isFinite(qty) || qty <= 0) throw new Error("Transfer quantity must be greater than 0");

  return withTransaction(async (conn) => {
    const line = await lockInventory(conn, args.inventoryId);
    if (Number(line.warehouse_id) === Number(args.toWarehouseId)) {
      throw new Error("Source and destination warehouses must be different");
    }

    const [toWh] = await conn.execute<RowDataPacket[]>(
      `SELECT id, status FROM warehouses WHERE id = ? LIMIT 1`,
      [args.toWarehouseId],
    );
    if (!toWh.length || toWh[0].status !== "ACTIVE") {
      throw new Error("Destination warehouse not found or inactive");
    }

    await assertNotExpiredForMove(conn, line, args.toWarehouseId);

    const available = Number(line.quantity);
    if (qty > available) {
      throw new Error(`Insufficient stock: available ${available}, requested ${qty}`);
    }

    const newSourceQty = available - qty;
    if (newSourceQty < 0) throw new Error("Stock cannot become negative");

    await conn.execute(`UPDATE inventory SET quantity = ? WHERE id = ?`, [
      newSourceQty,
      line.id,
    ]);

    const destId = await upsertDestination(conn, line, args.toWarehouseId, qty);

    // Keep RM batch warehouse pointer if entire remaining stock left source and dest holds it
    if (line.raw_material_batch_id && newSourceQty === 0) {
      await conn.execute(
        `UPDATE raw_material_batches SET warehouse_id = ? WHERE id = ?`,
        [args.toWarehouseId, line.raw_material_batch_id],
      );
    }
    if (line.batch_id && newSourceQty === 0) {
      await conn.execute(`UPDATE batches SET warehouse_id = ? WHERE id = ?`, [
        args.toWarehouseId,
        line.batch_id,
      ]);
    }

    const remarks = args.remarks || `Transfer inventory #${line.id} → warehouse ${args.toWarehouseId}`;

    await conn.execute(
      `INSERT INTO inventory_transactions
        (transaction_type, reference_type, reference_id, warehouse_id, raw_material_id,
         raw_material_batch_id, product_id, batch_id, quantity, transaction_date, created_by, remarks)
       VALUES ('STOCK_TRANSFER', 'INVENTORY_TRANSFER', ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [
        line.id,
        line.warehouse_id,
        line.raw_material_id,
        line.raw_material_batch_id,
        line.product_id,
        line.batch_id,
        -qty,
        args.userId || null,
        `${remarks} (OUT)`,
      ],
    );

    await conn.execute(
      `INSERT INTO inventory_transactions
        (transaction_type, reference_type, reference_id, warehouse_id, raw_material_id,
         raw_material_batch_id, product_id, batch_id, quantity, transaction_date, created_by, remarks)
       VALUES ('STOCK_TRANSFER', 'INVENTORY_TRANSFER', ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [
        destId,
        args.toWarehouseId,
        line.raw_material_id,
        line.raw_material_batch_id,
        line.product_id,
        line.batch_id,
        qty,
        args.userId || null,
        `${remarks} (IN)`,
      ],
    );

    return {
      source_inventory_id: line.id,
      destination_inventory_id: destId,
      quantity: qty,
      from_warehouse_id: line.warehouse_id,
      to_warehouse_id: args.toWarehouseId,
      source_remaining: newSourceQty,
    };
  });
}

export async function adjustStock(args: {
  inventoryId: number;
  adjustmentQty: number; // can be negative
  reason: string;
  userId?: number | null;
}) {
  const delta = Number(args.adjustmentQty);
  if (!Number.isFinite(delta) || delta === 0) {
    throw new Error("Adjustment quantity must be a non-zero number");
  }
  if (!String(args.reason || "").trim()) {
    throw new Error("Adjustment reason is required");
  }

  return withTransaction(async (conn) => {
    const line = await lockInventory(conn, args.inventoryId);

    // Block increasing expired stock (except zeroing/decreasing)
    if (delta > 0) {
      if (line.raw_material_batch_id) {
        const [rmb] = await conn.execute<RowDataPacket[]>(
          `SELECT batch_number, expiry_date, status FROM raw_material_batches WHERE id = ?`,
          [line.raw_material_batch_id],
        );
        if (rmb.length) {
          const expired =
            new Date(String(rmb[0].expiry_date)) < new Date(new Date().toDateString()) ||
            rmb[0].status === "EXPIRED";
          if (expired) {
            throw new Error(`Cannot increase stock for expired batch ${rmb[0].batch_number}`);
          }
        }
      }
      if (line.batch_id) {
        const [fg] = await conn.execute<RowDataPacket[]>(
          `SELECT batch_number, expiry_date, status FROM batches WHERE id = ?`,
          [line.batch_id],
        );
        if (fg.length) {
          const expired =
            new Date(String(fg[0].expiry_date)) < new Date(new Date().toDateString()) ||
            fg[0].status === "EXPIRED";
          if (expired) {
            throw new Error(`Cannot increase stock for expired batch ${fg[0].batch_number}`);
          }
        }
      }
    }

    const newQty = Number(line.quantity) + delta;
    if (newQty < 0) {
      throw new Error(
        `Stock cannot become negative (current ${line.quantity}, adjustment ${delta})`,
      );
    }

    await conn.execute(`UPDATE inventory SET quantity = ? WHERE id = ?`, [newQty, line.id]);

    // Keep RM batch available_quantity aligned with sum of inventory for that batch
    if (line.raw_material_batch_id) {
      const [sumRows] = await conn.execute<RowDataPacket[]>(
        `SELECT COALESCE(SUM(quantity),0) AS total
         FROM inventory WHERE raw_material_batch_id = ?`,
        [line.raw_material_batch_id],
      );
      const total = Number(sumRows[0]?.total || 0);
      await conn.execute(
        `UPDATE raw_material_batches
         SET available_quantity = ?,
             status = CASE
               WHEN ? <= 0 AND status = 'AVAILABLE' THEN 'CONSUMED'
               WHEN ? > 0 AND status = 'CONSUMED' THEN 'AVAILABLE'
               ELSE status
             END
         WHERE id = ?`,
        [total, total, total, line.raw_material_batch_id],
      );
    }

    await conn.execute(
      `INSERT INTO inventory_transactions
        (transaction_type, reference_type, reference_id, warehouse_id, raw_material_id,
         raw_material_batch_id, product_id, batch_id, quantity, transaction_date, created_by, remarks)
       VALUES ('STOCK_ADJUSTMENT', 'INVENTORY_ADJUSTMENT', ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [
        line.id,
        line.warehouse_id,
        line.raw_material_id,
        line.raw_material_batch_id,
        line.product_id,
        line.batch_id,
        delta,
        args.userId || null,
        args.reason.trim(),
      ],
    );

    return {
      inventory_id: line.id,
      previous_quantity: Number(line.quantity),
      adjustment: delta,
      new_quantity: newQty,
    };
  });
}

import { NextRequest } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { query, withTransaction } from "@/lib/db";
import { fail, getSearchParams, ok, paginate } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import {
  computePoReceiveStatus,
  getPoReceiveBalances,
  remainingByPoItem,
} from "@/lib/purchase-receive";
import { insertInventoryTxn } from "@/lib/inventory-txn";
import { ensurePurchaseTxnSchema } from "@/lib/ensure-phase18";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { page, limit, offset, search, status } = getSearchParams(request);
    const where: string[] = ["1=1"];
    const params: unknown[] = [];
    if (search) {
      where.push("(gr.grn_number LIKE ? OR po.po_number LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("gr.status = ?");
      params.push(status);
    }
    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM goods_receipts gr
       INNER JOIN purchase_orders po ON po.id = gr.purchase_order_id
       WHERE ${whereSql}`,
      params,
    );
    const rows = await query<RowDataPacket[]>(
      `SELECT gr.*, po.po_number, w.warehouse_name, s.supplier_name
       FROM goods_receipts gr
       INNER JOIN purchase_orders po ON po.id = gr.purchase_order_id
       INNER JOIN warehouses w ON w.id = gr.warehouse_id
       INNER JOIN suppliers s ON s.id = po.supplier_id
       WHERE ${whereSql}
       ORDER BY gr.id DESC
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );
    return ok({
      items: rows,
      pagination: paginate(Number(countRows[0]?.total || 0), page, limit),
    });
  } catch (error) {
    console.error(error);
    return fail("Unable to load goods receipts", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensurePurchaseTxnSchema();
    const session = await getSession();
    const body = await request.json();
    const purchase_order_id = Number(body.purchase_order_id);
    const warehouse_id = Number(body.warehouse_id);
    const receipt_date = body.receipt_date || new Date().toISOString().slice(0, 10);
    const items = Array.isArray(body.items) ? body.items : [];

    if (!purchase_order_id || !warehouse_id || !items.length) {
      return fail("purchase_order_id, warehouse_id and items are required", 400);
    }

    for (const item of items) {
      if (
        !item.purchase_order_item_id ||
        !item.raw_material_id ||
        !item.batch_number ||
        !item.expiry_date ||
        item.quantity == null
      ) {
        return fail(
          "Each item needs purchase_order_item_id, raw_material_id, batch_number, expiry_date, quantity",
          400,
        );
      }
      if (!(Number(item.quantity) > 0)) {
        return fail("Each receipt quantity must be greater than zero", 400);
      }
    }

    const data = await withTransaction(async (conn) => {
      const [poRows] = await conn.execute<RowDataPacket[]>(
        `SELECT po.*, s.id AS supplier_id FROM purchase_orders po
         INNER JOIN suppliers s ON s.id = po.supplier_id
         WHERE po.id = ? LIMIT 1 FOR UPDATE`,
        [purchase_order_id],
      );
      if (!poRows.length) throw new Error("Purchase order not found");
      const poStatus = String(poRows[0].status);
      if (poStatus === "CANCELLED") throw new Error("Cannot receive cancelled PO");
      if (poStatus === "FULLY_RECEIVED" || poStatus === "RECEIVED") {
        throw new Error("Purchase order is already fully received");
      }
      if (
        !["DRAFT", "PENDING", "ORDERED", "PARTIALLY_RECEIVED"].includes(poStatus)
      ) {
        throw new Error(`Cannot receive PO in status ${poStatus}`);
      }

      const balances = await getPoReceiveBalances(purchase_order_id, conn);
      if (!balances.length) throw new Error("Purchase order has no items");
      const remainingMap = remainingByPoItem(balances);
      const balanceByItem = new Map(balances.map((b) => [b.purchase_order_item_id, b]));

      const receivingNow = new Map<number, number>();
      for (const item of items) {
        const poiId = Number(item.purchase_order_item_id);
        const qty = Number(item.quantity);
        const line = balanceByItem.get(poiId);
        if (!line) throw new Error(`PO item #${poiId} is not on this purchase order`);
        if (Number(item.raw_material_id) !== line.raw_material_id) {
          throw new Error(`Material mismatch for PO item #${poiId}`);
        }
        receivingNow.set(poiId, (receivingNow.get(poiId) || 0) + qty);
      }

      for (const [poiId, qty] of receivingNow.entries()) {
        const remaining = remainingMap.get(poiId) || 0;
        const line = balanceByItem.get(poiId)!;
        if (qty > remaining + 1e-9) {
          throw new Error(
            `Receipt qty ${qty} exceeds remaining ${remaining} for ${line.material_code} — ${line.material_name} (ordered ${line.ordered_quantity}, already received ${line.received_quantity})`,
          );
        }
      }

      const datePart = String(receipt_date).replace(/-/g, "");
      const [cntRows] = await conn.execute<RowDataPacket[]>(
        `SELECT COUNT(*) AS c FROM goods_receipts WHERE grn_number LIKE ?`,
        [`GRN-${datePart}-%`],
      );
      const seq = String(Number(cntRows[0].c) + 1).padStart(3, "0");
      const grn_number = `GRN-${datePart}-${seq}`;
      const po_number = String(poRows[0].po_number);
      const supplierId = Number(poRows[0].supplier_id);

      const [grResult] = await conn.execute<ResultSetHeader>(
        `INSERT INTO goods_receipts (grn_number, purchase_order_id, receipt_date, warehouse_id, status, created_by)
         VALUES (?, ?, ?, ?, 'COMPLETED', ?)`,
        [grn_number, purchase_order_id, receipt_date, warehouse_id, session?.id || null],
      );
      const grId = grResult.insertId;

      for (const item of items) {
        const poiId = Number(item.purchase_order_item_id);
        const line = balanceByItem.get(poiId)!;
        const mid = line.raw_material_id;
        const qty = Number(item.quantity);
        const unit = item.unit || line.unit || "kg";
        const unitPrice =
          item.unit_price != null && item.unit_price !== ""
            ? Number(item.unit_price)
            : line.unit_price;
        const totalCost = qty * unitPrice;

        await conn.execute(
          `INSERT INTO goods_receipt_items
           (goods_receipt_id, purchase_order_item_id, raw_material_id, batch_number,
            manufacturing_date, expiry_date, quantity, unit, unit_price)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            grId,
            poiId,
            mid,
            item.batch_number,
            item.manufacturing_date || null,
            item.expiry_date,
            qty,
            unit,
            unitPrice,
          ],
        );

        const [rmbResult] = await conn.execute<ResultSetHeader>(
          `INSERT INTO raw_material_batches
           (raw_material_id, supplier_id, batch_number, manufacturing_date, expiry_date,
            received_quantity, available_quantity, unit, purchase_price, warehouse_id, goods_receipt_id, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE')`,
          [
            mid,
            supplierId,
            item.batch_number,
            item.manufacturing_date || null,
            item.expiry_date,
            qty,
            qty,
            unit,
            unitPrice,
            warehouse_id,
            grId,
          ],
        );
        const rmbId = rmbResult.insertId;

        const [invRows] = await conn.execute<RowDataPacket[]>(
          `SELECT id, quantity FROM inventory
           WHERE warehouse_id = ? AND raw_material_batch_id = ? LIMIT 1`,
          [warehouse_id, rmbId],
        );
        if (invRows.length) {
          await conn.execute(`UPDATE inventory SET quantity = quantity + ? WHERE id = ?`, [
            qty,
            invRows[0].id,
          ]);
        } else {
          await conn.execute(
            `INSERT INTO inventory (warehouse_id, raw_material_id, raw_material_batch_id, quantity, unit)
             VALUES (?, ?, ?, ?, ?)`,
            [warehouse_id, mid, rmbId, qty, unit],
          );
        }

        await insertInventoryTxn(
          {
            transaction_type: "PURCHASE_RECEIVED",
            reference_type: "GOODS_RECEIPT",
            reference_id: grId,
            warehouse_id,
            raw_material_id: mid,
            raw_material_batch_id: rmbId,
            quantity: qty,
            unit_cost: unitPrice,
            total_cost: totalCost,
            lot_number: String(item.batch_number),
            supplier_id: supplierId,
            purchase_order_id,
            purchase_order_item_id: poiId,
            created_by: session?.id || null,
            transaction_date: `${receipt_date} 12:00:00`,
            remarks:
              item.remarks ||
              `GRN ${grn_number} / PO ${po_number} / ${line.material_code} / lot ${item.batch_number}`,
          },
          conn,
        );
      }

      const afterBalances = await getPoReceiveBalances(purchase_order_id, conn);
      const nextStatus = computePoReceiveStatus(afterBalances);
      await conn.execute(`UPDATE purchase_orders SET status = ? WHERE id = ?`, [
        nextStatus,
        purchase_order_id,
      ]);

      return {
        id: grId,
        grn_number,
        po_number,
        po_status: nextStatus,
        transactions_created: items.length,
      };
    });

    await writeAudit({
      user: session,
      action: "CREATE",
      entity_type: "goods_receipt",
      entity_id: data.id,
      entity_code: data.grn_number,
      summary: `Goods receipt ${data.grn_number} posted for PO ${data.po_number} → ${data.po_status}`,
      after: { purchase_order_id, warehouse_id, po_status: data.po_status },
      request,
    });

    return ok(data, "Goods receipt completed successfully", 201);
  } catch (error) {
    console.error(error);
    return fail(error instanceof Error ? error.message : "Unable to create goods receipt", 400);
  }
}

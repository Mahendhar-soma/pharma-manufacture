import { NextRequest } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { withTransaction } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { createQcSampleForBatch } from "@/lib/qc";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const manufacturing_date =
      body.manufacturing_date || new Date().toISOString().slice(0, 10);

    const result = await withTransaction(async (conn) => {
      const [moRows] = await conn.execute<RowDataPacket[]>(
        `SELECT mo.*, p.product_code, p.shelf_life_months, p.unit AS product_unit
         FROM manufacturing_orders mo
         INNER JOIN products p ON p.id = mo.product_id
         WHERE mo.id = ? LIMIT 1`,
        [id],
      );
      if (!moRows.length) throw new Error("Manufacturing order not found");
      const mo = moRows[0];
      if (mo.status !== "IN_PROGRESS") {
        throw new Error("Manufacturing order must be IN_PROGRESS to complete");
      }

      const [items] = await conn.execute<RowDataPacket[]>(
        `SELECT * FROM manufacturing_order_items WHERE manufacturing_order_id = ?`,
        [id],
      );

      const consumptions: Array<{
        raw_material_id: number;
        raw_material_batch_id: number;
        planned_quantity: number;
        actual_quantity: number;
        unit: string;
      }> = [];

      // FEFO consumption
      for (const item of items) {
        let remaining = Number(item.planned_quantity);
        const [batches] = await conn.execute<RowDataPacket[]>(
          `SELECT * FROM raw_material_batches
           WHERE raw_material_id = ?
             AND status = 'AVAILABLE'
             AND expiry_date >= CURDATE()
             AND available_quantity > 0
           ORDER BY expiry_date ASC, id ASC
           FOR UPDATE`,
          [item.raw_material_id],
        );

        for (const batch of batches) {
          if (remaining <= 0) break;
          const take = Math.min(Number(batch.available_quantity), remaining);
          const newQty = Number(batch.available_quantity) - take;
          if (newQty < 0) throw new Error("Stock cannot become negative");

          await conn.execute(
            `UPDATE raw_material_batches
             SET available_quantity = ?, status = CASE WHEN ? = 0 THEN 'CONSUMED' ELSE status END
             WHERE id = ?`,
            [newQty, newQty, batch.id],
          );

          const [invRows] = await conn.execute<RowDataPacket[]>(
            `SELECT id, quantity FROM inventory WHERE raw_material_batch_id = ? AND warehouse_id = ? LIMIT 1`,
            [batch.id, batch.warehouse_id],
          );
          if (invRows.length) {
            const invNew = Number(invRows[0].quantity) - take;
            if (invNew < 0) throw new Error("Inventory cannot become negative");
            await conn.execute(`UPDATE inventory SET quantity = ? WHERE id = ?`, [
              invNew,
              invRows[0].id,
            ]);
          }

          await conn.execute(
            `INSERT INTO inventory_transactions
             (transaction_type, reference_type, reference_id, warehouse_id, raw_material_id,
              raw_material_batch_id, quantity, transaction_date, created_by, remarks)
             VALUES ('MANUFACTURING_CONSUMPTION', 'MANUFACTURING_ORDER', ?, ?, ?, ?, ?, NOW(), ?, ?)`,
            [
              id,
              batch.warehouse_id,
              item.raw_material_id,
              batch.id,
              -take,
              session?.id || null,
              `Consumed for MO ${mo.mo_number}`,
            ],
          );

          consumptions.push({
            raw_material_id: item.raw_material_id,
            raw_material_batch_id: batch.id,
            planned_quantity: Number(item.planned_quantity),
            actual_quantity: take,
            unit: item.unit,
          });
          remaining -= take;
        }

        if (remaining > 0.0001) {
          throw new Error(`Insufficient non-expired stock for raw material ${item.raw_material_id}`);
        }

        await conn.execute(
          `UPDATE manufacturing_order_items SET actual_quantity = planned_quantity WHERE id = ?`,
          [item.id],
        );
      }

      const datePart = String(manufacturing_date).replace(/-/g, "");
      const [cnt] = await conn.execute<RowDataPacket[]>(
        `SELECT COUNT(*) AS c FROM batches WHERE batch_number LIKE ?`,
        [`${mo.product_code}-${datePart}-%`],
      );
      const batch_number = `${mo.product_code}-${datePart}-${String(Number(cnt[0].c) + 1).padStart(3, "0")}`;

      const [expRows] = await conn.execute<RowDataPacket[]>(
        `SELECT DATE_ADD(?, INTERVAL ? MONTH) AS expiry_date`,
        [manufacturing_date, mo.shelf_life_months],
      );
      const expiry_date = expRows[0].expiry_date;
      const warehouse_id = mo.warehouse_id || 2;
      const actual_quantity = Number(body.actual_quantity || mo.planned_quantity);

      const [batchResult] = await conn.execute<ResultSetHeader>(
        `INSERT INTO batches
         (product_id, manufacturing_order_id, batch_number, manufacturing_date, expiry_date,
          planned_quantity, actual_quantity, unit, warehouse_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'QC_PENDING')`,
        [
          mo.product_id,
          id,
          batch_number,
          manufacturing_date,
          expiry_date,
          mo.planned_quantity,
          actual_quantity,
          mo.product_unit,
          warehouse_id,
        ],
      );
      const batchId = batchResult.insertId;

      for (const c of consumptions) {
        await conn.execute(
          `INSERT INTO batch_material_consumption
           (batch_id, raw_material_id, raw_material_batch_id, planned_quantity, actual_quantity, unit)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            batchId,
            c.raw_material_id,
            c.raw_material_batch_id,
            c.planned_quantity,
            c.actual_quantity,
            c.unit,
          ],
        );
      }

      await conn.execute(
        `INSERT INTO inventory (warehouse_id, product_id, batch_id, quantity, unit)
         VALUES (?, ?, ?, ?, ?)`,
        [warehouse_id, mo.product_id, batchId, actual_quantity, mo.product_unit],
      );

      await conn.execute(
        `INSERT INTO inventory_transactions
         (transaction_type, reference_type, reference_id, warehouse_id, product_id, batch_id,
          quantity, transaction_date, created_by, remarks)
         VALUES ('MANUFACTURING_OUTPUT', 'BATCH', ?, ?, ?, ?, ?, NOW(), ?, ?)`,
        [
          batchId,
          warehouse_id,
          mo.product_id,
          batchId,
          actual_quantity,
          session?.id || null,
          `Finished batch ${batch_number}`,
        ],
      );

      await conn.execute(
        `UPDATE manufacturing_orders
         SET status = 'COMPLETED', actual_quantity = ?, actual_end_date = CURDATE()
         WHERE id = ?`,
        [actual_quantity, id],
      );

      // Phase 12: auto-create LIMS QC sample + pending tests for release gate
      const qcSample = await createQcSampleForBatch(conn, {
        productId: Number(mo.product_id),
        batchId,
        batchNumber: batch_number,
        createdBy: session?.id || null,
      });

      return {
        batch_id: batchId,
        batch_number,
        expiry_date,
        status: "QC_PENDING",
        qc_sample: qcSample,
      };
    });

    await writeAudit({
      user: session,
      action: "COMPLETE",
      entity_type: "manufacturing_order",
      entity_id: Number(id),
      entity_code: String(result.batch_number),
      summary: `MO #${id} completed → batch ${result.batch_number} (QC_PENDING)`,
      after: result,
      request,
    });

    return ok(
      result,
      "Manufacturing completed — finished batch is QC_PENDING with LIMS sample created",
    );
  } catch (error) {
    console.error(error);
    return fail(error instanceof Error ? error.message : "Unable to complete manufacturing", 500);
  }
}

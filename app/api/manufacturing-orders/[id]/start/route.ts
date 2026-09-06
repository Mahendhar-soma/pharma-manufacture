import { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    const { id } = await context.params;
    const moRows = await query<RowDataPacket[]>(
      `SELECT * FROM manufacturing_orders WHERE id = ? LIMIT 1`,
      [id],
    );
    if (!moRows.length) return fail("Manufacturing order not found", 404);
    if (!["PLANNED", "RELEASED"].includes(moRows[0].status)) {
      return fail("Only PLANNED or RELEASED orders can be started", 400);
    }

    const items = await query<RowDataPacket[]>(
      `SELECT moi.*, 
        COALESCE((
          SELECT SUM(available_quantity) FROM raw_material_batches rmb
          WHERE rmb.raw_material_id = moi.raw_material_id
            AND rmb.status = 'AVAILABLE' AND rmb.expiry_date >= CURDATE()
        ),0) AS available_stock
       FROM manufacturing_order_items moi
       WHERE moi.manufacturing_order_id = ?`,
      [id],
    );

    const shortages = items.filter(
      (i) => Number(i.available_stock) < Number(i.planned_quantity),
    );
    if (shortages.length) {
      return fail("Insufficient raw material stock to start manufacturing", 409, {
        shortages: shortages.map((s) => ({
          raw_material_id: s.raw_material_id,
          required: s.planned_quantity,
          available: s.available_stock,
        })),
      });
    }

    const prevStatus = String(moRows[0].status);
    const moNumber = String(moRows[0].mo_number);

    await execute(
      `UPDATE manufacturing_orders
       SET status = 'IN_PROGRESS', actual_start_date = CURDATE()
       WHERE id = ?`,
      [id],
    );

    for (const item of items) {
      await execute(
        `UPDATE manufacturing_order_items SET reserved_quantity = planned_quantity WHERE id = ?`,
        [item.id],
      );
    }

    await writeAudit({
      user: session,
      action: "START",
      entity_type: "manufacturing_order",
      entity_id: Number(id),
      entity_code: moNumber,
      summary: `MO ${moNumber} started (${prevStatus} → IN_PROGRESS)`,
      before: { status: prevStatus },
      after: { status: "IN_PROGRESS" },
      request,
    });

    return ok(null, "Manufacturing started successfully");
  } catch (error) {
    console.error(error);
    return fail("Unable to start manufacturing", 500);
  }
}

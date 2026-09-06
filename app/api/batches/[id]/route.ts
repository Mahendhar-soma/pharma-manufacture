import { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { getBatchQcSummary } from "@/lib/qc";
import { writeAudit } from "@/lib/audit";
import {
  ForbiddenError,
  requireBatchReleasePermission,
  requireModuleWrite,
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/rbac";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const rows = await query<RowDataPacket[]>(
      `SELECT b.*, p.product_code, p.product_name, w.warehouse_name, mo.mo_number
       FROM batches b
       INNER JOIN products p ON p.id = b.product_id
       INNER JOIN warehouses w ON w.id = b.warehouse_id
       LEFT JOIN manufacturing_orders mo ON mo.id = b.manufacturing_order_id
       WHERE b.id = ? LIMIT 1`,
      [id],
    );
    if (!rows.length) return fail("Batch not found", 404);

    const consumption = await query<RowDataPacket[]>(
      `SELECT bmc.*, rm.material_code, rm.material_name, rmb.batch_number AS rm_batch_number,
        rmb.expiry_date AS rm_expiry_date, s.supplier_name
       FROM batch_material_consumption bmc
       INNER JOIN raw_materials rm ON rm.id = bmc.raw_material_id
       INNER JOIN raw_material_batches rmb ON rmb.id = bmc.raw_material_batch_id
       LEFT JOIN suppliers s ON s.id = rmb.supplier_id
       WHERE bmc.batch_id = ?`,
      [id],
    );

    return ok({ ...rows[0], consumption, qc: await getBatchQcSummary(Number(id)) });
  } catch (error) {
    console.error(error);
    return fail("Unable to load batch", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    if (!body.status) return fail("status is required", 400);

    const nextStatus = String(body.status).toUpperCase();
    const existing = await query<RowDataPacket[]>(
      `SELECT id, batch_number, status FROM batches WHERE id = ? LIMIT 1`,
      [id],
    );
    if (!existing.length) return fail("Batch not found", 404);
    const prevStatus = String(existing[0].status);
    const batchNumber = String(existing[0].batch_number);

    let user = null;

    if (nextStatus === "RELEASED") {
      user = await requireBatchReleasePermission();
      const summary = await getBatchQcSummary(Number(id));
      if (!summary) return fail("Batch not found", 404);
      if (!["QC_PENDING", "QUARANTINE"].includes(summary.batch_status)) {
        return fail(`Cannot release batch in status ${summary.batch_status}`, 409);
      }
      if (!summary.can_release) {
        return fail("QC gate blocked: LIMS requirements not met", 409, {
          blockers: summary.blockers,
          qc: summary,
        });
      }
    } else {
      user = await requireModuleWrite("batches");
    }

    const result = await execute(`UPDATE batches SET status = ? WHERE id = ?`, [
      nextStatus,
      id,
    ]);
    if (result.affectedRows === 0) return fail("Batch not found", 404);

    await writeAudit({
      user,
      action: nextStatus === "RELEASED" ? "RELEASE" : "STATUS_CHANGE",
      entity_type: "batch",
      entity_id: Number(id),
      entity_code: batchNumber,
      summary: `Batch ${batchNumber} status ${prevStatus} → ${nextStatus}`,
      before: { status: prevStatus },
      after: { status: nextStatus },
      request,
    });

    return ok(
      nextStatus === "RELEASED" ? { status: nextStatus } : null,
      nextStatus === "RELEASED"
        ? "Batch released after successful QC"
        : "Batch status updated",
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof ForbiddenError) {
      return forbiddenResponse(error.message);
    }
    console.error(error);
    return fail("Unable to update batch", 500);
  }
}

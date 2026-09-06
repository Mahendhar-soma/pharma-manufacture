import { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { getBatchQcSummary } from "@/lib/qc";
import { writeAudit } from "@/lib/audit";
import {
  ForbiddenError,
  requireBatchReleasePermission,
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/rbac";

export const runtime = "nodejs";

/** Dedicated QC release endpoint — QUALITY/ADMIN + LIMS PASS required. */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireBatchReleasePermission();
    const { id } = await context.params;
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

    const batchRows = await query<RowDataPacket[]>(
      `SELECT batch_number, status FROM batches WHERE id = ? LIMIT 1`,
      [id],
    );
    const prevStatus = String(batchRows[0]?.status || summary.batch_status);
    const batchNumber = String(batchRows[0]?.batch_number || id);

    await execute(`UPDATE batches SET status = 'RELEASED' WHERE id = ?`, [id]);

    await writeAudit({
      user,
      action: "RELEASE",
      entity_type: "batch",
      entity_id: Number(id),
      entity_code: batchNumber,
      summary: `Batch ${batchNumber} released (${prevStatus} → RELEASED)`,
      before: { status: prevStatus },
      after: { status: "RELEASED" },
      request,
    });

    return ok(
      { batch_id: Number(id), status: "RELEASED", qc: summary },
      "Batch released after successful QC",
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof ForbiddenError) {
      return forbiddenResponse(error.message);
    }
    console.error(error);
    return fail("Unable to release batch", 500);
  }
}

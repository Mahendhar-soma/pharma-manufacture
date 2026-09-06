import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { markExpiredBatches, ensureJobRunsTable } from "@/lib/expiry-job";
import { writeAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import {
  ForbiddenError,
  requireModuleWrite,
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/rbac";

export const runtime = "nodejs";

function cronSecretOk(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = request.headers.get("x-cron-secret") || "";
  const auth = request.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return header === expected || bearer === expected;
}

/**
 * Mark expired batches.
 * Auth: logged-in user with expiry write, OR x-cron-secret / Bearer CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  try {
    await ensureJobRunsTable().catch(() => undefined);

    let triggeredBy = "api";
    let session = null;
    if (cronSecretOk(request)) {
      triggeredBy = "cron-secret";
    } else {
      await requireModuleWrite("expiry");
      session = await getSession();
      triggeredBy = "user";
    }

    const result = await markExpiredBatches(triggeredBy);

    await writeAudit({
      user: session,
      action: "EXPIRE",
      entity_type: "expiry_job",
      summary: `Expiry job marked batches expired (triggered_by=${triggeredBy})`,
      after: result,
      request,
    });

    return ok(result, "Expired batches marked successfully");
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof ForbiddenError) {
      return forbiddenResponse(error.message);
    }
    console.error(error);
    return fail(
      error instanceof Error ? error.message : "Unable to mark expired batches",
      500,
    );
  }
}

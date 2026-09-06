import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { markExpiredBatches, ensureJobRunsTable } from "@/lib/expiry-job";

export const runtime = "nodejs";

/**
 * External cron entrypoint (no session cookie).
 * Requires header: x-cron-secret: <CRON_SECRET>
 * or Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: NextRequest) {
  try {
    const expected = process.env.CRON_SECRET;
    if (!expected) {
      return fail("CRON_SECRET is not configured on the server", 500);
    }

    const header = request.headers.get("x-cron-secret") || "";
    const auth = request.headers.get("authorization") || "";
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (header !== expected && bearer !== expected) {
      return fail("Unauthorized cron request", 401);
    }

    await ensureJobRunsTable().catch(() => undefined);
    const result = await markExpiredBatches("external-cron");
    return ok(result, "Expiry cron job completed");
  } catch (error) {
    console.error(error);
    return fail(
      error instanceof Error ? error.message : "Expiry cron job failed",
      500,
    );
  }
}

export async function GET(request: NextRequest) {
  // Allow health-style check with secret
  return POST(request);
}

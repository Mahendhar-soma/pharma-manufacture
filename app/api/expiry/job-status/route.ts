import { fail, ok } from "@/lib/api";
import { getLatestExpiryJobRun, ensureJobRunsTable } from "@/lib/expiry-job";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureJobRunsTable().catch(() => undefined);
    const lastRun = await getLatestExpiryJobRun();
    return ok(
      {
        job_name: "mark_expired_batches",
        scheduler_enabled: process.env.EXPIRY_JOB_ENABLED === "true",
        interval_ms: Number(process.env.EXPIRY_JOB_INTERVAL_MS || 60 * 60 * 1000),
        last_run: lastRun,
      },
      "Expiry job status loaded",
    );
  } catch (error) {
    console.error(error);
    return fail("Unable to load expiry job status", 500);
  }
}

import "server-only";
import { markExpiredBatches } from "@/lib/expiry-job";

declare global {
  // eslint-disable-next-line no-var
  var __pharmaExpirySchedulerStarted: boolean | undefined;
}

function parseIntervalMs(): number {
  const raw = process.env.EXPIRY_JOB_INTERVAL_MS;
  if (raw && Number(raw) > 0) return Number(raw);
  // Default: every hour
  return 60 * 60 * 1000;
}

/**
 * Starts an in-process interval that marks expired batches.
 * Enabled when EXPIRY_JOB_ENABLED=true (recommended for `next start`).
 */
export function startExpiryScheduler() {
  if (process.env.EXPIRY_JOB_ENABLED !== "true") {
    console.log("[expiry-job] Scheduler disabled (set EXPIRY_JOB_ENABLED=true to enable)");
    return;
  }

  if (global.__pharmaExpirySchedulerStarted) return;
  global.__pharmaExpirySchedulerStarted = true;

  const intervalMs = parseIntervalMs();
  console.log(`[expiry-job] Scheduler started (every ${intervalMs}ms)`);

  const run = async () => {
    try {
      const result = await markExpiredBatches("scheduler");
      console.log(
        `[expiry-job] Run complete — FG:${result.finished_batches_marked} RM:${result.raw_material_batches_marked}`,
      );
    } catch (error) {
      console.error("[expiry-job] Run failed:", error);
    }
  };

  // Run once shortly after boot, then on interval
  setTimeout(run, 15_000);
  setInterval(run, intervalMs);
}

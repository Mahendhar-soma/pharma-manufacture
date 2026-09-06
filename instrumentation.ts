export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureJobRunsTable } = await import("@/lib/expiry-job");
    const { startExpiryScheduler } = await import("@/lib/expiry-scheduler");
    try {
      await ensureJobRunsTable();
    } catch (error) {
      console.error("[expiry-job] Unable to ensure job_runs table:", error);
    }
    startExpiryScheduler();
  }
}

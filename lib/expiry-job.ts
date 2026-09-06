import "server-only";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { execute, query, withTransaction } from "@/lib/db";

export const EXPIRY_JOB_NAME = "mark_expired_batches";

export type ExpiryJobResult = {
  finished_batches_marked: number;
  raw_material_batches_marked: number;
  started_at: string;
  finished_at: string;
  triggered_by: string;
  job_run_id?: number;
};

/**
 * Marks past-expiry finished and raw-material batches as EXPIRED.
 * Safe to run repeatedly (idempotent for already-expired rows).
 */
export async function markExpiredBatches(
  triggeredBy: string = "manual",
): Promise<ExpiryJobResult> {
  const started_at = new Date().toISOString();

  return withTransaction(async (conn) => {
    let jobRunId: number | undefined;

    // job_runs table may not exist on older DBs — fail soft for logging only
    try {
      const [ins] = await conn.execute<ResultSetHeader>(
        `INSERT INTO job_runs (job_name, started_at, status, triggered_by)
         VALUES (?, NOW(), 'RUNNING', ?)`,
        [EXPIRY_JOB_NAME, triggeredBy],
      );
      jobRunId = ins.insertId;
    } catch {
      jobRunId = undefined;
    }

    try {
      const [fg] = await conn.execute<ResultSetHeader>(
        `UPDATE batches SET status = 'EXPIRED'
         WHERE expiry_date < CURDATE()
           AND status NOT IN ('EXPIRED','SOLD_OUT','REJECTED')`,
      );

      const [rm] = await conn.execute<ResultSetHeader>(
        `UPDATE raw_material_batches SET status = 'EXPIRED'
         WHERE expiry_date < CURDATE()
           AND status NOT IN ('EXPIRED','CONSUMED','REJECTED')`,
      );

      const result: ExpiryJobResult = {
        finished_batches_marked: fg.affectedRows,
        raw_material_batches_marked: rm.affectedRows,
        started_at,
        finished_at: new Date().toISOString(),
        triggered_by: triggeredBy,
        job_run_id: jobRunId,
      };

      if (jobRunId) {
        await conn.execute(
          `UPDATE job_runs
           SET finished_at = NOW(), status = 'SUCCESS', result_json = ?
           WHERE id = ?`,
          [JSON.stringify(result), jobRunId],
        );
      }

      return result;
    } catch (error) {
      if (jobRunId) {
        await conn.execute(
          `UPDATE job_runs
           SET finished_at = NOW(), status = 'FAILED', error_message = ?
           WHERE id = ?`,
          [error instanceof Error ? error.message : "Unknown error", jobRunId],
        );
      }
      throw error;
    }
  });
}

export async function getLatestExpiryJobRun() {
  try {
    const rows = await query<RowDataPacket[]>(
      `SELECT id, job_name, started_at, finished_at, status, result_json, error_message, triggered_by
       FROM job_runs
       WHERE job_name = ?
       ORDER BY id DESC
       LIMIT 1`,
      [EXPIRY_JOB_NAME],
    );
    if (!rows.length) return null;
    const row = rows[0];
    let result: unknown = null;
    if (row.result_json) {
      try {
        result =
          typeof row.result_json === "string"
            ? JSON.parse(row.result_json)
            : row.result_json;
      } catch {
        result = row.result_json;
      }
    }
    return {
      id: Number(row.id),
      job_name: String(row.job_name),
      started_at: row.started_at,
      finished_at: row.finished_at,
      status: String(row.status),
      result,
      error_message: row.error_message,
      triggered_by: row.triggered_by,
    };
  } catch {
    return null;
  }
}

export async function ensureJobRunsTable() {
  await execute(`
    CREATE TABLE IF NOT EXISTS job_runs (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      job_name VARCHAR(100) NOT NULL,
      started_at DATETIME NOT NULL,
      finished_at DATETIME NULL,
      status ENUM('RUNNING','SUCCESS','FAILED') NOT NULL,
      result_json JSON NULL,
      error_message TEXT NULL,
      triggered_by VARCHAR(50) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_job_runs_name_id (job_name, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

/**
 * One-shot expiry job for OS schedulers / manual runs.
 * Usage: node scripts/run-expiry-job.js
 * Loads DATABASE_URL from .env.local
 */
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*"(.*)"\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    const m2 = line.match(/^([A-Z0-9_]+)\s*=\s*([^\s#]+)\s*$/);
    if (m2 && !process.env[m2[1]]) process.env[m2[1]] = m2[2];
  }
}

async function main() {
  loadEnv();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL missing");

  const url = new URL(databaseUrl);
  const conn = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    multipleStatements: true,
  });

  await conn.query(`
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

  await conn.beginTransaction();
  try {
    const [ins] = await conn.execute(
      `INSERT INTO job_runs (job_name, started_at, status, triggered_by)
       VALUES ('mark_expired_batches', NOW(), 'RUNNING', 'cli')`,
    );
    const jobId = ins.insertId;

    const [fg] = await conn.execute(
      `UPDATE batches SET status = 'EXPIRED'
       WHERE expiry_date < CURDATE()
         AND status NOT IN ('EXPIRED','SOLD_OUT','REJECTED')`,
    );
    const [rm] = await conn.execute(
      `UPDATE raw_material_batches SET status = 'EXPIRED'
       WHERE expiry_date < CURDATE()
         AND status NOT IN ('EXPIRED','CONSUMED','REJECTED')`,
    );

    const result = {
      finished_batches_marked: fg.affectedRows,
      raw_material_batches_marked: rm.affectedRows,
      triggered_by: "cli",
    };

    await conn.execute(
      `UPDATE job_runs SET finished_at = NOW(), status = 'SUCCESS', result_json = ? WHERE id = ?`,
      [JSON.stringify(result), jobId],
    );
    await conn.commit();
    console.log("Expiry job OK:", result);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Expiry job failed:", err.message);
  process.exit(1);
});

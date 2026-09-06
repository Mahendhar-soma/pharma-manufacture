/**
 * Apply Phase 17 migration (audit_logs table).
 * Usage: node database/migrate-phase17.js
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
  }
}

async function main() {
  loadEnv();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL missing in .env.local");
  const url = new URL(databaseUrl);
  const sql = fs.readFileSync(path.join(__dirname, "migrate-phase17.sql"), "utf8");
  const conn = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    multipleStatements: true,
  });
  await conn.query(sql);
  console.log("Phase 17 migration applied (audit_logs).");
  await conn.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

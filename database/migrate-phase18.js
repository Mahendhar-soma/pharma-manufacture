/**
 * Apply Phase 18 migration (PO item receiving + enriched transactions).
 * Usage: node database/migrate-phase18.js
 */
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*"(.*)"\s*$/) || line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

async function main() {
  loadEnv();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL missing in .env.local");
  const url = new URL(databaseUrl);
  if (!url.hostname) {
    throw new Error(
      'DATABASE_URL must include host, e.g. mysql://user:pass@host:3306/dbname',
    );
  }
  const sql = fs.readFileSync(path.join(__dirname, "migrate-phase18.sql"), "utf8");
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.replace(/--.*$/gm, "").trim())
    .filter((s) => s.length > 0);

  const conn = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    multipleStatements: false,
  });

  for (const stmt of statements) {
    try {
      await conn.query(stmt);
      console.log("OK:", stmt.slice(0, 80).replace(/\s+/g, " "));
    } catch (err) {
      const code = err && err.code;
      // Duplicate column / key / already migrated
      if (code === "ER_DUP_FIELDNAME" || code === "ER_DUP_KEYNAME") {
        console.log("SKIP (exists):", stmt.slice(0, 60).replace(/\s+/g, " "));
        continue;
      }
      throw err;
    }
  }

  console.log("Phase 18 migration applied.");
  await conn.end();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

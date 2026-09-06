/**
 * Applies schema.sql then seed.sql using DATABASE_URL from .env.local
 */
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function run() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const envText = fs.readFileSync(envPath, "utf8");
  const match = envText.match(/DATABASE_URL="([^"]+)"/);
  if (!match) throw new Error("DATABASE_URL not found in .env.local");

  const url = new URL(match[1]);
  const conn = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    multipleStatements: true,
  });

  console.log("Connected to", url.hostname, url.pathname);
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  const seed = fs.readFileSync(path.join(__dirname, "seed.sql"), "utf8");

  console.log("Applying schema...");
  await conn.query(schema);
  console.log("Schema applied.");

  console.log("Applying seed...");
  await conn.query(seed);
  console.log("Seed applied.");

  const [rows] = await conn.query("SELECT COUNT(*) AS users FROM users");
  console.log("Users count:", rows[0].users);
  await conn.end();
}

run().catch((err) => {
  console.error("DB setup failed:", err.message);
  process.exit(1);
});

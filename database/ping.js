const mysql = require("mysql2/promise");

async function main() {
  const url = new URL(
    process.env.DATABASE_URL ||
      "mysql://inrisoft_user:inrisoft_user%40123@68.178.146.55:3306/erp_dev",
  );
  const conn = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
  });
  const [ping] = await conn.query("SELECT 1 AS ok, DATABASE() AS db");
  console.log("ping", ping);
  const [tables] = await conn.query("SHOW TABLES");
  console.log("table_count", tables.length);
  console.log(
    "tables",
    tables.slice(0, 20).map((t) => Object.values(t)[0]),
  );
  await conn.end();
}

main().catch((err) => {
  console.error("FAIL", err.message);
  process.exit(1);
});

import "server-only";
import mysql, { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

declare global {
  var __pharmaMysqlPool: Pool | undefined;
}

function createPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local");
  }

  // Prefer URL parsing so passwords with special characters work correctly.
  const url = new URL(databaseUrl);

  return mysql.createPool({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: false,
    dateStrings: true,
  });
}

const pool = global.__pharmaMysqlPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  global.__pharmaMysqlPool = pool;
}

export default pool;

export type QueryResult<T extends RowDataPacket[]> = [T, mysql.FieldPacket[]];

export async function query<T extends RowDataPacket[]>(
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  const [rows] = await pool.execute<T>(sql, params as never);
  return rows;
}

export async function execute(
  sql: string,
  params: unknown[] = [],
): Promise<ResultSetHeader> {
  const [result] = await pool.execute<ResultSetHeader>(sql, params as never);
  return result;
}

export async function withTransaction<T>(
  fn: (conn: PoolConnection) => Promise<T>,
): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

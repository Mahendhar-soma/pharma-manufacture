import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";

/**
 * Auto-generate sequential codes like SMP-2026-0001 when not provided by client.
 */
export async function nextCode(
  table: string,
  column: string,
  prefix: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const like = `${prefix}-${year}-%`;
  const rows = await query<RowDataPacket[]>(
    `SELECT ${column} AS code FROM ${table} WHERE ${column} LIKE ? ORDER BY id DESC LIMIT 1`,
    [like],
  );
  let seq = 1;
  const last = rows[0]?.code as string | undefined;
  if (last) {
    const parts = last.split("-");
    const n = Number(parts[parts.length - 1]);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

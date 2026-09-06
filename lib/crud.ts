/**
 * Shared helpers for building list + CRUD API handlers with mysql2.
 */
import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, getSearchParams, ok, paginate } from "@/lib/api";

const SAFE_SORT = /^[a-zA-Z0-9_\.]+$/; 

export function buildListHandler(options: {
  table: string;
  searchColumns: string[];
  defaultSort?: string;
  selectSql?: string;
  fromSql?: string;
  statusColumn?: string;
}) {
  return async function GET(request: Request) {
    try {
      const { page, limit, offset, search, status, sortBy, sortDir } = getSearchParams(request);
      const sort = SAFE_SORT.test(sortBy) ? sortBy : options.defaultSort || "id";
      const where: string[] = ["1=1"];
      const params: unknown[] = [];

      if (search && options.searchColumns.length) {
        where.push(
          `(${options.searchColumns.map((c) => `${c} LIKE ?`).join(" OR ")})`,
        );
        options.searchColumns.forEach(() => params.push(`%${search}%`));
      }

      if (status && options.statusColumn) {
        where.push(`${options.statusColumn} = ?`);
        params.push(status);
      }

      const from = options.fromSql || options.table;
      const whereSql = where.join(" AND ");

      const countRows = await query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM ${from} WHERE ${whereSql}`,
        params,
      );
      const total = Number(countRows[0]?.total || 0);

      const select = options.selectSql || `${options.table}.*`;
      // LIMIT/OFFSET must be safe integers (mysql2 prepared statements can reject placeholders here)
      const safeLimit = Number(limit);
      const safeOffset = Number(offset);
      const rows = await query<RowDataPacket[]>(
        `SELECT ${select} FROM ${from} WHERE ${whereSql} ORDER BY ${sort} ${sortDir} LIMIT ${safeLimit} OFFSET ${safeOffset}`,
        params,
      );

      return ok({ items: rows, pagination: paginate(total, page, limit) });
    } catch (error) {
      console.error(`List ${options.table} error:`, error);
      return fail(`Unable to load ${options.table}`, 500);
    }
  };
}

export function buildGetByIdHandler(table: string, selectSql?: string) {
  return async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    try {
      const { id } = await context.params;
      const rows = await query<RowDataPacket[]>(
        `SELECT ${selectSql || "*"} FROM ${table} WHERE id = ? LIMIT 1`,
        [id],
      );
      if (!rows.length) return fail("Record not found", 404);
      return ok(rows[0]);
    } catch (error) {
      console.error(`Get ${table} error:`, error);
      return fail("Unable to load record", 500);
    }
  };
}

export function softDeactivate(table: string, statusValue = "INACTIVE") {
  return async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
    try {
      const { id } = await context.params;
      const result = await execute(`UPDATE ${table} SET status = ? WHERE id = ?`, [statusValue, id]);
      if (result.affectedRows === 0) return fail("Record not found", 404);
      return ok(null, "Record deactivated successfully");
    } catch (error) {
      console.error(`Deactivate ${table} error:`, error);
      return fail("Unable to deactivate record", 500);
    }
  };
}

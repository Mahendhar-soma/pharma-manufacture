import { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, getSearchParams, ok, paginate } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { page, limit, offset, search, status } = getSearchParams(request);
    const where: string[] = ["1=1"];
    const params: unknown[] = [];
    if (search) {
      where.push("(warehouse_code LIKE ? OR warehouse_name LIKE ? OR location LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("status = ?");
      params.push(status);
    }
    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM warehouses WHERE ${whereSql}`,
      params,
    );
    const rows = await query<RowDataPacket[]>(
      `SELECT * FROM warehouses WHERE ${whereSql} ORDER BY id DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );
    return ok({
      items: rows,
      pagination: paginate(Number(countRows[0]?.total || 0), page, limit),
    });
  } catch (error) {
    console.error(error);
    return fail("Unable to load warehouses", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const warehouse_code = String(body.warehouse_code || "").trim();
    const warehouse_name = String(body.warehouse_name || "").trim();
    const warehouse_type = String(body.warehouse_type || "").trim();
    if (!warehouse_code || !warehouse_name || !warehouse_type) {
      return fail("warehouse_code, warehouse_name and warehouse_type are required", 400);
    }
    const result = await execute(
      `INSERT INTO warehouses (warehouse_code, warehouse_name, location, warehouse_type, status)
       VALUES (?, ?, ?, ?, ?)`,
      [
        warehouse_code,
        warehouse_name,
        body.location || null,
        warehouse_type,
        body.status || "ACTIVE",
      ],
    );
    const rows = await query<RowDataPacket[]>("SELECT * FROM warehouses WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "Warehouse created successfully", 201);
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === "ER_DUP_ENTRY") return fail("Warehouse code already exists", 409);
    console.error(error);
    return fail("Unable to create warehouse", 500);
  }
}

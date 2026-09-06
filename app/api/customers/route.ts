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
      where.push("(customer_code LIKE ? OR customer_name LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("status = ?");
      params.push(status);
    }
    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM customers WHERE ${whereSql}`,
      params,
    );
    const rows = await query<RowDataPacket[]>(
      `SELECT * FROM customers WHERE ${whereSql} ORDER BY id DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );
    return ok({
      items: rows,
      pagination: paginate(Number(countRows[0]?.total || 0), page, limit),
    });
  } catch (error) {
    console.error(error);
    return fail("Unable to load customers", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const customer_code = String(body.customer_code || "").trim();
    const customer_name = String(body.customer_name || "").trim();
    if (!customer_code || !customer_name) {
      return fail("customer_code and customer_name are required", 400);
    }
    const result = await execute(
      `INSERT INTO customers (customer_code, customer_name, phone, email, address, gst_number, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        customer_code,
        customer_name,
        body.phone || null,
        body.email || null,
        body.address || null,
        body.gst_number || null,
        body.status || "ACTIVE",
      ],
    );
    const rows = await query<RowDataPacket[]>("SELECT * FROM customers WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "Customer created successfully", 201);
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === "ER_DUP_ENTRY") return fail("Customer code already exists", 409);
    console.error(error);
    return fail("Unable to create customer", 500);
  }
}

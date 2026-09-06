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
      where.push("(supplier_code LIKE ? OR supplier_name LIKE ? OR email LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("status = ?");
      params.push(status);
    }
    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM suppliers WHERE ${whereSql}`,
      params,
    );
    const rows = await query<RowDataPacket[]>(
      `SELECT * FROM suppliers WHERE ${whereSql} ORDER BY id DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );
    return ok({
      items: rows,
      pagination: paginate(Number(countRows[0]?.total || 0), page, limit),
    });
  } catch (error) {
    console.error(error);
    return fail("Unable to load suppliers", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supplier_code = String(body.supplier_code || "").trim();
    const supplier_name = String(body.supplier_name || "").trim();
    if (!supplier_code || !supplier_name) {
      return fail("supplier_code and supplier_name are required", 400);
    }
    const result = await execute(
      `INSERT INTO suppliers
      (supplier_code, supplier_name, contact_person, phone, email, address, gst_number, license_number, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        supplier_code,
        supplier_name,
        body.contact_person || null,
        body.phone || null,
        body.email || null,
        body.address || null,
        body.gst_number || null,
        body.license_number || null,
        body.status || "ACTIVE",
      ],
    );
    const rows = await query<RowDataPacket[]>("SELECT * FROM suppliers WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "Supplier created successfully", 201);
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === "ER_DUP_ENTRY") return fail("Supplier code already exists", 409);
    console.error(error);
    return fail("Unable to create supplier", 500);
  }
}

import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, getSearchParams, ok, paginate } from "@/lib/api";
import { nextCode } from "@/lib/codes";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { page, limit, offset, search, status, sortDir } = getSearchParams(request);
    const where: string[] = ["1=1"];
    const params: unknown[] = [];

    if (search) {
      where.push(`(license_number LIKE ? OR license_type LIKE ? OR issued_by LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("status = ?");
      params.push(status);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM licenses WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT * FROM licenses WHERE ${whereSql}
       ORDER BY id ${sortDir}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({ items: rows, pagination: paginate(total, page, limit) });
  } catch (error) {
    console.error("Licenses list error:", error);
    return fail("Unable to load licenses", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const license_type = String(body.license_type || "").trim();
    if (!license_type) return fail("license_type is required");

    const license_number =
      String(body.license_number || "").trim() ||
      (await nextCode("licenses", "license_number", "LIC"));

    const result = await execute(
      `INSERT INTO licenses
        (license_number, license_type, issued_by, issue_date, expiry_date, status, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        license_number,
        license_type,
        body.issued_by || null,
        body.issue_date || null,
        body.expiry_date || null,
        body.status || "ACTIVE",
        body.remarks || null,
      ],
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM licenses WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "License created", 201);
  } catch (error) {
    console.error("License create error:", error);
    return fail("Unable to create license", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return fail("id is required");
    const result = await execute(
      `UPDATE licenses SET
        license_type = COALESCE(?, license_type),
        issued_by = COALESCE(?, issued_by),
        issue_date = COALESCE(?, issue_date),
        expiry_date = COALESCE(?, expiry_date),
        status = COALESCE(?, status),
        remarks = COALESCE(?, remarks)
       WHERE id = ?`,
      [
        body.license_type ?? null,
        body.issued_by ?? null,
        body.issue_date ?? null,
        body.expiry_date ?? null,
        body.status ?? null,
        body.remarks ?? null,
        body.id,
      ],
    );
    if (result.affectedRows === 0) return fail("License not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM licenses WHERE id = ?", [body.id]);
    return ok(rows[0], "License updated");
  } catch (error) {
    console.error("License update error:", error);
    return fail("Unable to update license", 500);
  }
}

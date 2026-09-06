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
      where.push(
        `(pr.registration_number LIKE ? OR pr.country LIKE ? OR pr.authority LIKE ? OR p.product_name LIKE ?)`,
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("pr.status = ?");
      params.push(status);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM product_registrations pr
       JOIN products p ON p.id = pr.product_id
       WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT pr.*, p.product_name, p.product_code
       FROM product_registrations pr
       JOIN products p ON p.id = pr.product_id
       WHERE ${whereSql}
       ORDER BY pr.id ${sortDir}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({ items: rows, pagination: paginate(total, page, limit) });
  } catch (error) {
    console.error("Registrations list error:", error);
    return fail("Unable to load registrations", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.product_id || !body.country) {
      return fail("product_id and country are required");
    }

    const registration_number =
      String(body.registration_number || "").trim() ||
      (await nextCode("product_registrations", "registration_number", "REG"));

    const result = await execute(
      `INSERT INTO product_registrations
        (registration_number, product_id, country, authority, approval_date, expiry_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        registration_number,
        body.product_id,
        body.country,
        body.authority || null,
        body.approval_date || null,
        body.expiry_date || null,
        body.status || "ACTIVE",
      ],
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM product_registrations WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "Registration created", 201);
  } catch (error) {
    console.error("Registration create error:", error);
    return fail("Unable to create registration", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return fail("id is required");
    const result = await execute(
      `UPDATE product_registrations SET
        country = COALESCE(?, country),
        authority = COALESCE(?, authority),
        approval_date = COALESCE(?, approval_date),
        expiry_date = COALESCE(?, expiry_date),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [
        body.country ?? null,
        body.authority ?? null,
        body.approval_date ?? null,
        body.expiry_date ?? null,
        body.status ?? null,
        body.id,
      ],
    );
    if (result.affectedRows === 0) return fail("Registration not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM product_registrations WHERE id = ?", [
      body.id,
    ]);
    return ok(rows[0], "Registration updated");
  } catch (error) {
    console.error("Registration update error:", error);
    return fail("Unable to update registration", 500);
  }
}

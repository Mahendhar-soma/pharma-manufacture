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
      where.push(`(hospital_code LIKE ? OR hospital_name LIKE ? OR city LIKE ? OR phone LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("status = ?");
      params.push(status);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM hospitals WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT h.*,
        (SELECT COUNT(*) FROM doctors d WHERE d.hospital_id = h.id AND d.status = 'ACTIVE') AS doctors_count
       FROM hospitals h
       WHERE ${whereSql}
       ORDER BY h.id ${sortDir}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({ items: rows, pagination: paginate(total, page, limit) });
  } catch (error) {
    console.error("Hospitals list error:", error);
    return fail("Unable to load hospitals", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const hospital_name = String(body.hospital_name || "").trim();
    if (!hospital_name) return fail("hospital_name is required");

    const hospital_code =
      String(body.hospital_code || "").trim() ||
      (await nextCode("hospitals", "hospital_code", "HSP"));

    const result = await execute(
      `INSERT INTO hospitals
        (hospital_code, hospital_name, phone, email, address, city, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        hospital_code,
        hospital_name,
        body.phone || null,
        body.email || null,
        body.address || null,
        body.city || null,
        body.status || "ACTIVE",
      ],
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM hospitals WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "Hospital created", 201);
  } catch (error) {
    console.error("Hospital create error:", error);
    return fail("Unable to create hospital", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return fail("id is required");
    const result = await execute(
      `UPDATE hospitals SET
        hospital_name = COALESCE(?, hospital_name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [
        body.hospital_name ?? null,
        body.phone ?? null,
        body.email ?? null,
        body.address ?? null,
        body.city ?? null,
        body.status ?? null,
        body.id,
      ],
    );
    if (result.affectedRows === 0) return fail("Hospital not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM hospitals WHERE id = ?", [body.id]);
    return ok(rows[0], "Hospital updated");
  } catch (error) {
    console.error("Hospital update error:", error);
    return fail("Unable to update hospital", 500);
  }
}

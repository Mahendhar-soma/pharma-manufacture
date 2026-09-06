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
        `(d.doctor_code LIKE ? OR d.doctor_name LIKE ? OR d.specialization LIKE ? OR d.city LIKE ? OR h.hospital_name LIKE ?)`,
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("d.status = ?");
      params.push(status);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM doctors d
       LEFT JOIN hospitals h ON h.id = d.hospital_id
       WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT d.*, h.hospital_name
       FROM doctors d
       LEFT JOIN hospitals h ON h.id = d.hospital_id
       WHERE ${whereSql}
       ORDER BY d.id ${sortDir}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({ items: rows, pagination: paginate(total, page, limit) });
  } catch (error) {
    console.error("Doctors list error:", error);
    return fail("Unable to load doctors", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const doctor_name = String(body.doctor_name || "").trim();
    if (!doctor_name) return fail("doctor_name is required");

    const doctor_code =
      String(body.doctor_code || "").trim() || (await nextCode("doctors", "doctor_code", "DOC"));

    const result = await execute(
      `INSERT INTO doctors
        (doctor_code, doctor_name, specialization, phone, email, hospital_id, city, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        doctor_code,
        doctor_name,
        body.specialization || null,
        body.phone || null,
        body.email || null,
        body.hospital_id || null,
        body.city || null,
        body.status || "ACTIVE",
      ],
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM doctors WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "Doctor created", 201);
  } catch (error) {
    console.error("Doctor create error:", error);
    return fail("Unable to create doctor", 500);
  }
}

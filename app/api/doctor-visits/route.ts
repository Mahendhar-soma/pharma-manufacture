import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, getSearchParams, ok, paginate } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { page, limit, offset, search, status, sortDir, searchParams } = getSearchParams(request);
    const where: string[] = ["1=1"];
    const params: unknown[] = [];

    if (search) {
      where.push(
        `(d.doctor_name LIKE ? OR mr.mr_name LIKE ? OR dv.purpose LIKE ? OR dv.notes LIKE ?)`,
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("dv.status = ?");
      params.push(status);
    }
    const doctorId = searchParams.get("doctor_id");
    if (doctorId) {
      where.push("dv.doctor_id = ?");
      params.push(doctorId);
    }
    const mrId = searchParams.get("mr_id");
    if (mrId) {
      where.push("dv.medical_representative_id = ?");
      params.push(mrId);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM doctor_visits dv
       JOIN doctors d ON d.id = dv.doctor_id
       JOIN medical_representatives mr ON mr.id = dv.medical_representative_id
       WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT dv.*, d.doctor_name, d.doctor_code, mr.mr_name, mr.mr_code
       FROM doctor_visits dv
       JOIN doctors d ON d.id = dv.doctor_id
       JOIN medical_representatives mr ON mr.id = dv.medical_representative_id
       WHERE ${whereSql}
       ORDER BY dv.id ${sortDir}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({ items: rows, pagination: paginate(total, page, limit) });
  } catch (error) {
    console.error("Doctor visits list error:", error);
    return fail("Unable to load doctor visits", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.doctor_id || !body.medical_representative_id || !body.visit_date) {
      return fail("doctor_id, medical_representative_id and visit_date are required");
    }

    const result = await execute(
      `INSERT INTO doctor_visits
        (doctor_id, medical_representative_id, visit_date, purpose, notes, follow_up_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        body.doctor_id,
        body.medical_representative_id,
        body.visit_date,
        body.purpose || null,
        body.notes || null,
        body.follow_up_date || null,
        body.status || "PLANNED",
      ],
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM doctor_visits WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "Visit created", 201);
  } catch (error) {
    console.error("Doctor visit create error:", error);
    return fail("Unable to create visit", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return fail("id is required");
    const result = await execute(
      `UPDATE doctor_visits SET
        visit_date = COALESCE(?, visit_date),
        purpose = COALESCE(?, purpose),
        notes = COALESCE(?, notes),
        follow_up_date = COALESCE(?, follow_up_date),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [
        body.visit_date ?? null,
        body.purpose ?? null,
        body.notes ?? null,
        body.follow_up_date ?? null,
        body.status ?? null,
        body.id,
      ],
    );
    if (result.affectedRows === 0) return fail("Visit not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM doctor_visits WHERE id = ?", [body.id]);
    return ok(rows[0], "Visit updated");
  } catch (error) {
    console.error("Doctor visit update error:", error);
    return fail("Unable to update visit", 500);
  }
}

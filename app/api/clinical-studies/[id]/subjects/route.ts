import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { nextCode } from "@/lib/codes";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const rows = await query<RowDataPacket[]>(
      `SELECT sub.*, sit.site_name
       FROM clinical_subjects sub
       LEFT JOIN clinical_sites sit ON sit.id = sub.site_id
       WHERE sub.study_id = ?
       ORDER BY sub.id DESC`,
      [id],
    );
    return ok({ items: rows });
  } catch (error) {
    console.error("Clinical subjects list error:", error);
    return fail("Unable to load clinical subjects", 500);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const subject_code =
      String(body.subject_code || "").trim() ||
      (await nextCode("clinical_subjects", "subject_code", "SUB"));

    const result = await execute(
      `INSERT INTO clinical_subjects
        (study_id, subject_code, site_id, enrollment_date, status)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        subject_code,
        body.site_id || null,
        body.enrollment_date || null,
        body.status || "SCREENING",
      ],
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM clinical_subjects WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "Subject enrolled", 201);
  } catch (error) {
    console.error("Clinical subject create error:", error);
    return fail("Unable to enroll subject", 500);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await context.params;
    const body = await request.json();
    if (!body.id) return fail("subject id is required");
    const result = await execute(
      `UPDATE clinical_subjects SET
        site_id = COALESCE(?, site_id),
        enrollment_date = COALESCE(?, enrollment_date),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [body.site_id ?? null, body.enrollment_date ?? null, body.status ?? null, body.id],
    );
    if (result.affectedRows === 0) return fail("Subject not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM clinical_subjects WHERE id = ?", [
      body.id,
    ]);
    return ok(rows[0], "Subject updated");
  } catch (error) {
    console.error("Clinical subject update error:", error);
    return fail("Unable to update subject", 500);
  }
}

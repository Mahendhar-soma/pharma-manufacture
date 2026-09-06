import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, getSearchParams, ok, paginate } from "@/lib/api";
import { nextCode } from "@/lib/codes";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { page, limit, offset, search, status, sortDir, searchParams } = getSearchParams(request);
    const where: string[] = ["1=1"];
    const params: unknown[] = [];

    if (search) {
      where.push(`(study_code LIKE ? OR study_title LIKE ? OR sponsor LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("status = ?");
      params.push(status);
    }
    const phase = searchParams.get("phase");
    if (phase) {
      where.push("phase = ?");
      params.push(phase);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM clinical_studies WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT cs.*,
        (SELECT COUNT(*) FROM clinical_sites sit WHERE sit.study_id = cs.id) AS sites_count,
        (SELECT COUNT(*) FROM clinical_subjects sub WHERE sub.study_id = cs.id) AS subjects_count
       FROM clinical_studies cs
       WHERE ${whereSql}
       ORDER BY cs.id ${sortDir}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({ items: rows, pagination: paginate(total, page, limit) });
  } catch (error) {
    console.error("Clinical studies list error:", error);
    return fail("Unable to load clinical studies", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const study_title = String(body.study_title || "").trim();
    const phase = body.phase;
    if (!study_title || !phase) return fail("study_title and phase are required");

    const study_code =
      String(body.study_code || "").trim() ||
      (await nextCode("clinical_studies", "study_code", "CLS"));

    const result = await execute(
      `INSERT INTO clinical_studies
        (study_code, study_title, phase, sponsor, start_date, end_date, status, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        study_code,
        study_title,
        phase,
        body.sponsor || null,
        body.start_date || null,
        body.end_date || null,
        body.status || "PLANNED",
        body.description || null,
      ],
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM clinical_studies WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "Clinical study created", 201);
  } catch (error) {
    console.error("Clinical study create error:", error);
    return fail("Unable to create clinical study", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return fail("id is required");
    const result = await execute(
      `UPDATE clinical_studies SET
        study_title = COALESCE(?, study_title),
        phase = COALESCE(?, phase),
        sponsor = COALESCE(?, sponsor),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        status = COALESCE(?, status),
        description = COALESCE(?, description)
       WHERE id = ?`,
      [
        body.study_title ?? null,
        body.phase ?? null,
        body.sponsor ?? null,
        body.start_date ?? null,
        body.end_date ?? null,
        body.status ?? null,
        body.description ?? null,
        body.id,
      ],
    );
    if (result.affectedRows === 0) return fail("Study not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM clinical_studies WHERE id = ?", [
      body.id,
    ]);
    return ok(rows[0], "Clinical study updated");
  } catch (error) {
    console.error("Clinical study update error:", error);
    return fail("Unable to update clinical study", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const id = body.id || new URL(request.url).searchParams.get("id");
    if (!id) return fail("id is required");
    const result = await execute(`UPDATE clinical_studies SET status = 'CANCELLED' WHERE id = ?`, [
      id,
    ]);
    if (result.affectedRows === 0) return fail("Study not found", 404);
    return ok(null, "Clinical study cancelled");
  } catch (error) {
    console.error("Clinical study cancel error:", error);
    return fail("Unable to cancel clinical study", 500);
  }
}

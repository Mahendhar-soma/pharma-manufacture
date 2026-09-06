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
      where.push(
        `(ps.study_code LIKE ? OR ps.study_title LIKE ? OR ps.researcher LIKE ? OR c.compound_code LIKE ?)`,
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("ps.status = ?");
      params.push(status);
    }
    const studyType = searchParams.get("study_type");
    if (studyType) {
      where.push("ps.study_type = ?");
      params.push(studyType);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM preclinical_studies ps
       LEFT JOIN compounds c ON c.id = ps.compound_id
       WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT ps.*, c.compound_code, c.compound_name
       FROM preclinical_studies ps
       LEFT JOIN compounds c ON c.id = ps.compound_id
       WHERE ${whereSql}
       ORDER BY ps.id ${sortDir}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({ items: rows, pagination: paginate(total, page, limit) });
  } catch (error) {
    console.error("Preclinical studies list error:", error);
    return fail("Unable to load preclinical studies", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const study_title = String(body.study_title || "").trim();
    const study_type = body.study_type;
    if (!study_title || !study_type) return fail("study_title and study_type are required");

    const study_code =
      String(body.study_code || "").trim() ||
      (await nextCode("preclinical_studies", "study_code", "PCS"));

    const result = await execute(
      `INSERT INTO preclinical_studies
        (study_code, study_title, study_type, compound_id, study_date, researcher, result, remarks, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        study_code,
        study_title,
        study_type,
        body.compound_id || null,
        body.study_date || null,
        body.researcher || null,
        body.result || null,
        body.remarks || null,
        body.status || "PLANNED",
      ],
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM preclinical_studies WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "Preclinical study created", 201);
  } catch (error) {
    console.error("Preclinical study create error:", error);
    return fail("Unable to create preclinical study", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return fail("id is required");
    const result = await execute(
      `UPDATE preclinical_studies SET
        study_title = COALESCE(?, study_title),
        study_type = COALESCE(?, study_type),
        compound_id = COALESCE(?, compound_id),
        study_date = COALESCE(?, study_date),
        researcher = COALESCE(?, researcher),
        result = COALESCE(?, result),
        remarks = COALESCE(?, remarks),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [
        body.study_title ?? null,
        body.study_type ?? null,
        body.compound_id ?? null,
        body.study_date ?? null,
        body.researcher ?? null,
        body.result ?? null,
        body.remarks ?? null,
        body.status ?? null,
        body.id,
      ],
    );
    if (result.affectedRows === 0) return fail("Study not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM preclinical_studies WHERE id = ?", [
      body.id,
    ]);
    return ok(rows[0], "Preclinical study updated");
  } catch (error) {
    console.error("Preclinical study update error:", error);
    return fail("Unable to update preclinical study", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const id = body.id || new URL(request.url).searchParams.get("id");
    if (!id) return fail("id is required");
    const result = await execute(
      `UPDATE preclinical_studies SET status = 'CANCELLED' WHERE id = ?`,
      [id],
    );
    if (result.affectedRows === 0) return fail("Study not found", 404);
    return ok(null, "Preclinical study cancelled");
  } catch (error) {
    console.error("Preclinical study cancel error:", error);
    return fail("Unable to cancel preclinical study", 500);
  }
}

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
        `(rs.submission_number LIKE ? OR rs.title LIKE ? OR rs.authority LIKE ? OR p.product_name LIKE ?)`,
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("rs.status = ?");
      params.push(status);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM regulatory_submissions rs
       LEFT JOIN products p ON p.id = rs.product_id
       WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT rs.*, p.product_name, p.product_code
       FROM regulatory_submissions rs
       LEFT JOIN products p ON p.id = rs.product_id
       WHERE ${whereSql}
       ORDER BY rs.id ${sortDir}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({ items: rows, pagination: paginate(total, page, limit) });
  } catch (error) {
    console.error("Submissions list error:", error);
    return fail("Unable to load submissions", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = String(body.title || "").trim();
    if (!title) return fail("title is required");

    const submission_number =
      String(body.submission_number || "").trim() ||
      (await nextCode("regulatory_submissions", "submission_number", "SUBM"));

    const result = await execute(
      `INSERT INTO regulatory_submissions
        (submission_number, title, authority, submission_type, product_id, submission_date, status, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        submission_number,
        title,
        body.authority || null,
        body.submission_type || null,
        body.product_id || null,
        body.submission_date || null,
        body.status || "DRAFT",
        body.remarks || null,
      ],
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM regulatory_submissions WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "Submission created", 201);
  } catch (error) {
    console.error("Submission create error:", error);
    return fail("Unable to create submission", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return fail("id is required");
    const result = await execute(
      `UPDATE regulatory_submissions SET
        title = COALESCE(?, title),
        authority = COALESCE(?, authority),
        submission_type = COALESCE(?, submission_type),
        product_id = COALESCE(?, product_id),
        submission_date = COALESCE(?, submission_date),
        status = COALESCE(?, status),
        remarks = COALESCE(?, remarks)
       WHERE id = ?`,
      [
        body.title ?? null,
        body.authority ?? null,
        body.submission_type ?? null,
        body.product_id ?? null,
        body.submission_date ?? null,
        body.status ?? null,
        body.remarks ?? null,
        body.id,
      ],
    );
    if (result.affectedRows === 0) return fail("Submission not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM regulatory_submissions WHERE id = ?", [
      body.id,
    ]);
    return ok(rows[0], "Submission updated");
  } catch (error) {
    console.error("Submission update error:", error);
    return fail("Unable to update submission", 500);
  }
}

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
      where.push(`(sop_number LIKE ? OR title LIKE ? OR department LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("status = ?");
      params.push(status);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM sops WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT s.*, u.name AS created_by_name
       FROM sops s
       LEFT JOIN users u ON u.id = s.created_by
       WHERE ${whereSql}
       ORDER BY s.id ${sortDir}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({ items: rows, pagination: paginate(total, page, limit) });
  } catch (error) {
    console.error("SOPs list error:", error);
    return fail("Unable to load SOPs", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = String(body.title || "").trim();
    if (!title) return fail("title is required");

    const sop_number =
      String(body.sop_number || "").trim() || (await nextCode("sops", "sop_number", "SOP"));

    const result = await execute(
      `INSERT INTO sops
        (sop_number, title, version, department, effective_date, review_date, status, description, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sop_number,
        title,
        body.version || "1.0",
        body.department || null,
        body.effective_date || null,
        body.review_date || null,
        body.status || "DRAFT",
        body.description || null,
        body.created_by || null,
      ],
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM sops WHERE id = ?", [result.insertId]);
    return ok(rows[0], "SOP created", 201);
  } catch (error) {
    console.error("SOP create error:", error);
    return fail("Unable to create SOP", 500);
  }
}

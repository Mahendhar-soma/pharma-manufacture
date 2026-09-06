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
      where.push(`(d.deviation_number LIKE ? OR d.title LIKE ? OR d.department LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("d.status = ?");
      params.push(status);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM deviations d WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT d.*, u.name AS reported_by_name
       FROM deviations d
       LEFT JOIN users u ON u.id = d.reported_by
       WHERE ${whereSql}
       ORDER BY d.id ${sortDir}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({ items: rows, pagination: paginate(total, page, limit) });
  } catch (error) {
    console.error("Deviations list error:", error);
    return fail("Unable to load deviations", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = String(body.title || "").trim();
    const reported_date = body.reported_date;
    if (!title || !reported_date) return fail("title and reported_date are required");

    const deviation_number =
      String(body.deviation_number || "").trim() ||
      (await nextCode("deviations", "deviation_number", "DEV"));

    const result = await execute(
      `INSERT INTO deviations
        (deviation_number, title, description, department, severity, reported_date, reported_by, root_cause, corrective_action, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        deviation_number,
        title,
        body.description || null,
        body.department || null,
        body.severity || "MEDIUM",
        reported_date,
        body.reported_by || null,
        body.root_cause || null,
        body.corrective_action || null,
        body.status || "OPEN",
      ],
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM deviations WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "Deviation created", 201);
  } catch (error) {
    console.error("Deviation create error:", error);
    return fail("Unable to create deviation", 500);
  }
}

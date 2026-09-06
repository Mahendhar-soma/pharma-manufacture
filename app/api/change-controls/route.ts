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
      where.push(`(cc.change_number LIKE ? OR cc.title LIKE ? OR cc.reason LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("cc.status = ?");
      params.push(status);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM change_controls cc WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT cc.*, u.name AS requested_by_name
       FROM change_controls cc
       LEFT JOIN users u ON u.id = cc.requested_by
       WHERE ${whereSql}
       ORDER BY cc.id ${sortDir}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({ items: rows, pagination: paginate(total, page, limit) });
  } catch (error) {
    console.error("Change controls list error:", error);
    return fail("Unable to load change controls", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = String(body.title || "").trim();
    if (!title) return fail("title is required");

    const change_number =
      String(body.change_number || "").trim() ||
      (await nextCode("change_controls", "change_number", "CC"));

    const result = await execute(
      `INSERT INTO change_controls
        (change_number, title, description, reason, impact, requested_by, approval_status, implementation_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        change_number,
        title,
        body.description || null,
        body.reason || null,
        body.impact || null,
        body.requested_by || null,
        body.approval_status || "PENDING",
        body.implementation_date || null,
        body.status || "DRAFT",
      ],
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM change_controls WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "Change control created", 201);
  } catch (error) {
    console.error("Change control create error:", error);
    return fail("Unable to create change control", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return fail("id is required");
    const result = await execute(
      `UPDATE change_controls SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        reason = COALESCE(?, reason),
        impact = COALESCE(?, impact),
        approval_status = COALESCE(?, approval_status),
        implementation_date = COALESCE(?, implementation_date),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [
        body.title ?? null,
        body.description ?? null,
        body.reason ?? null,
        body.impact ?? null,
        body.approval_status ?? null,
        body.implementation_date ?? null,
        body.status ?? null,
        body.id,
      ],
    );
    if (result.affectedRows === 0) return fail("Change control not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM change_controls WHERE id = ?", [
      body.id,
    ]);
    return ok(rows[0], "Change control updated");
  } catch (error) {
    console.error("Change control update error:", error);
    return fail("Unable to update change control", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const id = body.id || new URL(request.url).searchParams.get("id");
    if (!id) return fail("id is required");
    const result = await execute(`UPDATE change_controls SET status = 'CANCELLED' WHERE id = ?`, [id]);
    if (result.affectedRows === 0) return fail("Change control not found", 404);
    return ok(null, "Change control cancelled");
  } catch (error) {
    console.error("Change control cancel error:", error);
    return fail("Unable to cancel change control", 500);
  }
}

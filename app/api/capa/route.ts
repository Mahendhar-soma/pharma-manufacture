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
        `(c.capa_number LIKE ? OR c.description LIKE ? OR c.responsible_person LIKE ? OR d.deviation_number LIKE ?)`,
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("c.status = ?");
      params.push(status);
    }
    const deviationId = searchParams.get("deviation_id");
    if (deviationId) {
      where.push("c.deviation_id = ?");
      params.push(deviationId);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM capa c
       LEFT JOIN deviations d ON d.id = c.deviation_id
       WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT c.*, d.deviation_number
       FROM capa c
       LEFT JOIN deviations d ON d.id = c.deviation_id
       WHERE ${whereSql}
       ORDER BY c.id ${sortDir}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({ items: rows, pagination: paginate(total, page, limit) });
  } catch (error) {
    console.error("CAPA list error:", error);
    return fail("Unable to load CAPA records", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const description = String(body.description || "").trim();
    if (!description) return fail("description is required");

    const capa_number =
      String(body.capa_number || "").trim() || (await nextCode("capa", "capa_number", "CAPA"));

    const result = await execute(
      `INSERT INTO capa
        (capa_number, deviation_id, type, description, root_cause, corrective_action, preventive_action, responsible_person, due_date, completion_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        capa_number,
        body.deviation_id || null,
        body.type || "CORRECTIVE",
        description,
        body.root_cause || null,
        body.corrective_action || null,
        body.preventive_action || null,
        body.responsible_person || null,
        body.due_date || null,
        body.completion_date || null,
        body.status || "OPEN",
      ],
    );

    if (body.deviation_id) {
      await execute(`UPDATE deviations SET status = 'CAPA' WHERE id = ? AND status IN ('OPEN','INVESTIGATION')`, [
        body.deviation_id,
      ]);
    }

    const rows = await query<RowDataPacket[]>("SELECT * FROM capa WHERE id = ?", [result.insertId]);
    return ok(rows[0], "CAPA created", 201);
  } catch (error) {
    console.error("CAPA create error:", error);
    return fail("Unable to create CAPA", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return fail("id is required");
    const result = await execute(
      `UPDATE capa SET
        type = COALESCE(?, type),
        description = COALESCE(?, description),
        root_cause = COALESCE(?, root_cause),
        corrective_action = COALESCE(?, corrective_action),
        preventive_action = COALESCE(?, preventive_action),
        responsible_person = COALESCE(?, responsible_person),
        due_date = COALESCE(?, due_date),
        completion_date = COALESCE(?, completion_date),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [
        body.type ?? null,
        body.description ?? null,
        body.root_cause ?? null,
        body.corrective_action ?? null,
        body.preventive_action ?? null,
        body.responsible_person ?? null,
        body.due_date ?? null,
        body.completion_date ?? null,
        body.status ?? null,
        body.id,
      ],
    );
    if (result.affectedRows === 0) return fail("CAPA not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM capa WHERE id = ?", [body.id]);
    return ok(rows[0], "CAPA updated");
  } catch (error) {
    console.error("CAPA update error:", error);
    return fail("Unable to update CAPA", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const id = body.id || new URL(request.url).searchParams.get("id");
    if (!id) return fail("id is required");
    const result = await execute(`UPDATE capa SET status = 'CANCELLED' WHERE id = ?`, [id]);
    if (result.affectedRows === 0) return fail("CAPA not found", 404);
    return ok(null, "CAPA cancelled");
  } catch (error) {
    console.error("CAPA cancel error:", error);
    return fail("Unable to cancel CAPA", 500);
  }
}

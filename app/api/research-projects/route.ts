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
      where.push(`(project_code LIKE ? OR project_name LIKE ? OR description LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("status = ?");
      params.push(status);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM research_projects WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT rp.*, u.name AS created_by_name,
        (SELECT COUNT(*) FROM research_experiments re WHERE re.project_id = rp.id) AS experiment_count
       FROM research_projects rp
       LEFT JOIN users u ON u.id = rp.created_by
       WHERE ${whereSql}
       ORDER BY rp.id ${sortDir}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({ items: rows, pagination: paginate(total, page, limit) });
  } catch (error) {
    console.error("Research projects list error:", error);
    return fail("Unable to load research projects", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const project_name = String(body.project_name || "").trim();
    if (!project_name) return fail("project_name is required");

    const project_code =
      String(body.project_code || "").trim() ||
      (await nextCode("research_projects", "project_code", "RP"));

    const result = await execute(
      `INSERT INTO research_projects
        (project_code, project_name, description, start_date, end_date, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        project_code,
        project_name,
        body.description || null,
        body.start_date || null,
        body.end_date || null,
        body.status || "PLANNED",
        body.created_by || null,
      ],
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM research_projects WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "Research project created", 201);
  } catch (error) {
    console.error("Research project create error:", error);
    return fail("Unable to create research project", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return fail("id is required");

    const allowed = ["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];
    const status = body.status != null ? String(body.status).trim() : null;
    if (status && !allowed.includes(status)) {
      return fail(`Invalid status. Use ${allowed.join(", ")}`);
    }

    // Quick status-only update
    if (status && body.project_name === undefined && body.description === undefined) {
      const result = await execute(`UPDATE research_projects SET status = ? WHERE id = ?`, [
        status,
        body.id,
      ]);
      if (result.affectedRows === 0) return fail("Project not found", 404);
      const rows = await query<RowDataPacket[]>("SELECT * FROM research_projects WHERE id = ?", [
        body.id,
      ]);
      return ok(rows[0], "Project status updated");
    }

    const project_name = String(body.project_name || "").trim();
    if (!project_name) return fail("project_name is required");
    if (!status) return fail("status is required");

    const result = await execute(
      `UPDATE research_projects SET
        project_name = ?,
        description = ?,
        start_date = ?,
        end_date = ?,
        status = ?
       WHERE id = ?`,
      [
        project_name,
        body.description ? String(body.description).trim() : null,
        body.start_date || null,
        body.end_date || null,
        status,
        body.id,
      ],
    );
    if (result.affectedRows === 0) return fail("Project not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM research_projects WHERE id = ?", [
      body.id,
    ]);
    return ok(rows[0], "Research project updated");
  } catch (error) {
    console.error("Research project update error:", error);
    return fail("Unable to update research project", 500);
  }
}

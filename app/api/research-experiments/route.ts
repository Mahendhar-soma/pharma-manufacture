import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, getSearchParams, ok, paginate } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { page, limit, offset, search, sortDir, searchParams } = getSearchParams(request);
    const where: string[] = ["1=1"];
    const params: unknown[] = [];

    if (search) {
      where.push(
        `(re.experiment_name LIKE ? OR re.result LIKE ? OR rp.project_code LIKE ? OR c.compound_code LIKE ?)`,
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    const projectId = searchParams.get("project_id");
    if (projectId) {
      where.push("re.project_id = ?");
      params.push(projectId);
    }
    const compoundId = searchParams.get("compound_id");
    if (compoundId) {
      where.push("re.compound_id = ?");
      params.push(compoundId);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM research_experiments re
       JOIN research_projects rp ON rp.id = re.project_id
       LEFT JOIN compounds c ON c.id = re.compound_id
       WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT re.*, rp.project_code, rp.project_name, c.compound_code, c.compound_name, u.name AS created_by_name
       FROM research_experiments re
       JOIN research_projects rp ON rp.id = re.project_id
       LEFT JOIN compounds c ON c.id = re.compound_id
       LEFT JOIN users u ON u.id = re.created_by
       WHERE ${whereSql}
       ORDER BY re.id ${sortDir}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({ items: rows, pagination: paginate(total, page, limit) });
  } catch (error) {
    console.error("Research experiments list error:", error);
    return fail("Unable to load research experiments", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.project_id || !body.experiment_name) {
      return fail("project_id and experiment_name are required");
    }

    const result = await execute(
      `INSERT INTO research_experiments
        (project_id, compound_id, experiment_name, experiment_date, result, remarks, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        body.project_id,
        body.compound_id || null,
        body.experiment_name,
        body.experiment_date || null,
        body.result || null,
        body.remarks || null,
        body.created_by || null,
      ],
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM research_experiments WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "Experiment created", 201);
  } catch (error) {
    console.error("Research experiment create error:", error);
    return fail("Unable to create experiment", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return fail("id is required");
    if (!body.project_id || !body.experiment_name) {
      return fail("project_id and experiment_name are required");
    }

    const result = await execute(
      `UPDATE research_experiments SET
        project_id = ?,
        compound_id = ?,
        experiment_name = ?,
        experiment_date = ?,
        result = ?,
        remarks = ?
       WHERE id = ?`,
      [
        Number(body.project_id),
        body.compound_id ? Number(body.compound_id) : null,
        String(body.experiment_name).trim(),
        body.experiment_date || null,
        body.result ? String(body.result).trim() : null,
        body.remarks ? String(body.remarks).trim() : null,
        body.id,
      ],
    );
    if (result.affectedRows === 0) return fail("Experiment not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM research_experiments WHERE id = ?", [
      body.id,
    ]);
    return ok(rows[0], "Experiment updated");
  } catch (error) {
    console.error("Research experiment update error:", error);
    return fail("Unable to update experiment", 500);
  }
}

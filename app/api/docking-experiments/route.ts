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
        `(de.target_name LIKE ? OR de.software_name LIKE ? OR c.compound_code LIKE ? OR c.compound_name LIKE ?)`,
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    const compoundId = searchParams.get("compound_id");
    if (compoundId) {
      where.push("de.compound_id = ?");
      params.push(compoundId);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM docking_experiments de
       JOIN compounds c ON c.id = de.compound_id
       WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT de.*, c.compound_code, c.compound_name
       FROM docking_experiments de
       JOIN compounds c ON c.id = de.compound_id
       WHERE ${whereSql}
       ORDER BY de.id ${sortDir}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({ items: rows, pagination: paginate(total, page, limit) });
  } catch (error) {
    console.error("Docking experiments list error:", error);
    return fail("Unable to load docking experiments", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.compound_id || !body.target_name) {
      return fail("compound_id and target_name are required");
    }

    const result = await execute(
      `INSERT INTO docking_experiments
        (compound_id, target_name, software_name, binding_score, experiment_date, result, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        body.compound_id,
        body.target_name,
        body.software_name || null,
        body.binding_score ?? null,
        body.experiment_date || null,
        body.result || null,
        body.remarks || null,
      ],
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM docking_experiments WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "Docking experiment created", 201);
  } catch (error) {
    console.error("Docking experiment create error:", error);
    return fail("Unable to create docking experiment", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return fail("id is required");
    if (!body.compound_id || !body.target_name) {
      return fail("compound_id and target_name are required");
    }

    const result = await execute(
      `UPDATE docking_experiments SET
        compound_id = ?,
        target_name = ?,
        software_name = ?,
        binding_score = ?,
        experiment_date = ?,
        result = ?,
        remarks = ?
       WHERE id = ?`,
      [
        Number(body.compound_id),
        String(body.target_name).trim(),
        body.software_name ? String(body.software_name).trim() : null,
        body.binding_score != null && body.binding_score !== ""
          ? Number(body.binding_score)
          : null,
        body.experiment_date || null,
        body.result ? String(body.result).trim() : null,
        body.remarks ? String(body.remarks).trim() : null,
        body.id,
      ],
    );
    if (result.affectedRows === 0) return fail("Docking experiment not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM docking_experiments WHERE id = ?", [
      body.id,
    ]);
    return ok(rows[0], "Docking experiment updated");
  } catch (error) {
    console.error("Docking experiment update error:", error);
    return fail("Unable to update docking experiment", 500);
  }
}

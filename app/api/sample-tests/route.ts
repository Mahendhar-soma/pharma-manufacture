import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, getSearchParams, ok, paginate } from "@/lib/api";
import { refreshSampleStatusFromTests } from "@/lib/qc";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { page, limit, offset, search, status, sortDir, searchParams } = getSearchParams(request);
    const where: string[] = ["1=1"];
    const params: unknown[] = [];

    if (search) {
      where.push(`(st.test_name LIKE ? OR st.test_method LIKE ? OR s.sample_code LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("st.status = ?");
      params.push(status);
    }
    const sampleId = searchParams.get("sample_id");
    if (sampleId) {
      where.push("st.sample_id = ?");
      params.push(sampleId);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM sample_tests st
       JOIN samples s ON s.id = st.sample_id
       WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT st.*, s.sample_code, u.name AS assigned_name
       FROM sample_tests st
       JOIN samples s ON s.id = st.sample_id
       LEFT JOIN users u ON u.id = st.assigned_to
       WHERE ${whereSql}
       ORDER BY st.id ${sortDir}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({ items: rows, pagination: paginate(total, page, limit) });
  } catch (error) {
    console.error("Sample tests list error:", error);
    return fail("Unable to load sample tests", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.sample_id || !body.test_name) {
      return fail("sample_id and test_name are required");
    }

    const result = await execute(
      `INSERT INTO sample_tests
        (sample_id, test_name, test_method, assigned_to, test_date, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        body.sample_id,
        body.test_name,
        body.test_method || null,
        body.assigned_to || null,
        body.test_date || null,
        body.status || "PENDING",
      ],
    );

    await execute(`UPDATE samples SET status = 'IN_TESTING' WHERE id = ? AND status = 'RECEIVED'`, [
      body.sample_id,
    ]);

    const rows = await query<RowDataPacket[]>("SELECT * FROM sample_tests WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "Sample test created", 201);
  } catch (error) {
    console.error("Sample test create error:", error);
    return fail("Unable to create sample test", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return fail("id is required");

    const result = await execute(
      `UPDATE sample_tests SET
        test_name = COALESCE(?, test_name),
        test_method = COALESCE(?, test_method),
        assigned_to = COALESCE(?, assigned_to),
        test_date = COALESCE(?, test_date),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [
        body.test_name ?? null,
        body.test_method ?? null,
        body.assigned_to ?? null,
        body.test_date ?? null,
        body.status ?? null,
        body.id,
      ],
    );
    if (result.affectedRows === 0) return fail("Sample test not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM sample_tests WHERE id = ?", [body.id]);
    if (rows.length) {
      await refreshSampleStatusFromTests(Number(rows[0].sample_id));
    }
    return ok(rows[0], "Sample test updated");
  } catch (error) {
    console.error("Sample test update error:", error);
    return fail("Unable to update sample test", 500);
  }
}

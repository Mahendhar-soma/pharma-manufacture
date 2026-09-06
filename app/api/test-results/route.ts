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
      where.push(
        `(tr.parameter LIKE ? OR tr.result_value LIKE ? OR st.test_name LIKE ? OR s.sample_code LIKE ?)`,
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("tr.pass_fail = ?");
      params.push(status);
    }
    const sampleTestId = searchParams.get("sample_test_id");
    if (sampleTestId) {
      where.push("tr.sample_test_id = ?");
      params.push(sampleTestId);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM test_results tr
       JOIN sample_tests st ON st.id = tr.sample_test_id
       JOIN samples s ON s.id = st.sample_id
       WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT tr.*, st.test_name, s.sample_code
       FROM test_results tr
       JOIN sample_tests st ON st.id = tr.sample_test_id
       JOIN samples s ON s.id = st.sample_id
       WHERE ${whereSql}
       ORDER BY tr.id ${sortDir}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({ items: rows, pagination: paginate(total, page, limit) });
  } catch (error) {
    console.error("Test results list error:", error);
    return fail("Unable to load test results", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.sample_test_id || !body.parameter) {
      return fail("sample_test_id and parameter are required");
    }

    const result = await execute(
      `INSERT INTO test_results
        (sample_test_id, parameter, result_value, unit, specification, pass_fail, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        body.sample_test_id,
        body.parameter,
        body.result_value || null,
        body.unit || null,
        body.specification || null,
        body.pass_fail || "NA",
        body.remarks || null,
      ],
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM test_results WHERE id = ?", [
      result.insertId,
    ]);

    const testRows = await query<RowDataPacket[]>(
      `SELECT sample_id FROM sample_tests WHERE id = ? LIMIT 1`,
      [body.sample_test_id],
    );
    if (testRows.length) {
      // Mark owning test completed when a decisive result is entered
      if (body.pass_fail === "PASS" || body.pass_fail === "FAIL") {
        await execute(
          `UPDATE sample_tests SET status = 'COMPLETED', test_date = COALESCE(test_date, CURDATE())
           WHERE id = ? AND status <> 'CANCELLED'`,
          [body.sample_test_id],
        );
      }
      await refreshSampleStatusFromTests(Number(testRows[0].sample_id));
    }

    return ok(rows[0], "Test result created", 201);
  } catch (error) {
    console.error("Test result create error:", error);
    return fail("Unable to create test result", 500);
  }
}

import { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";
import { fail, getSearchParams, ok, paginate } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { page, limit, offset, search, status } = getSearchParams(request);
    const where: string[] = ["1=1"];
    const params: unknown[] = [];
    if (search) {
      where.push("(b.batch_number LIKE ? OR p.product_name LIKE ? OR p.product_code LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("b.status = ?");
      params.push(status);
    }
    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM batches b
       INNER JOIN products p ON p.id = b.product_id WHERE ${whereSql}`,
      params,
    );
    const rows = await query<RowDataPacket[]>(
      `SELECT b.*, p.product_code, p.product_name, w.warehouse_name, mo.mo_number,
        (SELECT COUNT(*) FROM samples s WHERE s.batch_id = b.id) AS sample_count,
        (SELECT COUNT(*) FROM sample_tests st
           INNER JOIN samples s2 ON s2.id = st.sample_id
           WHERE s2.batch_id = b.id AND st.status IN ('PENDING','IN_PROGRESS')) AS pending_tests,
        (SELECT COUNT(*) FROM sample_tests st
           INNER JOIN samples s2 ON s2.id = st.sample_id
           WHERE s2.batch_id = b.id) AS test_count,
        (SELECT COUNT(*) FROM sample_tests st
           INNER JOIN samples s2 ON s2.id = st.sample_id
           WHERE s2.batch_id = b.id AND st.status = 'COMPLETED') AS completed_tests,
        (SELECT COUNT(*) FROM test_results tr
           INNER JOIN sample_tests st2 ON st2.id = tr.sample_test_id
           INNER JOIN samples s3 ON s3.id = st2.sample_id
           WHERE s3.batch_id = b.id AND tr.pass_fail = 'PASS') AS pass_results,
        (SELECT COUNT(*) FROM test_results tr
           INNER JOIN sample_tests st2 ON st2.id = tr.sample_test_id
           INNER JOIN samples s3 ON s3.id = st2.sample_id
           WHERE s3.batch_id = b.id AND tr.pass_fail = 'FAIL') AS fail_results
       FROM batches b
       INNER JOIN products p ON p.id = b.product_id
       INNER JOIN warehouses w ON w.id = b.warehouse_id
       LEFT JOIN manufacturing_orders mo ON mo.id = b.manufacturing_order_id
       WHERE ${whereSql}
       ORDER BY b.id DESC
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    const items = rows.map((r) => {
      const sample_count = Number(r.sample_count || 0);
      const pending_tests = Number(r.pending_tests || 0);
      const test_count = Number(r.test_count || 0);
      const completed_tests = Number(r.completed_tests || 0);
      const pass_results = Number(r.pass_results || 0);
      const fail_results = Number(r.fail_results || 0);
      let qc_state = "IN_TESTING";
      if (r.status === "RELEASED") qc_state = "RELEASED";
      else if (!sample_count) qc_state = "NO_SAMPLE";
      else if (fail_results > 0) qc_state = "FAILED";
      else if (
        ["QC_PENDING", "QUARANTINE"].includes(String(r.status)) &&
        sample_count > 0 &&
        test_count > 0 &&
        pending_tests === 0 &&
        completed_tests >= test_count &&
        pass_results > 0 &&
        fail_results === 0
      ) {
        qc_state = "READY";
      }
      return {
        ...r,
        qc_state,
        can_release: qc_state === "READY",
        test_count,
        completed_tests,
      };
    });

    return ok({
      items,
      pagination: paginate(Number(countRows[0]?.total || 0), page, limit),
    });
  } catch (error) {
    console.error(error);
    return fail("Unable to load batches", 500);
  }
}

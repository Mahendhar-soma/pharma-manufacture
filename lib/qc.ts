import "server-only";
import type { RowDataPacket } from "mysql2";
import type { PoolConnection } from "mysql2/promise";
import { execute, query } from "@/lib/db";

export type QcSummary = {
  batch_id: number;
  batch_number: string;
  batch_status: string;
  sample_count: number;
  test_count: number;
  completed_tests: number;
  pending_tests: number;
  pass_results: number;
  fail_results: number;
  na_results: number;
  samples: Array<{
    id: number;
    sample_code: string;
    status: string;
  }>;
  tests: Array<{
    id: number;
    sample_id: number;
    test_name: string;
    status: string;
  }>;
  results: Array<{
    id: number;
    sample_test_id: number;
    parameter: string;
    pass_fail: string;
    result_value: string | null;
  }>;
  can_release: boolean;
  blockers: string[];
  qc_state: "NO_SAMPLE" | "IN_TESTING" | "FAILED" | "READY" | "RELEASED" | "NOT_APPLICABLE";
};

export async function getBatchQcSummary(batchId: number): Promise<QcSummary | null> {
  const batches = await query<RowDataPacket[]>(
    `SELECT id, batch_number, status FROM batches WHERE id = ? LIMIT 1`,
    [batchId],
  );
  if (!batches.length) return null;
  const batch = batches[0];

  const samples = await query<RowDataPacket[]>(
    `SELECT id, sample_code, status FROM samples WHERE batch_id = ? ORDER BY id`,
    [batchId],
  );

  const tests = samples.length
    ? await query<RowDataPacket[]>(
        `SELECT st.id, st.sample_id, st.test_name, st.status
         FROM sample_tests st
         INNER JOIN samples s ON s.id = st.sample_id
         WHERE s.batch_id = ?
         ORDER BY st.id`,
        [batchId],
      )
    : [];

  const results = tests.length
    ? await query<RowDataPacket[]>(
        `SELECT tr.id, tr.sample_test_id, tr.parameter, tr.pass_fail, tr.result_value
         FROM test_results tr
         INNER JOIN sample_tests st ON st.id = tr.sample_test_id
         INNER JOIN samples s ON s.id = st.sample_id
         WHERE s.batch_id = ?
         ORDER BY tr.id`,
        [batchId],
      )
    : [];

  const completed_tests = tests.filter((t) => t.status === "COMPLETED").length;
  const pending_tests = tests.filter((t) =>
    ["PENDING", "IN_PROGRESS"].includes(String(t.status)),
  ).length;
  const pass_results = results.filter((r) => r.pass_fail === "PASS").length;
  const fail_results = results.filter((r) => r.pass_fail === "FAIL").length;
  const na_results = results.filter((r) => r.pass_fail === "NA").length;

  const blockers: string[] = [];

  if (["RELEASED", "SOLD_OUT", "EXPIRED", "REJECTED"].includes(String(batch.status))) {
    return {
      batch_id: Number(batch.id),
      batch_number: String(batch.batch_number),
      batch_status: String(batch.status),
      sample_count: samples.length,
      test_count: tests.length,
      completed_tests,
      pending_tests,
      pass_results,
      fail_results,
      na_results,
      samples: samples.map((s) => ({
        id: Number(s.id),
        sample_code: String(s.sample_code),
        status: String(s.status),
      })),
      tests: tests.map((t) => ({
        id: Number(t.id),
        sample_id: Number(t.sample_id),
        test_name: String(t.test_name),
        status: String(t.status),
      })),
      results: results.map((r) => ({
        id: Number(r.id),
        sample_test_id: Number(r.sample_test_id),
        parameter: String(r.parameter),
        pass_fail: String(r.pass_fail),
        result_value: r.result_value == null ? null : String(r.result_value),
      })),
      can_release: false,
      blockers:
        batch.status === "RELEASED"
          ? ["Batch is already RELEASED"]
          : [`Batch status ${batch.status} cannot be released`],
      qc_state: batch.status === "RELEASED" ? "RELEASED" : "NOT_APPLICABLE",
    };
  }

  if (!samples.length) {
    blockers.push("No LIMS sample linked to this batch");
  }
  if (!tests.length) {
    blockers.push("No QC tests assigned to batch samples");
  }
  if (pending_tests > 0) {
    blockers.push(`${pending_tests} test(s) still pending/in progress`);
  }
  if (tests.length && completed_tests < tests.length) {
    blockers.push("All sample tests must be COMPLETED before release");
  }
  if (fail_results > 0) {
    blockers.push(`${fail_results} FAIL result(s) — batch cannot be released`);
  }
  if (tests.length && pass_results === 0) {
    blockers.push("At least one PASS test result is required");
  }
  if (samples.some((s) => s.status === "REJECTED")) {
    blockers.push("One or more samples are REJECTED");
  }

  let qc_state: QcSummary["qc_state"] = "IN_TESTING";
  if (!samples.length) qc_state = "NO_SAMPLE";
  else if (fail_results > 0 || samples.some((s) => s.status === "REJECTED")) qc_state = "FAILED";
  else if (blockers.length === 0) qc_state = "READY";

  return {
    batch_id: Number(batch.id),
    batch_number: String(batch.batch_number),
    batch_status: String(batch.status),
    sample_count: samples.length,
    test_count: tests.length,
    completed_tests,
    pending_tests,
    pass_results,
    fail_results,
    na_results,
    samples: samples.map((s) => ({
      id: Number(s.id),
      sample_code: String(s.sample_code),
      status: String(s.status),
    })),
    tests: tests.map((t) => ({
      id: Number(t.id),
      sample_id: Number(t.sample_id),
      test_name: String(t.test_name),
      status: String(t.status),
    })),
    results: results.map((r) => ({
      id: Number(r.id),
      sample_test_id: Number(r.sample_test_id),
      parameter: String(r.parameter),
      pass_fail: String(r.pass_fail),
      result_value: r.result_value == null ? null : String(r.result_value),
    })),
    can_release: blockers.length === 0,
    blockers,
    qc_state,
  };
}

/** Create default QC sample + Assay/Dissolution tests after batch manufacture. */
export async function createQcSampleForBatch(
  conn: PoolConnection,
  args: {
    productId: number;
    batchId: number;
    batchNumber: string;
    createdBy?: number | null;
  },
) {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const [cnt] = await conn.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM samples WHERE sample_code LIKE ?`,
    [`SMP-${datePart}-%`],
  );
  const sample_code = `SMP-${datePart}-${String(Number(cnt[0].c) + 1).padStart(3, "0")}`;

  const [sampleResult] = await conn.execute(
    `INSERT INTO samples
      (sample_code, sample_type, product_id, batch_id, received_date, received_by, status, remarks)
     VALUES (?, 'Finished Product', ?, ?, CURDATE(), ?, 'RECEIVED', ?)`,
    [
      sample_code,
      args.productId,
      args.batchId,
      args.createdBy || null,
      `Auto-created QC sample for batch ${args.batchNumber}`,
    ],
  );
  const sampleId = Number((sampleResult as { insertId: number }).insertId);

  const defaultTests = [
    { name: "Assay", method: "HPLC" },
    { name: "Dissolution", method: "USP <711>" },
  ];

  for (const t of defaultTests) {
    await conn.execute(
      `INSERT INTO sample_tests (sample_id, test_name, test_method, status)
       VALUES (?, ?, ?, 'PENDING')`,
      [sampleId, t.name, t.method],
    );
  }

  return { sample_id: sampleId, sample_code };
}

/** After LIMS updates, keep sample status in sync and surface FAIL for QC. */
export async function refreshSampleStatusFromTests(sampleId: number) {
  const tests = await query<RowDataPacket[]>(
    `SELECT id, status FROM sample_tests WHERE sample_id = ?`,
    [sampleId],
  );
  if (!tests.length) return;

  const results = await query<RowDataPacket[]>(
    `SELECT tr.pass_fail
     FROM test_results tr
     INNER JOIN sample_tests st ON st.id = tr.sample_test_id
     WHERE st.sample_id = ?`,
    [sampleId],
  );

  const hasFail = results.some((r) => r.pass_fail === "FAIL");
  const allCompleted = tests.every((t) => t.status === "COMPLETED");
  const anyInProgress = tests.some((t) =>
    ["PENDING", "IN_PROGRESS", "COMPLETED"].includes(String(t.status)),
  );

  let status = "IN_TESTING";
  if (hasFail) status = "REJECTED";
  else if (allCompleted && results.some((r) => r.pass_fail === "PASS")) status = "COMPLETED";
  else if (anyInProgress) status = "IN_TESTING";

  await execute(`UPDATE samples SET status = ? WHERE id = ?`, [status, sampleId]);
}

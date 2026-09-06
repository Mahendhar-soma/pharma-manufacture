import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, getSearchParams, ok, paginate } from "@/lib/api";
import { nextCode } from "@/lib/codes";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { page, limit, offset, search, status, sortBy, sortDir, searchParams } =
      getSearchParams(request);
    const where: string[] = ["1=1"];
    const params: unknown[] = [];

    if (search) {
      where.push(
        `(s.sample_code LIKE ? OR s.sample_type LIKE ? OR p.product_name LIKE ? OR b.batch_number LIKE ?)`,
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("s.status = ?");
      params.push(status);
    }
    const batchId = searchParams.get("batch_id");
    if (batchId) {
      where.push("s.batch_id = ?");
      params.push(batchId);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM samples s
       LEFT JOIN products p ON p.id = s.product_id
       LEFT JOIN batches b ON b.id = s.batch_id
       WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);
    const sort = ["id", "sample_code", "received_date", "status", "created_at"].includes(sortBy)
      ? `s.${sortBy}`
      : "s.id";

    const rows = await query<RowDataPacket[]>(
      `SELECT s.*, p.product_name, b.batch_number, u.name AS received_by_name
       FROM samples s
       LEFT JOIN products p ON p.id = s.product_id
       LEFT JOIN batches b ON b.id = s.batch_id
       LEFT JOIN users u ON u.id = s.received_by
       WHERE ${whereSql}
       ORDER BY ${sort} ${sortDir}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({ items: rows, pagination: paginate(total, page, limit) });
  } catch (error) {
    console.error("Samples list error:", error);
    return fail("Unable to load samples", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sample_type = String(body.sample_type || "").trim();
    const received_date = body.received_date;
    if (!sample_type || !received_date) {
      return fail("sample_type and received_date are required");
    }

    const sample_code =
      String(body.sample_code || "").trim() || (await nextCode("samples", "sample_code", "SMP"));

    const result = await execute(
      `INSERT INTO samples
        (sample_code, sample_type, product_id, batch_id, received_date, received_by, status, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sample_code,
        sample_type,
        body.product_id || null,
        body.batch_id || null,
        received_date,
        body.received_by || null,
        body.status || "RECEIVED",
        body.remarks || null,
      ],
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM samples WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "Sample created", 201);
  } catch (error) {
    console.error("Sample create error:", error);
    return fail("Unable to create sample", 500);
  }
}

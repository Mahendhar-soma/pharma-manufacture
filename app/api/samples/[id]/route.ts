import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, ok } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const rows = await query<RowDataPacket[]>(
      `SELECT s.*, p.product_name, b.batch_number, u.name AS received_by_name
       FROM samples s
       LEFT JOIN products p ON p.id = s.product_id
       LEFT JOIN batches b ON b.id = s.batch_id
       LEFT JOIN users u ON u.id = s.received_by
       WHERE s.id = ? LIMIT 1`,
      [id],
    );
    if (!rows.length) return fail("Sample not found", 404);

    const tests = await query<RowDataPacket[]>(
      `SELECT st.*, u.name AS assigned_name
       FROM sample_tests st
       LEFT JOIN users u ON u.id = st.assigned_to
       WHERE st.sample_id = ?
       ORDER BY st.id DESC`,
      [id],
    );

    return ok({ ...rows[0], tests });
  } catch (error) {
    console.error("Sample get error:", error);
    return fail("Unable to load sample", 500);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const result = await execute(
      `UPDATE samples SET
        sample_type = COALESCE(?, sample_type),
        product_id = COALESCE(?, product_id),
        batch_id = COALESCE(?, batch_id),
        received_date = COALESCE(?, received_date),
        received_by = COALESCE(?, received_by),
        status = COALESCE(?, status),
        remarks = COALESCE(?, remarks)
       WHERE id = ?`,
      [
        body.sample_type ?? null,
        body.product_id ?? null,
        body.batch_id ?? null,
        body.received_date ?? null,
        body.received_by ?? null,
        body.status ?? null,
        body.remarks ?? null,
        id,
      ],
    );
    if (result.affectedRows === 0) return fail("Sample not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM samples WHERE id = ?", [id]);
    return ok(rows[0], "Sample updated");
  } catch (error) {
    console.error("Sample update error:", error);
    return fail("Unable to update sample", 500);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const result = await execute(`UPDATE samples SET status = 'REJECTED' WHERE id = ?`, [id]);
    if (result.affectedRows === 0) return fail("Sample not found", 404);
    return ok(null, "Sample marked rejected");
  } catch (error) {
    console.error("Sample deactivate error:", error);
    return fail("Unable to update sample", 500);
  }
}

import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, ok } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const rows = await query<RowDataPacket[]>(`SELECT * FROM audits WHERE id = ? LIMIT 1`, [id]);
    if (!rows.length) return fail("Audit not found", 404);
    const findings = await query<RowDataPacket[]>(
      `SELECT * FROM audit_findings WHERE audit_id = ? ORDER BY id DESC`,
      [id],
    );
    return ok({ ...rows[0], findings });
  } catch (error) {
    console.error("Audit get error:", error);
    return fail("Unable to load audit", 500);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const result = await execute(
      `UPDATE audits SET
        audit_type = COALESCE(?, audit_type),
        department = COALESCE(?, department),
        auditor = COALESCE(?, auditor),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        status = COALESCE(?, status),
        remarks = COALESCE(?, remarks)
       WHERE id = ?`,
      [
        body.audit_type ?? null,
        body.department ?? null,
        body.auditor ?? null,
        body.start_date ?? null,
        body.end_date ?? null,
        body.status ?? null,
        body.remarks ?? null,
        id,
      ],
    );
    if (result.affectedRows === 0) return fail("Audit not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM audits WHERE id = ?", [id]);
    return ok(rows[0], "Audit updated");
  } catch (error) {
    console.error("Audit update error:", error);
    return fail("Unable to update audit", 500);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const result = await execute(`UPDATE audits SET status = 'CANCELLED' WHERE id = ?`, [id]);
    if (result.affectedRows === 0) return fail("Audit not found", 404);
    return ok(null, "Audit cancelled");
  } catch (error) {
    console.error("Audit cancel error:", error);
    return fail("Unable to cancel audit", 500);
  }
}

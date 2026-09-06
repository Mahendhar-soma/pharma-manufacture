import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, ok } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const rows = await query<RowDataPacket[]>(
      `SELECT s.*, u.name AS created_by_name FROM sops s
       LEFT JOIN users u ON u.id = s.created_by WHERE s.id = ? LIMIT 1`,
      [id],
    );
    if (!rows.length) return fail("SOP not found", 404);
    return ok(rows[0]);
  } catch (error) {
    console.error("SOP get error:", error);
    return fail("Unable to load SOP", 500);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const result = await execute(
      `UPDATE sops SET
        title = COALESCE(?, title),
        version = COALESCE(?, version),
        department = COALESCE(?, department),
        effective_date = COALESCE(?, effective_date),
        review_date = COALESCE(?, review_date),
        status = COALESCE(?, status),
        description = COALESCE(?, description)
       WHERE id = ?`,
      [
        body.title ?? null,
        body.version ?? null,
        body.department ?? null,
        body.effective_date ?? null,
        body.review_date ?? null,
        body.status ?? null,
        body.description ?? null,
        id,
      ],
    );
    if (result.affectedRows === 0) return fail("SOP not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM sops WHERE id = ?", [id]);
    return ok(rows[0], "SOP updated");
  } catch (error) {
    console.error("SOP update error:", error);
    return fail("Unable to update SOP", 500);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const result = await execute(`UPDATE sops SET status = 'OBSOLETE' WHERE id = ?`, [id]);
    if (result.affectedRows === 0) return fail("SOP not found", 404);
    return ok(null, "SOP marked obsolete");
  } catch (error) {
    console.error("SOP deactivate error:", error);
    return fail("Unable to update SOP", 500);
  }
}

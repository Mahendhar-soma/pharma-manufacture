import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, ok } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const rows = await query<RowDataPacket[]>(
      `SELECT d.*, u.name AS reported_by_name FROM deviations d
       LEFT JOIN users u ON u.id = d.reported_by WHERE d.id = ? LIMIT 1`,
      [id],
    );
    if (!rows.length) return fail("Deviation not found", 404);
    const capas = await query<RowDataPacket[]>(
      `SELECT * FROM capa WHERE deviation_id = ? ORDER BY id DESC`,
      [id],
    );
    return ok({ ...rows[0], capas });
  } catch (error) {
    console.error("Deviation get error:", error);
    return fail("Unable to load deviation", 500);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const result = await execute(
      `UPDATE deviations SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        department = COALESCE(?, department),
        severity = COALESCE(?, severity),
        reported_date = COALESCE(?, reported_date),
        root_cause = COALESCE(?, root_cause),
        corrective_action = COALESCE(?, corrective_action),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [
        body.title ?? null,
        body.description ?? null,
        body.department ?? null,
        body.severity ?? null,
        body.reported_date ?? null,
        body.root_cause ?? null,
        body.corrective_action ?? null,
        body.status ?? null,
        id,
      ],
    );
    if (result.affectedRows === 0) return fail("Deviation not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM deviations WHERE id = ?", [id]);
    return ok(rows[0], "Deviation updated");
  } catch (error) {
    console.error("Deviation update error:", error);
    return fail("Unable to update deviation", 500);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const result = await execute(`UPDATE deviations SET status = 'CANCELLED' WHERE id = ?`, [id]);
    if (result.affectedRows === 0) return fail("Deviation not found", 404);
    return ok(null, "Deviation cancelled");
  } catch (error) {
    console.error("Deviation cancel error:", error);
    return fail("Unable to cancel deviation", 500);
  }
}

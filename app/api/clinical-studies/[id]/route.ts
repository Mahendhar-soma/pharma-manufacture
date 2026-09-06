import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, ok } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const rows = await query<RowDataPacket[]>(
      `SELECT * FROM clinical_studies WHERE id = ? LIMIT 1`,
      [id],
    );
    if (!rows.length) return fail("Clinical study not found", 404);

    const sites = await query<RowDataPacket[]>(
      `SELECT * FROM clinical_sites WHERE study_id = ? ORDER BY id DESC`,
      [id],
    );
    const subjects = await query<RowDataPacket[]>(
      `SELECT sub.*, sit.site_name
       FROM clinical_subjects sub
       LEFT JOIN clinical_sites sit ON sit.id = sub.site_id
       WHERE sub.study_id = ?
       ORDER BY sub.id DESC`,
      [id],
    );

    return ok({ ...rows[0], sites, subjects });
  } catch (error) {
    console.error("Clinical study get error:", error);
    return fail("Unable to load clinical study", 500);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const result = await execute(
      `UPDATE clinical_studies SET
        study_title = COALESCE(?, study_title),
        phase = COALESCE(?, phase),
        sponsor = COALESCE(?, sponsor),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        status = COALESCE(?, status),
        description = COALESCE(?, description)
       WHERE id = ?`,
      [
        body.study_title ?? null,
        body.phase ?? null,
        body.sponsor ?? null,
        body.start_date ?? null,
        body.end_date ?? null,
        body.status ?? null,
        body.description ?? null,
        id,
      ],
    );
    if (result.affectedRows === 0) return fail("Study not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM clinical_studies WHERE id = ?", [id]);
    return ok(rows[0], "Clinical study updated");
  } catch (error) {
    console.error("Clinical study update error:", error);
    return fail("Unable to update clinical study", 500);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const result = await execute(`UPDATE clinical_studies SET status = 'CANCELLED' WHERE id = ?`, [
      id,
    ]);
    if (result.affectedRows === 0) return fail("Study not found", 404);
    return ok(null, "Clinical study cancelled");
  } catch (error) {
    console.error("Clinical study cancel error:", error);
    return fail("Unable to cancel clinical study", 500);
  }
}

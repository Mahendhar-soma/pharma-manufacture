import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, ok } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const rows = await query<RowDataPacket[]>("SELECT * FROM compounds WHERE id = ? LIMIT 1", [id]);
    if (!rows.length) return fail("Compound not found", 404);

    const docking = await query<RowDataPacket[]>(
      `SELECT * FROM docking_experiments WHERE compound_id = ? ORDER BY id DESC`,
      [id],
    );
    const experiments = await query<RowDataPacket[]>(
      `SELECT * FROM research_experiments WHERE compound_id = ? ORDER BY id DESC`,
      [id],
    );

    return ok({ ...rows[0], docking_experiments: docking, research_experiments: experiments });
  } catch (error) {
    console.error("Compound get error:", error);
    return fail("Unable to load compound", 500);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const allowed = ["ACTIVE", "INACTIVE", "ARCHIVED"];
    const status = body.status != null ? String(body.status).trim() : null;
    if (status && !allowed.includes(status)) {
      return fail(`Invalid status. Use ${allowed.join(", ")}`);
    }

    // Quick status-only
    if (status && body.compound_name === undefined) {
      const result = await execute(`UPDATE compounds SET status = ? WHERE id = ?`, [status, id]);
      if (result.affectedRows === 0) return fail("Compound not found", 404);
      const rows = await query<RowDataPacket[]>("SELECT * FROM compounds WHERE id = ?", [id]);
      return ok(rows[0], "Compound status updated");
    }

    const compound_name = String(body.compound_name || "").trim();
    if (!compound_name) return fail("compound_name is required");

    const result = await execute(
      `UPDATE compounds SET
        compound_name = ?,
        chemical_formula = ?,
        molecular_weight = ?,
        smiles = ?,
        description = ?,
        status = ?
       WHERE id = ?`,
      [
        compound_name,
        body.chemical_formula ? String(body.chemical_formula).trim() : null,
        body.molecular_weight != null && body.molecular_weight !== ""
          ? Number(body.molecular_weight)
          : null,
        body.smiles ? String(body.smiles).trim() : null,
        body.description ? String(body.description).trim() : null,
        status || "ACTIVE",
        id,
      ],
    );
    if (result.affectedRows === 0) return fail("Compound not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM compounds WHERE id = ?", [id]);
    return ok(rows[0], "Compound updated");
  } catch (error) {
    console.error("Compound update error:", error);
    return fail("Unable to update compound", 500);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const result = await execute(`UPDATE compounds SET status = 'INACTIVE' WHERE id = ?`, [id]);
    if (result.affectedRows === 0) return fail("Compound not found", 404);
    return ok(null, "Compound deactivated");
  } catch (error) {
    console.error("Compound deactivate error:", error);
    return fail("Unable to deactivate compound", 500);
  }
}

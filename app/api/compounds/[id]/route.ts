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
    const result = await execute(
      `UPDATE compounds SET
        compound_name = COALESCE(?, compound_name),
        chemical_formula = COALESCE(?, chemical_formula),
        molecular_weight = COALESCE(?, molecular_weight),
        smiles = COALESCE(?, smiles),
        description = COALESCE(?, description),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [
        body.compound_name ?? null,
        body.chemical_formula ?? null,
        body.molecular_weight ?? null,
        body.smiles ?? null,
        body.description ?? null,
        body.status ?? null,
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

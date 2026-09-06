import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, getSearchParams, ok, paginate } from "@/lib/api";
import { nextCode } from "@/lib/codes";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { page, limit, offset, search, status, sortDir } = getSearchParams(request);
    const where: string[] = ["1=1"];
    const params: unknown[] = [];

    if (search) {
      where.push(
        `(compound_code LIKE ? OR compound_name LIKE ? OR chemical_formula LIKE ? OR smiles LIKE ?)`,
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("status = ?");
      params.push(status);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM compounds WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT * FROM compounds WHERE ${whereSql}
       ORDER BY id ${sortDir}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({ items: rows, pagination: paginate(total, page, limit) });
  } catch (error) {
    console.error("Compounds list error:", error);
    return fail("Unable to load compounds", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const compound_name = String(body.compound_name || "").trim();
    if (!compound_name) return fail("compound_name is required");

    const compound_code =
      String(body.compound_code || "").trim() ||
      (await nextCode("compounds", "compound_code", "CMP"));

    const result = await execute(
      `INSERT INTO compounds
        (compound_code, compound_name, chemical_formula, molecular_weight, smiles, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        compound_code,
        compound_name,
        body.chemical_formula || null,
        body.molecular_weight ?? null,
        body.smiles || null,
        body.description || null,
        body.status || "ACTIVE",
      ],
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM compounds WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "Compound created", 201);
  } catch (error) {
    console.error("Compound create error:", error);
    return fail("Unable to create compound", 500);
  }
}

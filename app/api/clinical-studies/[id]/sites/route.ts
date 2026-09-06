import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { nextCode } from "@/lib/codes";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const rows = await query<RowDataPacket[]>(
      `SELECT * FROM clinical_sites WHERE study_id = ? ORDER BY id DESC`,
      [id],
    );
    return ok({ items: rows });
  } catch (error) {
    console.error("Clinical sites list error:", error);
    return fail("Unable to load clinical sites", 500);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const site_name = String(body.site_name || "").trim();
    if (!site_name) return fail("site_name is required");

    const site_code =
      String(body.site_code || "").trim() ||
      (await nextCode("clinical_sites", "site_code", "SITE"));

    const result = await execute(
      `INSERT INTO clinical_sites
        (study_id, site_code, site_name, location, principal_investigator, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        site_code,
        site_name,
        body.location || null,
        body.principal_investigator || null,
        body.status || "ACTIVE",
      ],
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM clinical_sites WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "Site created", 201);
  } catch (error) {
    console.error("Clinical site create error:", error);
    return fail("Unable to create clinical site", 500);
  }
}

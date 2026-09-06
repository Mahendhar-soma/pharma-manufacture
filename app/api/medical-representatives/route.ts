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
      where.push(`(mr_code LIKE ? OR mr_name LIKE ? OR territory LIKE ? OR phone LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("status = ?");
      params.push(status);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM medical_representatives WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT * FROM medical_representatives WHERE ${whereSql}
       ORDER BY id ${sortDir}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({ items: rows, pagination: paginate(total, page, limit) });
  } catch (error) {
    console.error("MR list error:", error);
    return fail("Unable to load medical representatives", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const mr_name = String(body.mr_name || "").trim();
    if (!mr_name) return fail("mr_name is required");

    const mr_code =
      String(body.mr_code || "").trim() ||
      (await nextCode("medical_representatives", "mr_code", "MR"));

    const result = await execute(
      `INSERT INTO medical_representatives
        (mr_code, mr_name, phone, email, territory, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        mr_code,
        mr_name,
        body.phone || null,
        body.email || null,
        body.territory || null,
        body.status || "ACTIVE",
      ],
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM medical_representatives WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "Medical representative created", 201);
  } catch (error) {
    console.error("MR create error:", error);
    return fail("Unable to create medical representative", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return fail("id is required");
    const result = await execute(
      `UPDATE medical_representatives SET
        mr_name = COALESCE(?, mr_name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        territory = COALESCE(?, territory),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [
        body.mr_name ?? null,
        body.phone ?? null,
        body.email ?? null,
        body.territory ?? null,
        body.status ?? null,
        body.id,
      ],
    );
    if (result.affectedRows === 0) return fail("Medical representative not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM medical_representatives WHERE id = ?", [
      body.id,
    ]);
    return ok(rows[0], "Medical representative updated");
  } catch (error) {
    console.error("MR update error:", error);
    return fail("Unable to update medical representative", 500);
  }
}

import { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, getSearchParams, ok, paginate } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { page, limit, offset, search, status } = getSearchParams(request);
    const materialType = new URL(request.url).searchParams.get("material_type") || "";
    const where: string[] = ["1=1"];
    const params: unknown[] = [];

    if (search) {
      where.push("(material_code LIKE ? OR material_name LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("status = ?");
      params.push(status);
    }
    if (materialType) {
      where.push("material_type = ?");
      params.push(materialType);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM raw_materials WHERE ${whereSql}`,
      params,
    );
    const rows = await query<RowDataPacket[]>(
      `SELECT rm.*,
        COALESCE((
          SELECT SUM(available_quantity) FROM raw_material_batches rmb
          WHERE rmb.raw_material_id = rm.id AND rmb.status = 'AVAILABLE' AND rmb.expiry_date >= CURDATE()
        ), 0) AS current_stock
       FROM raw_materials rm
       WHERE ${whereSql}
       ORDER BY rm.id DESC
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({
      items: rows,
      pagination: paginate(Number(countRows[0]?.total || 0), page, limit),
    });
  } catch (error) {
    console.error(error);
    return fail("Unable to load raw materials", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const material_code = String(body.material_code || "").trim();
    const material_name = String(body.material_name || "").trim();
    if (!material_code || !material_name) {
      return fail("material_code and material_name are required", 400);
    }

    const result = await execute(
      `INSERT INTO raw_materials
      (material_code, material_name, material_type, unit, reorder_level, description, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        material_code,
        material_name,
        body.material_type || "OTHER",
        body.unit || "kg",
        Number(body.reorder_level || 0),
        body.description || null,
        body.status || "ACTIVE",
      ],
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM raw_materials WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "Raw material created successfully", 201);
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === "ER_DUP_ENTRY") return fail("Material code already exists", 409);
    console.error(error);
    return fail("Unable to create raw material", 500);
  }
}

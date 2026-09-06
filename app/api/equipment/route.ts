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
        `(equipment_code LIKE ? OR equipment_name LIKE ? OR serial_number LIKE ? OR location LIKE ?)`,
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("status = ?");
      params.push(status);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM laboratory_equipment WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT e.*,
        (SELECT MAX(next_calibration_date) FROM equipment_calibrations ec WHERE ec.equipment_id = e.id) AS next_calibration_date
       FROM laboratory_equipment e
       WHERE ${whereSql}
       ORDER BY e.id ${sortDir}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({ items: rows, pagination: paginate(total, page, limit) });
  } catch (error) {
    console.error("Equipment list error:", error);
    return fail("Unable to load equipment", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const equipment_name = String(body.equipment_name || "").trim();
    if (!equipment_name) return fail("equipment_name is required");

    const equipment_code =
      String(body.equipment_code || "").trim() ||
      (await nextCode("laboratory_equipment", "equipment_code", "EQP"));

    const result = await execute(
      `INSERT INTO laboratory_equipment
        (equipment_code, equipment_name, serial_number, location, purchase_date, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        equipment_code,
        equipment_name,
        body.serial_number || null,
        body.location || null,
        body.purchase_date || null,
        body.status || "ACTIVE",
      ],
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM laboratory_equipment WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "Equipment created", 201);
  } catch (error) {
    console.error("Equipment create error:", error);
    return fail("Unable to create equipment", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return fail("id is required");
    const result = await execute(
      `UPDATE laboratory_equipment SET
        equipment_name = COALESCE(?, equipment_name),
        serial_number = COALESCE(?, serial_number),
        location = COALESCE(?, location),
        purchase_date = COALESCE(?, purchase_date),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [
        body.equipment_name ?? null,
        body.serial_number ?? null,
        body.location ?? null,
        body.purchase_date ?? null,
        body.status ?? null,
        body.id,
      ],
    );
    if (result.affectedRows === 0) return fail("Equipment not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM laboratory_equipment WHERE id = ?", [
      body.id,
    ]);
    return ok(rows[0], "Equipment updated");
  } catch (error) {
    console.error("Equipment update error:", error);
    return fail("Unable to update equipment", 500);
  }
}

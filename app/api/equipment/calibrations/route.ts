import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, getSearchParams, ok, paginate } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { page, limit, offset, search, status, sortDir, searchParams } = getSearchParams(request);
    const where: string[] = ["1=1"];
    const params: unknown[] = [];

    if (search) {
      where.push(
        `(e.equipment_code LIKE ? OR e.equipment_name LIKE ? OR ec.certificate_number LIKE ? OR ec.performed_by LIKE ?)`,
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("ec.result = ?");
      params.push(status);
    }
    const equipmentId = searchParams.get("equipment_id");
    if (equipmentId) {
      where.push("ec.equipment_id = ?");
      params.push(equipmentId);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM equipment_calibrations ec
       JOIN laboratory_equipment e ON e.id = ec.equipment_id
       WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT ec.*, e.equipment_code, e.equipment_name
       FROM equipment_calibrations ec
       JOIN laboratory_equipment e ON e.id = ec.equipment_id
       WHERE ${whereSql}
       ORDER BY ec.id ${sortDir}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({ items: rows, pagination: paginate(total, page, limit) });
  } catch (error) {
    console.error("Calibrations list error:", error);
    return fail("Unable to load calibrations", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.equipment_id || !body.calibration_date || !body.next_calibration_date) {
      return fail("equipment_id, calibration_date and next_calibration_date are required");
    }

    const result = await execute(
      `INSERT INTO equipment_calibrations
        (equipment_id, calibration_date, next_calibration_date, performed_by, result, certificate_number, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        body.equipment_id,
        body.calibration_date,
        body.next_calibration_date,
        body.performed_by || null,
        body.result || "PASS",
        body.certificate_number || null,
        body.remarks || null,
      ],
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM equipment_calibrations WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "Calibration recorded", 201);
  } catch (error) {
    console.error("Calibration create error:", error);
    return fail("Unable to create calibration", 500);
  }
}

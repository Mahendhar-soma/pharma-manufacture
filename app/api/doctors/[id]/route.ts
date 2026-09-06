import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, ok } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const rows = await query<RowDataPacket[]>(
      `SELECT d.*, h.hospital_name FROM doctors d
       LEFT JOIN hospitals h ON h.id = d.hospital_id WHERE d.id = ? LIMIT 1`,
      [id],
    );
    if (!rows.length) return fail("Doctor not found", 404);

    const visits = await query<RowDataPacket[]>(
      `SELECT dv.*, mr.mr_name FROM doctor_visits dv
       JOIN medical_representatives mr ON mr.id = dv.medical_representative_id
       WHERE dv.doctor_id = ? ORDER BY dv.visit_date DESC LIMIT 20`,
      [id],
    );

    return ok({ ...rows[0], visits });
  } catch (error) {
    console.error("Doctor get error:", error);
    return fail("Unable to load doctor", 500);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const result = await execute(
      `UPDATE doctors SET
        doctor_name = COALESCE(?, doctor_name),
        specialization = COALESCE(?, specialization),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        hospital_id = COALESCE(?, hospital_id),
        city = COALESCE(?, city),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [
        body.doctor_name ?? null,
        body.specialization ?? null,
        body.phone ?? null,
        body.email ?? null,
        body.hospital_id ?? null,
        body.city ?? null,
        body.status ?? null,
        id,
      ],
    );
    if (result.affectedRows === 0) return fail("Doctor not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM doctors WHERE id = ?", [id]);
    return ok(rows[0], "Doctor updated");
  } catch (error) {
    console.error("Doctor update error:", error);
    return fail("Unable to update doctor", 500);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const result = await execute(`UPDATE doctors SET status = 'INACTIVE' WHERE id = ?`, [id]);
    if (result.affectedRows === 0) return fail("Doctor not found", 404);
    return ok(null, "Doctor deactivated");
  } catch (error) {
    console.error("Doctor deactivate error:", error);
    return fail("Unable to deactivate doctor", 500);
  }
}

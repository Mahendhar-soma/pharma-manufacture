import { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, ok } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const rows = await query<RowDataPacket[]>("SELECT * FROM suppliers WHERE id = ? LIMIT 1", [id]);
    if (!rows.length) return fail("Supplier not found", 404);

    const history = await query<RowDataPacket[]>(
      `SELECT po.id, po.po_number, po.order_date, po.status, po.total_amount
       FROM purchase_orders po WHERE po.supplier_id = ? ORDER BY po.id DESC LIMIT 20`,
      [id],
    );

    return ok({ ...rows[0], purchase_history: history });
  } catch (error) {
    console.error(error);
    return fail("Unable to load supplier", 500);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const result = await execute(
      `UPDATE suppliers SET
        supplier_code = ?, supplier_name = ?, contact_person = ?, phone = ?, email = ?,
        address = ?, gst_number = ?, license_number = ?, status = ?
       WHERE id = ?`,
      [
        body.supplier_code,
        body.supplier_name,
        body.contact_person || null,
        body.phone || null,
        body.email || null,
        body.address || null,
        body.gst_number || null,
        body.license_number || null,
        body.status || "ACTIVE",
        id,
      ],
    );
    if (result.affectedRows === 0) return fail("Supplier not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM suppliers WHERE id = ?", [id]);
    return ok(rows[0], "Supplier updated successfully");
  } catch (error) {
    console.error(error);
    return fail("Unable to update supplier", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const result = await execute(`UPDATE suppliers SET status = 'INACTIVE' WHERE id = ?`, [id]);
    if (result.affectedRows === 0) return fail("Supplier not found", 404);
    return ok(null, "Supplier deactivated successfully");
  } catch (error) {
    console.error(error);
    return fail("Unable to deactivate supplier", 500);
  }
}

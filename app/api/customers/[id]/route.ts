import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { buildGetByIdHandler, softDeactivate } from "@/lib/crud";

export const runtime = "nodejs";

export const GET = buildGetByIdHandler("customers");
export const DELETE = softDeactivate("customers", "INACTIVE");

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const customer_code = String(body.customer_code || "").trim();
    const customer_name = String(body.customer_name || "").trim();
    if (!customer_code || !customer_name) {
      return fail("customer_code and customer_name are required");
    }

    const result = await execute(
      `UPDATE customers SET
        customer_code = ?, customer_name = ?, phone = ?, email = ?,
        address = ?, gst_number = ?, status = ?
       WHERE id = ?`,
      [
        customer_code,
        customer_name,
        body.phone || null,
        body.email || null,
        body.address || null,
        body.gst_number || null,
        body.status || "ACTIVE",
        id,
      ],
    );
    if (result.affectedRows === 0) return fail("Customer not found", 404);

    const rows = await query<RowDataPacket[]>("SELECT * FROM customers WHERE id = ? LIMIT 1", [id]);
    return ok(rows[0], "Customer updated");
  } catch (error: unknown) {
    console.error("Update customer error:", error);
    const msg = String((error as { code?: string })?.code || "");
    if (msg === "ER_DUP_ENTRY") return fail("Customer code already exists", 409);
    return fail("Unable to update customer", 500);
  }
}

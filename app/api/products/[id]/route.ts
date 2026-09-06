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
    const rows = await query<RowDataPacket[]>("SELECT * FROM products WHERE id = ? LIMIT 1", [id]);
    if (!rows.length) return fail("Product not found", 404);
    return ok(rows[0]);
  } catch (error) {
    console.error(error);
    return fail("Unable to load product", 500);
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
      `UPDATE products SET
        product_code = ?, product_name = ?, generic_name = ?, dosage_form = ?,
        strength = ?, unit = ?, shelf_life_months = ?, description = ?, status = ?
       WHERE id = ?`,
      [
        body.product_code,
        body.product_name,
        body.generic_name || null,
        body.dosage_form || null,
        body.strength || null,
        body.unit || "units",
        Number(body.shelf_life_months || 24),
        body.description || null,
        body.status || "ACTIVE",
        id,
      ],
    );
    if (result.affectedRows === 0) return fail("Product not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM products WHERE id = ?", [id]);
    return ok(rows[0], "Product updated successfully");
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === "ER_DUP_ENTRY") return fail("Product code already exists", 409);
    console.error(error);
    return fail("Unable to update product", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const result = await execute(`UPDATE products SET status = 'INACTIVE' WHERE id = ?`, [id]);
    if (result.affectedRows === 0) return fail("Product not found", 404);
    return ok(null, "Product deactivated successfully");
  } catch (error) {
    console.error(error);
    return fail("Unable to deactivate product", 500);
  }
}

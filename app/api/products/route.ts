import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { buildListHandler } from "@/lib/crud";

export const runtime = "nodejs";

export const GET = buildListHandler({
  table: "products",
  searchColumns: ["product_code", "product_name", "generic_name"],
  statusColumn: "status",
  defaultSort: "id",
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const product_code = String(body.product_code || "").trim();
    const product_name = String(body.product_name || "").trim();
    if (!product_code || !product_name) {
      return fail("product_code and product_name are required");
    }

    const result = await execute(
      `INSERT INTO products
        (product_code, product_name, generic_name, dosage_form, strength, unit, shelf_life_months, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product_code,
        product_name,
        body.generic_name || null,
        body.dosage_form || null,
        body.strength || null,
        body.unit || "units",
        Number(body.shelf_life_months ?? 24),
        body.description || null,
        body.status || "ACTIVE",
      ],
    );

    const rows = await query<RowDataPacket[]>(
      "SELECT * FROM products WHERE id = ? LIMIT 1",
      [result.insertId],
    );
    return ok(rows[0], "Product created", 201);
  } catch (error: unknown) {
    console.error("Create product error:", error);
    const msg = String((error as { code?: string })?.code || "");
    if (msg === "ER_DUP_ENTRY") return fail("Product code already exists", 409);
    return fail("Unable to create product", 500);
  }
}

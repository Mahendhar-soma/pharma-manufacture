import { NextRequest } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { query, withTransaction } from "@/lib/db";
import { fail, getSearchParams, ok, paginate } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { page, limit, offset, search, status } = getSearchParams(request);
    const where: string[] = ["1=1"];
    const params: unknown[] = [];
    if (search) {
      where.push("(f.formula_code LIKE ? OR p.product_name LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("f.status = ?");
      params.push(status);
    }
    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM formulas f
       INNER JOIN products p ON p.id = f.product_id WHERE ${whereSql}`,
      params,
    );
    const rows = await query<RowDataPacket[]>(
      `SELECT f.*, p.product_code, p.product_name
       FROM formulas f
       INNER JOIN products p ON p.id = f.product_id
       WHERE ${whereSql}
       ORDER BY f.id DESC
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );
    return ok({
      items: rows,
      pagination: paginate(Number(countRows[0]?.total || 0), page, limit),
    });
  } catch (error) {
    console.error(error);
    return fail("Unable to load formulas", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const product_id = Number(body.product_id);
    const formula_code = String(body.formula_code || "").trim();
    const batch_size = Number(body.batch_size);
    const items = Array.isArray(body.items) ? body.items : [];
    const status = body.status || "DRAFT";

    if (!product_id || !formula_code || !batch_size || !items.length) {
      return fail("product_id, formula_code, batch_size and items are required", 400);
    }

    const data = await withTransaction(async (conn) => {
      if (status === "ACTIVE") {
        await conn.execute(
          `UPDATE formulas SET status = 'INACTIVE' WHERE product_id = ? AND status = 'ACTIVE'`,
          [product_id],
        );
      }

      const [result] = await conn.execute<ResultSetHeader>(
        `INSERT INTO formulas (product_id, formula_code, version, batch_size, unit, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          product_id,
          formula_code,
          body.version || "1.0",
          batch_size,
          body.unit || "units",
          status,
        ],
      );
      const formulaId = result.insertId;

      let seq = 1;
      for (const item of items) {
        await conn.execute(
          `INSERT INTO formula_items
           (formula_id, raw_material_id, quantity, unit, percentage, sequence_no)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            formulaId,
            item.raw_material_id,
            item.quantity,
            item.unit || "kg",
            item.percentage || null,
            item.sequence_no || seq,
          ],
        );
        seq += 1;
      }

      return { id: formulaId };
    });

    return ok(data, "Formula created successfully", 201);
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === "ER_DUP_ENTRY") return fail("Formula code/version already exists", 409);
    console.error(error);
    return fail("Unable to create formula", 500);
  }
}

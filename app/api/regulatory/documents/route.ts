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
        `(rd.document_code LIKE ? OR rd.title LIKE ? OR rd.document_type LIKE ? OR p.product_name LIKE ?)`,
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("rd.status = ?");
      params.push(status);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM regulatory_documents rd
       LEFT JOIN products p ON p.id = rd.product_id
       WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT rd.*, p.product_name, p.product_code
       FROM regulatory_documents rd
       LEFT JOIN products p ON p.id = rd.product_id
       WHERE ${whereSql}
       ORDER BY rd.id ${sortDir}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({ items: rows, pagination: paginate(total, page, limit) });
  } catch (error) {
    console.error("Documents list error:", error);
    return fail("Unable to load regulatory documents", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = String(body.title || "").trim();
    if (!title) return fail("title is required");

    const document_code =
      String(body.document_code || "").trim() ||
      (await nextCode("regulatory_documents", "document_code", "RDOC"));

    const result = await execute(
      `INSERT INTO regulatory_documents
        (document_code, title, document_type, product_id, version, effective_date, status, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        document_code,
        title,
        body.document_type || null,
        body.product_id || null,
        body.version || null,
        body.effective_date || null,
        body.status || "DRAFT",
        body.remarks || null,
      ],
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM regulatory_documents WHERE id = ?", [
      result.insertId,
    ]);
    return ok(rows[0], "Document created", 201);
  } catch (error) {
    console.error("Document create error:", error);
    return fail("Unable to create document", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return fail("id is required");
    const result = await execute(
      `UPDATE regulatory_documents SET
        title = COALESCE(?, title),
        document_type = COALESCE(?, document_type),
        product_id = COALESCE(?, product_id),
        version = COALESCE(?, version),
        effective_date = COALESCE(?, effective_date),
        status = COALESCE(?, status),
        remarks = COALESCE(?, remarks)
       WHERE id = ?`,
      [
        body.title ?? null,
        body.document_type ?? null,
        body.product_id ?? null,
        body.version ?? null,
        body.effective_date ?? null,
        body.status ?? null,
        body.remarks ?? null,
        body.id,
      ],
    );
    if (result.affectedRows === 0) return fail("Document not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM regulatory_documents WHERE id = ?", [
      body.id,
    ]);
    return ok(rows[0], "Document updated");
  } catch (error) {
    console.error("Document update error:", error);
    return fail("Unable to update document", 500);
  }
}

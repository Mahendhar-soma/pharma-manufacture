import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import { fail, getSearchParams, ok, paginate } from "@/lib/api";
import { nextCode } from "@/lib/codes";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { page, limit, offset, search, status, sortDir, searchParams } = getSearchParams(request);
    const id = searchParams.get("id");

    if (id) {
      const rows = await query<RowDataPacket[]>(`SELECT * FROM audits WHERE id = ? LIMIT 1`, [id]);
      if (!rows.length) return fail("Audit not found", 404);
      const findings = await query<RowDataPacket[]>(
        `SELECT * FROM audit_findings WHERE audit_id = ? ORDER BY id DESC`,
        [id],
      );
      return ok({ ...rows[0], findings });
    }

    const where: string[] = ["1=1"];
    const params: unknown[] = [];

    if (search) {
      where.push(`(audit_number LIKE ? OR audit_type LIKE ? OR department LIKE ? OR auditor LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      where.push("status = ?");
      params.push(status);
    }

    const whereSql = where.join(" AND ");
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM audits WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT a.*,
        (SELECT COUNT(*) FROM audit_findings af WHERE af.audit_id = a.id) AS findings_count,
        (SELECT COUNT(*) FROM audit_findings af WHERE af.audit_id = a.id AND af.status = 'OPEN') AS open_findings
       FROM audits a
       WHERE ${whereSql}
       ORDER BY a.id ${sortDir}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({ items: rows, pagination: paginate(total, page, limit) });
  } catch (error) {
    console.error("Audits list error:", error);
    return fail("Unable to load audits", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.finding && body.audit_id) {
      const f = body.finding;
      if (!f.finding_title) return fail("finding_title is required");
      const result = await execute(
        `INSERT INTO audit_findings
          (audit_id, finding_title, severity, description, action_required, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          body.audit_id,
          f.finding_title,
          f.severity || "MEDIUM",
          f.description || null,
          f.action_required || null,
          f.status || "OPEN",
        ],
      );
      const rows = await query<RowDataPacket[]>("SELECT * FROM audit_findings WHERE id = ?", [
        result.insertId,
      ]);
      return ok(rows[0], "Finding added", 201);
    }

    const audit_type = String(body.audit_type || "").trim();
    if (!audit_type) return fail("audit_type is required");

    const audit_number =
      String(body.audit_number || "").trim() || (await nextCode("audits", "audit_number", "AUD"));

    const result = await execute(
      `INSERT INTO audits
        (audit_number, audit_type, department, auditor, start_date, end_date, status, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        audit_number,
        audit_type,
        body.department || null,
        body.auditor || null,
        body.start_date || null,
        body.end_date || null,
        body.status || "PLANNED",
        body.remarks || null,
      ],
    );

    const rows = await query<RowDataPacket[]>("SELECT * FROM audits WHERE id = ?", [result.insertId]);
    return ok(rows[0], "Audit created", 201);
  } catch (error) {
    console.error("Audit create error:", error);
    return fail("Unable to create audit", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) return fail("id is required");
    const result = await execute(
      `UPDATE audits SET
        audit_type = COALESCE(?, audit_type),
        department = COALESCE(?, department),
        auditor = COALESCE(?, auditor),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        status = COALESCE(?, status),
        remarks = COALESCE(?, remarks)
       WHERE id = ?`,
      [
        body.audit_type ?? null,
        body.department ?? null,
        body.auditor ?? null,
        body.start_date ?? null,
        body.end_date ?? null,
        body.status ?? null,
        body.remarks ?? null,
        body.id,
      ],
    );
    if (result.affectedRows === 0) return fail("Audit not found", 404);
    const rows = await query<RowDataPacket[]>("SELECT * FROM audits WHERE id = ?", [body.id]);
    return ok(rows[0], "Audit updated");
  } catch (error) {
    console.error("Audit update error:", error);
    return fail("Unable to update audit", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const id = body.id || new URL(request.url).searchParams.get("id");
    if (!id) return fail("id is required");
    const result = await execute(`UPDATE audits SET status = 'CANCELLED' WHERE id = ?`, [id]);
    if (result.affectedRows === 0) return fail("Audit not found", 404);
    return ok(null, "Audit cancelled");
  } catch (error) {
    console.error("Audit cancel error:", error);
    return fail("Unable to cancel audit", 500);
  }
}

import "server-only";
import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "STATUS_CHANGE"
  | "RELEASE"
  | "TRANSFER"
  | "ADJUST"
  | "LOGIN"
  | "LOGIN_FAILED"
  | "EXPIRE"
  | "COMPLETE"
  | "START";

export type AuditInput = {
  user?: SessionUser | null;
  action: AuditAction | string;
  entity_type: string;
  entity_id?: number | null;
  entity_code?: string | null;
  summary: string;
  before?: unknown;
  after?: unknown;
  request?: Request | null;
};

let ensured = false;

export async function ensureAuditLogsTable(): Promise<void> {
  if (ensured) return;
  await execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      user_id BIGINT UNSIGNED NULL,
      user_email VARCHAR(191) NULL,
      user_name VARCHAR(191) NULL,
      role_code VARCHAR(50) NULL,
      action VARCHAR(50) NOT NULL,
      entity_type VARCHAR(100) NOT NULL,
      entity_id BIGINT UNSIGNED NULL,
      entity_code VARCHAR(100) NULL,
      summary VARCHAR(500) NOT NULL,
      before_json JSON NULL,
      after_json JSON NULL,
      ip_address VARCHAR(64) NULL,
      request_path VARCHAR(255) NULL,
      KEY idx_audit_occurred (occurred_at),
      KEY idx_audit_entity (entity_type, entity_id),
      KEY idx_audit_user (user_id),
      KEY idx_audit_action (action)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  ensured = true;
}

function clientIp(request?: Request | null): string | null {
  if (!request) return null;
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}

function safeJson(value: unknown): string | null {
  if (value == null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ error: "unserializable" });
  }
}

/**
 * Append-only audit write. Never throws to callers — logging must not break business ops.
 */
export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await ensureAuditLogsTable();
    await execute(
      `INSERT INTO audit_logs
        (user_id, user_email, user_name, role_code, action, entity_type, entity_id,
         entity_code, summary, before_json, after_json, ip_address, request_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.user?.id ?? null,
        input.user?.email ?? null,
        input.user?.name ?? null,
        input.user?.role_code ?? null,
        String(input.action).slice(0, 50),
        String(input.entity_type).slice(0, 100),
        input.entity_id ?? null,
        input.entity_code ? String(input.entity_code).slice(0, 100) : null,
        String(input.summary).slice(0, 500),
        safeJson(input.before),
        safeJson(input.after),
        clientIp(input.request),
        input.request ? new URL(input.request.url).pathname.slice(0, 255) : null,
      ],
    );
  } catch (err) {
    console.error("[audit] write failed:", err);
  }
}

export type AuditListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  entity_type?: string;
  entity_id?: number | null;
  user_id?: number | null;
};

export async function listAuditLogs(filters: AuditListFilters = {}) {
  await ensureAuditLogsTable();
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const offset = (page - 1) * limit;
  const where: string[] = ["1=1"];
  const params: unknown[] = [];

  if (filters.action) {
    where.push("action = ?");
    params.push(filters.action);
  }
  if (filters.entity_type) {
    where.push("entity_type = ?");
    params.push(filters.entity_type);
  }
  if (filters.entity_id != null && !Number.isNaN(filters.entity_id)) {
    where.push("entity_id = ?");
    params.push(filters.entity_id);
  }
  if (filters.user_id != null && !Number.isNaN(filters.user_id)) {
    where.push("user_id = ?");
    params.push(filters.user_id);
  }
  if (filters.search) {
    where.push(
      `(summary LIKE ? OR entity_code LIKE ? OR user_email LIKE ? OR user_name LIKE ? OR action LIKE ? OR entity_type LIKE ?)`,
    );
    const q = `%${filters.search}%`;
    params.push(q, q, q, q, q, q);
  }

  const whereSql = where.join(" AND ");
  const countRows = await query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM audit_logs WHERE ${whereSql}`,
    params,
  );
  const total = Number(countRows[0]?.total || 0);

  const items = await query<RowDataPacket[]>(
    `SELECT id, occurred_at, user_id, user_email, user_name, role_code, action,
      entity_type, entity_id, entity_code, summary, before_json, after_json,
      ip_address, request_path
     FROM audit_logs
     WHERE ${whereSql}
     ORDER BY id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return { items, total, page, limit };
}

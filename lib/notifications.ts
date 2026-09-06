import "server-only";
import type { RowDataPacket } from "mysql2";
import { execute, query } from "@/lib/db";

export type NotificationSeverity = "critical" | "warning" | "info";

export type AppNotification = {
  key: string;
  type: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  href: string;
  entity_type?: string;
  entity_id?: number;
  meta?: Record<string, unknown>;
};

export async function ensureNotificationTables() {
  await execute(`
    CREATE TABLE IF NOT EXISTS notification_dismissals (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      notification_key VARCHAR(191) NOT NULL,
      dismissed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_notification (user_id, notification_key),
      KEY idx_nd_user (user_id),
      CONSTRAINT fk_nd_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function getDismissedKeys(userId: number): Promise<Set<string>> {
  try {
    const rows = await query<RowDataPacket[]>(
      `SELECT notification_key FROM notification_dismissals WHERE user_id = ?`,
      [userId],
    );
    return new Set(rows.map((r) => String(r.notification_key)));
  } catch {
    return new Set();
  }
}

export async function collectNotifications(): Promise<AppNotification[]> {
  const items: AppNotification[] = [];

  // Low stock (active materials below reorder)
  const lowStock = await query<RowDataPacket[]>(
    `SELECT rm.id, rm.material_code, rm.material_name, rm.reorder_level, rm.unit,
      COALESCE((
        SELECT SUM(rmb.available_quantity)
        FROM raw_material_batches rmb
        WHERE rmb.raw_material_id = rm.id
          AND rmb.status = 'AVAILABLE'
          AND rmb.expiry_date >= CURDATE()
      ), 0) AS current_stock
     FROM raw_materials rm
     WHERE rm.status = 'ACTIVE'
       AND rm.reorder_level > 0
       AND COALESCE((
         SELECT SUM(rmb.available_quantity)
         FROM raw_material_batches rmb
         WHERE rmb.raw_material_id = rm.id
           AND rmb.status = 'AVAILABLE'
           AND rmb.expiry_date >= CURDATE()
       ), 0) < rm.reorder_level
     ORDER BY (rm.reorder_level - COALESCE((
       SELECT SUM(rmb.available_quantity)
       FROM raw_material_batches rmb
       WHERE rmb.raw_material_id = rm.id
         AND rmb.status = 'AVAILABLE'
         AND rmb.expiry_date >= CURDATE()
     ), 0)) DESC
     LIMIT 50`,
  );
  for (const row of lowStock) {
    items.push({
      key: `LOW_STOCK:${row.id}`,
      type: "LOW_STOCK",
      severity: Number(row.current_stock) <= 0 ? "critical" : "warning",
      title: "Low stock",
      message: `${row.material_code} — ${row.material_name}: ${row.current_stock} ${row.unit} (reorder ${row.reorder_level})`,
      href: "/manufacturing/raw-materials",
      entity_type: "raw_material",
      entity_id: Number(row.id),
      meta: {
        current_stock: Number(row.current_stock),
        reorder_level: Number(row.reorder_level),
      },
    });
  }

  // Expired finished batches still holding stock / not marked sold out
  const expiredFg = await query<RowDataPacket[]>(
    `SELECT b.id, b.batch_number, p.product_name, b.expiry_date, b.status
     FROM batches b
     INNER JOIN products p ON p.id = b.product_id
     WHERE b.expiry_date < CURDATE()
       AND b.status NOT IN ('EXPIRED','SOLD_OUT','REJECTED')
     ORDER BY b.expiry_date ASC
     LIMIT 50`,
  );
  for (const row of expiredFg) {
    items.push({
      key: `EXPIRED_FG:${row.id}`,
      type: "EXPIRED_BATCH",
      severity: "critical",
      title: "Expired finished batch",
      message: `${row.batch_number} (${row.product_name}) expired ${row.expiry_date} — status ${row.status}`,
      href: "/manufacturing/expiry",
      entity_type: "batch",
      entity_id: Number(row.id),
    });
  }

  const expiredRm = await query<RowDataPacket[]>(
    `SELECT rmb.id, rmb.batch_number, rm.material_name, rmb.expiry_date, rmb.status
     FROM raw_material_batches rmb
     INNER JOIN raw_materials rm ON rm.id = rmb.raw_material_id
     WHERE rmb.expiry_date < CURDATE()
       AND rmb.status NOT IN ('EXPIRED','CONSUMED','REJECTED')
     ORDER BY rmb.expiry_date ASC
     LIMIT 50`,
  );
  for (const row of expiredRm) {
    items.push({
      key: `EXPIRED_RM:${row.id}`,
      type: "EXPIRED_RM_BATCH",
      severity: "critical",
      title: "Expired raw material batch",
      message: `${row.batch_number} (${row.material_name}) expired ${row.expiry_date}`,
      href: "/manufacturing/expiry",
      entity_type: "raw_material_batch",
      entity_id: Number(row.id),
    });
  }

  // Expiring within 7 / 30 days
  const expiring = await query<RowDataPacket[]>(
    `SELECT 'FG' AS kind, b.id, b.batch_number AS batch_number, p.product_name AS item_name,
        b.expiry_date,
        DATEDIFF(b.expiry_date, CURDATE()) AS days_left
     FROM batches b
     INNER JOIN products p ON p.id = b.product_id
     WHERE b.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
       AND b.status NOT IN ('EXPIRED','SOLD_OUT','REJECTED')
     UNION ALL
     SELECT 'RM' AS kind, rmb.id, rmb.batch_number, rm.material_name,
        rmb.expiry_date,
        DATEDIFF(rmb.expiry_date, CURDATE()) AS days_left
     FROM raw_material_batches rmb
     INNER JOIN raw_materials rm ON rm.id = rmb.raw_material_id
     WHERE rmb.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
       AND rmb.status NOT IN ('EXPIRED','CONSUMED','REJECTED')
     ORDER BY days_left ASC
     LIMIT 80`,
  );
  for (const row of expiring) {
    const days = Number(row.days_left);
    items.push({
      key: `EXPIRING_${row.kind}:${row.id}`,
      type: days <= 7 ? "EXPIRING_7" : "EXPIRING_30",
      severity: days <= 7 ? "warning" : "info",
      title: days <= 7 ? "Expiring within 7 days" : "Expiring within 30 days",
      message: `${row.batch_number} (${row.item_name}) expires in ${days} day(s) on ${row.expiry_date}`,
      href: "/manufacturing/expiry",
      entity_type: row.kind === "FG" ? "batch" : "raw_material_batch",
      entity_id: Number(row.id),
      meta: { days_left: days },
    });
  }

  // Overdue / due soon CAPA
  const capas = await query<RowDataPacket[]>(
    `SELECT id, capa_number, type, due_date, status,
      DATEDIFF(due_date, CURDATE()) AS days_left
     FROM capa
     WHERE due_date IS NOT NULL
       AND status NOT IN ('COMPLETED','CANCELLED')
       AND due_date <= DATE_ADD(CURDATE(), INTERVAL 14 DAY)
     ORDER BY due_date ASC
     LIMIT 50`,
  );
  for (const row of capas) {
    const days = Number(row.days_left);
    const overdue = days < 0;
    items.push({
      key: `CAPA:${row.id}`,
      type: overdue ? "CAPA_OVERDUE" : "CAPA_DUE_SOON",
      severity: overdue ? "critical" : "warning",
      title: overdue ? "Overdue CAPA" : "CAPA due soon",
      message: `${row.capa_number} (${row.type}) due ${row.due_date}${overdue ? ` — ${Math.abs(days)} day(s) overdue` : ` — in ${days} day(s)`}`,
      href: "/quality/capa",
      entity_type: "capa",
      entity_id: Number(row.id),
    });
  }

  // Calibration overdue / upcoming (latest calibration per equipment)
  const calibrations = await query<RowDataPacket[]>(
    `SELECT ec.id, ec.equipment_id, ec.next_calibration_date, ec.result,
        le.equipment_code, le.equipment_name,
        DATEDIFF(ec.next_calibration_date, CURDATE()) AS days_left
     FROM equipment_calibrations ec
     INNER JOIN laboratory_equipment le ON le.id = ec.equipment_id
     INNER JOIN (
       SELECT equipment_id, MAX(id) AS max_id
       FROM equipment_calibrations
       GROUP BY equipment_id
     ) latest ON latest.max_id = ec.id
     WHERE le.status = 'ACTIVE'
       AND ec.next_calibration_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
     ORDER BY ec.next_calibration_date ASC
     LIMIT 50`,
  );
  for (const row of calibrations) {
    const days = Number(row.days_left);
    const overdue = days < 0;
    items.push({
      key: `CALIBRATION:${row.equipment_id}`,
      type: overdue ? "CALIBRATION_OVERDUE" : "CALIBRATION_DUE_SOON",
      severity: overdue ? "critical" : "warning",
      title: overdue ? "Calibration overdue" : "Calibration due soon",
      message: `${row.equipment_code} — ${row.equipment_name}: next calibration ${row.next_calibration_date}${overdue ? ` (${Math.abs(days)} day(s) overdue)` : ` (in ${days} day(s))`}`,
      href: "/laboratory/equipment",
      entity_type: "equipment",
      entity_id: Number(row.equipment_id),
    });
  }

  // Open critical deviations
  const deviations = await query<RowDataPacket[]>(
    `SELECT id, deviation_number, title, severity, status, reported_date
     FROM deviations
     WHERE status IN ('OPEN','INVESTIGATION','CAPA')
       AND severity IN ('HIGH','CRITICAL')
     ORDER BY FIELD(severity,'CRITICAL','HIGH'), id DESC
     LIMIT 30`,
  );
  for (const row of deviations) {
    items.push({
      key: `DEVIATION:${row.id}`,
      type: "OPEN_DEVIATION",
      severity: row.severity === "CRITICAL" ? "critical" : "warning",
      title: `${row.severity} deviation open`,
      message: `${row.deviation_number}: ${row.title} (${row.status})`,
      href: "/quality/deviations",
      entity_type: "deviation",
      entity_id: Number(row.id),
    });
  }

  // QC-ready batches awaiting release
  const qcReady = await query<RowDataPacket[]>(
    `SELECT b.id, b.batch_number, p.product_name, b.status
     FROM batches b
     INNER JOIN products p ON p.id = b.product_id
     WHERE b.status IN ('QC_PENDING','QUARANTINE')
       AND EXISTS (SELECT 1 FROM samples s WHERE s.batch_id = b.id)
       AND NOT EXISTS (
         SELECT 1 FROM sample_tests st
         INNER JOIN samples s2 ON s2.id = st.sample_id
         WHERE s2.batch_id = b.id AND st.status IN ('PENDING','IN_PROGRESS')
       )
       AND EXISTS (
         SELECT 1 FROM test_results tr
         INNER JOIN sample_tests st3 ON st3.id = tr.sample_test_id
         INNER JOIN samples s3 ON s3.id = st3.sample_id
         WHERE s3.batch_id = b.id AND tr.pass_fail = 'PASS'
       )
       AND NOT EXISTS (
         SELECT 1 FROM test_results tr
         INNER JOIN sample_tests st4 ON st4.id = tr.sample_test_id
         INNER JOIN samples s4 ON s4.id = st4.sample_id
         WHERE s4.batch_id = b.id AND tr.pass_fail = 'FAIL'
       )
     ORDER BY b.id DESC
     LIMIT 30`,
  );
  for (const row of qcReady) {
    items.push({
      key: `QC_READY:${row.id}`,
      type: "QC_READY",
      severity: "info",
      title: "Batch ready for QC release",
      message: `${row.batch_number} (${row.product_name}) passed LIMS checks`,
      href: "/manufacturing/batches",
      entity_type: "batch",
      entity_id: Number(row.id),
    });
  }

  const severityRank = { critical: 0, warning: 1, info: 2 };
  items.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
  return items;
}

export async function getNotificationsForUser(userId: number) {
  await ensureNotificationTables().catch(() => undefined);
  const all = await collectNotifications();
  const dismissed = await getDismissedKeys(userId);
  const active = all.filter((n) => !dismissed.has(n.key));
  return {
    items: active,
    total: active.length,
    counts: {
      critical: active.filter((n) => n.severity === "critical").length,
      warning: active.filter((n) => n.severity === "warning").length,
      info: active.filter((n) => n.severity === "info").length,
      dismissed: dismissed.size,
    },
    generated_at: new Date().toISOString(),
  };
}

export async function dismissNotification(userId: number, key: string) {
  await ensureNotificationTables();
  await execute(
    `INSERT INTO notification_dismissals (user_id, notification_key)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE dismissed_at = CURRENT_TIMESTAMP`,
    [userId, key],
  );
}

export async function dismissNotifications(userId: number, keys: string[]) {
  await ensureNotificationTables();
  for (const key of keys) {
    await execute(
      `INSERT INTO notification_dismissals (user_id, notification_key)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE dismissed_at = CURRENT_TIMESTAMP`,
      [userId, key],
    );
  }
}

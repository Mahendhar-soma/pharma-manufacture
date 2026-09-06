import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";

export const REPORT_TYPES = [
  "inventory",
  "production",
  "purchases",
  "sales",
  "batches",
  "expiry",
  "raw-materials",
  "laboratory",
  "quality",
  "clinical",
  "regulatory",
  "crm",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export function isReportType(v: string): v is ReportType {
  return (REPORT_TYPES as readonly string[]).includes(v);
}

type ReportQuery = {
  sql: string;
  params: unknown[];
  columns: string[];
};

function dateFilter(
  column: string,
  from: string | null,
  to: string | null,
  where: string[],
  params: unknown[],
) {
  if (from) {
    where.push(`${column} >= ?`);
    params.push(from);
  }
  if (to) {
    where.push(`${column} <= ?`);
    params.push(to);
  }
}

function searchFilter(
  columns: string[],
  search: string | null,
  where: string[],
  params: unknown[],
) {
  if (search && columns.length) {
    where.push(`(${columns.map((c) => `${c} LIKE ?`).join(" OR ")})`);
    columns.forEach(() => params.push(`%${search}%`));
  }
}

export function buildReportQuery(
  type: ReportType,
  from: string | null,
  to: string | null,
  search: string | null,
): ReportQuery {
  const where: string[] = ["1=1"];
  const params: unknown[] = [];

  switch (type) {
    case "inventory": {
      searchFilter(
        ["w.warehouse_name", "rm.material_name", "p.product_name", "i.unit"],
        search,
        where,
        params,
      );
      dateFilter("i.updated_at", from, to, where, params);
      return {
        columns: [
          "id",
          "warehouse_name",
          "material_name",
          "product_name",
          "quantity",
          "unit",
          "updated_at",
        ],
        params,
        sql: `SELECT i.id, w.warehouse_name, rm.material_name, p.product_name, i.quantity, i.unit, i.updated_at
              FROM inventory i
              JOIN warehouses w ON w.id = i.warehouse_id
              LEFT JOIN raw_materials rm ON rm.id = i.raw_material_id
              LEFT JOIN products p ON p.id = i.product_id
              WHERE ${where.join(" AND ")}
              ORDER BY i.id DESC LIMIT 1000`,
      };
    }
    case "production": {
      searchFilter(["mo.mo_number", "p.product_name", "mo.status"], search, where, params);
      dateFilter("mo.created_at", from, to, where, params);
      return {
        columns: [
          "id",
          "mo_number",
          "product_name",
          "planned_quantity",
          "actual_quantity",
          "status",
          "planned_start_date",
        ],
        params,
        sql: `SELECT mo.id, mo.mo_number, p.product_name, mo.planned_quantity, mo.actual_quantity, mo.status, mo.planned_start_date
              FROM manufacturing_orders mo
              JOIN products p ON p.id = mo.product_id
              WHERE ${where.join(" AND ")}
              ORDER BY mo.id DESC LIMIT 1000`,
      };
    }
    case "purchases": {
      searchFilter(["po.po_number", "s.supplier_name", "po.status"], search, where, params);
      dateFilter("po.order_date", from, to, where, params);
      return {
        columns: ["id", "po_number", "supplier_name", "order_date", "total_amount", "status"],
        params,
        sql: `SELECT po.id, po.po_number, s.supplier_name, po.order_date, po.total_amount, po.status
              FROM purchase_orders po
              JOIN suppliers s ON s.id = po.supplier_id
              WHERE ${where.join(" AND ")}
              ORDER BY po.id DESC LIMIT 1000`,
      };
    }
    case "sales": {
      searchFilter(["so.invoice_number", "c.customer_name", "so.status"], search, where, params);
      dateFilter("so.invoice_date", from, to, where, params);
      return {
        columns: ["id", "invoice_number", "customer_name", "invoice_date", "total_amount", "status"],
        params,
        sql: `SELECT so.id, so.invoice_number, c.customer_name, so.invoice_date, so.total_amount, so.status
              FROM sales_orders so
              JOIN customers c ON c.id = so.customer_id
              WHERE ${where.join(" AND ")}
              ORDER BY so.id DESC LIMIT 1000`,
      };
    }
    case "batches": {
      searchFilter(["b.batch_number", "p.product_name", "b.status"], search, where, params);
      dateFilter("b.manufacturing_date", from, to, where, params);
      return {
        columns: [
          "id",
          "batch_number",
          "product_name",
          "manufacturing_date",
          "expiry_date",
          "actual_quantity",
          "status",
        ],
        params,
        sql: `SELECT b.id, b.batch_number, p.product_name, b.manufacturing_date, b.expiry_date, b.actual_quantity, b.status
              FROM batches b
              JOIN products p ON p.id = b.product_id
              WHERE ${where.join(" AND ")}
              ORDER BY b.id DESC LIMIT 1000`,
      };
    }
    case "expiry": {
      searchFilter(["batch_number", "item_name", "item_type"], search, where, params);
      if (from) {
        where.push("expiry_date >= ?");
        params.push(from);
      }
      if (to) {
        where.push("expiry_date <= ?");
        params.push(to);
      } else {
        where.push("expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY)");
      }
      return {
        columns: [
          "item_type",
          "item_name",
          "batch_number",
          "expiry_date",
          "available_quantity",
          "status",
        ],
        params,
        sql: `SELECT * FROM (
                SELECT 'FINISHED' AS item_type, p.product_name AS item_name, b.batch_number, b.expiry_date,
                       b.actual_quantity AS available_quantity, b.status
                FROM batches b JOIN products p ON p.id = b.product_id
                UNION ALL
                SELECT 'RAW' AS item_type, rm.material_name AS item_name, rmb.batch_number, rmb.expiry_date,
                       rmb.available_quantity, rmb.status
                FROM raw_material_batches rmb JOIN raw_materials rm ON rm.id = rmb.raw_material_id
              ) e
              WHERE ${where.join(" AND ")}
              ORDER BY expiry_date ASC LIMIT 1000`,
      };
    }
    case "raw-materials": {
      searchFilter(["material_code", "material_name", "material_type"], search, where, params);
      dateFilter("created_at", from, to, where, params);
      return {
        columns: ["id", "material_code", "material_name", "material_type", "unit", "reorder_level", "status"],
        params,
        sql: `SELECT id, material_code, material_name, material_type, unit, reorder_level, status
              FROM raw_materials WHERE ${where.join(" AND ")}
              ORDER BY id DESC LIMIT 1000`,
      };
    }
    case "laboratory": {
      searchFilter(["s.sample_code", "s.sample_type", "s.status"], search, where, params);
      dateFilter("s.received_date", from, to, where, params);
      return {
        columns: ["id", "sample_code", "sample_type", "product_name", "batch_number", "received_date", "status"],
        params,
        sql: `SELECT s.id, s.sample_code, s.sample_type, p.product_name, b.batch_number, s.received_date, s.status
              FROM samples s
              LEFT JOIN products p ON p.id = s.product_id
              LEFT JOIN batches b ON b.id = s.batch_id
              WHERE ${where.join(" AND ")}
              ORDER BY s.id DESC LIMIT 1000`,
      };
    }
    case "quality": {
      searchFilter(["deviation_number", "title", "department", "severity", "status"], search, where, params);
      dateFilter("reported_date", from, to, where, params);
      return {
        columns: ["id", "deviation_number", "title", "department", "severity", "reported_date", "status"],
        params,
        sql: `SELECT id, deviation_number, title, department, severity, reported_date, status
              FROM deviations WHERE ${where.join(" AND ")}
              ORDER BY id DESC LIMIT 1000`,
      };
    }
    case "clinical": {
      searchFilter(["study_code", "study_title", "phase", "sponsor", "status"], search, where, params);
      dateFilter("start_date", from, to, where, params);
      return {
        columns: ["id", "study_code", "study_title", "phase", "sponsor", "start_date", "status"],
        params,
        sql: `SELECT id, study_code, study_title, phase, sponsor, start_date, status
              FROM clinical_studies WHERE ${where.join(" AND ")}
              ORDER BY id DESC LIMIT 1000`,
      };
    }
    case "regulatory": {
      searchFilter(["submission_number", "title", "authority", "submission_type", "status"], search, where, params);
      dateFilter("submission_date", from, to, where, params);
      return {
        columns: ["id", "submission_number", "title", "authority", "submission_type", "submission_date", "status"],
        params,
        sql: `SELECT id, submission_number, title, authority, submission_type, submission_date, status
              FROM regulatory_submissions WHERE ${where.join(" AND ")}
              ORDER BY id DESC LIMIT 1000`,
      };
    }
    case "crm": {
      searchFilter(["d.doctor_name", "mr.mr_name", "dv.purpose", "dv.status"], search, where, params);
      dateFilter("dv.visit_date", from, to, where, params);
      return {
        columns: ["id", "doctor_name", "mr_name", "visit_date", "purpose", "status", "follow_up_date"],
        params,
        sql: `SELECT dv.id, d.doctor_name, mr.mr_name, dv.visit_date, dv.purpose, dv.status, dv.follow_up_date
              FROM doctor_visits dv
              JOIN doctors d ON d.id = dv.doctor_id
              JOIN medical_representatives mr ON mr.id = dv.medical_representative_id
              WHERE ${where.join(" AND ")}
              ORDER BY dv.id DESC LIMIT 1000`,
      };
    }
    default:
      throw new Error("Unsupported report type");
  }
}

export async function runReport(
  type: ReportType,
  from: string | null,
  to: string | null,
  search: string | null,
) {
  const { sql, params, columns } = buildReportQuery(type, from, to, search);
  const rows = await query<RowDataPacket[]>(sql, params);
  return { columns, rows };
}

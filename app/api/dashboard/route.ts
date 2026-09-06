import { query } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [[products]] = await Promise.all([
      query<RowDataPacket[]>("SELECT COUNT(*) AS c FROM products WHERE status = 'ACTIVE'"),
    ]);

    const counts = await query<RowDataPacket[]>(
      `SELECT
        (SELECT COUNT(*) FROM products WHERE status = 'ACTIVE') AS products,
        (SELECT COUNT(*) FROM raw_materials WHERE status = 'ACTIVE') AS raw_materials,
        (SELECT COUNT(*) FROM batches WHERE status IN ('QUARANTINE','QC_PENDING','RELEASED')) AS active_batches,
        (SELECT COUNT(*) FROM manufacturing_orders WHERE status IN ('PLANNED','RELEASED','IN_PROGRESS')) AS manufacturing_orders,
        (SELECT COUNT(*) FROM inventory WHERE quantity > 0) AS inventory_items,
        (SELECT COUNT(*) FROM samples WHERE status IN ('RECEIVED','IN_TESTING')) AS lab_samples,
        (SELECT COUNT(*) FROM clinical_studies WHERE status = 'ACTIVE') AS clinical_studies,
        (SELECT COUNT(*) FROM deviations WHERE status IN ('OPEN','INVESTIGATION','CAPA')) AS open_quality_issues,
        (SELECT COUNT(*) FROM batches WHERE expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 90 DAY) AND status NOT IN ('EXPIRED','SOLD_OUT','REJECTED')) AS expiring_batches,
        (SELECT COUNT(*) FROM doctors WHERE status = 'ACTIVE') AS doctors,
        (SELECT COUNT(*) FROM compounds WHERE status = 'ACTIVE') AS compounds,
        (SELECT COUNT(*) FROM preclinical_studies WHERE status IN ('PLANNED','IN_PROGRESS')) AS preclinical_studies,
        (SELECT COUNT(*) FROM regulatory_submissions WHERE status IN ('SUBMITTED','UNDER_REVIEW')) AS regulatory_open,
        (SELECT COUNT(*) FROM doctor_visits WHERE status IN ('PLANNED','FOLLOW_UP')) AS crm_visits
      `,
    );

    const monthlyProduction = await query<RowDataPacket[]>(
      `SELECT DATE_FORMAT(manufacturing_date, '%Y-%m') AS month, COUNT(*) AS batches, COALESCE(SUM(actual_quantity),0) AS quantity
       FROM batches
       GROUP BY DATE_FORMAT(manufacturing_date, '%Y-%m')
       ORDER BY month DESC
       LIMIT 6`,
    );

    const monthlySales = await query<RowDataPacket[]>(
      `SELECT DATE_FORMAT(invoice_date, '%Y-%m') AS month, COUNT(*) AS orders, COALESCE(SUM(total_amount),0) AS amount
       FROM sales_orders
       WHERE status != 'CANCELLED'
       GROUP BY DATE_FORMAT(invoice_date, '%Y-%m')
       ORDER BY month DESC
       LIMIT 6`,
    );

    const batchStatus = await query<RowDataPacket[]>(
      `SELECT status, COUNT(*) AS count FROM batches GROUP BY status`,
    );

    const expiryOverview = await query<RowDataPacket[]>(
      `SELECT
        SUM(CASE WHEN expiry_date < CURDATE() THEN 1 ELSE 0 END) AS expired,
        SUM(CASE WHEN expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS d7,
        SUM(CASE WHEN expiry_date BETWEEN DATE_ADD(CURDATE(), INTERVAL 8 DAY) AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS d30,
        SUM(CASE WHEN expiry_date BETWEEN DATE_ADD(CURDATE(), INTERVAL 31 DAY) AND DATE_ADD(CURDATE(), INTERVAL 90 DAY) THEN 1 ELSE 0 END) AS d90
       FROM (
         SELECT expiry_date FROM batches
         UNION ALL
         SELECT expiry_date FROM raw_material_batches
       ) e`,
    );

    return ok(
      {
        cards: counts[0] || {},
        charts: {
          monthlyProduction: monthlyProduction.reverse(),
          monthlySales: monthlySales.reverse(),
          batchStatus,
          expiryOverview: expiryOverview[0] || {},
        },
        meta: { productsSeedCheck: products?.c ?? 0 },
      },
      "Dashboard loaded",
    );
  } catch (error) {
    console.error("Dashboard error:", error);
    return fail("Unable to load dashboard", 500);
  }
}

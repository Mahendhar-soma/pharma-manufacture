import { query } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";

export async function GET() {
  try {
    const selectFg = `
      SELECT 'FINISHED' AS item_type, b.batch_number, p.product_name AS item_name,
        b.expiry_date, COALESCE(i.quantity,0) AS available_quantity,
        w.warehouse_name, b.status
      FROM batches b
      INNER JOIN products p ON p.id = b.product_id
      INNER JOIN warehouses w ON w.id = b.warehouse_id
      LEFT JOIN inventory i ON i.batch_id = b.id
    `;
    const selectRm = `
      SELECT 'RAW_MATERIAL' AS item_type, rmb.batch_number, rm.material_name AS item_name,
        rmb.expiry_date, rmb.available_quantity, w.warehouse_name, rmb.status
      FROM raw_material_batches rmb
      INNER JOIN raw_materials rm ON rm.id = rmb.raw_material_id
      INNER JOIN warehouses w ON w.id = rmb.warehouse_id
    `;

    const expired = await query<RowDataPacket[]>(
      `${selectFg} WHERE b.expiry_date < CURDATE()
       UNION ALL
       ${selectRm} WHERE rmb.expiry_date < CURDATE()
       ORDER BY expiry_date ASC`,
    );

    const d7 = await query<RowDataPacket[]>(
      `${selectFg} WHERE b.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
       UNION ALL
       ${selectRm} WHERE rmb.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
       ORDER BY expiry_date ASC`,
    );

    const d30 = await query<RowDataPacket[]>(
      `${selectFg} WHERE b.expiry_date BETWEEN DATE_ADD(CURDATE(), INTERVAL 8 DAY) AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
       UNION ALL
       ${selectRm} WHERE rmb.expiry_date BETWEEN DATE_ADD(CURDATE(), INTERVAL 8 DAY) AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
       ORDER BY expiry_date ASC`,
    );

    const d90 = await query<RowDataPacket[]>(
      `${selectFg} WHERE b.expiry_date BETWEEN DATE_ADD(CURDATE(), INTERVAL 31 DAY) AND DATE_ADD(CURDATE(), INTERVAL 90 DAY)
       UNION ALL
       ${selectRm} WHERE rmb.expiry_date BETWEEN DATE_ADD(CURDATE(), INTERVAL 31 DAY) AND DATE_ADD(CURDATE(), INTERVAL 90 DAY)
       ORDER BY expiry_date ASC`,
    );

    return ok({
      expired,
      expiring_7_days: d7,
      expiring_30_days: d30,
      expiring_90_days: d90,
      counts: {
        expired: expired.length,
        d7: d7.length,
        d30: d30.length,
        d90: d90.length,
      },
    });
  } catch (error) {
    console.error(error);
    return fail("Unable to load expiry dashboard", 500);
  }
}

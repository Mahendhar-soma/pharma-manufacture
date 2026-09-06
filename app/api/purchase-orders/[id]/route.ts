import { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { getPoReceiveBalances, computePoReceiveStatus } from "@/lib/purchase-receive";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const rows = await query<RowDataPacket[]>(
      `SELECT po.*, s.supplier_name, s.supplier_code, w.warehouse_name
       FROM purchase_orders po
       INNER JOIN suppliers s ON s.id = po.supplier_id
       LEFT JOIN warehouses w ON w.id = po.warehouse_id
       WHERE po.id = ? LIMIT 1`,
      [id],
    );
    if (!rows.length) return fail("Purchase order not found", 404);

    const items = await getPoReceiveBalances(Number(id));
    const receive_status = computePoReceiveStatus(items);

    return ok({
      ...rows[0],
      items,
      receive_summary: {
        lines: items.length,
        open_lines: items.filter((i) => i.remaining_quantity > 0).length,
        receive_status,
      },
    });
  } catch (error) {
    console.error(error);
    return fail("Unable to load purchase order", 500);
  }
}

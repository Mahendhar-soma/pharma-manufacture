import { NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";
import { fail, getSearchParams, ok, paginate } from "@/lib/api";
import { ensurePurchaseTxnSchema } from "@/lib/ensure-phase18";
import { TXN_TYPES, TXN_TYPE_LABELS, txnTypeAliases } from "@/lib/txn-labels";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await ensurePurchaseTxnSchema();
    const { page, limit, offset, search, searchParams } = getSearchParams(request);
    const transaction_type = (searchParams.get("transaction_type") || "").trim();
    const raw_material_id = searchParams.get("raw_material_id");
    const purchase_order_id = searchParams.get("purchase_order_id");
    const po_number = (searchParams.get("po_number") || "").trim();
    const lot_number = (searchParams.get("lot_number") || "").trim();
    const supplier_id = searchParams.get("supplier_id");
    const user_id = searchParams.get("user_id");
    const date_from = (searchParams.get("date_from") || searchParams.get("from") || "").trim();
    const date_to = (searchParams.get("date_to") || searchParams.get("to") || "").trim();
    const group_by = (searchParams.get("group_by") || "").trim(); // "type" for type-wise report

    const where: string[] = ["1=1"];
    const params: unknown[] = [];

    if (search) {
      where.push(
        `(it.remarks LIKE ? OR it.lot_number LIKE ? OR it.reference_type LIKE ? OR po.po_number LIKE ? OR gr.grn_number LIKE ? OR rm.material_name LIKE ? OR rm.material_code LIKE ?)`,
      );
      const q = `%${search}%`;
      params.push(q, q, q, q, q, q, q);
    }
    if (transaction_type) {
      const aliases = txnTypeAliases(transaction_type);
      where.push(`it.transaction_type IN (${aliases.map(() => "?").join(",")})`);
      params.push(...aliases);
    }
    if (raw_material_id) {
      where.push("it.raw_material_id = ?");
      params.push(Number(raw_material_id));
    }
    if (purchase_order_id) {
      where.push("it.purchase_order_id = ?");
      params.push(Number(purchase_order_id));
    }
    if (po_number) {
      where.push("po.po_number LIKE ?");
      params.push(`%${po_number}%`);
    }
    if (lot_number) {
      where.push("(it.lot_number LIKE ? OR rmb.batch_number LIKE ? OR b.batch_number LIKE ?)");
      params.push(`%${lot_number}%`, `%${lot_number}%`, `%${lot_number}%`);
    }
    if (supplier_id) {
      where.push("it.supplier_id = ?");
      params.push(Number(supplier_id));
    }
    if (user_id) {
      where.push("it.created_by = ?");
      params.push(Number(user_id));
    }
    if (date_from) {
      where.push("DATE(it.transaction_date) >= ?");
      params.push(date_from);
    }
    if (date_to) {
      where.push("DATE(it.transaction_date) <= ?");
      params.push(date_to);
    }

    const whereSql = where.join(" AND ");
    const fromSql = `
      FROM inventory_transactions it
      INNER JOIN warehouses w ON w.id = it.warehouse_id
      LEFT JOIN raw_materials rm ON rm.id = it.raw_material_id
      LEFT JOIN products p ON p.id = it.product_id
      LEFT JOIN users u ON u.id = it.created_by
      LEFT JOIN suppliers s ON s.id = it.supplier_id
      LEFT JOIN purchase_orders po ON po.id = it.purchase_order_id
      LEFT JOIN purchase_order_items poi ON poi.id = it.purchase_order_item_id
      LEFT JOIN goods_receipts gr ON it.reference_type = 'GOODS_RECEIPT' AND gr.id = it.reference_id
      LEFT JOIN raw_material_batches rmb ON rmb.id = it.raw_material_batch_id
      LEFT JOIN batches b ON b.id = it.batch_id
    `;

    if (group_by === "type") {
      const groups = await query<RowDataPacket[]>(
        `SELECT it.transaction_type AS transaction_type,
          COUNT(*) AS txn_count,
          SUM(it.quantity) AS total_quantity,
          SUM(COALESCE(it.total_cost, 0)) AS total_cost
         ${fromSql}
         WHERE ${whereSql}
         GROUP BY it.transaction_type
         ORDER BY it.transaction_type`,
        params,
      );
      return ok({
        group_by: "type",
        groups: groups.map((g) => ({
          ...g,
          label: TXN_TYPE_LABELS[String(g.transaction_type)] || g.transaction_type,
        })),
        types: TXN_TYPES.map((t) => ({ value: t, label: TXN_TYPE_LABELS[t] || t })),
      });
    }

    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total ${fromSql} WHERE ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const rows = await query<RowDataPacket[]>(
      `SELECT it.*,
        w.warehouse_name, w.warehouse_code,
        rm.material_name, rm.material_code,
        p.product_name, p.product_code,
        u.name AS created_by_name, u.email AS created_by_email,
        s.supplier_name, s.supplier_code,
        po.po_number,
        gr.grn_number,
        COALESCE(it.lot_number, rmb.batch_number, b.batch_number) AS batch_lot,
        poi.ordered_quantity AS po_ordered_quantity
       ${fromSql}
       WHERE ${whereSql}
       ORDER BY it.transaction_date DESC, it.id DESC
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      params,
    );

    return ok({
      items: rows.map((r) => ({
        ...r,
        type_label: TXN_TYPE_LABELS[String(r.transaction_type)] || r.transaction_type,
      })),
      pagination: paginate(total, page, limit),
      types: TXN_TYPES.map((t) => ({ value: t, label: TXN_TYPE_LABELS[t] || t })),
    });
  } catch (error) {
    console.error(error);
    return fail("Unable to load inventory transactions", 500);
  }
}

import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPurchaseOrderPrint } from "@/lib/print-data";
import PrintToolbar from "@/components/print/PrintToolbar";
import {
  DocFooter,
  DocHeader,
  DocShell,
  DocSignatures,
  DocTable,
} from "@/components/print/DocBlocks";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function PrintPurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const doc = await getPurchaseOrderPrint(Number(id));
  if (!doc) notFound();

  const total = Number(doc.total_amount || 0);

  return (
    <>
      <PrintToolbar title={`Purchase Order ${doc.po_number}`} backHref="/purchases" />
      <DocShell>
        <DocHeader
          docTitle="Purchase Order"
          docNumber={String(doc.po_number)}
          meta={[
            { label: "Order Date", value: formatDate(String(doc.order_date)) },
            { label: "Expected Date", value: formatDate(String(doc.expected_date || "")) },
            { label: "Status", value: String(doc.status) },
            {
              label: "Supplier",
              value: `${doc.supplier_code} — ${doc.supplier_name}`,
            },
            { label: "Warehouse", value: String(doc.warehouse_name || "-") },
            { label: "Created By", value: String(doc.created_by_name || "-") },
          ]}
        />

        <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div className="rounded border border-slate-200 p-3">
            <div className="font-semibold">Supplier</div>
            <div>{String(doc.supplier_name)}</div>
            <div className="text-slate-600">{String(doc.supplier_address || "-")}</div>
            <div className="text-slate-600">
              {String(doc.supplier_phone || "-")} · {String(doc.supplier_email || "-")}
            </div>
            <div className="text-slate-600">GST: {String(doc.supplier_gst || "-")}</div>
          </div>
          <div className="rounded border border-slate-200 p-3">
            <div className="font-semibold">Bill To / Ship To</div>
            <div>Pharma Life Sciences Plant</div>
            <div className="text-slate-600">{String(doc.warehouse_name || "Main Warehouse")}</div>
          </div>
        </div>

        <DocTable
          headers={["#", "Material", "Qty", "Unit", "Unit Price", "Total"]}
          rows={(doc.items as Array<Record<string, unknown>>).map((item, idx) => [
            idx + 1,
            `${item.material_code} — ${item.material_name}`,
            Number(item.ordered_quantity),
            String(item.unit),
            formatMoney(Number(item.unit_price)),
            formatMoney(Number(item.total_price)),
          ])}
        />

        <div className="mt-4 flex justify-end">
          <div className="rounded border border-slate-300 px-4 py-2 text-sm">
            <span className="text-slate-600">Grand Total: </span>
            <span className="text-lg font-semibold">{formatMoney(total)}</span>
          </div>
        </div>

        <DocSignatures labels={["Requested by", "Purchase Manager", "Authorized Signatory"]} />
        <DocFooter />
      </DocShell>
    </>
  );
}

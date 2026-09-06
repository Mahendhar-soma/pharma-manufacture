import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getSalesInvoicePrint } from "@/lib/print-data";
import PrintToolbar from "@/components/print/PrintToolbar";
import {
  DocFooter,
  DocHeader,
  DocShell,
  DocSignatures,
  DocTable,
} from "@/components/print/DocBlocks";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function PrintSalesInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const doc = await getSalesInvoicePrint(Number(id));
  if (!doc) notFound();

  return (
    <>
      <PrintToolbar title={`Invoice ${doc.invoice_number}`} backHref="/manufacturing/sales" />
      <DocShell>
        <DocHeader
          docTitle="Tax Invoice / Sales Invoice"
          docNumber={String(doc.invoice_number)}
          meta={[
            { label: "Invoice Date", value: formatDate(String(doc.invoice_date)) },
            { label: "Status", value: String(doc.status) },
            {
              label: "Customer",
              value: `${doc.customer_code} — ${doc.customer_name}`,
            },
            { label: "Warehouse", value: String(doc.warehouse_name) },
            { label: "Prepared By", value: String(doc.created_by_name || "-") },
          ]}
        />

        <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div className="rounded border border-slate-200 p-3">
            <div className="font-semibold">Bill To</div>
            <div>{String(doc.customer_name)}</div>
            <div className="text-slate-600">{String(doc.customer_address || "-")}</div>
            <div className="text-slate-600">
              {String(doc.customer_phone || "-")} · {String(doc.customer_email || "-")}
            </div>
            <div className="text-slate-600">GST: {String(doc.customer_gst || "-")}</div>
          </div>
          <div className="rounded border border-slate-200 p-3">
            <div className="font-semibold">Dispatch From</div>
            <div>{String(doc.warehouse_name)}</div>
            <div className="text-slate-600">{String(doc.warehouse_code)}</div>
          </div>
        </div>

        <DocTable
          headers={[
            "#",
            "Product",
            "Batch",
            "Expiry",
            "Qty",
            "Unit Price",
            "Line Total",
          ]}
          rows={(doc.items as Array<Record<string, unknown>>).map((item, idx) => [
            idx + 1,
            `${item.product_code} — ${item.product_name}`,
            String(item.batch_number),
            formatDate(String(item.expiry_date || "")),
            Number(item.quantity),
            formatMoney(Number(item.unit_price)),
            formatMoney(Number(item.total_price)),
          ])}
        />

        <div className="mt-4 flex justify-end">
          <div className="rounded border border-slate-300 px-4 py-2 text-sm">
            <span className="text-slate-600">Invoice Total: </span>
            <span className="text-lg font-semibold">
              {formatMoney(Number(doc.total_amount))}
            </span>
          </div>
        </div>

        <DocSignatures labels={["Sales Executive", "Accounts", "Customer Acknowledgement"]} />
        <DocFooter note="Only RELEASED finished batches are invoiced. Batch numbers on this invoice support forward/backward traceability." />
      </DocShell>
    </>
  );
}

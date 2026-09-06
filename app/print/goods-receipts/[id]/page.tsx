import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getGoodsReceiptPrint } from "@/lib/print-data";
import PrintToolbar from "@/components/print/PrintToolbar";
import {
  DocFooter,
  DocHeader,
  DocShell,
  DocSignatures,
  DocTable,
} from "@/components/print/DocBlocks";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function PrintGoodsReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const doc = await getGoodsReceiptPrint(Number(id));
  if (!doc) notFound();

  return (
    <>
      <PrintToolbar title={`Goods Receipt ${doc.grn_number}`} backHref="/purchases" />
      <DocShell>
        <DocHeader
          docTitle="Goods Receipt Note (GRN)"
          docNumber={String(doc.grn_number)}
          meta={[
            { label: "Receipt Date", value: formatDate(String(doc.receipt_date)) },
            { label: "PO Number", value: String(doc.po_number) },
            { label: "Status", value: String(doc.status) },
            {
              label: "Supplier",
              value: `${doc.supplier_code} — ${doc.supplier_name}`,
            },
            { label: "Warehouse", value: String(doc.warehouse_name) },
            { label: "Received By", value: String(doc.created_by_name || "-") },
          ]}
        />

        <DocTable
          headers={[
            "#",
            "Material",
            "Batch No",
            "Mfg Date",
            "Expiry",
            "Qty",
            "Unit",
            "Unit Price",
          ]}
          rows={(doc.items as Array<Record<string, unknown>>).map((item, idx) => [
            idx + 1,
            `${item.material_code} — ${item.material_name}`,
            String(item.batch_number),
            formatDate(String(item.manufacturing_date || "")),
            formatDate(String(item.expiry_date || "")),
            Number(item.quantity),
            String(item.unit),
            formatMoney(Number(item.unit_price)),
          ])}
        />

        <DocSignatures labels={["Received by", "Warehouse Manager", "QA Verification"]} />
        <DocFooter note="Verify batch numbers, expiry dates and quantities against physical delivery before inventory posting." />
      </DocShell>
    </>
  );
}

import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getBatchRecordPrint } from "@/lib/print-data";
import PrintToolbar from "@/components/print/PrintToolbar";
import {
  DocFooter,
  DocHeader,
  DocShell,
  DocSignatures,
  DocTable,
} from "@/components/print/DocBlocks";
import { formatDate } from "@/lib/utils";

export default async function PrintBatchRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const doc = await getBatchRecordPrint(Number(id));
  if (!doc) notFound();

  return (
    <>
      <PrintToolbar
        title={`Batch Record ${doc.batch_number}`}
        backHref="/manufacturing/batches"
      />
      <DocShell>
        <DocHeader
          docTitle="Batch Manufacturing Record (BMR)"
          docNumber={String(doc.batch_number)}
          meta={[
            {
              label: "Product",
              value: `${doc.product_code} — ${doc.product_name}`,
            },
            { label: "Strength / Form", value: `${doc.strength || "-"} / ${doc.dosage_form || "-"}` },
            { label: "MO Number", value: String(doc.mo_number || "-") },
            {
              label: "Formula",
              value: doc.formula_code
                ? `${doc.formula_code} v${doc.formula_version}`
                : "-",
            },
            { label: "Mfg Date", value: formatDate(String(doc.manufacturing_date)) },
            { label: "Expiry Date", value: formatDate(String(doc.expiry_date)) },
            {
              label: "Quantity",
              value: `${doc.actual_quantity} ${doc.unit} (planned ${doc.planned_quantity})`,
            },
            { label: "Status", value: String(doc.status) },
            { label: "Warehouse", value: String(doc.warehouse_name) },
          ]}
        />

        <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-700">
          Formula Bill of Materials
        </h2>
        <DocTable
          headers={["Seq", "Material", "Qty / Batch", "Unit", "%"]}
          rows={(doc.formula_items as Array<Record<string, unknown>>).map((item) => [
            Number(item.sequence_no || 0),
            `${item.material_code} — ${item.material_name}`,
            Number(item.quantity),
            String(item.unit),
            item.percentage == null ? "-" : Number(item.percentage),
          ])}
        />

        <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-700">
          Actual Material Consumption (Traceability)
        </h2>
        <DocTable
          headers={["Material", "Supplier Batch", "Supplier", "Planned", "Actual", "Expiry"]}
          rows={(doc.consumption as Array<Record<string, unknown>>).map((item) => [
            `${item.material_code} — ${item.material_name}`,
            String(item.rm_batch_number),
            String(item.supplier_name || "-"),
            `${item.planned_quantity} ${item.unit}`,
            `${item.actual_quantity} ${item.unit}`,
            formatDate(String(item.rm_expiry_date || "")),
          ])}
        />

        <DocSignatures
          labels={["Production Officer", "QA Review", "Batch Release Authority"]}
        />
        <DocFooter note="BMR must be retained as a controlled quality record. Do not alter handwritten entries without deviation control." />
      </DocShell>
    </>
  );
}

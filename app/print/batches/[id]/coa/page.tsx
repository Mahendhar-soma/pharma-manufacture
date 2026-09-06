import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getCoaPrint } from "@/lib/print-data";
import PrintToolbar from "@/components/print/PrintToolbar";
import {
  DocFooter,
  DocHeader,
  DocShell,
  DocSignatures,
  DocTable,
} from "@/components/print/DocBlocks";
import { formatDate } from "@/lib/utils";

export default async function PrintCoaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const doc = await getCoaPrint(Number(id));
  if (!doc) notFound();

  const batch = doc.batch;

  return (
    <>
      <PrintToolbar
        title={`CoA ${batch.batch_number}`}
        backHref="/manufacturing/batches"
      />
      <DocShell>
        <DocHeader
          docTitle="Certificate of Analysis (CoA)"
          docNumber={`COA-${batch.batch_number}`}
          meta={[
            {
              label: "Product",
              value: `${batch.product_code} — ${batch.product_name}`,
            },
            { label: "Batch Number", value: String(batch.batch_number) },
            { label: "Mfg Date", value: formatDate(String(batch.manufacturing_date)) },
            { label: "Expiry Date", value: formatDate(String(batch.expiry_date)) },
            { label: "Batch Status", value: String(batch.status) },
            { label: "Disposition", value: doc.disposition },
          ]}
        />

        <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-700">
          Samples
        </h2>
        <DocTable
          headers={["Sample Code", "Type", "Received", "Status"]}
          rows={(doc.samples as Array<Record<string, unknown>>).map((s) => [
            String(s.sample_code),
            String(s.sample_type),
            formatDate(String(s.received_date || "")),
            String(s.status),
          ])}
        />

        <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-700">
          Test Results
        </h2>
        <DocTable
          headers={["Sample", "Test", "Parameter", "Result", "Unit", "Spec", "Pass/Fail"]}
          rows={(doc.results as Array<Record<string, unknown>>).map((r) => [
            String(r.sample_code),
            String(r.test_name),
            String(r.parameter),
            String(r.result_value ?? "-"),
            String(r.unit || "-"),
            String(r.specification || "-"),
            String(r.pass_fail),
          ])}
        />

        <div className="mt-6 rounded border border-slate-300 p-4 text-sm">
          <div className="font-semibold">Quality Disposition</div>
          <div className="mt-1 text-lg font-bold tracking-wide">{doc.disposition}</div>
          <p className="mt-2 text-slate-600">
            This certificate summarizes LIMS results linked to the finished batch. Release for
            sale is permitted only when batch status is RELEASED.
          </p>
        </div>

        <DocSignatures labels={["Analyst", "QC Reviewer", "QA Approver"]} />
        <DocFooter />
      </DocShell>
    </>
  );
}

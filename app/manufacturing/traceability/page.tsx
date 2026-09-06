"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { StatusCell } from "@/components/tables/ResponsiveTable";
import { Alert, Button, Card, FilterActions, FilterBar, FormField, PageHeader, SearchInput, Select, StatCard } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export default function TraceabilityPage() {
  const [mode, setMode] = useState<"finished" | "raw">("finished");
  const [batchNumber, setBatchNumber] = useState("PARA-20260901-001");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => j.success && setUserName(j.data.name));
  }, []);

  async function search() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const url =
        mode === "finished"
          ? `/api/traceability/batch/${encodeURIComponent(batchNumber)}`
          : `/api/traceability/raw-material/${encodeURIComponent(batchNumber)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Traceability lookup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout title="Traceability" userName={userName}>
      <PageHeader
        title="Batch Traceability"
        subtitle="Forward and reverse genealogy for finished and raw-material batches"
      />

      <Card className="mb-4">
        <FilterBar className="sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]">
          <FormField label="Trace mode" hint="Finished batch genealogy or raw-material reverse trace">
            <Select value={mode} onChange={(e) => setMode(e.target.value as "finished" | "raw")}>
              <option value="finished">Finished Batch</option>
              <option value="raw">Raw Material Batch</option>
            </Select>
          </FormField>
          <SearchInput
            value={batchNumber}
            onChange={setBatchNumber}
            label="Batch number"
            hint="Enter the finished or raw-material batch / lot to trace"
            placeholder="Enter batch number"
          />
          <FilterActions>
            <Button onClick={search} disabled={loading} className="w-full sm:w-auto">
              {loading ? "Searching..." : "Trace"}
            </Button>
          </FilterActions>
        </FilterBar>
      </Card>

      {error ? <Alert type="error">{error}</Alert> : null}

      {data && mode === "finished" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <StatCard
              label="Product"
              value={String((data.product as { product_name?: string })?.product_name || "-")}
            />
            <StatCard
              label="Finished Batch"
              value={String((data.finished_batch as { batch_number?: string })?.batch_number || "-")}
            />
            <StatCard
              label="Manufacturing Order"
              value={String((data.manufacturing_order as { mo_number?: string })?.mo_number || "-")}
            />
          </div>
          <Card>
            <h3 className="mb-3 font-semibold text-slate-900">Raw Materials Consumed</h3>
            <ResponsiveTable
              rows={(data.raw_materials as Array<Record<string, unknown> & { id?: number }>) || []}
              columns={[
                { key: "material_name", header: "Material" },
                { key: "rm_batch_number", header: "RM Batch" },
                { key: "supplier_name", header: "Supplier" },
                { key: "actual_quantity", header: "Qty" },
                { key: "po_number", header: "PO" },
                { key: "grn_number", header: "GRN" },
                {
                  key: "rm_expiry_date",
                  header: "Expiry",
                  render: (r) => formatDate(String(r.rm_expiry_date || "")),
                },
              ]}
            />
          </Card>
          <Card>
            <h3 className="mb-3 font-semibold text-slate-900">Sales / Customers</h3>
            <ResponsiveTable
              rows={(data.sales as Array<Record<string, unknown> & { id?: number }>) || []}
              emptyTitle="No sales linked yet"
              columns={[
                { key: "invoice_number", header: "Invoice" },
                { key: "customer_name", header: "Customer" },
                { key: "quantity", header: "Qty" },
                {
                  key: "invoice_date",
                  header: "Date",
                  render: (r) => formatDate(String(r.invoice_date || "")),
                },
                {
                  key: "status",
                  header: "Status",
                  render: (r) => <StatusCell value={String(r.status || "")} />,
                },
              ]}
            />
          </Card>
        </div>
      ) : null}

      {data && mode === "raw" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <StatCard
              label="Supplier"
              value={String((data.supplier as { supplier_name?: string })?.supplier_name || "-")}
            />
            <StatCard
              label="Purchase Order"
              value={String((data.purchase_order as { po_number?: string })?.po_number || "-")}
            />
            <StatCard
              label="Goods Receipt"
              value={String((data.goods_receipt as { grn_number?: string })?.grn_number || "-")}
            />
          </div>
          <Card>
            <h3 className="mb-3 font-semibold text-slate-900">Used In Finished Batches</h3>
            <ResponsiveTable
              rows={(data.manufacturing_batches as Array<Record<string, unknown> & { id?: number }>) || []}
              emptyTitle="Not consumed in any finished batch yet"
              columns={[
                { key: "batch_number", header: "Finished Batch" },
                { key: "product_name", header: "Product" },
                { key: "mo_number", header: "MO" },
                { key: "actual_quantity", header: "Consumed Qty" },
                {
                  key: "status",
                  header: "Status",
                  render: (r) => <StatusCell value={String(r.status || "")} />,
                },
              ]}
            />
          </Card>
          <Card>
            <h3 className="mb-3 font-semibold text-slate-900">Customers / Sales</h3>
            <ResponsiveTable
              rows={(data.customers_sales as Array<Record<string, unknown> & { id?: number }>) || []}
              emptyTitle="No downstream sales yet"
              columns={[
                { key: "invoice_number", header: "Invoice" },
                { key: "customer_name", header: "Customer" },
                { key: "batch_number", header: "FG Batch" },
                { key: "quantity", header: "Qty" },
              ]}
            />
          </Card>
        </div>
      ) : null}
    </AppLayout>
  );
}

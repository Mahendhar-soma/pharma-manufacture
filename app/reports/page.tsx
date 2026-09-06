"use client";

import { useCallback, useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable from "@/components/tables/ResponsiveTable";
import { Alert, Button, Card, FilterActions, FilterBar, FormField, Input, PageHeader, SearchInput, Select } from "@/components/ui";

const REPORT_TYPES = [
  "inventory",
  "production",
  "purchases",
  "sales",
  "batches",
  "expiry",
  "raw-materials",
  "laboratory",
  "quality",
  "clinical",
  "regulatory",
  "crm",
] as const;

export default function ReportsPage() {
  const [type, setType] = useState<(typeof REPORT_TYPES)[number]>("inventory");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (search) params.set("search", search);
      const res = await fetch(`/api/reports/${type}?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setColumns(json.data?.columns || []);
      setRows(json.data?.rows || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load report");
      setRows([]);
      setColumns([]);
    } finally {
      setLoading(false);
    }
  }, [type, from, to, search]);

  useEffect(() => {
    load();
  }, [load]);

  function exportCsv() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (search) params.set("search", search);
    window.open(`/api/reports/${type}/export?${params}`, "_blank");
  }

  function printReport() {
    window.print();
  }

  return (
    <AppLayout title="Reports">
      <PageHeader
        title="Reports"
        subtitle="Operational and compliance reports"
        actions={
          <div className="flex gap-2 print:hidden">
            <Button variant="secondary" onClick={printReport}>Print</Button>
            <Button onClick={exportCsv}>Export CSV</Button>
          </div>
        }
      />
      <Card className="mb-4 print:hidden">
        <FilterBar className="sm:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto]">
          <FormField label="Report type" hint="Which operational report to load">
            <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              {REPORT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="From" hint="Optional start date">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </FormField>
          <FormField label="To" hint="Optional end date">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </FormField>
          <SearchInput value={search} onChange={setSearch} placeholder="Filter rows..." label="Search" hint="Filter rows in the loaded report" />
          <FilterActions>
            <Button variant="secondary" onClick={load} className="w-full sm:w-auto">
              Refresh
            </Button>
          </FilterActions>
        </FilterBar>
      </Card>
      {error ? <Alert type="error">{error}</Alert> : null}
      <div className="print:block">
        <h3 className="mb-3 hidden text-lg font-semibold print:block">
          {type} report {from || to ? `(${from || "…"} to ${to || "…"})` : ""}
        </h3>
        <ResponsiveTable
          columns={columns.map((c) => ({
            key: c,
            header: c.replace(/_/g, " "),
            render: (r: Record<string, unknown>) => String(r[c] ?? "-"),
          }))}
          rows={rows.map((r, i) => ({ ...r, id: (r.id as number) ?? i }))}
          loading={loading}
          error={error}
          onRetry={load}
          emptyTitle="No rows for this report"
          minWidth="1000px"
        />
      </div>
    </AppLayout>
  );
}

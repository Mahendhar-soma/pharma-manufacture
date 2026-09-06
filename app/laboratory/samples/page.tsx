"use client";

import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { StatusCell } from "@/components/tables/ResponsiveTable";
import { Button, Card, Input, Label, PageHeader, SearchInput, Select, Alert, FilterActions, FilterBar, FormField } from "@/components/ui";
import { useApiList } from "@/hooks/useApiList";
import { formatDate } from "@/lib/utils";

type Sample = {
  id: number;
  sample_code: string;
  sample_type: string;
  product_name?: string;
  batch_number?: string;
  received_date: string;
  status: string;
};

export default function SamplesPage() {
  const { rows, loading, error, search, setSearch, status, setStatus, setPage, pagination, reload } =
    useApiList<Sample>("/api/samples");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({ sample_type: "", received_date: "", remarks: "" });

  async function createSample(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setShowForm(false);
      setForm({ sample_type: "", received_date: "", remarks: "" });
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="Samples">
      <PageHeader
        title="Laboratory Samples"
        subtitle="Receive and track QC samples"
        actions={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "New Sample"}</Button>}
      />

      {showForm ? (
        <Card className="mb-4">
          <form onSubmit={createSample} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label>Sample Type</Label>
              <Input required value={form.sample_type} onChange={(e) => setForm({ ...form, sample_type: e.target.value })} />
            </div>
            <div>
              <Label>Received Date</Label>
              <Input type="date" required value={form.received_date} onChange={(e) => setForm({ ...form, received_date: e.target.value })} />
            </div>
            <div>
              <Label>Remarks</Label>
              <Input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </div>
            {formError ? <div className="sm:col-span-3"><Alert type="error">{formError}</Alert></div> : null}
            <div className="sm:col-span-3">
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create Sample"}</Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card className="mb-4">
        <FilterBar>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search samples..." />
          <FormField label="Filter by status" hint="Show records in one status only">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="RECEIVED">RECEIVED</option>
            <option value="IN_TESTING">IN_TESTING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="REJECTED">REJECTED</option>
          </Select>
          </FormField>
          <FilterActions>
            <Button variant="secondary" onClick={reload} className="w-full sm:w-auto">
              Refresh
            </Button>
          </FilterActions>
        </FilterBar>
      </Card>

      <ResponsiveTable
        columns={[
          { key: "sample_code", header: "Code" },
          { key: "sample_type", header: "Type" },
          { key: "product_name", header: "Product", render: (r) => r.product_name || "-" },
          { key: "batch_number", header: "Batch", render: (r) => r.batch_number || "-" },
          { key: "received_date", header: "Received", render: (r) => formatDate(r.received_date) },
          { key: "status", header: "Status", render: (r) => <StatusCell value={r.status} /> },
        ]}
        rows={rows}
        loading={loading}
        error={error}
        onRetry={reload}
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
      />
    </AppLayout>
  );
}

"use client";

import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { StatusCell } from "@/components/tables/ResponsiveTable";
import { Alert, Button, Card, Input, Label, PageHeader, SearchInput, Select, FilterActions, FilterBar, FormField } from "@/components/ui";
import { useApiList } from "@/hooks/useApiList";
import { formatDate } from "@/lib/utils";

type Audit = {
  id: number;
  audit_number: string;
  audit_type: string;
  department?: string;
  auditor?: string;
  start_date?: string;
  findings_count?: number;
  open_findings?: number;
  status: string;
};

export default function AuditsPage() {
  const { rows, loading, error, search, setSearch, status, setStatus, page, setPage, pagination, reload } =
    useApiList<Audit>("/api/audits");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ audit_type: "", department: "", auditor: "", start_date: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setShowForm(false);
      setForm({ audit_type: "", department: "", auditor: "", start_date: "" });
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="Audits">
      <PageHeader
        title="Audits"
        subtitle="Audit schedule and findings"
        actions={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "New Audit"}</Button>}
      />
      {showForm ? (
        <Card className="mb-4">
          <form onSubmit={create} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>Audit Type</Label>
              <Input required value={form.audit_type} onChange={(e) => setForm({ ...form, audit_type: e.target.value })} />
            </div>
            <div>
              <Label>Department</Label>
              <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
            <div>
              <Label>Auditor</Label>
              <Input value={form.auditor} onChange={(e) => setForm({ ...form, auditor: e.target.value })} />
            </div>
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            {formError ? <div className="sm:col-span-2 lg:col-span-4"><Alert type="error">{formError}</Alert></div> : null}
            <div className="sm:col-span-2 lg:col-span-4"><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create"}</Button></div>
          </form>
        </Card>
      ) : null}
      <Card className="mb-4">
        <FilterBar>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
          <FormField label="Filter by status" hint="Show records in one status only">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="PLANNED">PLANNED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
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
          { key: "audit_number", header: "Number" },
          { key: "audit_type", header: "Type" },
          { key: "department", header: "Department", render: (r) => r.department || "-" },
          { key: "auditor", header: "Auditor", render: (r) => r.auditor || "-" },
          { key: "start_date", header: "Start", render: (r) => formatDate(r.start_date) },
          { key: "findings_count", header: "Findings", render: (r) => `${r.open_findings || 0}/${r.findings_count || 0} open` },
          { key: "status", header: "Status", render: (r) => <StatusCell value={r.status} /> },
        ]}
        rows={rows}
        loading={loading}
        error={error}
        onRetry={reload}
        page={page}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
      />
    </AppLayout>
  );
}

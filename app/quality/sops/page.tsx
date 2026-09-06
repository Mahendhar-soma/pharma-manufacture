"use client";

import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { StatusCell } from "@/components/tables/ResponsiveTable";
import { Alert, Button, Card, Input, Label, PageHeader, SearchInput, Select, FilterActions, FilterBar, FormField } from "@/components/ui";
import { useApiList } from "@/hooks/useApiList";
import { formatDate } from "@/lib/utils";

type Sop = {
  id: number;
  sop_number: string;
  title: string;
  version: string;
  department?: string;
  effective_date?: string;
  status: string;
};

export default function SopsPage() {
  const { rows, loading, error, search, setSearch, status, setStatus, page, setPage, pagination, reload } =
    useApiList<Sop>("/api/sops");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", department: "", version: "1.0" });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/sops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setShowForm(false);
      setForm({ title: "", department: "", version: "1.0" });
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="SOPs">
      <PageHeader
        title="Standard Operating Procedures"
        subtitle="Controlled document register"
        actions={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "New SOP"}</Button>}
      />
      {showForm ? (
        <Card className="mb-4">
          <form onSubmit={create} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label>Title</Label>
              <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Department</Label>
              <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
            <div>
              <Label>Version</Label>
              <Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
            </div>
            {formError ? <div className="sm:col-span-3"><Alert type="error">{formError}</Alert></div> : null}
            <div className="sm:col-span-3"><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create SOP"}</Button></div>
          </form>
        </Card>
      ) : null}
      <Card className="mb-4">
        <FilterBar>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
          <FormField label="Filter by status" hint="Show records in one status only">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="UNDER_REVIEW">UNDER_REVIEW</option>
            <option value="APPROVED">APPROVED</option>
            <option value="OBSOLETE">OBSOLETE</option>
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
          { key: "sop_number", header: "Number" },
          { key: "title", header: "Title" },
          { key: "version", header: "Version" },
          { key: "department", header: "Department", render: (r) => r.department || "-" },
          { key: "effective_date", header: "Effective", render: (r) => formatDate(r.effective_date) },
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

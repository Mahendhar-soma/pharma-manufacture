"use client";

import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { StatusCell } from "@/components/tables/ResponsiveTable";
import { Alert, Button, Card, Input, Label, PageHeader, SearchInput, Select, Textarea, FilterActions, FilterBar, FormField } from "@/components/ui";
import { useApiList } from "@/hooks/useApiList";
import { formatDate } from "@/lib/utils";

type Capa = {
  id: number;
  capa_number: string;
  deviation_number?: string;
  type: string;
  description: string;
  responsible_person?: string;
  due_date?: string;
  status: string;
};

export default function CapaPage() {
  const { rows, loading, error, search, setSearch, status, setStatus, page, setPage, pagination, reload } =
    useApiList<Capa>("/api/capa");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: "", type: "CORRECTIVE", responsible_person: "", due_date: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/capa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setShowForm(false);
      setForm({ description: "", type: "CORRECTIVE", responsible_person: "", due_date: "" });
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="CAPA">
      <PageHeader
        title="CAPA"
        subtitle="Corrective and preventive actions"
        actions={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "New CAPA"}</Button>}
      />
      {showForm ? (
        <Card className="mb-4">
          <form onSubmit={create} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="CORRECTIVE">CORRECTIVE</option>
                <option value="PREVENTIVE">PREVENTIVE</option>
                <option value="BOTH">BOTH</option>
              </Select>
            </div>
            <div>
              <Label>Responsible</Label>
              <Input value={form.responsible_person} onChange={(e) => setForm({ ...form, responsible_person: e.target.value })} />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
            {formError ? <div className="sm:col-span-2"><Alert type="error">{formError}</Alert></div> : null}
            <div className="sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create CAPA"}</Button></div>
          </form>
        </Card>
      ) : null}
      <Card className="mb-4">
        <FilterBar>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
          <FormField label="Filter by status" hint="Show records in one status only">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="OVERDUE">OVERDUE</option>
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
          { key: "capa_number", header: "Number" },
          { key: "deviation_number", header: "Deviation", render: (r) => r.deviation_number || "-" },
          { key: "type", header: "Type" },
          { key: "description", header: "Description", render: (r) => (r.description?.length > 60 ? `${r.description.slice(0, 60)}…` : r.description) },
          { key: "responsible_person", header: "Owner", render: (r) => r.responsible_person || "-" },
          { key: "due_date", header: "Due", render: (r) => formatDate(r.due_date) },
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

"use client";

import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { StatusCell } from "@/components/tables/ResponsiveTable";
import { Alert, Button, Card, Input, Label, PageHeader, SearchInput, Select, FilterActions, FilterBar, FormField } from "@/components/ui";
import { useApiList } from "@/hooks/useApiList";
import { formatDate } from "@/lib/utils";

type Study = {
  id: number;
  study_code: string;
  study_title: string;
  phase: string;
  sponsor?: string;
  start_date?: string;
  sites_count?: number;
  subjects_count?: number;
  status: string;
};

export default function ClinicalTrialsPage() {
  const { rows, loading, error, search, setSearch, status, setStatus, page, setPage, pagination, reload } =
    useApiList<Study>("/api/clinical-studies");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ study_title: "", phase: "PHASE_I", sponsor: "", start_date: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/clinical-studies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setShowForm(false);
      setForm({ study_title: "", phase: "PHASE_I", sponsor: "", start_date: "" });
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="Clinical Trials">
      <PageHeader
        title="Clinical Studies"
        subtitle="Trials, sites and subjects"
        actions={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "New Study"}</Button>}
      />
      {showForm ? (
        <Card className="mb-4">
          <form onSubmit={create} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <Label>Title</Label>
              <Input required value={form.study_title} onChange={(e) => setForm({ ...form, study_title: e.target.value })} />
            </div>
            <div>
              <Label>Phase</Label>
              <Select value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })}>
                <option value="PHASE_I">PHASE_I</option>
                <option value="PHASE_II">PHASE_II</option>
                <option value="PHASE_III">PHASE_III</option>
                <option value="PHASE_IV">PHASE_IV</option>
              </Select>
            </div>
            <div>
              <Label>Sponsor</Label>
              <Input value={form.sponsor} onChange={(e) => setForm({ ...form, sponsor: e.target.value })} />
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
            <option value="ACTIVE">ACTIVE</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="ON_HOLD">ON_HOLD</option>
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
          { key: "study_code", header: "Code" },
          { key: "study_title", header: "Title" },
          { key: "phase", header: "Phase" },
          { key: "sponsor", header: "Sponsor", render: (r) => r.sponsor || "-" },
          { key: "sites_count", header: "Sites", render: (r) => r.sites_count || 0 },
          { key: "subjects_count", header: "Subjects", render: (r) => r.subjects_count || 0 },
          { key: "start_date", header: "Start", render: (r) => formatDate(r.start_date) },
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

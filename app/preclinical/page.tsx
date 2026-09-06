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
  study_type: string;
  compound_code?: string;
  researcher?: string;
  study_date?: string;
  status: string;
};

export default function PreclinicalPage() {
  const { rows, loading, error, search, setSearch, status, setStatus, page, setPage, pagination, reload } =
    useApiList<Study>("/api/preclinical-studies");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    study_title: "",
    study_type: "TOXICOLOGY",
    researcher: "",
    study_date: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/preclinical-studies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setShowForm(false);
      setForm({ study_title: "", study_type: "TOXICOLOGY", researcher: "", study_date: "" });
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="Preclinical">
      <PageHeader
        title="Preclinical Studies"
        subtitle="Toxicology, pharmacology and safety studies"
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
              <Label>Type</Label>
              <Select value={form.study_type} onChange={(e) => setForm({ ...form, study_type: e.target.value })}>
                <option value="TOXICOLOGY">TOXICOLOGY</option>
                <option value="PHARMACOLOGY">PHARMACOLOGY</option>
                <option value="SAFETY">SAFETY</option>
                <option value="EFFICACY">EFFICACY</option>
                <option value="OTHER">OTHER</option>
              </Select>
            </div>
            <div>
              <Label>Researcher</Label>
              <Input value={form.researcher} onChange={(e) => setForm({ ...form, researcher: e.target.value })} />
            </div>
            <div>
              <Label>Study Date</Label>
              <Input type="date" value={form.study_date} onChange={(e) => setForm({ ...form, study_date: e.target.value })} />
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
          { key: "study_code", header: "Code" },
          { key: "study_title", header: "Title" },
          { key: "study_type", header: "Type" },
          { key: "compound_code", header: "Compound", render: (r) => r.compound_code || "-" },
          { key: "researcher", header: "Researcher", render: (r) => r.researcher || "-" },
          { key: "study_date", header: "Date", render: (r) => formatDate(r.study_date) },
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

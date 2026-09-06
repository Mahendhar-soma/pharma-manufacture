"use client";

import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { StatusCell } from "@/components/tables/ResponsiveTable";
import { Alert, Button, Card, Input, Label, PageHeader, SearchInput, Select, FilterActions, FilterBar, FormField } from "@/components/ui";
import { useApiList } from "@/hooks/useApiList";

type Compound = {
  id: number;
  compound_code: string;
  compound_name: string;
  chemical_formula?: string;
  molecular_weight?: number;
  status: string;
};

export default function CompoundsPage() {
  const { rows, loading, error, search, setSearch, status, setStatus, page, setPage, pagination, reload } =
    useApiList<Compound>("/api/compounds");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ compound_name: "", chemical_formula: "", molecular_weight: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/compounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          molecular_weight: form.molecular_weight ? Number(form.molecular_weight) : null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setShowForm(false);
      setForm({ compound_name: "", chemical_formula: "", molecular_weight: "" });
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="Compounds">
      <PageHeader
        title="Compounds"
        subtitle="Chemical entity library"
        actions={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "New Compound"}</Button>}
      />
      {showForm ? (
        <Card className="mb-4">
          <form onSubmit={create} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label>Name</Label>
              <Input required value={form.compound_name} onChange={(e) => setForm({ ...form, compound_name: e.target.value })} />
            </div>
            <div>
              <Label>Formula</Label>
              <Input value={form.chemical_formula} onChange={(e) => setForm({ ...form, chemical_formula: e.target.value })} />
            </div>
            <div>
              <Label>Mol. Weight</Label>
              <Input type="number" step="0.0001" value={form.molecular_weight} onChange={(e) => setForm({ ...form, molecular_weight: e.target.value })} />
            </div>
            {formError ? <div className="sm:col-span-3"><Alert type="error">{formError}</Alert></div> : null}
            <div className="sm:col-span-3"><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create"}</Button></div>
          </form>
        </Card>
      ) : null}
      <Card className="mb-4">
        <FilterBar>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
          <FormField label="Filter by status" hint="Show records in one status only">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
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
          { key: "compound_code", header: "Code" },
          { key: "compound_name", header: "Name" },
          { key: "chemical_formula", header: "Formula", render: (r) => r.chemical_formula || "-" },
          { key: "molecular_weight", header: "MW", render: (r) => r.molecular_weight ?? "-" },
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

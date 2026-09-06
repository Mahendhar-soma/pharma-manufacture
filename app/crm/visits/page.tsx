"use client";

import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { StatusCell } from "@/components/tables/ResponsiveTable";
import { Alert, Button, Card, Input, Label, PageHeader, SearchInput, Select, FilterActions, FilterBar, FormField } from "@/components/ui";
import { useApiList } from "@/hooks/useApiList";
import { formatDate } from "@/lib/utils";

type Visit = {
  id: number;
  doctor_name: string;
  mr_name: string;
  visit_date: string;
  purpose?: string;
  follow_up_date?: string;
  status: string;
};

export default function VisitsPage() {
  const { rows, loading, error, search, setSearch, status, setStatus, page, setPage, pagination, reload } =
    useApiList<Visit>("/api/doctor-visits");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    doctor_id: "",
    medical_representative_id: "",
    visit_date: "",
    purpose: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/doctor-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: Number(form.doctor_id),
          medical_representative_id: Number(form.medical_representative_id),
          visit_date: form.visit_date,
          purpose: form.purpose,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setShowForm(false);
      setForm({ doctor_id: "", medical_representative_id: "", visit_date: "", purpose: "" });
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="Visits">
      <PageHeader
        title="Doctor Visits"
        subtitle="MR call reporting"
        actions={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "New Visit"}</Button>}
      />
      {showForm ? (
        <Card className="mb-4">
          <form onSubmit={create} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>Doctor ID</Label>
              <Input required type="number" value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })} />
            </div>
            <div>
              <Label>MR ID</Label>
              <Input required type="number" value={form.medical_representative_id} onChange={(e) => setForm({ ...form, medical_representative_id: e.target.value })} />
            </div>
            <div>
              <Label>Visit Date</Label>
              <Input required type="date" value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} />
            </div>
            <div>
              <Label>Purpose</Label>
              <Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
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
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="FOLLOW_UP">FOLLOW_UP</option>
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
          { key: "doctor_name", header: "Doctor" },
          { key: "mr_name", header: "MR" },
          { key: "visit_date", header: "Date", render: (r) => formatDate(r.visit_date) },
          { key: "purpose", header: "Purpose", render: (r) => r.purpose || "-" },
          { key: "follow_up_date", header: "Follow-up", render: (r) => formatDate(r.follow_up_date) },
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

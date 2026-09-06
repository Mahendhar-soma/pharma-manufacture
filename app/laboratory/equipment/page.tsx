"use client";

import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { StatusCell } from "@/components/tables/ResponsiveTable";
import { Button, Card, Input, Label, PageHeader, SearchInput, Select, Alert, FilterActions, FilterBar, FormField } from "@/components/ui";
import { useApiList } from "@/hooks/useApiList";
import { formatDate } from "@/lib/utils";

type Equipment = {
  id: number;
  equipment_code: string;
  equipment_name: string;
  serial_number?: string;
  location?: string;
  next_calibration_date?: string;
  status: string;
};

export default function EquipmentPage() {
  const { rows, loading, error, search, setSearch, status, setStatus, page, setPage, pagination, reload } =
    useApiList<Equipment>("/api/equipment");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ equipment_name: "", serial_number: "", location: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function createEquipment(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setShowForm(false);
      setForm({ equipment_name: "", serial_number: "", location: "" });
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="Equipment">
      <PageHeader
        title="Laboratory Equipment"
        subtitle="Assets and calibration schedule"
        actions={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "Add Equipment"}</Button>}
      />
      {showForm ? (
        <Card className="mb-4">
          <form onSubmit={createEquipment} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label>Name</Label>
              <Input required value={form.equipment_name} onChange={(e) => setForm({ ...form, equipment_name: e.target.value })} />
            </div>
            <div>
              <Label>Serial Number</Label>
              <Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            {formError ? <div className="sm:col-span-3"><Alert type="error">{formError}</Alert></div> : null}
            <div className="sm:col-span-3">
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create"}</Button>
            </div>
          </form>
        </Card>
      ) : null}
      <Card className="mb-4">
        <FilterBar>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search equipment..." />
          <FormField label="Filter by status" hint="Show records in one status only">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
            <option value="RETIRED">RETIRED</option>
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
          { key: "equipment_code", header: "Code" },
          { key: "equipment_name", header: "Name" },
          { key: "serial_number", header: "Serial", render: (r) => r.serial_number || "-" },
          { key: "location", header: "Location", render: (r) => r.location || "-" },
          { key: "next_calibration_date", header: "Next Calibration", render: (r) => formatDate(r.next_calibration_date) },
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

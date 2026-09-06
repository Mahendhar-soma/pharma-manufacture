"use client";

import { FormEvent, useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { StatusCell } from "@/components/tables/ResponsiveTable";
import {
  Alert,
  Button,
  Card,
  FilterActions,
  FilterBar,
  FormField,
  FormGrid,
  Input,
  PageHeader,
  SearchInput,
  Select,
} from "@/components/ui";

type Material = {
  id: number;
  material_code: string;
  material_name: string;
  material_type: string;
  unit: string;
  reorder_level: number;
  current_stock?: number;
  status: string;
};

export default function RawMaterialsPage() {
  const [items, setItems] = useState<Material[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [userName, setUserName] = useState("User");
  const [form, setForm] = useState({
    material_code: "",
    material_name: "",
    material_type: "API",
    unit: "kg",
    reorder_level: 0,
    description: "",
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10", search, status });
      const [res, me] = await Promise.all([
        fetch(`/api/raw-materials?${params}`),
        fetch("/api/auth/me"),
      ]);
      const json = await res.json();
      const meJson = await me.json();
      if (!json.success) throw new Error(json.message);
      setItems(json.data.items);
      setTotalPages(json.data.pagination.totalPages);
      if (meJson.success) setUserName(meJson.data.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/raw-materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setMessage(json.message);
      setShowForm(false);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="Raw Materials" userName={userName}>
      <PageHeader
        title="Raw Materials"
        subtitle="Master data only — stock quantity is added via Purchase Order → Goods Receipt"
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Close" : "Add Material"}
          </Button>
        }
      />
      {message ? (
        <div className="mb-4">
          <Alert type="info">{message}</Alert>
        </div>
      ) : null}
      {showForm ? (
        <Card className="mb-4">
          <form onSubmit={onSubmit} className="space-y-4">
            <FormGrid cols={3}>
            <FormField
              label="Material code *"
              hint="Unique ID used in PO, formula, and inventory (e.g. RM-API-001)"
            >
              <Input
                required
                value={form.material_code}
                onChange={(e) => setForm({ ...form, material_code: e.target.value })}
              />
            </FormField>
            <FormField
              label="Material name *"
              hint="Full name shown in purchasing, production, and reports"
            >
              <Input
                required
                value={form.material_name}
                onChange={(e) => setForm({ ...form, material_name: e.target.value })}
              />
            </FormField>
            <FormField
              label="Material type *"
              hint="Category for filtering (API, excipient, packaging, etc.)"
            >
              <Select
                value={form.material_type}
                onChange={(e) => setForm({ ...form, material_type: e.target.value })}
              >
                {["API", "EXCIPIENT", "PACKAGING", "CHEMICAL", "OTHER"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label="Unit of measure *"
              hint="Stock and PO quantities use this unit (kg, L, pcs…)"
            >
              <Input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </FormField>
            <FormField
              label="Reorder level"
              hint="Low-stock alert threshold — not the current stock quantity"
            >
              <Input
                type="number"
                value={form.reorder_level}
                onChange={(e) => setForm({ ...form, reorder_level: Number(e.target.value) })}
              />
            </FormField>
            <FormField
              label="Description"
              hint="Optional notes for identification or specs"
            >
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </FormField>
            </FormGrid>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? "Saving..." : "Save"}
            </Button>
          </form>
        </Card>
      ) : null}
      <Card className="mb-4">
        <FilterBar>
          <SearchInput
            value={search}
            onChange={setSearch}
            label="Search materials"
            hint="Filter by material code or name"
            placeholder="e.g. API or Paracetamol"
          />
          <FormField label="Filter by status" hint="Show active or inactive materials only">
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Status</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </Select>
          </FormField>
          <FilterActions>
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                setPage(1);
                load();
              }}
            >
              Search
            </Button>
          </FilterActions>
        </FilterBar>
      </Card>
      <ResponsiveTable
        loading={loading}
        error={error}
        onRetry={load}
        rows={items}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyTitle="No raw materials found"
        columns={[
          { key: "material_code", header: "Code" },
          { key: "material_name", header: "Name" },
          { key: "material_type", header: "Type" },
          { key: "current_stock", header: "Stock" },
          { key: "reorder_level", header: "Reorder" },
          { key: "unit", header: "Unit" },
          { key: "status", header: "Status", render: (r) => <StatusCell value={r.status} /> },
        ]}
      />
    </AppLayout>
  );
}

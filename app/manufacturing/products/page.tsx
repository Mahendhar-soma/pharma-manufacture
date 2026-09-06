"use client";

import { useCallback, useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { StatusCell, type Column } from "@/components/tables/ResponsiveTable";
import {
  Alert,
  Button,
  Card,
  Input,
  Label,
  PageHeader,
  FilterActions,
  FilterBar,
  FormField,
  SearchInput,
  Select,
} from "@/components/ui";
import { useAuthSession } from "@/hooks/useAuthSession";

type Product = {
  id: number;
  product_code: string;
  product_name: string;
  generic_name?: string;
  dosage_form?: string;
  strength?: string;
  unit: string;
  shelf_life_months: number;
  status: string;
};

const emptyForm = {
  product_code: "",
  product_name: "",
  generic_name: "",
  dosage_form: "",
  strength: "",
  unit: "units",
  shelf_life_months: "24",
  status: "ACTIVE",
};

export default function ProductsPage() {
  const { canWrite } = useAuthSession();
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [userName, setUserName] = useState("User");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const res = await fetch(`/api/products?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setRows(json.data.items);
      setTotalPages(json.data.pagination.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    load();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => j.success && setUserName(j.data.name))
      .catch(() => undefined);
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.product_code.trim() || !form.product_name.trim()) {
      setMsg("Product code and name are required");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          shelf_life_months: Number(form.shelf_life_months),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setShowForm(false);
      setForm(emptyForm);
      setMsg("Product created");
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id: number) {
    if (!confirm("Deactivate this product?")) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) {
      setMsg(json.message);
      return;
    }
    load();
  }

  const columns: Column<Product>[] = [
    { key: "product_code", header: "Code" },
    { key: "product_name", header: "Name" },
    { key: "dosage_form", header: "Form" },
    { key: "strength", header: "Strength" },
    { key: "unit", header: "Unit" },
    { key: "shelf_life_months", header: "Shelf Life (mo)" },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusCell value={r.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) =>
        r.status === "ACTIVE" && canWrite("products") ? (
          <Button variant="ghost" onClick={() => deactivate(r.id)}>
            Deactivate
          </Button>
        ) : (
          "-"
        ),
    },
  ];

  return (
    <AppLayout title="Products" userName={userName}>
      <PageHeader
        title="Products"
        subtitle="Finished goods master data"
        actions={
          canWrite("products") ? (
            <Button onClick={() => setShowForm((v) => !v)}>
              {showForm ? "Close" : "New Product"}
            </Button>
          ) : undefined
        }
      />

      {msg ? <Alert type="info">{msg}</Alert> : null}

      {showForm && canWrite("products") ? (
        <Card className="mb-4">
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Product Code *</Label>
              <Input
                value={form.product_code}
                onChange={(e) => setForm({ ...form, product_code: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Product Name *</Label>
              <Input
                value={form.product_name}
                onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Generic Name</Label>
              <Input
                value={form.generic_name}
                onChange={(e) => setForm({ ...form, generic_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Dosage Form</Label>
              <Input
                value={form.dosage_form}
                onChange={(e) => setForm({ ...form, dosage_form: e.target.value })}
              />
            </div>
            <div>
              <Label>Strength</Label>
              <Input
                value={form.strength}
                onChange={(e) => setForm({ ...form, strength: e.target.value })}
              />
            </div>
            <div>
              <Label>Unit</Label>
              <Input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
            <div>
              <Label>Shelf Life (months)</Label>
              <Input
                type="number"
                value={form.shelf_life_months}
                onChange={(e) => setForm({ ...form, shelf_life_months: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Create Product"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card className="mb-4">
        <FilterBar>
          <SearchInput value={search} onChange={(v) => { setPage(1); setSearch(v); }} placeholder="Search code/name..." />
          <FormField label="Filter by status" hint="Show active or inactive products only">
            <Select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
              <option value="">All statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </Select>
          </FormField>
          <FilterActions>
            <Button variant="secondary" onClick={load} className="w-full sm:w-auto">
              Refresh
            </Button>
          </FilterActions>
        </FilterBar>
      </Card>

      <ResponsiveTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        onRetry={load}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </AppLayout>
  );
}

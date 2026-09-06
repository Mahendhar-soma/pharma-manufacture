"use client";

import { useCallback, useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { StatusCell, type Column } from "@/components/tables/ResponsiveTable";
import { Alert, Button, Card, FilterActions, FilterBar, FormField, Input, Label, PageHeader, SearchInput, Select } from "@/components/ui";

type Formula = {
  id: number;
  formula_code: string;
  version: string;
  product_code: string;
  product_name: string;
  batch_size: number;
  unit: string;
  status: string;
};

type Option = { id: number; label: string; unit?: string };

export default function FormulasPage() {
  const [rows, setRows] = useState<Formula[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [products, setProducts] = useState<Option[]>([]);
  const [materials, setMaterials] = useState<Option[]>([]);
  const [form, setForm] = useState({
    product_id: "",
    formula_code: "",
    version: "1.0",
    batch_size: "",
    unit: "units",
    status: "DRAFT",
  });
  const [items, setItems] = useState([{ raw_material_id: "", quantity: "", unit: "kg" }]);
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
      const res = await fetch(`/api/formulas?${params}`);
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
    fetch("/api/auth/me").then((r) => r.json()).then((j) => j.success && setUserName(j.data.name)).catch(() => undefined);
    Promise.all([
      fetch("/api/products?limit=100&status=ACTIVE").then((r) => r.json()),
      fetch("/api/raw-materials?limit=100&status=ACTIVE").then((r) => r.json()),
    ]).then(([p, m]) => {
      if (p.success) {
        setProducts(p.data.items.map((x: { id: number; product_code: string; product_name: string; unit: string }) => ({
          id: x.id,
          label: `${x.product_code} — ${x.product_name}`,
          unit: x.unit,
        })));
      }
      if (m.success) {
        setMaterials(m.data.items.map((x: { id: number; material_code: string; material_name: string; unit: string }) => ({
          id: x.id,
          label: `${x.material_code} — ${x.material_name}`,
          unit: x.unit,
        })));
      }
    });
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.product_id || !form.formula_code || !form.batch_size) {
      setMsg("Product, formula code and batch size are required");
      return;
    }
    const validItems = items.filter((i) => i.raw_material_id && i.quantity);
    if (!validItems.length) {
      setMsg("Add at least one formula item");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/formulas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          product_id: Number(form.product_id),
          batch_size: Number(form.batch_size),
          items: validItems.map((i) => ({
            raw_material_id: Number(i.raw_material_id),
            quantity: Number(i.quantity),
            unit: i.unit,
          })),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setShowForm(false);
      setMsg("Formula created");
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<Formula>[] = [
    { key: "formula_code", header: "Code" },
    { key: "version", header: "Version" },
    { key: "product_name", header: "Product", render: (r) => `${r.product_code} — ${r.product_name}` },
    { key: "batch_size", header: "Batch Size" },
    { key: "unit", header: "Unit" },
    { key: "status", header: "Status", render: (r) => <StatusCell value={r.status} /> },
  ];

  return (
    <AppLayout title="Formulas" userName={userName}>
      <PageHeader title="Formulas / BOM" subtitle="One ACTIVE formula per product" actions={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "New Formula"}</Button>} />
      {msg ? <Alert type="info">{msg}</Alert> : null}
      {showForm ? (
        <Card className="mb-4 space-y-4">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label>Product *</Label>
                <Select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} required>
                  <option value="">Select product</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </Select>
              </div>
              <div><Label>Formula Code *</Label><Input value={form.formula_code} onChange={(e) => setForm({ ...form, formula_code: e.target.value })} required /></div>
              <div><Label>Version</Label><Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} /></div>
              <div><Label>Batch Size *</Label><Input type="number" step="0.0001" value={form.batch_size} onChange={(e) => setForm({ ...form, batch_size: e.target.value })} required /></div>
              <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="DRAFT">DRAFT</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-900">Ingredients</h3>
                <Button type="button" variant="secondary" onClick={() => setItems([...items, { raw_material_id: "", quantity: "", unit: "kg" }])}>Add Row</Button>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Select value={item.raw_material_id} onChange={(e) => {
                    const next = [...items];
                    const mat = materials.find((m) => String(m.id) === e.target.value);
                    next[idx] = { ...next[idx], raw_material_id: e.target.value, unit: mat?.unit || next[idx].unit };
                    setItems(next);
                  }}>
                    <option value="">Select material</option>
                    {materials.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </Select>
                  <Input type="number" step="0.0001" placeholder="Quantity" value={item.quantity} onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...next[idx], quantity: e.target.value };
                    setItems(next);
                  }} />
                  <Input placeholder="Unit" value={item.unit} onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...next[idx], unit: e.target.value };
                    setItems(next);
                  }} />
                </div>
              ))}
            </div>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create Formula"}</Button>
          </form>
        </Card>
      ) : null}
      <Card className="mb-4">
        <FilterBar>
          <SearchInput value={search} onChange={(v) => { setPage(1); setSearch(v); }} />
          <FormField label="Filter by status" hint="Show formulas in one approval state">
            <Select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
              <option value="">All statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="OBSOLETE">OBSOLETE</option>
            </Select>
          </FormField>
          <FilterActions>
            <Button variant="secondary" onClick={load} className="w-full sm:w-auto">
              Refresh
            </Button>
          </FilterActions>
        </FilterBar>
      </Card>
      <ResponsiveTable columns={columns} rows={rows} loading={loading} error={error} onRetry={load} page={page} totalPages={totalPages} onPageChange={setPage} />
    </AppLayout>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { StatusCell, type Column } from "@/components/tables/ResponsiveTable";
import { Alert, Button, Card, FilterActions, FilterBar, FormField, Input, Label, PageHeader, SearchInput, Select } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { useAuthSession } from "@/hooks/useAuthSession";

type MO = {
  id: number;
  mo_number: string;
  product_code: string;
  product_name: string;
  formula_code: string;
  planned_quantity: number;
  actual_quantity?: number;
  status: string;
  planned_start_date?: string;
  warehouse_name?: string;
};

type Option = { id: number; label: string };

export default function ProductionPage() {
  const [rows, setRows] = useState<MO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [products, setProducts] = useState<Option[]>([]);
  const [warehouses, setWarehouses] = useState<Option[]>([]);
  const [form, setForm] = useState({
    product_id: "",
    planned_quantity: "",
    warehouse_id: "",
    planned_start_date: new Date().toISOString().slice(0, 10),
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [userName, setUserName] = useState("User");
  const [busyId, setBusyId] = useState<number | null>(null);
  const { canWrite } = useAuthSession();
  const canProduce = canWrite("production");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const res = await fetch(`/api/manufacturing-orders?${params}`);
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
      fetch("/api/warehouses?limit=100&status=ACTIVE").then((r) => r.json()),
    ]).then(([p, w]) => {
      if (p.success) setProducts(p.data.items.map((x: { id: number; product_code: string; product_name: string }) => ({ id: x.id, label: `${x.product_code} — ${x.product_name}` })));
      if (w.success) setWarehouses(w.data.items.map((x: { id: number; warehouse_code: string; warehouse_name: string }) => ({ id: x.id, label: `${x.warehouse_code} — ${x.warehouse_name}` })));
    });
  }, [load]);

  async function createMo(e: React.FormEvent) {
    e.preventDefault();
    if (!form.product_id || !form.planned_quantity) {
      setMsg("Product and planned quantity required");
      return;
    }
    const res = await fetch("/api/manufacturing-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: Number(form.product_id),
        planned_quantity: Number(form.planned_quantity),
        warehouse_id: form.warehouse_id ? Number(form.warehouse_id) : null,
        planned_start_date: form.planned_start_date || null,
      }),
    });
    const json = await res.json();
    if (!json.success) { setMsg(json.message); return; }
    setShowForm(false);
    setMsg(`MO ${json.data.mo_number} created from active formula`);
    load();
  }

  async function startMo(id: number) {
    setBusyId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/manufacturing-orders/${id}/start`, { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setMsg("Manufacturing order started");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Start failed");
    } finally {
      setBusyId(null);
    }
  }

  async function completeMo(id: number, warehouseId?: string) {
    const wh = warehouseId || form.warehouse_id || prompt("Warehouse ID for FG output?");
    if (!wh) return;
    setBusyId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/manufacturing-orders/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warehouse_id: Number(wh) }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setMsg(
        `Completed — batch ${json.data.batch_number} (QC_PENDING). LIMS sample ${json.data.qc_sample?.sample_code || ""} created.`,
      );
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Complete failed");
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<MO>[] = [
    { key: "mo_number", header: "MO #" },
    { key: "product_name", header: "Product", render: (r) => `${r.product_code} — ${r.product_name}` },
    { key: "formula_code", header: "Formula" },
    { key: "planned_quantity", header: "Planned Qty" },
    { key: "actual_quantity", header: "Actual Qty" },
    { key: "planned_start_date", header: "Start", render: (r) => formatDate(r.planned_start_date) },
    { key: "status", header: "Status", render: (r) => <StatusCell value={r.status} /> },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {canProduce && ["PLANNED", "RELEASED"].includes(r.status) ? (
            <Button variant="secondary" disabled={busyId === r.id} onClick={() => startMo(r.id)}>Start</Button>
          ) : null}
          {canProduce && r.status === "IN_PROGRESS" ? (
            <Button disabled={busyId === r.id} onClick={() => completeMo(r.id)}>Complete</Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="Production" userName={userName}>
      <PageHeader
        title="Manufacturing Orders"
        subtitle="Create from ACTIVE formula, start with stock check, complete with FEFO"
        actions={
          canProduce ? (
            <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "New MO"}</Button>
          ) : undefined
        }
      />
      {msg ? <Alert type="info">{msg}</Alert> : null}
      {showForm && canProduce ? (
        <Card className="mb-4">
          <form onSubmit={createMo} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>Product *</Label>
              <Select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} required>
                <option value="">Select</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </Select>
            </div>
            <div><Label>Planned Qty *</Label><Input type="number" step="0.0001" value={form.planned_quantity} onChange={(e) => setForm({ ...form, planned_quantity: e.target.value })} required /></div>
            <div>
              <Label>FG Warehouse</Label>
              <Select value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}>
                <option value="">Select</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
              </Select>
            </div>
            <div><Label>Planned Start</Label><Input type="date" value={form.planned_start_date} onChange={(e) => setForm({ ...form, planned_start_date: e.target.value })} /></div>
            <div className="flex items-end"><Button type="submit">Create MO</Button></div>
          </form>
        </Card>
      ) : null}
      <Card className="mb-4">
        <FilterBar>
          <SearchInput value={search} onChange={(v) => { setPage(1); setSearch(v); }} />
          <FormField label="Filter by status" hint="Show manufacturing orders in one state">
            <Select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
              <option value="">All statuses</option>
              <option value="PLANNED">PLANNED</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
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

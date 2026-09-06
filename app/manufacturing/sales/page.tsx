"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { StatusCell, type Column } from "@/components/tables/ResponsiveTable";
import { Alert, Button, Card, FilterActions, FilterBar, Input, Label, PageHeader, SearchInput, Select } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/utils";

type Sale = {
  id: number;
  invoice_number: string;
  customer_name: string;
  invoice_date: string;
  warehouse_name: string;
  total_amount: number;
  status: string;
};

type Option = { id: number; label: string };
type FefoBatch = { id: number; batch_number: string; available_quantity: number; expiry_date: string; product_id: number };

export default function SalesPage() {
  const [rows, setRows] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [customers, setCustomers] = useState<Option[]>([]);
  const [warehouses, setWarehouses] = useState<Option[]>([]);
  const [products, setProducts] = useState<Option[]>([]);
  const [fefo, setFefo] = useState<FefoBatch[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [userName, setUserName] = useState("User");
  const [form, setForm] = useState({
    customer_id: "",
    warehouse_id: "",
    invoice_date: new Date().toISOString().slice(0, 10),
  });
  const [item, setItem] = useState({
    product_id: "",
    batch_id: "",
    quantity: "",
    unit_price: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/sales?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setRows(json.data.items);
      setTotalPages(json.data.pagination.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    load();
    fetch("/api/auth/me").then((r) => r.json()).then((j) => j.success && setUserName(j.data.name)).catch(() => undefined);
    Promise.all([
      fetch("/api/customers?limit=100&status=ACTIVE").then((r) => r.json()),
      fetch("/api/warehouses?limit=100&status=ACTIVE").then((r) => r.json()),
      fetch("/api/products?limit=100&status=ACTIVE").then((r) => r.json()),
    ]).then(([c, w, p]) => {
      if (c.success) setCustomers(c.data.items.map((x: { id: number; customer_code: string; customer_name: string }) => ({ id: x.id, label: `${x.customer_code} — ${x.customer_name}` })));
      if (w.success) setWarehouses(w.data.items.map((x: { id: number; warehouse_code: string; warehouse_name: string }) => ({ id: x.id, label: `${x.warehouse_code} — ${x.warehouse_name}` })));
      if (p.success) setProducts(p.data.items.map((x: { id: number; product_code: string; product_name: string }) => ({ id: x.id, label: `${x.product_code} — ${x.product_name}` })));
    });
  }, [load]);

  async function loadFefo(productId: string) {
    setItem((prev) => ({ ...prev, product_id: productId, batch_id: "" }));
    if (!productId) { setFefo([]); return; }
    const res = await fetch(`/api/batches/fefo?product_id=${productId}`);
    const json = await res.json();
    if (json.success) {
      setFefo(json.data.items);
      if (json.data.recommendation) {
        setItem((prev) => ({ ...prev, product_id: productId, batch_id: String(json.data.recommendation.id) }));
      }
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_id || !form.warehouse_id || !item.product_id || !item.batch_id || !item.quantity || !item.unit_price) {
      setMsg("All sales fields are required");
      return;
    }
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: Number(form.customer_id),
        warehouse_id: Number(form.warehouse_id),
        invoice_date: form.invoice_date,
        items: [{
          product_id: Number(item.product_id),
          batch_id: Number(item.batch_id),
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
        }],
      }),
    });
    const json = await res.json();
    if (!json.success) { setMsg(json.message); return; }
    setShowForm(false);
    setMsg(`Invoice ${json.data.invoice_number} created`);
    load();
  }

  const columns: Column<Sale>[] = [
    { key: "invoice_number", header: "Invoice" },
    { key: "customer_name", header: "Customer" },
    { key: "invoice_date", header: "Date", render: (r) => formatDate(r.invoice_date) },
    { key: "warehouse_name", header: "Warehouse" },
    { key: "total_amount", header: "Amount", render: (r) => formatMoney(r.total_amount) },
    { key: "status", header: "Status", render: (r) => <StatusCell value={r.status} /> },
    {
      key: "actions",
      header: "Print",
      render: (r) => (
        <Link
          href={`/print/sales/${r.id}`}
          target="_blank"
          className="text-sm font-medium text-teal-800 hover:underline"
        >
          Invoice
        </Link>
      ),
    },
  ];

  return (
    <AppLayout title="Sales" userName={userName}>
      <PageHeader
        title="Sales Orders"
        subtitle="Only QC-released (RELEASED) non-expired batches — FEFO picks earliest expiry"
        actions={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "New Sale"}</Button>}
      />
      {msg ? <Alert type="info">{msg}</Alert> : null}
      {showForm ? (
        <Card className="mb-4">
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Customer *</Label>
              <Select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required>
                <option value="">Select</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </Select>
            </div>
            <div>
              <Label>Warehouse *</Label>
              <Select value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })} required>
                <option value="">Select</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
              </Select>
            </div>
            <div><Label>Invoice Date *</Label><Input type="date" value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} required /></div>
            <div>
              <Label>Product *</Label>
              <Select value={item.product_id} onChange={(e) => loadFefo(e.target.value)} required>
                <option value="">Select</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </Select>
            </div>
            <div>
              <Label>FEFO Batch *</Label>
              <Select value={item.batch_id} onChange={(e) => setItem({ ...item, batch_id: e.target.value })} required>
                <option value="">Select released batch</option>
                {fefo.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batch_number} · avail {b.available_quantity} · exp {b.expiry_date}
                  </option>
                ))}
              </Select>
            </div>
            <div><Label>Quantity *</Label><Input type="number" step="0.0001" value={item.quantity} onChange={(e) => setItem({ ...item, quantity: e.target.value })} required /></div>
            <div><Label>Unit Price *</Label><Input type="number" step="0.01" value={item.unit_price} onChange={(e) => setItem({ ...item, unit_price: e.target.value })} required /></div>
            <div className="flex items-end"><Button type="submit">Create Sale</Button></div>
          </form>
        </Card>
      ) : null}
      <Card className="mb-4">
        <FilterBar className="lg:grid-cols-[minmax(0,1fr)_auto]">
          <SearchInput value={search} onChange={(v) => { setPage(1); setSearch(v); }} />
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

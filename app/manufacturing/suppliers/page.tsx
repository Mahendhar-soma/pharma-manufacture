"use client";

import { useCallback, useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { StatusCell, type Column } from "@/components/tables/ResponsiveTable";
import { Alert, Button, Card, FilterActions, FilterBar, FormField, Input, Label, PageHeader, SearchInput, Select } from "@/components/ui";

type Row = {
  id: number;
  supplier_code: string;
  supplier_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  status: string;
};

const emptyForm = {
  supplier_code: "",
  supplier_name: "",
  contact_person: "",
  phone: "",
  email: "",
  address: "",
  gst_number: "",
  license_number: "",
};

export default function SuppliersPage() {
  const [rows, setRows] = useState<Row[]>([]);
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
      const res = await fetch(`/api/suppliers?${params}`);
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
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.supplier_code.trim() || !form.supplier_name.trim()) {
      setMsg("Supplier code and name are required");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setShowForm(false);
      setForm(emptyForm);
      setMsg("Supplier created");
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id: number) {
    if (!confirm("Deactivate this supplier?")) return;
    const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) { setMsg(json.message); return; }
    load();
  }

  const columns: Column<Row>[] = [
    { key: "supplier_code", header: "Code" },
    { key: "supplier_name", header: "Name" },
    { key: "contact_person", header: "Contact" },
    { key: "phone", header: "Phone" },
    { key: "email", header: "Email" },
    { key: "status", header: "Status", render: (r) => <StatusCell value={r.status} /> },
    {
      key: "actions",
      header: "Actions",
      render: (r) =>
        r.status === "ACTIVE" ? (
          <Button variant="ghost" onClick={() => deactivate(r.id)}>Deactivate</Button>
        ) : "-",
    },
  ];

  return (
    <AppLayout title="Suppliers" userName={userName}>
      <PageHeader title="Suppliers" subtitle="Vendor master" actions={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "New Supplier"}</Button>} />
      {msg ? <Alert type="info">{msg}</Alert> : null}
      {showForm ? (
        <Card className="mb-4">
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div><Label>Code *</Label><Input value={form.supplier_code} onChange={(e) => setForm({ ...form, supplier_code: e.target.value })} required /></div>
            <div><Label>Name *</Label><Input value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} required /></div>
            <div><Label>Contact</Label><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>GST</Label><Input value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="flex items-end"><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create"}</Button></div>
          </form>
        </Card>
      ) : null}
      <Card className="mb-4">
        <FilterBar>
          <SearchInput value={search} onChange={(v) => { setPage(1); setSearch(v); }} />
          <FormField label="Filter by status" hint="Show active or inactive suppliers only">
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
      <ResponsiveTable columns={columns} rows={rows} loading={loading} error={error} onRetry={load} page={page} totalPages={totalPages} onPageChange={setPage} />
    </AppLayout>
  );
}

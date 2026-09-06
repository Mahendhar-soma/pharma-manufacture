"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { StatusCell } from "@/components/tables/ResponsiveTable";
import { Alert, Button, Card, FilterActions, FilterBar, Input, Label, PageHeader, SearchInput } from "@/components/ui";
import { formatDate } from "@/lib/utils";

type Tab = "submissions" | "registrations" | "licenses" | "documents";

const tabs: { id: Tab; label: string; endpoint: string }[] = [
  { id: "submissions", label: "Submissions", endpoint: "/api/regulatory/submissions" },
  { id: "registrations", label: "Registrations", endpoint: "/api/regulatory/registrations" },
  { id: "licenses", label: "Licenses", endpoint: "/api/regulatory/licenses" },
  { id: "documents", label: "Documents", endpoint: "/api/regulatory/documents" },
];

export default function RegulatoryPage() {
  const [tab, setTab] = useState<Tab>("submissions");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const endpoint = tabs.find((t) => t.id === tab)!.endpoint;
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (search) params.set("search", search);
      const res = await fetch(`${endpoint}?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setRows(json.data?.items || []);
      setTotalPages(json.data?.pagination?.totalPages || 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page, search]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const endpoint = tabs.find((t) => t.id === tab)!.endpoint;
      const payload =
        tab === "registrations"
          ? { ...form, product_id: Number(form.product_id) }
          : form;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setShowForm(false);
      setForm({});
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  function formFields() {
    if (tab === "submissions") {
      return (
        <>
          <div><Label>Title</Label><Input required value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Authority</Label><Input value={form.authority || ""} onChange={(e) => setForm({ ...form, authority: e.target.value })} /></div>
          <div><Label>Type</Label><Input value={form.submission_type || ""} onChange={(e) => setForm({ ...form, submission_type: e.target.value })} /></div>
        </>
      );
    }
    if (tab === "registrations") {
      return (
        <>
          <div><Label>Product ID</Label><Input required type="number" value={form.product_id || ""} onChange={(e) => setForm({ ...form, product_id: e.target.value })} /></div>
          <div><Label>Country</Label><Input required value={form.country || ""} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
          <div><Label>Authority</Label><Input value={form.authority || ""} onChange={(e) => setForm({ ...form, authority: e.target.value })} /></div>
        </>
      );
    }
    if (tab === "licenses") {
      return (
        <>
          <div><Label>License Type</Label><Input required value={form.license_type || ""} onChange={(e) => setForm({ ...form, license_type: e.target.value })} /></div>
          <div><Label>Issued By</Label><Input value={form.issued_by || ""} onChange={(e) => setForm({ ...form, issued_by: e.target.value })} /></div>
          <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date || ""} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
        </>
      );
    }
    return (
      <>
        <div><Label>Title</Label><Input required value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><Label>Document Type</Label><Input value={form.document_type || ""} onChange={(e) => setForm({ ...form, document_type: e.target.value })} /></div>
        <div><Label>Version</Label><Input value={form.version || ""} onChange={(e) => setForm({ ...form, version: e.target.value })} /></div>
      </>
    );
  }

  const columns =
    tab === "submissions"
      ? [
          { key: "submission_number", header: "Number" },
          { key: "title", header: "Title" },
          { key: "authority", header: "Authority", render: (r: Record<string, unknown>) => String(r.authority || "-") },
          { key: "submission_date", header: "Date", render: (r: Record<string, unknown>) => formatDate(r.submission_date as string) },
          { key: "status", header: "Status", render: (r: Record<string, unknown>) => <StatusCell value={String(r.status)} /> },
        ]
      : tab === "registrations"
        ? [
            { key: "registration_number", header: "Number" },
            { key: "product_name", header: "Product", render: (r: Record<string, unknown>) => String(r.product_name || "-") },
            { key: "country", header: "Country" },
            { key: "expiry_date", header: "Expiry", render: (r: Record<string, unknown>) => formatDate(r.expiry_date as string) },
            { key: "status", header: "Status", render: (r: Record<string, unknown>) => <StatusCell value={String(r.status)} /> },
          ]
        : tab === "licenses"
          ? [
              { key: "license_number", header: "Number" },
              { key: "license_type", header: "Type" },
              { key: "issued_by", header: "Issued By", render: (r: Record<string, unknown>) => String(r.issued_by || "-") },
              { key: "expiry_date", header: "Expiry", render: (r: Record<string, unknown>) => formatDate(r.expiry_date as string) },
              { key: "status", header: "Status", render: (r: Record<string, unknown>) => <StatusCell value={String(r.status)} /> },
            ]
          : [
              { key: "document_code", header: "Code" },
              { key: "title", header: "Title" },
              { key: "document_type", header: "Type", render: (r: Record<string, unknown>) => String(r.document_type || "-") },
              { key: "version", header: "Version", render: (r: Record<string, unknown>) => String(r.version || "-") },
              { key: "status", header: "Status", render: (r: Record<string, unknown>) => <StatusCell value={String(r.status)} /> },
            ];

  return (
    <AppLayout title="Regulatory">
      <PageHeader
        title="Regulatory Affairs"
        subtitle="Submissions, registrations, licenses and documents"
        actions={<Button onClick={() => { setShowForm((v) => !v); setForm({}); }}>{showForm ? "Close" : "New Record"}</Button>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            variant={tab === t.id ? "primary" : "secondary"}
            onClick={() => { setTab(t.id); setPage(1); setShowForm(false); setSearch(""); }}
          >
            {t.label}
          </Button>
        ))}
      </div>
      {showForm ? (
        <Card className="mb-4">
          <form onSubmit={create} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {formFields()}
            {formError ? <div className="sm:col-span-3"><Alert type="error">{formError}</Alert></div> : null}
            <div className="sm:col-span-3"><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create"}</Button></div>
          </form>
        </Card>
      ) : null}
      <Card className="mb-4">
        <FilterBar className="lg:grid-cols-[minmax(0,1fr)_auto]">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search..." />
          <FilterActions>
            <Button variant="secondary" onClick={load} className="w-full sm:w-auto">
              Refresh
            </Button>
          </FilterActions>
        </FilterBar>
      </Card>
      <ResponsiveTable
        columns={columns as never}
        rows={rows as { id?: number }[]}
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

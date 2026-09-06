"use client";

import { useCallback, useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { StatusCell, type Column } from "@/components/tables/ResponsiveTable";
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

type Row = {
  id: number;
  warehouse_code: string;
  warehouse_name: string;
  location?: string;
  warehouse_type: string;
  status: string;
};

const emptyForm = {
  warehouse_code: "",
  warehouse_name: "",
  location: "",
  warehouse_type: "RAW_MATERIAL",
  status: "ACTIVE",
};

export default function WarehousesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
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
      const res = await fetch(`/api/warehouses?${params}`);
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

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setMsg(null);
  }

  function openEdit(row: Row) {
    setEditingId(row.id);
    setForm({
      warehouse_code: row.warehouse_code,
      warehouse_name: row.warehouse_name,
      location: row.location || "",
      warehouse_type: row.warehouse_type,
      status: row.status,
    });
    setShowForm(true);
    setMsg(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.warehouse_code.trim() || !form.warehouse_name.trim()) {
      setMsg("Warehouse code and name are required");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(
        editingId ? `/api/warehouses/${editingId}` : "/api/warehouses",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      setMsg(editingId ? "Warehouse updated" : "Warehouse created");
      load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function setWarehouseStatus(id: number, next: "ACTIVE" | "INACTIVE") {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    if (next === "INACTIVE" && !confirm("Deactivate this warehouse?")) return;

    const res = await fetch(`/api/warehouses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        warehouse_code: row.warehouse_code,
        warehouse_name: row.warehouse_name,
        location: row.location || null,
        warehouse_type: row.warehouse_type,
        status: next,
      }),
    });
    const json = await res.json();
    if (!json.success) {
      setMsg(json.message);
      return;
    }
    setMsg(next === "ACTIVE" ? "Warehouse activated" : "Warehouse deactivated");
    load();
  }

  const columns: Column<Row>[] = [
    { key: "warehouse_code", header: "Code" },
    { key: "warehouse_name", header: "Name" },
    { key: "warehouse_type", header: "Type" },
    { key: "location", header: "Location" },
    { key: "status", header: "Status", render: (r) => <StatusCell value={r.status} /> },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          <Button variant="ghost" onClick={() => openEdit(r)}>
            Edit
          </Button>
          {r.status === "ACTIVE" ? (
            <Button variant="ghost" onClick={() => setWarehouseStatus(r.id, "INACTIVE")}>
              Deactivate
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setWarehouseStatus(r.id, "ACTIVE")}>
              Activate
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="Warehouses" userName={userName}>
      <PageHeader
        title="Warehouses"
        subtitle="Create, edit, activate or deactivate storage locations"
        actions={
          <Button
            onClick={() => {
              if (showForm) {
                setShowForm(false);
                setEditingId(null);
                setForm(emptyForm);
              } else {
                openCreate();
              }
            }}
          >
            {showForm ? "Close" : "New Warehouse"}
          </Button>
        }
      />
      {msg ? <Alert type="info">{msg}</Alert> : null}
      {showForm ? (
        <Card className="mb-4">
          <h3 className="mb-3 font-semibold text-slate-900">
            {editingId ? "Edit warehouse" : "New warehouse"}
          </h3>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormGrid cols={3}>
            <FormField
              label="Warehouse code *"
              hint="Short unique ID used in inventory, PO, and GRN (e.g. WH-RM-01)"
            >
              <Input
                value={form.warehouse_code}
                onChange={(e) => setForm({ ...form, warehouse_code: e.target.value })}
                required
              />
            </FormField>
            <FormField
              label="Warehouse name *"
              hint="Display name shown in dropdowns and reports"
            >
              <Input
                value={form.warehouse_name}
                onChange={(e) => setForm({ ...form, warehouse_name: e.target.value })}
                required
              />
            </FormField>
            <FormField
              label="Warehouse type *"
              hint="Controls what stock belongs here (raw material, FG, packaging, rejected)"
            >
              <Select
                value={form.warehouse_type}
                onChange={(e) => setForm({ ...form, warehouse_type: e.target.value })}
              >
                <option value="RAW_MATERIAL">RAW_MATERIAL</option>
                <option value="FINISHED_GOODS">FINISHED_GOODS</option>
                <option value="PACKAGING">PACKAGING</option>
                <option value="REJECTED">REJECTED</option>
              </Select>
            </FormField>
            <FormField
              label="Location"
              hint="Optional plant / building / area for physical identification"
            >
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </FormField>
            {editingId ? (
              <FormField
                label="Status"
                hint="ACTIVE warehouses can be used in transactions; INACTIVE are hidden from most pickers"
              >
                <Select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </Select>
              </FormField>
            ) : null}
            </FormGrid>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
      <Card className="mb-4">
        <FilterBar>
          <SearchInput
            value={search}
            onChange={(v) => {
              setPage(1);
              setSearch(v);
            }}
            label="Search warehouses"
            hint="Filter by warehouse code, name, or location"
            placeholder="e.g. WH-RM or Main store"
          />
          <FormField
            label="Filter by status"
            hint="Show only active or inactive warehouses"
          >
            <Select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            >
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

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
  Input,
  Label,
  Modal,
  PageHeader,
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
  description?: string;
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
  description: "",
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

  const [editing, setEditing] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

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

  function openEdit(row: Product) {
    setEditing(row);
    setEditError(null);
    setEditForm({
      product_code: row.product_code || "",
      product_name: row.product_name || "",
      generic_name: row.generic_name || "",
      dosage_form: row.dosage_form || "",
      strength: row.strength || "",
      unit: row.unit || "units",
      shelf_life_months: String(row.shelf_life_months ?? 24),
      description: row.description || "",
      status: row.status || "ACTIVE",
    });
  }

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

  async function updateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editForm.product_code.trim() || !editForm.product_name.trim()) {
      setEditError("Product code and name are required");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/products/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          shelf_life_months: Number(editForm.shelf_life_months),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setEditing(null);
      setMsg(`Product updated → ${editForm.status}`);
      load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setEditSaving(false);
    }
  }

  async function setProductStatus(row: Product, next: "ACTIVE" | "INACTIVE") {
    if (next === "INACTIVE" && !confirm("Deactivate this product?")) return;
    const res = await fetch(`/api/products/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_code: row.product_code,
        product_name: row.product_name,
        generic_name: row.generic_name || null,
        dosage_form: row.dosage_form || null,
        strength: row.strength || null,
        unit: row.unit,
        shelf_life_months: row.shelf_life_months,
        description: row.description || null,
        status: next,
      }),
    });
    const json = await res.json();
    if (!json.success) {
      setMsg(json.message);
      return;
    }
    setMsg(`${row.product_code} → ${next}`);
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
        canWrite("products") ? (
          <div className="flex flex-wrap gap-1">
            <Button variant="ghost" onClick={() => openEdit(r)}>
              Edit
            </Button>
            {r.status === "ACTIVE" ? (
              <Button variant="ghost" onClick={() => setProductStatus(r, "INACTIVE")}>
                Deactivate
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setProductStatus(r, "ACTIVE")}>
                Activate
              </Button>
            )}
          </div>
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

      {msg ? (
        <div className="mb-4">
          <Alert type="info">{msg}</Alert>
        </div>
      ) : null}

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
            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Create Product"}
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
            placeholder="Search code/name..."
          />
          <FormField label="Filter by status" hint="Show active or inactive products only">
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

      <Modal
        open={!!editing}
        onClose={() => (editSaving ? undefined : setEditing(null))}
        title="Edit product"
        description={editing ? `${editing.product_code} — update finished goods details` : undefined}
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={editSaving}
              onClick={() => setEditing(null)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-product-form"
              disabled={editSaving}
              className="w-full sm:w-auto"
            >
              {editSaving ? "Updating..." : "Update"}
            </Button>
          </>
        }
      >
        <form
          id="edit-product-form"
          onSubmit={updateProduct}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <div>
            <Label>Product code *</Label>
            <Input
              required
              value={editForm.product_code}
              onChange={(e) => setEditForm({ ...editForm, product_code: e.target.value })}
            />
          </div>
          <div>
            <Label>Product name *</Label>
            <Input
              required
              value={editForm.product_name}
              onChange={(e) => setEditForm({ ...editForm, product_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Generic name</Label>
            <Input
              value={editForm.generic_name}
              onChange={(e) => setEditForm({ ...editForm, generic_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Dosage form</Label>
            <Input
              value={editForm.dosage_form}
              onChange={(e) => setEditForm({ ...editForm, dosage_form: e.target.value })}
            />
          </div>
          <div>
            <Label>Strength</Label>
            <Input
              value={editForm.strength}
              onChange={(e) => setEditForm({ ...editForm, strength: e.target.value })}
            />
          </div>
          <div>
            <Label>Unit</Label>
            <Input
              value={editForm.unit}
              onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
            />
          </div>
          <div>
            <Label>Shelf life (months)</Label>
            <Input
              type="number"
              value={editForm.shelf_life_months}
              onChange={(e) => setEditForm({ ...editForm, shelf_life_months: e.target.value })}
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Input
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
          </div>
          {editError ? (
            <div className="sm:col-span-2">
              <Alert type="error">{editError}</Alert>
            </div>
          ) : null}
        </form>
      </Modal>
    </AppLayout>
  );
}

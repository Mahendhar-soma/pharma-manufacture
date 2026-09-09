"use client";

import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { StatusCell } from "@/components/tables/ResponsiveTable";
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
import { useApiList } from "@/hooks/useApiList";

type Mr = {
  id: number;
  mr_code: string;
  mr_name: string;
  territory?: string;
  phone?: string;
  email?: string;
  status: string;
};

const emptyCreate = { mr_name: "", territory: "", phone: "", email: "" };

export default function MedicalRepresentativesPage() {
  const { rows, loading, error, search, setSearch, status, setStatus, page, setPage, pagination, reload } =
    useApiList<Mr>("/api/medical-representatives");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyCreate);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<Mr | null>(null);
  const [editForm, setEditForm] = useState({
    mr_name: "",
    territory: "",
    phone: "",
    email: "",
    status: "ACTIVE",
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  function openEdit(row: Mr) {
    setEditing(row);
    setEditError(null);
    setEditForm({
      mr_name: row.mr_name || "",
      territory: row.territory || "",
      phone: row.phone || "",
      email: row.email || "",
      status: row.status || "ACTIVE",
    });
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/medical-representatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setShowForm(false);
      setForm(emptyCreate);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function updateMr(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch("/api/medical-representatives", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          mr_name: editForm.mr_name,
          territory: editForm.territory || null,
          phone: editForm.phone || null,
          email: editForm.email || null,
          status: editForm.status,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setEditing(null);
      reload();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <AppLayout title="Medical Reps">
      <PageHeader
        title="Medical Representatives"
        subtitle="Field force directory"
        actions={<Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "New MR"}</Button>}
      />
      {showForm ? (
        <Card className="mb-4">
          <form onSubmit={create} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>Name</Label>
              <Input
                required
                value={form.mr_name}
                onChange={(e) => setForm({ ...form, mr_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Territory</Label>
              <Input
                value={form.territory}
                onChange={(e) => setForm({ ...form, territory: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            {formError ? (
              <div className="sm:col-span-2 lg:col-span-4">
                <Alert type="error">{formError}</Alert>
              </div>
            ) : null}
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Create"}
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
              setSearch(v);
              setPage(1);
            }}
          />
          <FormField label="Filter by status" hint="Show records in one status only">
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
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
          { key: "mr_code", header: "Code" },
          { key: "mr_name", header: "Name" },
          { key: "territory", header: "Territory", render: (r) => r.territory || "-" },
          { key: "phone", header: "Phone", render: (r) => r.phone || "-" },
          { key: "email", header: "Email", render: (r) => r.email || "-" },
          { key: "status", header: "Status", render: (r) => <StatusCell value={r.status} /> },
          {
            key: "actions",
            header: "Actions",
            render: (r) => (
              <Button variant="ghost" onClick={() => openEdit(r)}>
                Edit
              </Button>
            ),
          },
        ]}
        rows={rows}
        loading={loading}
        error={error}
        onRetry={reload}
        page={page}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
      />

      <Modal
        open={!!editing}
        onClose={() => (editSaving ? undefined : setEditing(null))}
        title="Edit medical representative"
        description={editing ? `${editing.mr_code} — update field force details` : undefined}
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
              form="edit-mr-form"
              disabled={editSaving}
              className="w-full sm:w-auto"
            >
              {editSaving ? "Updating..." : "Update"}
            </Button>
          </>
        }
      >
        <form id="edit-mr-form" onSubmit={updateMr} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>Name *</Label>
            <Input
              required
              value={editForm.mr_name}
              onChange={(e) => setEditForm({ ...editForm, mr_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Territory</Label>
            <Input
              value={editForm.territory}
              onChange={(e) => setEditForm({ ...editForm, territory: e.target.value })}
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
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

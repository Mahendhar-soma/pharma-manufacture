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

type Hospital = {
  id: number;
  hospital_code: string;
  hospital_name: string;
  city?: string;
  phone?: string;
  email?: string;
  address?: string;
  doctors_count?: number;
  status: string;
};

const emptyCreate = { hospital_name: "", city: "", phone: "" };

export default function HospitalsPage() {
  const { rows, loading, error, search, setSearch, status, setStatus, page, setPage, pagination, reload } =
    useApiList<Hospital>("/api/hospitals");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyCreate);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<Hospital | null>(null);
  const [editForm, setEditForm] = useState({
    hospital_name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    status: "ACTIVE",
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  function openEdit(row: Hospital) {
    setEditing(row);
    setEditError(null);
    setEditForm({
      hospital_name: row.hospital_name || "",
      phone: row.phone || "",
      email: row.email || "",
      address: row.address || "",
      city: row.city || "",
      status: row.status || "ACTIVE",
    });
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/hospitals", {
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

  async function updateHospital(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch("/api/hospitals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          hospital_name: editForm.hospital_name,
          phone: editForm.phone || null,
          email: editForm.email || null,
          address: editForm.address || null,
          city: editForm.city || null,
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
    <AppLayout title="Hospitals">
      <PageHeader
        title="Hospitals"
        subtitle="Healthcare institutions"
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "New Hospital"}</Button>
        }
      />
      {showForm ? (
        <Card className="mb-4">
          <form onSubmit={create} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label>Name</Label>
              <Input
                required
                value={form.hospital_name}
                onChange={(e) => setForm({ ...form, hospital_name: e.target.value })}
              />
            </div>
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            {formError ? (
              <div className="sm:col-span-3">
                <Alert type="error">{formError}</Alert>
              </div>
            ) : null}
            <div className="sm:col-span-3">
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
          { key: "hospital_code", header: "Code" },
          { key: "hospital_name", header: "Name" },
          { key: "city", header: "City", render: (r) => r.city || "-" },
          { key: "phone", header: "Phone", render: (r) => r.phone || "-" },
          { key: "doctors_count", header: "Doctors", render: (r) => r.doctors_count || 0 },
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
        title="Edit hospital"
        description={editing ? `${editing.hospital_code} — update institution details` : undefined}
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
              form="edit-hospital-form"
              disabled={editSaving}
              className="w-full sm:w-auto"
            >
              {editSaving ? "Updating..." : "Update"}
            </Button>
          </>
        }
      >
        <form
          id="edit-hospital-form"
          onSubmit={updateHospital}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <div>
            <Label>Name *</Label>
            <Input
              required
              value={editForm.hospital_name}
              onChange={(e) => setEditForm({ ...editForm, hospital_name: e.target.value })}
            />
          </div>
          <div>
            <Label>City</Label>
            <Input
              value={editForm.city}
              onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
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
          <div className="sm:col-span-2">
            <Label>Address</Label>
            <Input
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
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

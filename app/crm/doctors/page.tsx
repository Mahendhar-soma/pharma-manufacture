"use client";

import { useEffect, useState } from "react";
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

type Doctor = {
  id: number;
  doctor_code: string;
  doctor_name: string;
  specialization?: string;
  phone?: string;
  email?: string;
  hospital_id?: number | null;
  hospital_name?: string;
  city?: string;
  status: string;
};

type HospitalOption = { id: number; hospital_name: string; hospital_code: string };

const emptyCreate = { doctor_name: "", specialization: "", city: "", phone: "" };

export default function DoctorsPage() {
  const { rows, loading, error, search, setSearch, status, setStatus, page, setPage, pagination, reload } =
    useApiList<Doctor>("/api/doctors");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyCreate);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<Doctor | null>(null);
  const [editForm, setEditForm] = useState({
    doctor_name: "",
    specialization: "",
    phone: "",
    email: "",
    hospital_id: "",
    city: "",
    status: "ACTIVE",
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [hospitals, setHospitals] = useState<HospitalOption[]>([]);

  useEffect(() => {
    fetch("/api/hospitals?limit=200&status=ACTIVE")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setHospitals(j.data.items || []);
      })
      .catch(() => undefined);
  }, []);

  function openEdit(row: Doctor) {
    setEditing(row);
    setEditError(null);
    setEditForm({
      doctor_name: row.doctor_name || "",
      specialization: row.specialization || "",
      phone: row.phone || "",
      email: row.email || "",
      hospital_id: row.hospital_id ? String(row.hospital_id) : "",
      city: row.city || "",
      status: row.status || "ACTIVE",
    });
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/doctors", {
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

  async function updateDoctor(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/doctors/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_name: editForm.doctor_name,
          specialization: editForm.specialization || null,
          phone: editForm.phone || null,
          email: editForm.email || null,
          hospital_id: editForm.hospital_id ? Number(editForm.hospital_id) : null,
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
    <AppLayout title="Doctors">
      <PageHeader
        title="Doctors / HCPs"
        subtitle="Healthcare professional directory"
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "New Doctor"}</Button>
        }
      />
      {showForm ? (
        <Card className="mb-4">
          <form onSubmit={create} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>Name</Label>
              <Input
                required
                value={form.doctor_name}
                onChange={(e) => setForm({ ...form, doctor_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Specialization</Label>
              <Input
                value={form.specialization}
                onChange={(e) => setForm({ ...form, specialization: e.target.value })}
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
          { key: "doctor_code", header: "Code" },
          { key: "doctor_name", header: "Name" },
          { key: "specialization", header: "Specialization", render: (r) => r.specialization || "-" },
          { key: "hospital_name", header: "Hospital", render: (r) => r.hospital_name || "-" },
          { key: "city", header: "City", render: (r) => r.city || "-" },
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
        title="Edit doctor"
        description={editing ? `${editing.doctor_code} — update HCP details` : undefined}
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
              form="edit-doctor-form"
              disabled={editSaving}
              className="w-full sm:w-auto"
            >
              {editSaving ? "Updating..." : "Update"}
            </Button>
          </>
        }
      >
        <form id="edit-doctor-form" onSubmit={updateDoctor} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>Name *</Label>
            <Input
              required
              value={editForm.doctor_name}
              onChange={(e) => setEditForm({ ...editForm, doctor_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Specialization</Label>
            <Input
              value={editForm.specialization}
              onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
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
            <Label>Hospital</Label>
            <Select
              value={editForm.hospital_id}
              onChange={(e) => setEditForm({ ...editForm, hospital_id: e.target.value })}
            >
              <option value="">No hospital</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.hospital_code} — {h.hospital_name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>City</Label>
            <Input
              value={editForm.city}
              onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
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

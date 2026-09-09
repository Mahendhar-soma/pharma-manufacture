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
  Textarea,
} from "@/components/ui";
import { useApiList } from "@/hooks/useApiList";
import { formatDate } from "@/lib/utils";

type Visit = {
  id: number;
  doctor_id: number;
  medical_representative_id: number;
  doctor_name: string;
  mr_name: string;
  visit_date: string;
  purpose?: string;
  notes?: string;
  follow_up_date?: string;
  status: string;
};

type Option = { id: number; label: string };

function toDateInput(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function defaultFollowUpDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

const emptyCreate = {
  doctor_id: "",
  medical_representative_id: "",
  visit_date: "",
  purpose: "",
};

export default function VisitsPage() {
  const { rows, loading, error, search, setSearch, status, setStatus, page, setPage, pagination, reload } =
    useApiList<Visit>("/api/doctor-visits");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyCreate);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [doctors, setDoctors] = useState<Option[]>([]);
  const [mrs, setMrs] = useState<Option[]>([]);

  const [editing, setEditing] = useState<Visit | null>(null);
  const [editForm, setEditForm] = useState({
    visit_date: "",
    purpose: "",
    notes: "",
    follow_up_date: "",
    status: "PLANNED",
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/doctors?limit=200&status=ACTIVE").then((r) => r.json()),
      fetch("/api/medical-representatives?limit=200&status=ACTIVE").then((r) => r.json()),
    ]).then(([d, m]) => {
      if (d.success) {
        setDoctors(
          (d.data.items || []).map((x: { id: number; doctor_code: string; doctor_name: string }) => ({
            id: x.id,
            label: `${x.doctor_code} — ${x.doctor_name}`,
          })),
        );
      }
      if (m.success) {
        setMrs(
          (m.data.items || []).map((x: { id: number; mr_code: string; mr_name: string }) => ({
            id: x.id,
            label: `${x.mr_code} — ${x.mr_name}`,
          })),
        );
      }
    });
  }, []);

  function openEdit(row: Visit, presetStatus?: string) {
    setEditing(row);
    setEditError(null);
    const nextStatus = presetStatus || row.status || "PLANNED";
    setEditForm({
      visit_date: toDateInput(row.visit_date),
      purpose: row.purpose || "",
      notes: row.notes || "",
      follow_up_date:
        toDateInput(row.follow_up_date) ||
        (nextStatus === "FOLLOW_UP" ? defaultFollowUpDate() : ""),
      status: nextStatus,
    });
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/doctor-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: Number(form.doctor_id),
          medical_representative_id: Number(form.medical_representative_id),
          visit_date: form.visit_date,
          purpose: form.purpose,
          status: "PLANNED",
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setShowForm(false);
      setForm(emptyCreate);
      setActionMsg("Visit created as PLANNED");
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function updateVisit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch("/api/doctor-visits", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          visit_date: editForm.visit_date,
          purpose: editForm.purpose || null,
          notes: editForm.notes || null,
          follow_up_date: editForm.follow_up_date || null,
          status: editForm.status,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setEditing(null);
      setActionMsg(`Visit updated → ${editForm.status}`);
      reload();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setEditSaving(false);
    }
  }

  async function setVisitStatus(row: Visit, next: "COMPLETED" | "CANCELLED" | "FOLLOW_UP") {
    if (next === "FOLLOW_UP") {
      openEdit(row, "FOLLOW_UP");
      return;
    }
    setBusyId(row.id);
    setActionMsg(null);
    try {
      const res = await fetch("/api/doctor-visits", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, status: next }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setActionMsg(`Visit marked ${next}`);
      reload();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppLayout title="Visits">
      <PageHeader
        title="Doctor Visits"
        subtitle="MR call reporting — create planned visits, then Complete / Cancel / Follow-up"
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "New Visit"}</Button>
        }
      />

      {actionMsg ? (
        <div className="mb-4">
          <Alert type="info">{actionMsg}</Alert>
        </div>
      ) : null}

      {showForm ? (
        <Card className="mb-4">
          <form onSubmit={create} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>Doctor *</Label>
              <Select
                required
                value={form.doctor_id}
                onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}
              >
                <option value="">Select doctor</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Medical rep *</Label>
              <Select
                required
                value={form.medical_representative_id}
                onChange={(e) => setForm({ ...form, medical_representative_id: e.target.value })}
              >
                <option value="">Select MR</option>
                {mrs.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Visit date *</Label>
              <Input
                required
                type="date"
                value={form.visit_date}
                onChange={(e) => setForm({ ...form, visit_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Purpose</Label>
              <Input
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="e.g. Product detailing"
              />
            </div>
            {formError ? (
              <div className="sm:col-span-2 lg:col-span-4">
                <Alert type="error">{formError}</Alert>
              </div>
            ) : null}
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Create as PLANNED"}
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
          <FormField label="Filter by status" hint="Show visits in one state only">
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="PLANNED">PLANNED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="FOLLOW_UP">FOLLOW_UP</option>
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
          { key: "doctor_name", header: "Doctor" },
          { key: "mr_name", header: "MR" },
          { key: "visit_date", header: "Date", render: (r) => formatDate(r.visit_date) },
          { key: "purpose", header: "Purpose", render: (r) => r.purpose || "-" },
          { key: "follow_up_date", header: "Follow-up", render: (r) => formatDate(r.follow_up_date) },
          { key: "status", header: "Status", render: (r) => <StatusCell value={r.status} /> },
          {
            key: "actions",
            header: "Actions",
            render: (r) => {
              const busy = busyId === r.id;
              const open = r.status === "PLANNED" || r.status === "FOLLOW_UP";
              return (
                <div className="flex flex-wrap gap-1">
                  <Button variant="ghost" onClick={() => openEdit(r)}>
                    Edit
                  </Button>
                  {open ? (
                    <>
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setVisitStatus(r, "COMPLETED")}
                      >
                        Complete
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setVisitStatus(r, "FOLLOW_UP")}
                      >
                        Follow-up
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setVisitStatus(r, "CANCELLED")}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : null}
                </div>
              );
            },
          },
        ]}
        rows={rows}
        loading={loading}
        error={error}
        onRetry={reload}
        page={page}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
        minWidth="1100px"
      />

      <Modal
        open={!!editing}
        onClose={() => (editSaving ? undefined : setEditing(null))}
        title="Edit visit"
        description={
          editing
            ? `${editing.doctor_name} · ${editing.mr_name} — update details and status`
            : undefined
        }
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
              Close
            </Button>
            <Button
              type="submit"
              form="edit-visit-form"
              disabled={editSaving}
              className="w-full sm:w-auto"
            >
              {editSaving ? "Updating..." : "Update visit"}
            </Button>
          </>
        }
      >
        <form id="edit-visit-form" onSubmit={updateVisit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>Visit date *</Label>
            <Input
              required
              type="date"
              value={editForm.visit_date}
              onChange={(e) => setEditForm({ ...editForm, visit_date: e.target.value })}
            />
          </div>
          <div>
            <Label>Status *</Label>
            <Select
              value={editForm.status}
              onChange={(e) => {
                const next = e.target.value;
                setEditForm({
                  ...editForm,
                  status: next,
                  follow_up_date:
                    next === "FOLLOW_UP" && !editForm.follow_up_date
                      ? defaultFollowUpDate()
                      : editForm.follow_up_date,
                });
              }}
            >
              <option value="PLANNED">PLANNED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="FOLLOW_UP">FOLLOW_UP</option>
            </Select>
          </div>
          <div>
            <Label>Purpose</Label>
            <Input
              value={editForm.purpose}
              onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })}
            />
          </div>
          <div>
            <Label>Follow-up date</Label>
            <Input
              type="date"
              value={editForm.follow_up_date}
              onChange={(e) => setEditForm({ ...editForm, follow_up_date: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Notes</Label>
            <Textarea
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              placeholder="Call outcome, samples given, doctor feedback…"
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

type Study = {
  id: number;
  study_code: string;
  study_title: string;
  study_type: string;
  compound_id?: number | null;
  compound_code?: string;
  researcher?: string;
  study_date?: string;
  result?: string;
  remarks?: string;
  status: string;
};

type Option = { id: number; label: string };

function toDateInput(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

const emptyCreate = {
  study_title: "",
  study_type: "TOXICOLOGY",
  compound_id: "",
  researcher: "",
  study_date: "",
  result: "",
  remarks: "",
};

export default function PreclinicalPage() {
  const { rows, loading, error, search, setSearch, status, setStatus, page, setPage, pagination, reload } =
    useApiList<Study>("/api/preclinical-studies");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyCreate);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [compounds, setCompounds] = useState<Option[]>([]);

  const [editing, setEditing] = useState<Study | null>(null);
  const [editForm, setEditForm] = useState({
    study_title: "",
    study_type: "TOXICOLOGY",
    compound_id: "",
    researcher: "",
    study_date: "",
    result: "",
    remarks: "",
    status: "PLANNED",
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    fetch("/api/compounds?limit=200&status=ACTIVE")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setCompounds(
            (j.data.items || []).map(
              (c: { id: number; compound_code: string; compound_name: string }) => ({
                id: c.id,
                label: `${c.compound_code} — ${c.compound_name}`,
              }),
            ),
          );
        }
      })
      .catch(() => undefined);
  }, []);

  function openEdit(row: Study) {
    setEditing(row);
    setEditError(null);
    setEditForm({
      study_title: row.study_title || "",
      study_type: row.study_type || "TOXICOLOGY",
      compound_id: row.compound_id ? String(row.compound_id) : "",
      researcher: row.researcher || "",
      study_date: toDateInput(row.study_date),
      result: row.result || "",
      remarks: row.remarks || "",
      status: row.status || "PLANNED",
    });
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/preclinical-studies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          study_title: form.study_title,
          study_type: form.study_type,
          compound_id: form.compound_id ? Number(form.compound_id) : null,
          researcher: form.researcher || null,
          study_date: form.study_date || null,
          result: form.result || null,
          remarks: form.remarks || null,
          status: "PLANNED",
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setShowForm(false);
      setForm(emptyCreate);
      setActionMsg("Study created as PLANNED");
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function updateStudy(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch("/api/preclinical-studies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          study_title: editForm.study_title,
          study_type: editForm.study_type,
          compound_id: editForm.compound_id ? Number(editForm.compound_id) : null,
          researcher: editForm.researcher || null,
          study_date: editForm.study_date || null,
          result: editForm.result || null,
          remarks: editForm.remarks || null,
          status: editForm.status,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setEditing(null);
      setActionMsg(`Study updated → ${editForm.status}`);
      reload();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setEditSaving(false);
    }
  }

  async function setStudyStatus(row: Study, next: string) {
    setBusyId(row.id);
    setActionMsg(null);
    try {
      const res = await fetch("/api/preclinical-studies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, status: next }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setActionMsg(`${row.study_code} → ${next}`);
      reload();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppLayout title="Preclinical">
      <PageHeader
        title="Preclinical Studies"
        subtitle="Toxicology, pharmacology and safety studies linked to compounds"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/drug-discovery/compounds"
              className="inline-flex h-10 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm"
            >
              Compounds
            </Link>
            <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "New Study"}</Button>
          </div>
        }
      />

      {actionMsg ? (
        <div className="mb-4">
          <Alert type="info">{actionMsg}</Alert>
        </div>
      ) : null}

      {showForm ? (
        <Card className="mb-4">
          <form onSubmit={create} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Label>Title *</Label>
              <Input
                required
                value={form.study_title}
                onChange={(e) => setForm({ ...form, study_title: e.target.value })}
              />
            </div>
            <div>
              <Label>Type *</Label>
              <Select
                value={form.study_type}
                onChange={(e) => setForm({ ...form, study_type: e.target.value })}
              >
                <option value="TOXICOLOGY">TOXICOLOGY</option>
                <option value="PHARMACOLOGY">PHARMACOLOGY</option>
                <option value="SAFETY">SAFETY</option>
                <option value="EFFICACY">EFFICACY</option>
                <option value="OTHER">OTHER</option>
              </Select>
            </div>
            <div>
              <Label>Compound</Label>
              <Select
                value={form.compound_id}
                onChange={(e) => setForm({ ...form, compound_id: e.target.value })}
              >
                <option value="">No compound</option>
                {compounds.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Researcher</Label>
              <Input
                value={form.researcher}
                onChange={(e) => setForm({ ...form, researcher: e.target.value })}
              />
            </div>
            <div>
              <Label>Study date</Label>
              <Input
                type="date"
                value={form.study_date}
                onChange={(e) => setForm({ ...form, study_date: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Label>Remarks</Label>
              <Textarea
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              />
            </div>
            {formError ? (
              <div className="sm:col-span-2 lg:col-span-3">
                <Alert type="error">{formError}</Alert>
              </div>
            ) : null}
            <div className="sm:col-span-2 lg:col-span-3">
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
          <FormField label="Filter by status" hint="Show studies in one state">
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="PLANNED">PLANNED</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
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
          { key: "study_code", header: "Code" },
          { key: "study_title", header: "Title" },
          { key: "study_type", header: "Type" },
          {
            key: "compound_code",
            header: "Compound",
            render: (r) =>
              r.compound_code ? (
                <Link
                  href={`/drug-discovery/experiments?compound_id=${r.compound_id}`}
                  className="text-teal-800 hover:underline"
                >
                  {r.compound_code}
                </Link>
              ) : (
                "-"
              ),
          },
          { key: "researcher", header: "Researcher", render: (r) => r.researcher || "-" },
          { key: "study_date", header: "Date", render: (r) => formatDate(r.study_date) },
          { key: "status", header: "Status", render: (r) => <StatusCell value={r.status} /> },
          {
            key: "actions",
            header: "Actions",
            render: (r) => {
              const busy = busyId === r.id;
              return (
                <div className="flex flex-wrap gap-1">
                  <Button variant="ghost" onClick={() => openEdit(r)}>
                    Edit
                  </Button>
                  {r.status === "PLANNED" ? (
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setStudyStatus(r, "IN_PROGRESS")}
                    >
                      Start
                    </Button>
                  ) : null}
                  {r.status === "IN_PROGRESS" ? (
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setStudyStatus(r, "COMPLETED")}
                    >
                      Complete
                    </Button>
                  ) : null}
                  {r.status !== "CANCELLED" && r.status !== "COMPLETED" ? (
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setStudyStatus(r, "CANCELLED")}
                    >
                      Cancel
                    </Button>
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
        title="Edit preclinical study"
        description={editing ? editing.study_code : undefined}
        size="lg"
        footer={
          <>
            <Button type="button" variant="secondary" disabled={editSaving} onClick={() => setEditing(null)}>
              Close
            </Button>
            <Button type="submit" form="edit-study-form" disabled={editSaving}>
              {editSaving ? "Updating..." : "Update"}
            </Button>
          </>
        }
      >
        <form id="edit-study-form" onSubmit={updateStudy} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Title *</Label>
            <Input
              required
              value={editForm.study_title}
              onChange={(e) => setEditForm({ ...editForm, study_title: e.target.value })}
            />
          </div>
          <div>
            <Label>Type *</Label>
            <Select
              value={editForm.study_type}
              onChange={(e) => setEditForm({ ...editForm, study_type: e.target.value })}
            >
              <option value="TOXICOLOGY">TOXICOLOGY</option>
              <option value="PHARMACOLOGY">PHARMACOLOGY</option>
              <option value="SAFETY">SAFETY</option>
              <option value="EFFICACY">EFFICACY</option>
              <option value="OTHER">OTHER</option>
            </Select>
          </div>
          <div>
            <Label>Status *</Label>
            <Select
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            >
              <option value="PLANNED">PLANNED</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </Select>
          </div>
          <div>
            <Label>Compound</Label>
            <Select
              value={editForm.compound_id}
              onChange={(e) => setEditForm({ ...editForm, compound_id: e.target.value })}
            >
              <option value="">No compound</option>
              {compounds.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Researcher</Label>
            <Input
              value={editForm.researcher}
              onChange={(e) => setEditForm({ ...editForm, researcher: e.target.value })}
            />
          </div>
          <div>
            <Label>Study date</Label>
            <Input
              type="date"
              value={editForm.study_date}
              onChange={(e) => setEditForm({ ...editForm, study_date: e.target.value })}
            />
          </div>
          <div>
            <Label>Result</Label>
            <Input
              value={editForm.result}
              onChange={(e) => setEditForm({ ...editForm, result: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Remarks</Label>
            <Textarea
              value={editForm.remarks}
              onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
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

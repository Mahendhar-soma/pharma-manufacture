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
  StatCard,
  Textarea,
} from "@/components/ui";
import { useApiList } from "@/hooks/useApiList";

type Project = {
  id: number;
  project_code: string;
  project_name: string;
  description?: string;
  status: string;
  experiment_count?: number;
  start_date?: string;
  end_date?: string;
};

function toDateInput(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

const emptyCreate = {
  project_name: "",
  description: "",
  start_date: "",
  end_date: "",
};

export default function DrugDiscoveryPage() {
  const {
    rows,
    loading,
    error,
    search,
    setSearch,
    status,
    setStatus,
    page,
    setPage,
    pagination,
    reload,
  } = useApiList<Project>("/api/research-projects");

  const [stats, setStats] = useState({ compounds: 0, experiments: 0, docking: 0 });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyCreate);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [editing, setEditing] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState({
    project_name: "",
    description: "",
    start_date: "",
    end_date: "",
    status: "PLANNED",
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/compounds?limit=1").then((r) => r.json()),
      fetch("/api/research-experiments?limit=1").then((r) => r.json()),
      fetch("/api/docking-experiments?limit=1").then((r) => r.json()),
    ]).then(([c, e, d]) => {
      setStats({
        compounds: c.data?.pagination?.total || 0,
        experiments: e.data?.pagination?.total || 0,
        docking: d.data?.pagination?.total || 0,
      });
    });
  }, [rows]);

  function openEdit(row: Project) {
    setEditing(row);
    setEditError(null);
    setEditForm({
      project_name: row.project_name || "",
      description: row.description || "",
      start_date: toDateInput(row.start_date),
      end_date: toDateInput(row.end_date),
      status: row.status || "PLANNED",
    });
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/research-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status: "PLANNED" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setShowForm(false);
      setForm(emptyCreate);
      setActionMsg("Project created as PLANNED");
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function updateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch("/api/research-projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          project_name: editForm.project_name,
          description: editForm.description || null,
          start_date: editForm.start_date || null,
          end_date: editForm.end_date || null,
          status: editForm.status,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setEditing(null);
      setActionMsg(`Project updated → ${editForm.status}`);
      reload();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setEditSaving(false);
    }
  }

  async function setProjectStatus(row: Project, next: string) {
    setBusyId(row.id);
    setActionMsg(null);
    try {
      const res = await fetch("/api/research-projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, status: next }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setActionMsg(`${row.project_code} → ${next}`);
      reload();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppLayout title="Drug Discovery">
      <PageHeader
        title="Drug Discovery"
        subtitle="Research projects linked to compounds and experiments"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/drug-discovery/compounds"
              className="inline-flex h-10 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm"
            >
              Compounds
            </Link>
            <Link
              href="/drug-discovery/experiments"
              className="inline-flex h-10 items-center rounded-xl bg-teal-700 px-3 text-sm text-white"
            >
              Experiments
            </Link>
            <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "New Project"}</Button>
          </div>
        }
      />

      {actionMsg ? (
        <div className="mb-4">
          <Alert type="info">{actionMsg}</Alert>
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Compounds" value={stats.compounds} />
        <StatCard label="Experiments" value={stats.experiments} />
        <StatCard label="Docking Runs" value={stats.docking} />
      </div>

      {showForm ? (
        <Card className="mb-4">
          <form onSubmit={create} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Project name *</Label>
              <Input
                required
                value={form.project_name}
                onChange={(e) => setForm({ ...form, project_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Start date</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label>End date</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            {formError ? (
              <div className="sm:col-span-2">
                <Alert type="error">{formError}</Alert>
              </div>
            ) : null}
            <div className="sm:col-span-2">
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
            placeholder="Search projects..."
          />
          <FormField label="Filter by status" hint="Show projects in one state">
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="PLANNED">PLANNED</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="ON_HOLD">ON_HOLD</option>
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

      {error ? <Alert type="error">{error}</Alert> : null}

      <ResponsiveTable
        columns={[
          { key: "project_code", header: "Code" },
          { key: "project_name", header: "Project" },
          {
            key: "experiment_count",
            header: "Experiments",
            render: (r) => (
              <Link
                href={`/drug-discovery/experiments?project_id=${r.id}`}
                className="font-medium text-teal-800 hover:underline"
              >
                {r.experiment_count || 0}
              </Link>
            ),
          },
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
                    <Button variant="ghost" disabled={busy} onClick={() => setProjectStatus(r, "ACTIVE")}>
                      Activate
                    </Button>
                  ) : null}
                  {r.status === "ACTIVE" ? (
                    <>
                      <Button variant="ghost" disabled={busy} onClick={() => setProjectStatus(r, "ON_HOLD")}>
                        Hold
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setProjectStatus(r, "COMPLETED")}
                      >
                        Complete
                      </Button>
                    </>
                  ) : null}
                  {r.status === "ON_HOLD" ? (
                    <Button variant="ghost" disabled={busy} onClick={() => setProjectStatus(r, "ACTIVE")}>
                      Resume
                    </Button>
                  ) : null}
                  {r.status !== "CANCELLED" && r.status !== "COMPLETED" ? (
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setProjectStatus(r, "CANCELLED")}
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
        minWidth="1000px"
      />

      <Modal
        open={!!editing}
        onClose={() => (editSaving ? undefined : setEditing(null))}
        title="Edit research project"
        description={editing ? `${editing.project_code}` : undefined}
        size="lg"
        footer={
          <>
            <Button type="button" variant="secondary" disabled={editSaving} onClick={() => setEditing(null)}>
              Close
            </Button>
            <Button type="submit" form="edit-project-form" disabled={editSaving}>
              {editSaving ? "Updating..." : "Update"}
            </Button>
          </>
        }
      >
        <form id="edit-project-form" onSubmit={updateProject} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Project name *</Label>
            <Input
              required
              value={editForm.project_name}
              onChange={(e) => setEditForm({ ...editForm, project_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Status *</Label>
            <Select
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            >
              <option value="PLANNED">PLANNED</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="ON_HOLD">ON_HOLD</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </Select>
          </div>
          <div>
            <Label>Start date</Label>
            <Input
              type="date"
              value={editForm.start_date}
              onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
            />
          </div>
          <div>
            <Label>End date</Label>
            <Input
              type="date"
              value={editForm.end_date}
              onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Textarea
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

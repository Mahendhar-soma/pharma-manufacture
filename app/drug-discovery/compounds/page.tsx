"use client";

import { useState } from "react";
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

type Compound = {
  id: number;
  compound_code: string;
  compound_name: string;
  chemical_formula?: string;
  molecular_weight?: number;
  smiles?: string;
  description?: string;
  status: string;
};

const emptyCreate = {
  compound_name: "",
  chemical_formula: "",
  molecular_weight: "",
  smiles: "",
  description: "",
};

export default function CompoundsPage() {
  const { rows, loading, error, search, setSearch, status, setStatus, page, setPage, pagination, reload } =
    useApiList<Compound>("/api/compounds");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyCreate);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [editing, setEditing] = useState<Compound | null>(null);
  const [editForm, setEditForm] = useState({
    compound_name: "",
    chemical_formula: "",
    molecular_weight: "",
    smiles: "",
    description: "",
    status: "ACTIVE",
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  function openEdit(row: Compound) {
    setEditing(row);
    setEditError(null);
    setEditForm({
      compound_name: row.compound_name || "",
      chemical_formula: row.chemical_formula || "",
      molecular_weight: row.molecular_weight != null ? String(row.molecular_weight) : "",
      smiles: row.smiles || "",
      description: row.description || "",
      status: row.status || "ACTIVE",
    });
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/compounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          molecular_weight: form.molecular_weight ? Number(form.molecular_weight) : null,
          status: "ACTIVE",
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setShowForm(false);
      setForm(emptyCreate);
      setActionMsg("Compound created as ACTIVE");
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function updateCompound(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/compounds/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          compound_name: editForm.compound_name,
          chemical_formula: editForm.chemical_formula || null,
          molecular_weight: editForm.molecular_weight ? Number(editForm.molecular_weight) : null,
          smiles: editForm.smiles || null,
          description: editForm.description || null,
          status: editForm.status,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setEditing(null);
      setActionMsg(`Compound updated → ${editForm.status}`);
      reload();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setEditSaving(false);
    }
  }

  async function setCompoundStatus(row: Compound, next: string) {
    setBusyId(row.id);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/compounds/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setActionMsg(`${row.compound_code} → ${next}`);
      reload();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppLayout title="Compounds">
      <PageHeader
        title="Compounds"
        subtitle="Chemical entities used in research experiments, docking, and preclinical studies"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/drug-discovery/experiments"
              className="inline-flex h-10 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm"
            >
              Experiments
            </Link>
            <Button onClick={() => setShowForm((v) => !v)}>{showForm ? "Close" : "New Compound"}</Button>
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
            <div>
              <Label>Name *</Label>
              <Input
                required
                value={form.compound_name}
                onChange={(e) => setForm({ ...form, compound_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Formula</Label>
              <Input
                value={form.chemical_formula}
                onChange={(e) => setForm({ ...form, chemical_formula: e.target.value })}
              />
            </div>
            <div>
              <Label>Mol. weight</Label>
              <Input
                type="number"
                step="0.0001"
                value={form.molecular_weight}
                onChange={(e) => setForm({ ...form, molecular_weight: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Label>SMILES</Label>
              <Input value={form.smiles} onChange={(e) => setForm({ ...form, smiles: e.target.value })} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            {formError ? (
              <div className="sm:col-span-2 lg:col-span-3">
                <Alert type="error">{formError}</Alert>
              </div>
            ) : null}
            <div className="sm:col-span-2 lg:col-span-3">
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
          <FormField label="Filter by status" hint="Show compounds in one state">
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
              <option value="ARCHIVED">ARCHIVED</option>
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
          { key: "compound_code", header: "Code" },
          { key: "compound_name", header: "Name" },
          { key: "chemical_formula", header: "Formula", render: (r) => r.chemical_formula || "-" },
          { key: "molecular_weight", header: "MW", render: (r) => r.molecular_weight ?? "-" },
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
                  <Link
                    href={`/drug-discovery/experiments?compound_id=${r.id}`}
                    className="inline-flex h-10 items-center px-2 text-sm text-teal-800 hover:underline"
                  >
                    Experiments
                  </Link>
                  {r.status === "ACTIVE" ? (
                    <>
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setCompoundStatus(r, "INACTIVE")}
                      >
                        Deactivate
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setCompoundStatus(r, "ARCHIVED")}
                      >
                        Archive
                      </Button>
                    </>
                  ) : null}
                  {r.status !== "ACTIVE" ? (
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setCompoundStatus(r, "ACTIVE")}
                    >
                      Activate
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
        title="Edit compound"
        description={editing ? editing.compound_code : undefined}
        size="lg"
        footer={
          <>
            <Button type="button" variant="secondary" disabled={editSaving} onClick={() => setEditing(null)}>
              Close
            </Button>
            <Button type="submit" form="edit-compound-form" disabled={editSaving}>
              {editSaving ? "Updating..." : "Update"}
            </Button>
          </>
        }
      >
        <form id="edit-compound-form" onSubmit={updateCompound} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>Name *</Label>
            <Input
              required
              value={editForm.compound_name}
              onChange={(e) => setEditForm({ ...editForm, compound_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Status *</Label>
            <Select
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </Select>
          </div>
          <div>
            <Label>Formula</Label>
            <Input
              value={editForm.chemical_formula}
              onChange={(e) => setEditForm({ ...editForm, chemical_formula: e.target.value })}
            />
          </div>
          <div>
            <Label>Mol. weight</Label>
            <Input
              type="number"
              step="0.0001"
              value={editForm.molecular_weight}
              onChange={(e) => setEditForm({ ...editForm, molecular_weight: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>SMILES</Label>
            <Input
              value={editForm.smiles}
              onChange={(e) => setEditForm({ ...editForm, smiles: e.target.value })}
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

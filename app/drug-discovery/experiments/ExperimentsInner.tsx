"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable from "@/components/tables/ResponsiveTable";
import {
  Alert,
  Button,
  Card,
  FilterActions,
  FilterBar,
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

type Option = { id: number; label: string };

type Experiment = {
  id: number;
  project_id: number;
  compound_id?: number | null;
  experiment_name: string;
  experiment_date?: string | null;
  result?: string | null;
  remarks?: string | null;
  project_code?: string;
  project_name?: string;
  compound_code?: string;
  compound_name?: string;
};

type Docking = {
  id: number;
  project_id?: number | null;
  compound_id: number;
  target_name: string;
  software_name?: string | null;
  binding_score?: number | null;
  experiment_date?: string | null;
  result?: string | null;
  remarks?: string | null;
  compound_code?: string;
  compound_name?: string;
};

function toDateInput(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

const emptyResearch = {
  project_id: "",
  compound_id: "",
  experiment_name: "",
  experiment_date: "",
  result: "",
  remarks: "",
};

const emptyDocking = {
  compound_id: "",
  target_name: "",
  software_name: "",
  binding_score: "",
  experiment_date: "",
  result: "",
  remarks: "",
};

export default function ExperimentsPage() {
  const searchParams = useSearchParams();
  const projectIdFilter = searchParams.get("project_id") || "";
  const compoundIdFilter = searchParams.get("compound_id") || "";

  const researchExtra = useMemo(() => {
    const parts: string[] = [];
    if (projectIdFilter) parts.push(`project_id=${encodeURIComponent(projectIdFilter)}`);
    if (compoundIdFilter) parts.push(`compound_id=${encodeURIComponent(compoundIdFilter)}`);
    return parts.join("&");
  }, [projectIdFilter, compoundIdFilter]);

  const dockingExtra = useMemo(() => {
    if (!compoundIdFilter) return "";
    return `compound_id=${encodeURIComponent(compoundIdFilter)}`;
  }, [compoundIdFilter]);

  const [tab, setTab] = useState<"research" | "docking">("research");

  const research = useApiList<Experiment>("/api/research-experiments", researchExtra);
  const docking = useApiList<Docking>("/api/docking-experiments", dockingExtra);

  const active = tab === "research" ? research : docking;

  const [projects, setProjects] = useState<Option[]>([]);
  const [compounds, setCompounds] = useState<Option[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [researchForm, setResearchForm] = useState(emptyResearch);
  const [dockingForm, setDockingForm] = useState(emptyDocking);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [editingResearch, setEditingResearch] = useState<Experiment | null>(null);
  const [editResearchForm, setEditResearchForm] = useState(emptyResearch);
  const [editResearchError, setEditResearchError] = useState<string | null>(null);
  const [editResearchSaving, setEditResearchSaving] = useState(false);

  const [editingDocking, setEditingDocking] = useState<Docking | null>(null);
  const [editDockingForm, setEditDockingForm] = useState(emptyDocking);
  const [editDockingError, setEditDockingError] = useState<string | null>(null);
  const [editDockingSaving, setEditDockingSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/research-projects?limit=200&status=ACTIVE").then((r) => r.json()),
      fetch("/api/research-projects?limit=200&status=PLANNED").then((r) => r.json()),
      fetch("/api/compounds?limit=200&status=ACTIVE").then((r) => r.json()),
    ])
      .then(([activeProjects, plannedProjects, compoundsJson]) => {
        const projectItems = [
          ...(activeProjects.success ? activeProjects.data?.items || [] : []),
          ...(plannedProjects.success ? plannedProjects.data?.items || [] : []),
        ] as { id: number; project_code: string; project_name: string }[];

        const seen = new Set<number>();
        setProjects(
          projectItems
            .filter((p) => {
              if (seen.has(p.id)) return false;
              seen.add(p.id);
              return true;
            })
            .map((p) => ({
              id: p.id,
              label: `${p.project_code} — ${p.project_name}`,
            })),
        );

        if (compoundsJson.success) {
          setCompounds(
            (compoundsJson.data?.items || []).map(
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

  useEffect(() => {
    if (projectIdFilter && !researchForm.project_id) {
      setResearchForm((f) => ({ ...f, project_id: projectIdFilter }));
    }
    if (compoundIdFilter) {
      setResearchForm((f) => (f.compound_id ? f : { ...f, compound_id: compoundIdFilter }));
      setDockingForm((f) => (f.compound_id ? f : { ...f, compound_id: compoundIdFilter }));
    }
    // Prefill from URL once options/filters are known; avoid fighting user edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectIdFilter, compoundIdFilter]);

  function openEditResearch(row: Experiment) {
    setEditingResearch(row);
    setEditResearchError(null);
    setEditResearchForm({
      project_id: row.project_id ? String(row.project_id) : "",
      compound_id: row.compound_id ? String(row.compound_id) : "",
      experiment_name: row.experiment_name || "",
      experiment_date: toDateInput(row.experiment_date),
      result: row.result || "",
      remarks: row.remarks || "",
    });
  }

  function openEditDocking(row: Docking) {
    setEditingDocking(row);
    setEditDockingError(null);
    setEditDockingForm({
      compound_id: row.compound_id ? String(row.compound_id) : "",
      target_name: row.target_name || "",
      software_name: row.software_name || "",
      binding_score: row.binding_score != null ? String(row.binding_score) : "",
      experiment_date: toDateInput(row.experiment_date),
      result: row.result || "",
      remarks: row.remarks || "",
    });
  }

  async function createResearch(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/research-experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: Number(researchForm.project_id),
          compound_id: researchForm.compound_id ? Number(researchForm.compound_id) : null,
          experiment_name: researchForm.experiment_name,
          experiment_date: researchForm.experiment_date || null,
          result: researchForm.result || null,
          remarks: researchForm.remarks || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setShowForm(false);
      setResearchForm({
        ...emptyResearch,
        project_id: projectIdFilter || "",
        compound_id: compoundIdFilter || "",
      });
      setActionMsg("Research experiment created");
      research.reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function createDocking(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/docking-experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          compound_id: Number(dockingForm.compound_id),
          target_name: dockingForm.target_name,
          software_name: dockingForm.software_name || null,
          binding_score: dockingForm.binding_score ? Number(dockingForm.binding_score) : null,
          experiment_date: dockingForm.experiment_date || null,
          result: dockingForm.result || null,
          remarks: dockingForm.remarks || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setShowForm(false);
      setDockingForm({
        ...emptyDocking,
        compound_id: compoundIdFilter || "",
      });
      setActionMsg("Docking experiment created");
      docking.reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function updateResearch(e: React.FormEvent) {
    e.preventDefault();
    if (!editingResearch) return;
    setEditResearchSaving(true);
    setEditResearchError(null);
    try {
      const res = await fetch("/api/research-experiments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingResearch.id,
          project_id: Number(editResearchForm.project_id),
          compound_id: editResearchForm.compound_id ? Number(editResearchForm.compound_id) : null,
          experiment_name: editResearchForm.experiment_name,
          experiment_date: editResearchForm.experiment_date || null,
          result: editResearchForm.result || null,
          remarks: editResearchForm.remarks || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setEditingResearch(null);
      setActionMsg("Research experiment updated");
      research.reload();
    } catch (err) {
      setEditResearchError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setEditResearchSaving(false);
    }
  }

  async function updateDocking(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDocking) return;
    setEditDockingSaving(true);
    setEditDockingError(null);
    try {
      const res = await fetch("/api/docking-experiments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingDocking.id,
          compound_id: Number(editDockingForm.compound_id),
          target_name: editDockingForm.target_name,
          software_name: editDockingForm.software_name || null,
          binding_score: editDockingForm.binding_score ? Number(editDockingForm.binding_score) : null,
          experiment_date: editDockingForm.experiment_date || null,
          result: editDockingForm.result || null,
          remarks: editDockingForm.remarks || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setEditingDocking(null);
      setActionMsg("Docking experiment updated");
      docking.reload();
    } catch (err) {
      setEditDockingError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setEditDockingSaving(false);
    }
  }

  const hasUrlFilter = Boolean(projectIdFilter || compoundIdFilter);

  return (
    <AppLayout title="Experiments">
      <PageHeader
        title="Experiments"
        subtitle="Research experiments and molecular docking runs"
        actions={
          <Button
            onClick={() => {
              setShowForm((v) => !v);
              setFormError(null);
            }}
          >
            {showForm ? "Close" : tab === "research" ? "New Research Experiment" : "New Docking Run"}
          </Button>
        }
      />

      {actionMsg ? (
        <div className="mb-4">
          <Alert type="info">{actionMsg}</Alert>
        </div>
      ) : null}

      {hasUrlFilter ? (
        <div className="mb-4">
          <Alert type="info">
            Filtered by
            {projectIdFilter ? ` project_id=${projectIdFilter}` : ""}
            {projectIdFilter && compoundIdFilter ? " and" : ""}
            {compoundIdFilter ? ` compound_id=${compoundIdFilter}` : ""}.{" "}
            <a href="/drug-discovery/experiments" className="font-medium text-teal-800 underline">
              Clear filters
            </a>
          </Alert>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          variant={tab === "research" ? "primary" : "secondary"}
          onClick={() => {
            setTab("research");
            setShowForm(false);
            setFormError(null);
          }}
        >
          Research
        </Button>
        <Button
          variant={tab === "docking" ? "primary" : "secondary"}
          onClick={() => {
            setTab("docking");
            setShowForm(false);
            setFormError(null);
          }}
        >
          Docking
        </Button>
      </div>

      {showForm && tab === "research" ? (
        <Card className="mb-4">
          <form onSubmit={createResearch} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Project *</Label>
              <Select
                required
                value={researchForm.project_id}
                onChange={(e) => setResearchForm({ ...researchForm, project_id: e.target.value })}
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Compound</Label>
              <Select
                value={researchForm.compound_id}
                onChange={(e) => setResearchForm({ ...researchForm, compound_id: e.target.value })}
              >
                <option value="">Optional</option>
                {compounds.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Name *</Label>
              <Input
                required
                value={researchForm.experiment_name}
                onChange={(e) => setResearchForm({ ...researchForm, experiment_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={researchForm.experiment_date}
                onChange={(e) => setResearchForm({ ...researchForm, experiment_date: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Label>Result</Label>
              <Input
                value={researchForm.result}
                onChange={(e) => setResearchForm({ ...researchForm, result: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Label>Remarks</Label>
              <Textarea
                value={researchForm.remarks}
                onChange={(e) => setResearchForm({ ...researchForm, remarks: e.target.value })}
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

      {showForm && tab === "docking" ? (
        <Card className="mb-4">
          <form onSubmit={createDocking} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Compound *</Label>
              <Select
                required
                value={dockingForm.compound_id}
                onChange={(e) => setDockingForm({ ...dockingForm, compound_id: e.target.value })}
              >
                <option value="">Select compound</option>
                {compounds.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Target *</Label>
              <Input
                required
                value={dockingForm.target_name}
                onChange={(e) => setDockingForm({ ...dockingForm, target_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Software</Label>
              <Input
                value={dockingForm.software_name}
                onChange={(e) => setDockingForm({ ...dockingForm, software_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Binding score</Label>
              <Input
                type="number"
                step="0.0001"
                value={dockingForm.binding_score}
                onChange={(e) => setDockingForm({ ...dockingForm, binding_score: e.target.value })}
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={dockingForm.experiment_date}
                onChange={(e) => setDockingForm({ ...dockingForm, experiment_date: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Label>Result</Label>
              <Input
                value={dockingForm.result}
                onChange={(e) => setDockingForm({ ...dockingForm, result: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Label>Remarks</Label>
              <Textarea
                value={dockingForm.remarks}
                onChange={(e) => setDockingForm({ ...dockingForm, remarks: e.target.value })}
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
            value={active.search}
            onChange={(v) => {
              active.setSearch(v);
              active.setPage(1);
            }}
            placeholder={tab === "research" ? "Search experiments..." : "Search docking runs..."}
          />
          <FilterActions>
            <Button variant="secondary" onClick={active.reload} className="w-full sm:w-auto">
              Refresh
            </Button>
          </FilterActions>
        </FilterBar>
      </Card>

      {tab === "research" ? (
        <ResponsiveTable
          columns={[
            { key: "project_code", header: "Project", render: (r) => r.project_code || r.project_id },
            {
              key: "compound_code",
              header: "Compound",
              render: (r) => r.compound_code || (r.compound_id ? String(r.compound_id) : "-"),
            },
            { key: "experiment_name", header: "Name" },
            {
              key: "experiment_date",
              header: "Date",
              render: (r) => formatDate(r.experiment_date),
            },
            { key: "result", header: "Result", render: (r) => r.result || "-" },
            {
              key: "actions",
              header: "Actions",
              render: (r) => (
                <Button variant="ghost" onClick={() => openEditResearch(r)}>
                  Edit
                </Button>
              ),
            },
          ]}
          rows={research.rows}
          loading={research.loading}
          error={research.error}
          onRetry={research.reload}
          page={research.page}
          totalPages={research.pagination.totalPages}
          onPageChange={research.setPage}
          minWidth="1000px"
        />
      ) : (
        <ResponsiveTable
          columns={[
            {
              key: "compound_code",
              header: "Compound",
              render: (r) => r.compound_code || String(r.compound_id),
            },
            { key: "target_name", header: "Target" },
            { key: "software_name", header: "Software", render: (r) => r.software_name || "-" },
            {
              key: "binding_score",
              header: "Score",
              render: (r) => (r.binding_score != null ? String(r.binding_score) : "-"),
            },
            {
              key: "experiment_date",
              header: "Date",
              render: (r) => formatDate(r.experiment_date),
            },
            { key: "result", header: "Result", render: (r) => r.result || "-" },
            {
              key: "actions",
              header: "Actions",
              render: (r) => (
                <Button variant="ghost" onClick={() => openEditDocking(r)}>
                  Edit
                </Button>
              ),
            },
          ]}
          rows={docking.rows}
          loading={docking.loading}
          error={docking.error}
          onRetry={docking.reload}
          page={docking.page}
          totalPages={docking.pagination.totalPages}
          onPageChange={docking.setPage}
          minWidth="1000px"
        />
      )}

      <Modal
        open={!!editingResearch}
        onClose={() => (editResearchSaving ? undefined : setEditingResearch(null))}
        title="Edit research experiment"
        description={editingResearch ? editingResearch.experiment_name : undefined}
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={editResearchSaving}
              onClick={() => setEditingResearch(null)}
            >
              Close
            </Button>
            <Button type="submit" form="edit-research-form" disabled={editResearchSaving}>
              {editResearchSaving ? "Updating..." : "Update"}
            </Button>
          </>
        }
      >
        <form
          id="edit-research-form"
          onSubmit={updateResearch}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <div>
            <Label>Project *</Label>
            <Select
              required
              value={editResearchForm.project_id}
              onChange={(e) => setEditResearchForm({ ...editResearchForm, project_id: e.target.value })}
            >
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Compound</Label>
            <Select
              value={editResearchForm.compound_id}
              onChange={(e) => setEditResearchForm({ ...editResearchForm, compound_id: e.target.value })}
            >
              <option value="">Optional</option>
              {compounds.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Name *</Label>
            <Input
              required
              value={editResearchForm.experiment_name}
              onChange={(e) =>
                setEditResearchForm({ ...editResearchForm, experiment_name: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={editResearchForm.experiment_date}
              onChange={(e) =>
                setEditResearchForm({ ...editResearchForm, experiment_date: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Result</Label>
            <Input
              value={editResearchForm.result}
              onChange={(e) => setEditResearchForm({ ...editResearchForm, result: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Remarks</Label>
            <Textarea
              value={editResearchForm.remarks}
              onChange={(e) => setEditResearchForm({ ...editResearchForm, remarks: e.target.value })}
            />
          </div>
          {editResearchError ? (
            <div className="sm:col-span-2">
              <Alert type="error">{editResearchError}</Alert>
            </div>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={!!editingDocking}
        onClose={() => (editDockingSaving ? undefined : setEditingDocking(null))}
        title="Edit docking experiment"
        description={editingDocking ? editingDocking.target_name : undefined}
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={editDockingSaving}
              onClick={() => setEditingDocking(null)}
            >
              Close
            </Button>
            <Button type="submit" form="edit-docking-form" disabled={editDockingSaving}>
              {editDockingSaving ? "Updating..." : "Update"}
            </Button>
          </>
        }
      >
        <form
          id="edit-docking-form"
          onSubmit={updateDocking}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <div>
            <Label>Compound *</Label>
            <Select
              required
              value={editDockingForm.compound_id}
              onChange={(e) => setEditDockingForm({ ...editDockingForm, compound_id: e.target.value })}
            >
              <option value="">Select compound</option>
              {compounds.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Target *</Label>
            <Input
              required
              value={editDockingForm.target_name}
              onChange={(e) => setEditDockingForm({ ...editDockingForm, target_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Software</Label>
            <Input
              value={editDockingForm.software_name}
              onChange={(e) =>
                setEditDockingForm({ ...editDockingForm, software_name: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Binding score</Label>
            <Input
              type="number"
              step="0.0001"
              value={editDockingForm.binding_score}
              onChange={(e) =>
                setEditDockingForm({ ...editDockingForm, binding_score: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={editDockingForm.experiment_date}
              onChange={(e) =>
                setEditDockingForm({ ...editDockingForm, experiment_date: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Result</Label>
            <Input
              value={editDockingForm.result}
              onChange={(e) => setEditDockingForm({ ...editDockingForm, result: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Remarks</Label>
            <Textarea
              value={editDockingForm.remarks}
              onChange={(e) => setEditDockingForm({ ...editDockingForm, remarks: e.target.value })}
            />
          </div>
          {editDockingError ? (
            <div className="sm:col-span-2">
              <Alert type="error">{editDockingError}</Alert>
            </div>
          ) : null}
        </form>
      </Modal>
    </AppLayout>
  );
}

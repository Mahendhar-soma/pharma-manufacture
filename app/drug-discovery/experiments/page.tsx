"use client";

import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable from "@/components/tables/ResponsiveTable";
import { Button, Card, FilterActions, FilterBar, PageHeader, SearchInput } from "@/components/ui";
import { useApiList } from "@/hooks/useApiList";
import { formatDate } from "@/lib/utils";

type Experiment = {
  id: number;
  experiment_name: string;
  project_code?: string;
  compound_code?: string;
  experiment_date?: string;
  result?: string;
};

type Docking = {
  id: number;
  compound_code?: string;
  target_name: string;
  software_name?: string;
  binding_score?: number;
  experiment_date?: string;
};

export default function ExperimentsPage() {
  const [tab, setTab] = useState<"research" | "docking">("research");
  const research = useApiList<Experiment>("/api/research-experiments");
  const docking = useApiList<Docking>("/api/docking-experiments");
  const active = tab === "research" ? research : docking;

  return (
    <AppLayout title="Experiments">
      <PageHeader
        title="Experiments"
        subtitle="Research and molecular docking experiments"
        actions={
          <div className="flex gap-2">
            <Button variant={tab === "research" ? "primary" : "secondary"} onClick={() => setTab("research")}>Research</Button>
            <Button variant={tab === "docking" ? "primary" : "secondary"} onClick={() => setTab("docking")}>Docking</Button>
          </div>
        }
      />
      <Card className="mb-4">
        <FilterBar className="lg:grid-cols-[minmax(0,1fr)_auto]">
          <SearchInput
            value={active.search}
            onChange={(v) => { active.setSearch(v); active.setPage(1); }}
            placeholder="Search experiments..."
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
            { key: "project_code", header: "Project", render: (r) => r.project_code || "-" },
            { key: "experiment_name", header: "Experiment" },
            { key: "compound_code", header: "Compound", render: (r) => r.compound_code || "-" },
            { key: "experiment_date", header: "Date", render: (r) => formatDate(r.experiment_date) },
            { key: "result", header: "Result", render: (r) => r.result || "-" },
          ]}
          rows={research.rows}
          loading={research.loading}
          error={research.error}
          onRetry={research.reload}
          page={research.page}
          totalPages={research.pagination.totalPages}
          onPageChange={research.setPage}
        />
      ) : (
        <ResponsiveTable
          columns={[
            { key: "compound_code", header: "Compound", render: (r) => r.compound_code || "-" },
            { key: "target_name", header: "Target" },
            { key: "software_name", header: "Software", render: (r) => r.software_name || "-" },
            { key: "binding_score", header: "Score", render: (r) => r.binding_score ?? "-" },
            { key: "experiment_date", header: "Date", render: (r) => formatDate(r.experiment_date) },
          ]}
          rows={docking.rows}
          loading={docking.loading}
          error={docking.error}
          onRetry={docking.reload}
          page={docking.page}
          totalPages={docking.pagination.totalPages}
          onPageChange={docking.setPage}
        />
      )}
    </AppLayout>
  );
}

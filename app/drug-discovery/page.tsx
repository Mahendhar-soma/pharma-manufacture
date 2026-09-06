"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { StatusCell } from "@/components/tables/ResponsiveTable";
import { Alert, Button, PageHeader, StatCard, Card, FilterActions, FilterBar, SearchInput } from "@/components/ui";
import { useApiList } from "@/hooks/useApiList";

type Project = {
  id: number;
  project_code: string;
  project_name: string;
  status: string;
  experiment_count?: number;
  start_date?: string;
};

export default function DrugDiscoveryPage() {
  const { rows, loading, error, search, setSearch, page, setPage, pagination, reload } =
    useApiList<Project>("/api/research-projects");
  const [stats, setStats] = useState({ compounds: 0, experiments: 0, docking: 0 });

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
  }, []);

  return (
    <AppLayout title="Drug Discovery">
      <PageHeader
        title="Drug Discovery"
        subtitle="Research projects, compounds and experiments"
        actions={
          <div className="flex gap-2">
            <Link href="/drug-discovery/compounds" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">Compounds</Link>
            <Link href="/drug-discovery/experiments" className="rounded-lg bg-teal-700 px-3 py-2 text-sm text-white">Experiments</Link>
          </div>
        }
      />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Compounds" value={stats.compounds} />
        <StatCard label="Experiments" value={stats.experiments} />
        <StatCard label="Docking Runs" value={stats.docking} />
      </div>
      <Card className="mb-4">
        <FilterBar className="lg:grid-cols-[minmax(0,1fr)_auto]">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search projects..." />
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
          { key: "experiment_count", header: "Experiments", render: (r) => r.experiment_count || 0 },
          { key: "status", header: "Status", render: (r) => <StatusCell value={r.status} /> },
        ]}
        rows={rows}
        loading={loading}
        error={error}
        onRetry={reload}
        page={page}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
      />
    </AppLayout>
  );
}

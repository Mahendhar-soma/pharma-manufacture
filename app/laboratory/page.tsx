"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { Alert, PageHeader, StatCard } from "@/components/ui";
import { HubOverviewSkeleton } from "@/components/skeletons";

type LabStats = {
  samples_total: number;
  samples_in_testing: number;
  tests_pending: number;
  results_fail: number;
  equipment_active: number;
  calibrations_due: number;
};

export default function LaboratoryOverviewPage() {
  const [stats, setStats] = useState<LabStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [samples, tests, results, equipment, calibrations, inTesting] = await Promise.all([
        fetch("/api/samples?limit=1").then((r) => r.json()),
        fetch("/api/sample-tests?limit=1&status=PENDING").then((r) => r.json()),
        fetch("/api/test-results?limit=1&status=FAIL").then((r) => r.json()),
        fetch("/api/equipment?limit=1&status=ACTIVE").then((r) => r.json()),
        fetch("/api/equipment/calibrations?limit=1").then((r) => r.json()),
        fetch("/api/samples?limit=1&status=IN_TESTING").then((r) => r.json()),
      ]);

      if (![samples, tests, results, equipment, calibrations, inTesting].every((x) => x.success)) {
        throw new Error("Failed to load laboratory stats");
      }

      setStats({
        samples_total: samples.data?.pagination?.total || 0,
        samples_in_testing: inTesting.data?.pagination?.total || 0,
        tests_pending: tests.data?.pagination?.total || 0,
        results_fail: results.data?.pagination?.total || 0,
        equipment_active: equipment.data?.pagination?.total || 0,
        calibrations_due: calibrations.data?.pagination?.total || 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const links = [
    { href: "/laboratory/samples", title: "Samples", desc: "Receive and track lab samples" },
    { href: "/laboratory/tests", title: "Tests", desc: "Assign and manage sample tests" },
    { href: "/laboratory/results", title: "Results", desc: "Review pass/fail parameters" },
    { href: "/laboratory/equipment", title: "Equipment", desc: "Assets and calibrations" },
  ];

  return (
    <AppLayout title="Laboratory">
      <PageHeader title="Laboratory Overview" subtitle="LIMS samples, tests, results and equipment" />
      {loading ? <HubOverviewSkeleton stats={6} links={4} /> : null}
      {error ? (
        <div className="space-y-3">
          <Alert type="error">{error}</Alert>
          <button type="button" onClick={load} className="rounded-lg bg-teal-700 px-3 py-2 text-sm text-white">
            Try Again
          </button>
        </div>
      ) : null}
      {!loading && !error && stats ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label="Total Samples" value={stats.samples_total} />
            <StatCard label="In Testing" value={stats.samples_in_testing} />
            <StatCard label="Pending Tests" value={stats.tests_pending} />
            <StatCard label="Failed Results" value={stats.results_fail} />
            <StatCard label="Active Equipment" value={stats.equipment_active} />
            <StatCard label="Calibration Records" value={stats.calibrations_due} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-teal-300">
                <div className="font-semibold text-slate-900">{l.title}</div>
                <div className="mt-1 text-sm text-slate-500">{l.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
}

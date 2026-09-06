"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { Alert, PageHeader, StatCard } from "@/components/ui";
import { HubOverviewSkeleton } from "@/components/skeletons";

export default function QualityOverviewPage() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [sops, deviations, capa, audits, changes] = await Promise.all([
        fetch("/api/sops?limit=1").then((r) => r.json()),
        fetch("/api/deviations?limit=1&status=OPEN").then((r) => r.json()),
        fetch("/api/capa?limit=1&status=OPEN").then((r) => r.json()),
        fetch("/api/audits?limit=1").then((r) => r.json()),
        fetch("/api/change-controls?limit=1").then((r) => r.json()),
      ]);
      if (![sops, deviations, capa, audits, changes].every((x) => x.success)) {
        throw new Error("Failed to load quality stats");
      }
      setStats({
        sops: sops.data?.pagination?.total || 0,
        open_deviations: deviations.data?.pagination?.total || 0,
        open_capa: capa.data?.pagination?.total || 0,
        audits: audits.data?.pagination?.total || 0,
        changes: changes.data?.pagination?.total || 0,
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
    { href: "/quality/sops", title: "SOPs", desc: "Controlled procedures" },
    { href: "/quality/deviations", title: "Deviations", desc: "Quality events" },
    { href: "/quality/capa", title: "CAPA", desc: "Corrective / preventive actions" },
    { href: "/quality/audits", title: "Audits", desc: "Internal and external audits" },
    { href: "/quality/change-control", title: "Change Control", desc: "Change requests" },
  ];

  return (
    <AppLayout title="Quality">
      <PageHeader title="Quality Management" subtitle="SOP, deviation, CAPA, audits and change control" />
      {loading ? <HubOverviewSkeleton stats={5} links={5} /> : null}
      {error ? (
        <div className="space-y-3">
          <Alert type="error">{error}</Alert>
          <button type="button" onClick={load} className="rounded-lg bg-teal-700 px-3 py-2 text-sm text-white">Try Again</button>
        </div>
      ) : null}
      {!loading && !error ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="SOPs" value={stats.sops || 0} />
            <StatCard label="Open Deviations" value={stats.open_deviations || 0} />
            <StatCard label="Open CAPA" value={stats.open_capa || 0} />
            <StatCard label="Audits" value={stats.audits || 0} />
            <StatCard label="Change Controls" value={stats.changes || 0} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { Alert, PageHeader, StatCard } from "@/components/ui";
import { HubOverviewSkeleton } from "@/components/skeletons";

export default function CrmOverviewPage() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [doctors, hospitals, mrs, visits] = await Promise.all([
        fetch("/api/doctors?limit=1&status=ACTIVE").then((r) => r.json()),
        fetch("/api/hospitals?limit=1&status=ACTIVE").then((r) => r.json()),
        fetch("/api/medical-representatives?limit=1&status=ACTIVE").then((r) => r.json()),
        fetch("/api/doctor-visits?limit=1&status=PLANNED").then((r) => r.json()),
      ]);
      if (![doctors, hospitals, mrs, visits].every((x) => x.success)) throw new Error("Failed to load CRM stats");
      setStats({
        doctors: doctors.data?.pagination?.total || 0,
        hospitals: hospitals.data?.pagination?.total || 0,
        mrs: mrs.data?.pagination?.total || 0,
        visits: visits.data?.pagination?.total || 0,
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
    { href: "/crm/doctors", title: "Doctors", desc: "HCP master data" },
    { href: "/crm/hospitals", title: "Hospitals", desc: "Institution accounts" },
    { href: "/crm/medical-representatives", title: "Medical Reps", desc: "Field force" },
    { href: "/crm/visits", title: "Visits", desc: "Call reporting" },
  ];

  return (
    <AppLayout title="CRM">
      <PageHeader title="CRM Overview" subtitle="Doctors, hospitals, MRs and visits" />
      {loading ? <HubOverviewSkeleton stats={4} links={4} /> : null}
      {error ? (
        <div className="space-y-3">
          <Alert type="error">{error}</Alert>
          <button type="button" onClick={load} className="rounded-lg bg-teal-700 px-3 py-2 text-sm text-white">Try Again</button>
        </div>
      ) : null}
      {!loading && !error ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active Doctors" value={stats.doctors || 0} />
            <StatCard label="Hospitals" value={stats.hospitals || 0} />
            <StatCard label="Medical Reps" value={stats.mrs || 0} />
            <StatCard label="Planned Visits" value={stats.visits || 0} />
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

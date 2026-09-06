"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { Card, PageHeader, StatCard, Alert } from "@/components/ui";
import { DashboardSkeleton } from "@/components/skeletons";
import Link from "next/link";
import { useAuthSession } from "@/hooks/useAuthSession";
import { canRead, navHrefModule } from "@/lib/permissions";

type DashboardData = {
  cards: Record<string, number>;
  charts: {
    monthlyProduction: { month: string; batches: number; quantity: number }[];
    monthlySales: { month: string; orders: number; amount: number }[];
    batchStatus: { status: string; count: number }[];
    expiryOverview: { expired: number; d7: number; d30: number; d90: number };
  };
};

const modules = [
  { href: "/drug-discovery", title: "Drug Discovery", desc: "Compounds, projects, docking" },
  { href: "/preclinical", title: "Preclinical", desc: "Toxicology and pharmacology studies" },
  { href: "/clinical-trials", title: "Clinical Trials", desc: "Studies, sites and subjects" },
  { href: "/manufacturing/production", title: "Manufacturing", desc: "Orders, formulas, batches" },
  { href: "/laboratory", title: "Laboratory", desc: "Samples, tests and equipment" },
  { href: "/quality", title: "Quality", desc: "SOP, deviation, CAPA, audits" },
  { href: "/regulatory", title: "Regulatory", desc: "Submissions and licenses" },
  { href: "/crm", title: "CRM", desc: "Doctors, hospitals and visits" },
];

function DashboardInner() {
  const searchParams = useSearchParams();
  const denied = searchParams.get("denied");
  const { roleCode, roleName } = useAuthSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [userName, setUserName] = useState("User");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, meRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/auth/me"),
      ]);
      const dash = await dashRes.json();
      const me = await meRes.json();
      if (!dash.success) throw new Error(dash.message);
      setData(dash.data);
      if (me.success) setUserName(me.data.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const c = data?.cards || {};
  const expiry = data?.charts.expiryOverview || { expired: 0, d7: 0, d30: 0, d90: 0 };
  const visibleModules = modules.filter((m) => {
    const mod = navHrefModule(m.href);
    return !mod || canRead(roleCode, mod);
  });

  return (
    <AppLayout title="Dashboard" userName={userName}>
      <PageHeader
        title="Operations Overview"
        subtitle={`Signed in as ${roleName} (${roleCode}) — lifecycle view across discovery to commercial`}
      />

      {denied ? (
        <div className="mb-4">
          <Alert type="error">
            Access denied for module <strong>{denied}</strong>. Your role cannot open that page.
          </Alert>
        </div>
      ) : null}

      {loading ? <DashboardSkeleton /> : null}
      {error ? (
        <div className="space-y-3">
          <Alert type="error">{error}</Alert>
          <button
            type="button"
            onClick={load}
            className="rounded-lg bg-teal-700 px-3 py-2 text-sm text-white"
          >
            Try Again
          </button>
        </div>
      ) : null}

      {!loading && !error && data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Total Products" value={c.products || 0} />
            <StatCard label="Raw Materials" value={c.raw_materials || 0} />
            <StatCard label="Active Batches" value={c.active_batches || 0} />
            <StatCard label="Manufacturing Orders" value={c.manufacturing_orders || 0} />
            <StatCard label="Inventory Items" value={c.inventory_items || 0} />
            <StatCard label="Laboratory Samples" value={c.lab_samples || 0} />
            <StatCard label="Clinical Studies" value={c.clinical_studies || 0} />
            <StatCard label="Open Quality Issues" value={c.open_quality_issues || 0} />
            <StatCard label="Expiring Batches" value={c.expiring_batches || 0} />
            <StatCard label="Doctors / HCPs" value={c.doctors || 0} />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card>
              <h3 className="font-semibold text-slate-900">Monthly Production</h3>
              <div className="mt-4 space-y-2">
                {data.charts.monthlyProduction.length ? (
                  data.charts.monthlyProduction.map((row) => (
                    <div key={row.month} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{row.month}</span>
                      <span className="font-medium text-slate-900">
                        {row.batches} batches / {Number(row.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No production data yet</p>
                )}
              </div>
            </Card>
            <Card>
              <h3 className="font-semibold text-slate-900">Expiry Overview</h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <StatCard label="Expired" value={expiry.expired || 0} />
                <StatCard label="In 7 Days" value={expiry.d7 || 0} />
                <StatCard label="In 30 Days" value={expiry.d30 || 0} />
                <StatCard label="In 90 Days" value={expiry.d90 || 0} />
              </div>
            </Card>
          </div>

          <div>
            <h3 className="mb-3 text-lg font-semibold text-slate-900">Lifecycle Modules</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {visibleModules.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300 hover:shadow"
                >
                  <div className="font-semibold text-slate-900">{m.title}</div>
                  <div className="mt-1 text-sm text-slate-500">{m.desc}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardInner />
    </Suspense>
  );
}

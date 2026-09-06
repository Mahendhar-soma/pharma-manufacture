"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import {
  Alert,
  Button,
  Card,
  FilterActions,
  FilterBar,
  FormField,
  PageHeader,
  SearchInput,
  Select,
  StatCard,
} from "@/components/ui";
import { NotificationListSkeleton, StatCardsSkeleton } from "@/components/skeletons";
import { cn } from "@/lib/utils";

type NotificationItem = {
  key: string;
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  href: string;
};

const severityStyles = {
  critical: "border-rose-200 bg-rose-50 text-rose-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
};

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [counts, setCounts] = useState({ critical: 0, warning: 0, info: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications?limit=100");
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setItems(json.data.items || []);
      setCounts(json.data.counts || { critical: 0, warning: 0, info: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return items.filter((n) => {
      if (severity && n.severity !== severity) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q)
      );
    });
  }, [items, search, severity]);

  async function dismiss(key: string) {
    await fetch("/api/notifications/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    setMessage("Notification dismissed");
    load();
  }

  async function dismissAll() {
    if (!confirm("Dismiss all current notifications?")) return;
    const res = await fetch("/api/notifications/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    const json = await res.json();
    setMessage(json.message || "Dismissed");
    load();
  }

  return (
    <AppLayout title="Notifications">
      <PageHeader
        title="Notifications"
        subtitle="Low stock, expiry, CAPA, calibration, deviations, and QC release alerts"
      />

      {message ? (
        <div className="mb-4">
          <Alert type="info">{message}</Alert>
        </div>
      ) : null}
      {error ? <Alert type="error">{error}</Alert> : null}

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {loading ? (
          <StatCardsSkeleton count={4} className="col-span-2 xl:col-span-4 xl:grid-cols-4" />
        ) : (
          <>
            <StatCard label="Active" value={items.length} />
            <StatCard label="Critical" value={counts.critical} />
            <StatCard label="Warning" value={counts.warning} />
            <StatCard label="Info" value={counts.info} />
          </>
        )}
      </div>

      <Card className="mb-4">
        <FilterBar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search alerts..." />
          <FormField label="Severity" hint="Show critical, warning, or info alerts only">
            <Select value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="">All severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </Select>
          </FormField>
          <FilterActions>
            <Button variant="secondary" onClick={load} className="w-full sm:w-auto">
              Refresh
            </Button>
            <Button variant="secondary" onClick={dismissAll} disabled={!items.length} className="w-full sm:w-auto">
              Dismiss all
            </Button>
          </FilterActions>
        </FilterBar>
      </Card>

      {loading ? <NotificationListSkeleton count={4} /> : null}

      {!loading && !filtered.length ? (
        <Card>
          <p className="text-sm text-slate-500">No notifications match your filters.</p>
        </Card>
      ) : null}

      <div className="space-y-3">
        {!loading
          ? filtered.map((n) => (
              <div
                key={n.key}
                className={cn("rounded-xl border p-4 shadow-sm", severityStyles[n.severity])}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                      {n.severity} · {n.type.split("_").join(" ")}
                    </div>
                    <h3 className="mt-1 text-base font-semibold">{n.title}</h3>
                    <p className="mt-1 text-sm opacity-90">{n.message}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link
                      href={n.href}
                      className="inline-flex items-center rounded-lg bg-white/80 px-3 py-2 text-sm font-medium text-slate-800 ring-1 ring-slate-200 hover:bg-white"
                    >
                      Open
                    </Link>
                    <Button variant="secondary" onClick={() => dismiss(n.key)}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            ))
          : null}
      </div>
    </AppLayout>
  );
}

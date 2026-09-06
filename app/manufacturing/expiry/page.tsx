"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { StatusCell } from "@/components/tables/ResponsiveTable";
import { Alert, Button, Card, PageHeader, StatCard } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { useAuthSession } from "@/hooks/useAuthSession";

type ExpiryItem = {
  item_type: string;
  batch_number: string;
  item_name: string;
  expiry_date: string;
  available_quantity: number;
  warehouse_name: string;
  status: string;
};

type JobStatus = {
  scheduler_enabled: boolean;
  interval_ms: number;
  last_run: {
    started_at?: string;
    finished_at?: string;
    status?: string;
    triggered_by?: string;
    result?: {
      finished_batches_marked?: number;
      raw_material_batches_marked?: number;
    };
    error_message?: string;
  } | null;
};

export default function ExpiryPage() {
  const { canWrite } = useAuthSession();
  const canMark = canWrite("expiry");
  const [data, setData] = useState<{
    expired: ExpiryItem[];
    expiring_7_days: ExpiryItem[];
    expiring_30_days: ExpiryItem[];
    expiring_90_days: ExpiryItem[];
    counts: { expired: number; d7: number; d30: number; d90: number };
  } | null>(null);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [tab, setTab] = useState<"expired" | "d7" | "d30" | "d90">("d30");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"success" | "error" | "info">("success");
  const [userName, setUserName] = useState("User");
  const [running, setRunning] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [res, me, jobRes] = await Promise.all([
        fetch("/api/expiry"),
        fetch("/api/auth/me"),
        fetch("/api/expiry/job-status"),
      ]);
      const json = await res.json();
      const meJson = await me.json();
      const jobJson = await jobRes.json();
      if (!json.success) throw new Error(json.message);
      setData(json.data);
      if (meJson.success) setUserName(meJson.data.name);
      if (jobJson.success) setJob(jobJson.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load expiry data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markExpired() {
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch("/api/expiry/mark-expired", { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setMsgType("success");
      setMessage(
        `${json.message} (FG: ${json.data.finished_batches_marked}, RM: ${json.data.raw_material_batches_marked})`,
      );
      await load();
    } catch (e) {
      setMsgType("error");
      setMessage(e instanceof Error ? e.message : "Mark expired failed");
    } finally {
      setRunning(false);
    }
  }

  const rows =
    tab === "expired"
      ? data?.expired || []
      : tab === "d7"
        ? data?.expiring_7_days || []
        : tab === "d30"
          ? data?.expiring_30_days || []
          : data?.expiring_90_days || [];

  const intervalMin = job ? Math.round(job.interval_ms / 60000) : 60;

  return (
    <AppLayout title="Expiry Management" userName={userName}>
      <PageHeader
        title="Expiry Management"
        subtitle="Monitor expiry buckets and run / schedule automatic EXPIRED status updates"
        actions={
          canMark ? (
            <Button onClick={markExpired} disabled={running}>
              {running ? "Running..." : "Mark Expired Now"}
            </Button>
          ) : undefined
        }
      />

      {message ? (
        <div className="mb-4">
          <Alert type={msgType}>{message}</Alert>
        </div>
      ) : null}
      {error ? <Alert type="error">{error}</Alert> : null}

      <Card className="mb-4">
        <h3 className="mb-2 font-semibold text-slate-900">Scheduled expiry job</h3>
        <div className="grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            Scheduler:{" "}
            <strong className={job?.scheduler_enabled ? "text-emerald-700" : "text-amber-700"}>
              {job?.scheduler_enabled ? "ENABLED" : "DISABLED"}
            </strong>
          </div>
          <div>
            Interval: <strong>{intervalMin} min</strong>
          </div>
          <div>
            Last run:{" "}
            <strong>
              {job?.last_run?.finished_at
                ? formatDate(String(job.last_run.finished_at))
                : "Never"}
            </strong>
            {job?.last_run?.status ? ` (${job.last_run.status})` : ""}
          </div>
          <div>
            Last trigger: <strong>{job?.last_run?.triggered_by || "-"}</strong>
            {job?.last_run?.result
              ? ` · FG ${job.last_run.result.finished_batches_marked ?? 0} / RM ${job.last_run.result.raw_material_batches_marked ?? 0}`
              : ""}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Enable with EXPIRY_JOB_ENABLED=true, or call POST /api/cron/expiry with x-cron-secret, or
          run npm run expiry:job
        </p>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Expired" value={data?.counts.expired || 0} />
        <StatCard label="In 7 Days" value={data?.counts.d7 || 0} />
        <StatCard label="In 30 Days" value={data?.counts.d30 || 0} />
        <StatCard label="In 90 Days" value={data?.counts.d90 || 0} />
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["expired", "Expired"],
              ["d7", "7 Days"],
              ["d30", "30 Days"],
              ["d90", "90 Days"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              variant={tab === key ? "primary" : "secondary"}
              onClick={() => setTab(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </Card>

      <ResponsiveTable
        loading={loading}
        error={error}
        onRetry={load}
        rows={rows.map((r, i) => ({ ...r, id: i }))}
        emptyTitle="No batches in this expiry bucket"
        columns={[
          { key: "item_type", header: "Type" },
          { key: "batch_number", header: "Batch" },
          { key: "item_name", header: "Product / Material" },
          {
            key: "expiry_date",
            header: "Expiry Date",
            render: (r) => formatDate(r.expiry_date),
          },
          { key: "available_quantity", header: "Qty" },
          { key: "warehouse_name", header: "Warehouse" },
          {
            key: "status",
            header: "Status",
            render: (r) => <StatusCell value={r.status} />,
          },
        ]}
      />
    </AppLayout>
  );
}

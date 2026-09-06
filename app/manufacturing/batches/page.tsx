"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { StatusCell, type Column } from "@/components/tables/ResponsiveTable";
import { Alert, Badge, Button, Card, FilterActions, FilterBar, FormField, PageHeader, SearchInput, Select } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { useAuthSession } from "@/hooks/useAuthSession";
import { normalizeRole } from "@/lib/permissions";

type Batch = {
  id: number;
  batch_number: string;
  product_code: string;
  product_name: string;
  manufacturing_date: string;
  expiry_date: string;
  actual_quantity: number;
  unit: string;
  status: string;
  mo_number?: string;
  warehouse_name?: string;
  qc_state?: string;
  can_release?: boolean;
  sample_count?: number;
  pending_tests?: number;
  pass_results?: number;
  fail_results?: number;
};

type QcSummary = {
  can_release: boolean;
  blockers: string[];
  qc_state: string;
  samples: Array<{ id: number; sample_code: string; status: string }>;
  tests: Array<{ id: number; test_name: string; status: string }>;
  results: Array<{ parameter: string; pass_fail: string; result_value: string | null }>;
  pass_results: number;
  fail_results: number;
  pending_tests: number;
};

export default function BatchesPage() {
  const [rows, setRows] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"info" | "error" | "success">("info");
  const [userName, setUserName] = useState("User");
  const [detail, setDetail] = useState<(Record<string, unknown> & { qc?: QcSummary }) | null>(null);
  const { roleCode, canWrite } = useAuthSession();
  const canRelease = normalizeRole(roleCode) === "ADMIN" || normalizeRole(roleCode) === "QUALITY";
  const canReject = canWrite("batches");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const res = await fetch(`/api/batches?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setRows(json.data.items);
      setTotalPages(json.data.pagination.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    load();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => j.success && setUserName(j.data.name))
      .catch(() => undefined);
  }, [load]);

  async function releaseBatch(id: number) {
    setMsg(null);
    const res = await fetch(`/api/batches/${id}/release`, { method: "POST" });
    const json = await res.json();
    if (!json.success) {
      const blockers = json.data?.blockers as string[] | undefined;
      setMsgType("error");
      setMsg(
        blockers?.length
          ? `${json.message}: ${blockers.join("; ")}`
          : json.message || "Release failed",
      );
      return;
    }
    setMsgType("success");
    setMsg("Batch released after successful QC");
    load();
    if (detail && Number(detail.id) === id) viewDetail(id);
  }

  async function patchStatus(id: number, next: string) {
    setMsg(null);
    const res = await fetch(`/api/batches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const json = await res.json();
    if (!json.success) {
      const blockers = json.data?.blockers as string[] | undefined;
      setMsgType("error");
      setMsg(
        blockers?.length
          ? `${json.message}: ${blockers.join("; ")}`
          : json.message || "Update failed",
      );
      return;
    }
    setMsgType("success");
    setMsg(`Batch status set to ${next}`);
    load();
  }

  async function viewDetail(id: number) {
    const res = await fetch(`/api/batches/${id}`);
    const json = await res.json();
    if (!json.success) {
      setMsgType("error");
      setMsg(json.message);
      return;
    }
    setDetail(json.data);
  }

  const columns: Column<Batch>[] = [
    { key: "batch_number", header: "Batch #" },
    {
      key: "product_name",
      header: "Product",
      render: (r) => `${r.product_code} — ${r.product_name}`,
    },
    { key: "mo_number", header: "MO" },
    {
      key: "manufacturing_date",
      header: "Mfg",
      render: (r) => formatDate(r.manufacturing_date),
    },
    {
      key: "expiry_date",
      header: "Expiry",
      render: (r) => formatDate(r.expiry_date),
    },
    {
      key: "actual_quantity",
      header: "Qty",
      render: (r) => `${r.actual_quantity} ${r.unit}`,
    },
    {
      key: "status",
      header: "Batch",
      render: (r) => <StatusCell value={r.status} />,
    },
    {
      key: "qc_state",
      header: "QC Gate",
      render: (r) => <Badge status={r.qc_state}>{r.qc_state || "-"}</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          <Button variant="ghost" onClick={() => viewDetail(r.id)}>
            View
          </Button>
          <Link
            href={`/print/batches/${r.id}`}
            target="_blank"
            className="rounded-lg px-2 py-1 text-sm font-medium text-teal-800 hover:bg-slate-100"
          >
            BMR
          </Link>
          <Link
            href={`/print/batches/${r.id}/coa`}
            target="_blank"
            className="rounded-lg px-2 py-1 text-sm font-medium text-teal-800 hover:bg-slate-100"
          >
            CoA
          </Link>
          {r.status === "QC_PENDING" || r.status === "QUARANTINE" ? (
            <>
              {canRelease ? (
                <Button
                  variant="secondary"
                  disabled={!r.can_release}
                  title={
                    r.can_release
                      ? "Release after LIMS PASS"
                      : "Complete LIMS tests with PASS first"
                  }
                  onClick={() => releaseBatch(r.id)}
                >
                  Release
                </Button>
              ) : null}
              {canReject ? (
                <Button variant="danger" onClick={() => patchStatus(r.id, "REJECTED")}>
                  Reject
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      ),
    },
  ];

  const qc = detail?.qc;

  return (
    <AppLayout title="Batches" userName={userName}>
      <PageHeader
        title="Finished Batches"
        subtitle="QC gate: LIMS PASS required before RELEASED — only RELEASED batches can be sold"
      />
      {msg ? <Alert type={msgType}>{msg}</Alert> : null}

      {detail ? (
        <Card className="mb-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-900">
              Batch {String(detail.batch_number)}
            </h3>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/print/batches/${detail.id}`}
                target="_blank"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
              >
                Print BMR
              </Link>
              <Link
                href={`/print/batches/${detail.id}/coa`}
                target="_blank"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
              >
                Print CoA
              </Link>
              <Button variant="ghost" onClick={() => setDetail(null)}>
                Close
              </Button>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Status: {String(detail.status)} · Qty: {String(detail.actual_quantity)} · QC:{" "}
            {qc?.qc_state || "-"}
          </p>

          {qc ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-800">LIMS / QC Gate</span>
                <Badge status={qc.qc_state}>{qc.qc_state}</Badge>
                {qc.can_release ? (
                  <Badge status="READY">Ready to release</Badge>
                ) : null}
              </div>
              {qc.blockers?.length ? (
                <ul className="mb-2 list-disc space-y-1 pl-5 text-sm text-rose-700">
                  {qc.blockers.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              ) : (
                <p className="mb-2 text-sm text-emerald-700">All QC checks passed.</p>
              )}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-sm">
                <div>
                  <div className="font-medium text-slate-700">Samples</div>
                  {(qc.samples || []).map((s) => (
                    <div key={s.id} className="text-slate-600">
                      {s.sample_code} · {s.status}
                    </div>
                  ))}
                  {!qc.samples?.length ? (
                    <div className="text-slate-500">None</div>
                  ) : null}
                </div>
                <div>
                  <div className="font-medium text-slate-700">Tests</div>
                  {(qc.tests || []).map((t) => (
                    <div key={t.id} className="text-slate-600">
                      {t.test_name} · {t.status}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="font-medium text-slate-700">Results</div>
                  {(qc.results || []).map((r, i) => (
                    <div key={i} className="text-slate-600">
                      {r.parameter}: {r.result_value ?? "-"} ({r.pass_fail})
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/laboratory/samples"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
                >
                  Open LIMS Samples
                </Link>
                {canRelease && (detail.status === "QC_PENDING" || detail.status === "QUARANTINE") ? (
                  <Button
                    disabled={!qc.can_release}
                    onClick={() => releaseBatch(Number(detail.id))}
                  >
                    Release Batch
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-1">Material</th>
                  <th>RM Batch</th>
                  <th>Qty</th>
                  <th>Expiry</th>
                </tr>
              </thead>
              <tbody>
                {((detail.consumption as Record<string, unknown>[]) || []).map((c, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-1">
                      {String(c.material_code)} — {String(c.material_name)}
                    </td>
                    <td>{String(c.rm_batch_number)}</td>
                    <td>
                      {String(c.actual_quantity)} {String(c.unit)}
                    </td>
                    <td>{formatDate(String(c.rm_expiry_date))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <Card className="mb-4">
        <FilterBar>
          <SearchInput
            value={search}
            onChange={(v) => {
              setPage(1);
              setSearch(v);
            }}
          />
          <FormField label="Filter by status" hint="Show batches in one QC / release state">
            <Select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            >
              <option value="">All statuses</option>
              <option value="QC_PENDING">QC_PENDING</option>
              <option value="QUARANTINE">QUARANTINE</option>
              <option value="RELEASED">RELEASED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="SOLD_OUT">SOLD_OUT</option>
            </Select>
          </FormField>
          <FilterActions>
            <Button variant="secondary" onClick={load} className="w-full sm:w-auto">
              Refresh
            </Button>
          </FilterActions>
        </FilterBar>
      </Card>
      <ResponsiveTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        onRetry={load}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </AppLayout>
  );
}

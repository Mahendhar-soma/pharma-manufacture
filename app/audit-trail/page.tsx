"use client";

import { useCallback, useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { type Column } from "@/components/tables/ResponsiveTable";
import { Alert, Button, Card, FilterActions, FilterBar, FormField, PageHeader, SearchInput, Select } from "@/components/ui";

type AuditRow = {
  id: number;
  occurred_at: string;
  user_name?: string | null;
  user_email?: string | null;
  role_code?: string | null;
  action: string;
  entity_type: string;
  entity_id?: number | null;
  entity_code?: string | null;
  summary: string;
  before_json?: unknown;
  after_json?: unknown;
  ip_address?: string | null;
};

function parseJsonField(value: unknown) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

export default function AuditTrailPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<AuditRow | null>(null);
  const [userName, setUserName] = useState("User");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (action) params.set("action", action);
      if (entityType) params.set("entity_type", entityType);
      const res = await fetch(`/api/audit-logs?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setRows(json.data.items || []);
      setTotalPages(json.data.pagination?.totalPages || 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit trail");
    } finally {
      setLoading(false);
    }
  }, [page, search, action, entityType]);

  useEffect(() => {
    load();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => j.success && setUserName(j.data.name))
      .catch(() => undefined);
  }, [load]);

  const columns: Column<AuditRow>[] = [
    {
      key: "occurred_at",
      header: "When",
      render: (r) =>
        String(r.occurred_at || "")
          .replace("T", " ")
          .slice(0, 19) || "-",
    },
    {
      key: "user_name",
      header: "Who",
      render: (r) => (
        <span>
          {r.user_name || r.user_email || "system"}
          {r.role_code ? (
            <span className="ml-1 text-xs text-slate-500">({r.role_code})</span>
          ) : null}
        </span>
      ),
    },
    { key: "action", header: "Action" },
    {
      key: "entity_type",
      header: "Entity",
      render: (r) => (
        <span>
          {r.entity_type}
          {r.entity_code ? ` · ${r.entity_code}` : r.entity_id ? ` #${r.entity_id}` : ""}
        </span>
      ),
    },
    { key: "summary", header: "Summary" },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <Button variant="ghost" onClick={() => setSelected(r)}>
          Detail
        </Button>
      ),
    },
  ];

  return (
    <AppLayout title="Audit Trail" userName={userName}>
      <PageHeader
        title="System Audit Trail"
        subtitle="Append-only log of who changed critical records and statuses"
      />

      {selected ? (
        <Card className="mb-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-900">Audit #{selected.id}</h3>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
          <p className="text-sm text-slate-700">{selected.summary}</p>
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <div className="font-medium text-slate-600">Before</div>
              <pre className="mt-1 overflow-x-auto rounded border border-slate-200 bg-slate-50 p-2 text-xs">
                {JSON.stringify(parseJsonField(selected.before_json), null, 2) || "null"}
              </pre>
            </div>
            <div>
              <div className="font-medium text-slate-600">After</div>
              <pre className="mt-1 overflow-x-auto rounded border border-slate-200 bg-slate-50 p-2 text-xs">
                {JSON.stringify(parseJsonField(selected.after_json), null, 2) || "null"}
              </pre>
            </div>
          </div>
          {selected.ip_address ? (
            <p className="text-xs text-slate-500">IP: {selected.ip_address}</p>
          ) : null}
        </Card>
      ) : null}

      <Card className="mb-4">
        <FilterBar className="sm:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <SearchInput
            value={search}
            onChange={(v) => {
              setPage(1);
              setSearch(v);
            }}
          />
          <FormField label="Action" hint="Filter by audit action type">
            <Select
              value={action}
              onChange={(e) => {
                setPage(1);
                setAction(e.target.value);
              }}
            >
              <option value="">All actions</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGIN_FAILED">LOGIN_FAILED</option>
              <option value="CREATE">CREATE</option>
              <option value="STATUS_CHANGE">STATUS_CHANGE</option>
              <option value="RELEASE">RELEASE</option>
              <option value="START">START</option>
              <option value="COMPLETE">COMPLETE</option>
              <option value="TRANSFER">TRANSFER</option>
              <option value="ADJUST">ADJUST</option>
              <option value="EXPIRE">EXPIRE</option>
            </Select>
          </FormField>
          <FormField label="Entity" hint="Filter by record type">
            <Select
              value={entityType}
              onChange={(e) => {
                setPage(1);
                setEntityType(e.target.value);
              }}
            >
              <option value="">All entities</option>
              <option value="session">session</option>
              <option value="batch">batch</option>
              <option value="manufacturing_order">manufacturing_order</option>
              <option value="purchase_order">purchase_order</option>
              <option value="goods_receipt">goods_receipt</option>
              <option value="sales_order">sales_order</option>
              <option value="inventory">inventory</option>
              <option value="expiry_job">expiry_job</option>
            </Select>
          </FormField>
          <FilterActions>
            <Button variant="secondary" onClick={load} className="w-full sm:w-auto">
              Refresh
            </Button>
          </FilterActions>
        </FilterBar>
      </Card>

      {error ? <Alert type="error">{error}</Alert> : null}

      <ResponsiveTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={null}
        onRetry={load}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </AppLayout>
  );
}

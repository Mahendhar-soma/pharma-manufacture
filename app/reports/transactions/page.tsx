"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { type Column } from "@/components/tables/ResponsiveTable";
import {
  Alert,
  Button,
  Card,
  FilterActions,
  FilterBar,
  FormField,
  Input,
  PageHeader,
  SearchInput,
  Select,
} from "@/components/ui";
import { TableSkeleton } from "@/components/skeletons";
import { formatDate, formatMoney } from "@/lib/utils";

type Txn = {
  id: number;
  transaction_type: string;
  type_label?: string;
  transaction_date: string;
  po_number?: string | null;
  grn_number?: string | null;
  material_code?: string | null;
  material_name?: string | null;
  product_name?: string | null;
  quantity: number;
  unit_cost?: number | null;
  total_cost?: number | null;
  batch_lot?: string | null;
  supplier_name?: string | null;
  created_by_name?: string | null;
  warehouse_name?: string | null;
  remarks?: string | null;
};

type TypeOpt = { value: string; label: string };
type Option = { id: number; label: string };

export default function TransactionReportPage() {
  const [rows, setRows] = useState<Txn[]>([]);
  const [types, setTypes] = useState<TypeOpt[]>([]);
  const [materials, setMaterials] = useState<Option[]>([]);
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [view, setView] = useState<"list" | "by_type">("list");
  const [groups, setGroups] = useState<
    Array<{ transaction_type: string; label: string; txn_count: number; total_quantity: number }>
  >([]);
  const [filters, setFilters] = useState({
    search: "",
    transaction_type: "",
    date_from: "",
    date_to: "",
    raw_material_id: "",
    po_number: "",
    lot_number: "",
    supplier_id: "",
  });
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("transaction_type");
    if (t) setFilters((f) => ({ ...f, transaction_type: t }));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
      if (view === "by_type") params.set("group_by", "type");
      const res = await fetch(`/api/inventory/transactions?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      if (json.data.types) setTypes(json.data.types);
      if (view === "by_type") {
        setGroups(json.data.groups || []);
        setRows([]);
      } else {
        setRows(json.data.items || []);
        setTotalPages(json.data.pagination?.totalPages || 1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [page, filters, view]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => j.success && setUserName(j.data.name))
      .catch(() => undefined);
    Promise.all([
      fetch("/api/raw-materials?limit=200&status=ACTIVE").then((r) => r.json()),
      fetch("/api/suppliers?limit=200&status=ACTIVE").then((r) => r.json()),
    ]).then(([m, s]) => {
      if (m.success) {
        setMaterials(
          m.data.items.map((x: { id: number; material_code: string; material_name: string }) => ({
            id: x.id,
            label: `${x.material_code} — ${x.material_name}`,
          })),
        );
      }
      if (s.success) {
        setSuppliers(
          s.data.items.map((x: { id: number; supplier_code: string; supplier_name: string }) => ({
            id: x.id,
            label: `${x.supplier_code} — ${x.supplier_name}`,
          })),
        );
      }
    });
  }, []);

  const typeWiseTables = useMemo(() => {
    if (view !== "list" || !filters.transaction_type) return null;
    return null;
  }, [view, filters.transaction_type]);
  void typeWiseTables;

  const columns: Column<Txn>[] = [
    {
      key: "transaction_date",
      header: "Date",
      render: (r) =>
        String(r.transaction_date || "")
          .replace("T", " ")
          .slice(0, 16),
    },
    {
      key: "transaction_type",
      header: "Type",
      render: (r) => r.type_label || r.transaction_type,
    },
    {
      key: "po_number",
      header: "PO / GRN",
      render: (r) =>
        r.po_number || r.grn_number ? `${r.po_number || "-"} / ${r.grn_number || "-"}` : "-",
    },
    {
      key: "material",
      header: "Material / Item",
      render: (r) =>
        r.material_code
          ? `${r.material_code} — ${r.material_name}`
          : r.product_name || "-",
    },
    {
      key: "quantity",
      header: "Qty",
      render: (r) => Number(r.quantity),
    },
    {
      key: "batch_lot",
      header: "Batch / Lot",
      render: (r) => r.batch_lot || "-",
    },
    {
      key: "total_cost",
      header: "Cost",
      render: (r) => (r.total_cost != null ? formatMoney(Number(r.total_cost)) : "-"),
    },
    {
      key: "supplier_name",
      header: "Supplier",
      render: (r) => r.supplier_name || "-",
    },
    {
      key: "created_by_name",
      header: "User",
      render: (r) => r.created_by_name || "-",
    },
    {
      key: "remarks",
      header: "Remarks",
      render: (r) => r.remarks || "-",
    },
  ];

  const purchaseReceivedPreview = rows.filter(
    (r) =>
      r.transaction_type === "PURCHASE_RECEIVED" ||
      r.transaction_type === "RECEIPT" ||
      r.transaction_type === "PURCHASE",
  );

  return (
    <AppLayout title="Transaction Report" userName={userName}>
      <PageHeader
        title="Inventory Transaction Report"
        subtitle="Audit trail of purchase receipts, manufacturing consumption, transfers, and adjustments"
        actions={
          <Link
            href="/inventory"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
          >
            Inventory stock
          </Link>
        }
      />

      <Card className="mb-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={view === "list" ? "primary" : "secondary"}
            onClick={() => {
              setView("list");
              setPage(1);
            }}
          >
            Transaction list
          </Button>
          <Button
            variant={view === "by_type" ? "primary" : "secondary"}
            onClick={() => {
              setView("by_type");
              setPage(1);
            }}
          >
            Type-wise summary
          </Button>
        </div>

        <FilterBar className="sm:grid-cols-2 lg:grid-cols-4">
          <SearchInput
            value={filters.search}
            onChange={(v) => {
              setPage(1);
              setFilters({ ...filters, search: v });
            }}
            label="Search"
            hint="PO, GRN, remarks, or reference text"
          />
          <FormField label="Transaction type" hint="One movement type only">
            <Select
              value={filters.transaction_type}
              onChange={(e) => {
                setPage(1);
                setFilters({ ...filters, transaction_type: e.target.value });
              }}
            >
              <option value="">All types</option>
              {types.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Date from" hint="Inclusive start date">
            <Input
              type="date"
              value={filters.date_from}
              onChange={(e) => {
                setPage(1);
                setFilters({ ...filters, date_from: e.target.value });
              }}
            />
          </FormField>
          <FormField label="Date to" hint="Inclusive end date">
            <Input
              type="date"
              value={filters.date_to}
              onChange={(e) => {
                setPage(1);
                setFilters({ ...filters, date_to: e.target.value });
              }}
            />
          </FormField>
          <FormField label="Raw material" hint="Filter PURCHASE_RECEIVED and related stock">
            <Select
              value={filters.raw_material_id}
              onChange={(e) => {
                setPage(1);
                setFilters({ ...filters, raw_material_id: e.target.value });
              }}
            >
              <option value="">All materials</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="PO number" hint="Exact or partial PO number">
            <Input
              placeholder="PO-…"
              value={filters.po_number}
              onChange={(e) => {
                setPage(1);
                setFilters({ ...filters, po_number: e.target.value });
              }}
            />
          </FormField>
          <FormField label="Batch / Lot" hint="Supplier or FG lot number">
            <Input
              value={filters.lot_number}
              onChange={(e) => {
                setPage(1);
                setFilters({ ...filters, lot_number: e.target.value });
              }}
            />
          </FormField>
          <FormField label="Supplier" hint="Filter by supplier on receiving txns">
            <Select
              value={filters.supplier_id}
              onChange={(e) => {
                setPage(1);
                setFilters({ ...filters, supplier_id: e.target.value });
              }}
            >
              <option value="">All suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
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

      {view === "by_type" ? (
        loading ? (
          <TableSkeleton columns={3} rows={5} />
        ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2">Transaction type</th>
                  <th className="py-2">Count</th>
                  <th className="py-2">Total qty</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.transaction_type} className="border-b border-slate-100">
                    <td className="py-2">
                      <button
                        type="button"
                        className="font-medium text-teal-800 hover:underline"
                        onClick={() => {
                          setFilters({ ...filters, transaction_type: g.transaction_type });
                          setView("list");
                          setPage(1);
                        }}
                      >
                        {g.label || g.transaction_type}
                      </button>
                    </td>
                    <td className="py-2">{g.txn_count}</td>
                    <td className="py-2">{Number(g.total_quantity)}</td>
                  </tr>
                ))}
                {!groups.length ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-slate-500">
                      No transactions for current filters
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
        )
      ) : (
        <>
          {filters.transaction_type === "PURCHASE_RECEIVED" && purchaseReceivedPreview.length ? (
            <Card className="mb-4">
              <h3 className="mb-2 font-semibold text-slate-900">Purchase Received</h3>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-1">Date</th>
                    <th>PO</th>
                    <th>Material</th>
                    <th className="text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseReceivedPreview.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100">
                      <td className="py-1">{formatDate(r.transaction_date)}</td>
                      <td>{r.po_number || "-"}</td>
                      <td>
                        {r.material_code} — {r.material_name}
                      </td>
                      <td className="text-right">{Number(r.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : null}

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
        </>
      )}
    </AppLayout>
  );
}

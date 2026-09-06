"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { StatusCell, type Column } from "@/components/tables/ResponsiveTable";
import {
  Alert,
  Button,
  Card,
  FilterActions,
  FilterBar,
  FormField,
  Input,
  Label,
  PageHeader,
  SearchInput,
  Select,
  Textarea,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { useAuthSession } from "@/hooks/useAuthSession";

type Inv = {
  id: number;
  warehouse_id: number;
  warehouse_name: string;
  material_code?: string;
  material_name?: string;
  product_code?: string;
  product_name?: string;
  rm_batch_number?: string;
  fg_batch_number?: string;
  rm_expiry_date?: string;
  fg_expiry_date?: string;
  quantity: number;
  unit: string;
};

type Txn = {
  id: number;
  transaction_type: string;
  warehouse_name: string;
  material_name?: string;
  product_name?: string;
  quantity: number;
  transaction_date: string;
  remarks?: string;
  grn_number?: string | null;
  po_number?: string | null;
};

type Wh = { id: number; warehouse_code: string; warehouse_name: string; warehouse_type: string };

export default function InventoryPage() {
  const { canWrite } = useAuthSession();
  const canManage = canWrite("inventory");
  const [tab, setTab] = useState<"stock" | "txn">("stock");
  const [rows, setRows] = useState<Inv[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [warehouses, setWarehouses] = useState<Wh[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [txnType, setTxnType] = useState("");
  const [userName, setUserName] = useState("User");
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"info" | "error" | "success">("info");
  const [mode, setMode] = useState<"none" | "transfer" | "adjust">("none");
  const [selected, setSelected] = useState<Inv | null>(null);
  const [saving, setSaving] = useState(false);
  const [transferForm, setTransferForm] = useState({
    to_warehouse_id: "",
    quantity: "",
    remarks: "",
  });
  const [adjustForm, setAdjustForm] = useState({
    adjustment_qty: "",
    reason: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (search) params.set("search", search);
      if (tab === "stock") {
        if (warehouseFilter) params.set("warehouse_id", warehouseFilter);
        const res = await fetch(`/api/inventory?${params}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        setRows(json.data.items);
        setTotalPages(json.data.pagination.totalPages);
      } else {
        if (txnType) params.set("transaction_type", txnType);
        const res = await fetch(`/api/inventory/transactions?${params}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        setTxns(json.data.items);
        setTotalPages(json.data.pagination.totalPages);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, search, tab, txnType, warehouseFilter]);

  useEffect(() => {
    load();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => j.success && setUserName(j.data.name))
      .catch(() => undefined);
    fetch("/api/warehouses?limit=100&status=ACTIVE")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setWarehouses(j.data.items);
      })
      .catch(() => undefined);
  }, [load]);

  function openTransfer(row: Inv) {
    setSelected(row);
    setMode("transfer");
    setTransferForm({
      to_warehouse_id: "",
      quantity: String(row.quantity),
      remarks: "",
    });
    setMsg(null);
  }

  function openAdjust(row: Inv) {
    setSelected(row);
    setMode("adjust");
    setAdjustForm({ adjustment_qty: "", reason: "" });
    setMsg(null);
  }

  function closeForms() {
    setMode("none");
    setSelected(null);
  }

  async function submitTransfer(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/inventory/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventory_id: selected.id,
          to_warehouse_id: Number(transferForm.to_warehouse_id),
          quantity: Number(transferForm.quantity),
          remarks: transferForm.remarks,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setMsgType("success");
      setMsg(
        `Transferred ${json.data.quantity} ${selected.unit} to warehouse #${json.data.to_warehouse_id}`,
      );
      closeForms();
      load();
    } catch (err) {
      setMsgType("error");
      setMsg(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setSaving(false);
    }
  }

  async function submitAdjust(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventory_id: selected.id,
          adjustment_qty: Number(adjustForm.adjustment_qty),
          reason: adjustForm.reason,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setMsgType("success");
      setMsg(
        `Adjusted inventory #${json.data.inventory_id}: ${json.data.previous_quantity} → ${json.data.new_quantity}`,
      );
      closeForms();
      load();
    } catch (err) {
      setMsgType("error");
      setMsg(err instanceof Error ? err.message : "Adjustment failed");
    } finally {
      setSaving(false);
    }
  }

  const invColumns: Column<Inv>[] = [
    { key: "warehouse_name", header: "Warehouse" },
    {
      key: "item",
      header: "Item",
      render: (r) =>
        r.material_name
          ? `${r.material_code} — ${r.material_name}`
          : r.product_name
            ? `${r.product_code} — ${r.product_name}`
            : "-",
    },
    {
      key: "batch",
      header: "Batch",
      render: (r) => r.rm_batch_number || r.fg_batch_number || "-",
    },
    {
      key: "expiry",
      header: "Expiry",
      render: (r) => formatDate(r.rm_expiry_date || r.fg_expiry_date),
    },
    { key: "quantity", header: "Qty" },
    { key: "unit", header: "Unit" },
    {
      key: "actions",
      header: "Actions",
      render: (r) =>
        canManage ? (
          <div className="flex flex-wrap gap-1">
            <Button variant="secondary" onClick={() => openTransfer(r)}>
              Transfer
            </Button>
            <Button variant="ghost" onClick={() => openAdjust(r)}>
              Adjust
            </Button>
          </div>
        ) : (
          "-"
        ),
    },
  ];

  const txnColumns: Column<Txn>[] = [
    {
      key: "transaction_type",
      header: "Type",
      render: (r) => <StatusCell value={r.transaction_type} />,
    },
    { key: "warehouse_name", header: "Warehouse" },
    {
      key: "item",
      header: "Item",
      render: (r) => r.material_name || r.product_name || "-",
    },
    { key: "quantity", header: "Qty" },
    {
      key: "ref",
      header: "PO / GRN",
      render: (r) =>
        r.po_number || r.grn_number
          ? `${r.po_number || "-"} / ${r.grn_number || "-"}`
          : "-",
    },
    {
      key: "transaction_date",
      header: "Date",
      render: (r) => formatDate(r.transaction_date),
    },
    { key: "remarks", header: "Remarks" },
  ];

  const itemLabel = selected
    ? selected.material_name
      ? `${selected.material_code} — ${selected.material_name}`
      : `${selected.product_code} — ${selected.product_name}`
    : "";

  return (
    <AppLayout title="Inventory" userName={userName}>
      <PageHeader
        title="Inventory"
        subtitle="Stock balances, warehouse transfers, and adjustments (all changes create transactions)"
      />

      {msg ? (
        <div className="mb-4">
          <Alert type={msgType}>{msg}</Alert>
        </div>
      ) : null}

      {mode === "transfer" && selected ? (
        <Card className="mb-4">
          <h3 className="mb-3 font-semibold text-slate-900">Transfer Stock</h3>
          <p className="mb-3 text-sm text-slate-600">
            {itemLabel} · Batch {selected.rm_batch_number || selected.fg_batch_number || "-"} · From{" "}
            <strong>{selected.warehouse_name}</strong> · Available {selected.quantity}{" "}
            {selected.unit}
          </p>
          <form onSubmit={submitTransfer} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Destination Warehouse</Label>
              <Select
                required
                value={transferForm.to_warehouse_id}
                onChange={(e) =>
                  setTransferForm({ ...transferForm, to_warehouse_id: e.target.value })
                }
              >
                <option value="">Select warehouse</option>
                {warehouses
                  .filter((w) => w.id !== selected.warehouse_id)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.warehouse_code} — {w.warehouse_name} ({w.warehouse_type})
                    </option>
                  ))}
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                step="0.0001"
                min="0.0001"
                max={selected.quantity}
                required
                value={transferForm.quantity}
                onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Label>Remarks</Label>
              <Textarea
                rows={2}
                value={transferForm.remarks}
                onChange={(e) => setTransferForm({ ...transferForm, remarks: e.target.value })}
                placeholder="Optional transfer note"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Transferring..." : "Confirm Transfer"}
              </Button>
              <Button type="button" variant="secondary" onClick={closeForms}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {mode === "adjust" && selected ? (
        <Card className="mb-4">
          <h3 className="mb-3 font-semibold text-slate-900">Adjust Stock</h3>
          <p className="mb-3 text-sm text-slate-600">
            {itemLabel} · Current qty <strong>{selected.quantity}</strong> {selected.unit}. Use
            negative values to decrease (cannot go below 0).
          </p>
          <form onSubmit={submitAdjust} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Adjustment Qty (+/-)</Label>
              <Input
                type="number"
                step="0.0001"
                required
                value={adjustForm.adjustment_qty}
                onChange={(e) => setAdjustForm({ ...adjustForm, adjustment_qty: e.target.value })}
                placeholder="e.g. -2.5 or 1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Reason (required)</Label>
              <Input
                required
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                placeholder="Cycle count / damage / correction"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Confirm Adjustment"}
              </Button>
              <Button type="button" variant="secondary" onClick={closeForms}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card className="mb-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={tab === "stock" ? "primary" : "secondary"}
            onClick={() => {
              setTab("stock");
              setPage(1);
              closeForms();
            }}
          >
            Stock
          </Button>
          <Button
            variant={tab === "txn" ? "primary" : "secondary"}
            onClick={() => {
              setTab("txn");
              setPage(1);
              closeForms();
            }}
          >
            Transactions
          </Button>
        </div>
        <FilterBar className="lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto]">
          <SearchInput
            value={search}
            onChange={(v) => {
              setPage(1);
              setSearch(v);
            }}
            label={tab === "stock" ? "Search stock" : "Search transactions"}
            hint={
              tab === "stock"
                ? "Filter by material, product, or batch"
                : "Filter by remarks, PO, GRN, or reference"
            }
          />
          {tab === "stock" ? (
            <FormField label="Warehouse filter" hint="Show stock for one warehouse only">
              <Select
                value={warehouseFilter}
                onChange={(e) => {
                  setPage(1);
                  setWarehouseFilter(e.target.value);
                }}
              >
                <option value="">All warehouses</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.warehouse_code} — {w.warehouse_name}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : (
            <FormField label="Transaction type" hint="Show one movement type (e.g. PURCHASE_RECEIVED)">
              <Select
                value={txnType}
                onChange={(e) => {
                  setPage(1);
                  setTxnType(e.target.value);
                }}
              >
                <option value="">All types</option>
                <option value="PURCHASE_RECEIVED">PURCHASE_RECEIVED</option>
                <option value="STOCK_TRANSFER">STOCK_TRANSFER</option>
                <option value="STOCK_ADJUSTMENT">STOCK_ADJUSTMENT</option>
                <option value="MANUFACTURING_CONSUMPTION">MANUFACTURING_CONSUMPTION</option>
                <option value="MANUFACTURING_OUTPUT">MANUFACTURING_OUTPUT</option>
                <option value="SALES_ISSUE">SALES_ISSUE</option>
              </Select>
            </FormField>
          )}
          <FilterActions>
            <Button variant="secondary" onClick={load} className="w-full sm:w-auto">
              Refresh
            </Button>
          </FilterActions>
        </FilterBar>
      </Card>

      {tab === "stock" ? (
        <ResponsiveTable
          columns={invColumns}
          rows={rows}
          loading={loading}
          error={error}
          onRetry={load}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      ) : (
        <ResponsiveTable
          columns={txnColumns}
          rows={txns}
          loading={loading}
          error={error}
          onRetry={load}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </AppLayout>
  );
}

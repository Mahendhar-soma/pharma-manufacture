"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import ResponsiveTable, { StatusCell, type Column } from "@/components/tables/ResponsiveTable";
import { Alert, Button, Card, FilterActions, FilterBar, FormField, FormGrid, Input, PageHeader, SearchInput, Select } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/utils";
import { formatPoStatus } from "@/lib/txn-labels";

type PO = {
  id: number;
  po_number: string;
  supplier_name: string;
  order_date: string;
  expected_date?: string;
  status: string;
  total_amount: number;
};

type Option = { id: number; label: string; unit?: string; status?: string };

type PoLine = {
  purchase_order_item_id: number;
  raw_material_id: number;
  material_code: string;
  material_name: string;
  ordered_quantity: number;
  received_quantity: number;
  remaining_quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  expected_date: string | null;
};

type GrnItem = {
  purchase_order_item_id: number;
  raw_material_id: string;
  batch_number: string;
  manufacturing_date: string;
  expiry_date: string;
  quantity: string;
  unit: string;
  unit_price: string;
  remaining_quantity: number;
  ordered_quantity: number;
  received_quantity: number;
  material_label: string;
  expected_date: string | null;
};

type PoFormItem = {
  raw_material_id: string;
  ordered_quantity: string;
  unit: string;
  unit_price: string;
  expected_date: string;
  remarks: string;
};

export default function PurchasesPage() {
  const [rows, setRows] = useState<PO[]>([]);
  const [grns, setGrns] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tab, setTab] = useState<"po" | "grn">("po");
  const [showPo, setShowPo] = useState(false);
  const [showGrn, setShowGrn] = useState(false);
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [warehouses, setWarehouses] = useState<Option[]>([]);
  const [materials, setMaterials] = useState<Option[]>([]);
  const [pos, setPos] = useState<Option[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [userName, setUserName] = useState("User");
  const [poForm, setPoForm] = useState({
    supplier_id: "",
    order_date: new Date().toISOString().slice(0, 10),
    expected_date: "",
    warehouse_id: "",
  });
  const [poItems, setPoItems] = useState<PoFormItem[]>([
    {
      raw_material_id: "",
      ordered_quantity: "",
      unit: "kg",
      unit_price: "",
      expected_date: "",
      remarks: "",
    },
  ]);
  const [grnForm, setGrnForm] = useState({
    purchase_order_id: "",
    warehouse_id: "",
    receipt_date: new Date().toISOString().slice(0, 10),
  });
  const [grnItems, setGrnItems] = useState<GrnItem[]>([]);
  const [loadingPoLines, setLoadingPoLines] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (search) params.set("search", search);
      const [poRes, grnRes] = await Promise.all([
        fetch(`/api/purchase-orders?${params}`),
        fetch("/api/goods-receipts?limit=20"),
      ]);
      const poJson = await poRes.json();
      const grnJson = await grnRes.json();
      if (!poJson.success) throw new Error(poJson.message);
      setRows(poJson.data.items);
      setTotalPages(poJson.data.pagination.totalPages);
      if (grnJson.success) setGrns(grnJson.data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  const refreshOpenPos = useCallback(async () => {
    const p = await fetch("/api/purchase-orders?limit=100").then((r) => r.json());
    if (p.success) {
      setPos(
        p.data.items
          .filter((x: PO) =>
            ["PENDING", "ORDERED", "DRAFT", "PARTIALLY_RECEIVED"].includes(x.status),
          )
          .map((x: PO) => ({
            id: x.id,
            label: `${x.po_number} (${formatPoStatus(x.status)})`,
            status: x.status,
          })),
      );
    }
  }, []);

  useEffect(() => {
    load();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => j.success && setUserName(j.data.name))
      .catch(() => undefined);
    Promise.all([
      fetch("/api/suppliers?limit=100&status=ACTIVE").then((r) => r.json()),
      fetch("/api/warehouses?limit=100&status=ACTIVE").then((r) => r.json()),
      fetch("/api/raw-materials?limit=100&status=ACTIVE").then((r) => r.json()),
    ]).then(([s, w, m]) => {
      if (s.success) {
        setSuppliers(
          s.data.items.map((x: { id: number; supplier_code: string; supplier_name: string }) => ({
            id: x.id,
            label: `${x.supplier_code} — ${x.supplier_name}`,
          })),
        );
      }
      if (w.success) {
        setWarehouses(
          w.data.items.map((x: { id: number; warehouse_code: string; warehouse_name: string }) => ({
            id: x.id,
            label: `${x.warehouse_code} — ${x.warehouse_name}`,
          })),
        );
      }
      if (m.success) {
        setMaterials(
          m.data.items.map(
            (x: { id: number; material_code: string; material_name: string; unit: string }) => ({
              id: x.id,
              label: `${x.material_code} — ${x.material_name}`,
              unit: x.unit,
            }),
          ),
        );
      }
    });
    refreshOpenPos();
  }, [load, refreshOpenPos]);

  async function loadPoForGrn(poId: string) {
    setGrnForm((prev) => ({ ...prev, purchase_order_id: poId }));
    setGrnItems([]);
    if (!poId) return;
    setLoadingPoLines(true);
    try {
      const res = await fetch(`/api/purchase-orders/${poId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      const lines = (json.data.items as PoLine[]).filter((l) => l.remaining_quantity > 0);
      if (!lines.length) {
        setMsg("This PO has no remaining quantity to receive");
        setGrnItems([]);
        return;
      }
      setMsg(null);
      setGrnItems(
        lines.map((l) => ({
          purchase_order_item_id: l.purchase_order_item_id,
          raw_material_id: String(l.raw_material_id),
          batch_number: "",
          manufacturing_date: "",
          expiry_date: "",
          quantity: String(l.remaining_quantity),
          unit: l.unit,
          unit_price: String(l.unit_price),
          remaining_quantity: l.remaining_quantity,
          ordered_quantity: l.ordered_quantity,
          received_quantity: l.received_quantity,
          material_label: `${l.material_code} — ${l.material_name}`,
          expected_date: l.expected_date,
        })),
      );
      if (json.data.warehouse_id) {
        setGrnForm((prev) => ({
          ...prev,
          purchase_order_id: poId,
          warehouse_id: String(json.data.warehouse_id),
        }));
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to load PO items");
    } finally {
      setLoadingPoLines(false);
    }
  }

  async function createPo(e: React.FormEvent) {
    e.preventDefault();
    const items = poItems.filter((i) => i.raw_material_id && i.ordered_quantity);
    if (!poForm.supplier_id || !items.length) {
      setMsg("Supplier and at least one item required");
      return;
    }
    const res = await fetch("/api/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...poForm,
        supplier_id: Number(poForm.supplier_id),
        warehouse_id: poForm.warehouse_id ? Number(poForm.warehouse_id) : null,
        items: items.map((i) => ({
          raw_material_id: Number(i.raw_material_id),
          ordered_quantity: Number(i.ordered_quantity),
          unit: i.unit,
          unit_price: Number(i.unit_price || 0),
          expected_date: i.expected_date || poForm.expected_date || null,
          remarks: i.remarks || null,
        })),
      }),
    });
    const json = await res.json();
    if (!json.success) {
      setMsg(json.message);
      return;
    }
    setShowPo(false);
    setMsg(`PO ${json.data.po_number} created (Pending)`);
    load();
    refreshOpenPos();
  }

  async function createGrn(e: React.FormEvent) {
    e.preventDefault();
    const items = grnItems.filter(
      (i) => i.raw_material_id && i.batch_number && i.expiry_date && Number(i.quantity) > 0,
    );
    if (!grnForm.purchase_order_id || !grnForm.warehouse_id || !items.length) {
      setMsg("PO, warehouse, batch #, expiry and qty > 0 are required");
      return;
    }
    for (const item of items) {
      const qty = Number(item.quantity);
      if (qty > item.remaining_quantity + 1e-9) {
        setMsg(
          `${item.material_label}: qty ${qty} exceeds remaining ${item.remaining_quantity}`,
        );
        return;
      }
    }
    const res = await fetch("/api/goods-receipts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purchase_order_id: Number(grnForm.purchase_order_id),
        warehouse_id: Number(grnForm.warehouse_id),
        receipt_date: grnForm.receipt_date,
        items: items.map((i) => ({
          purchase_order_item_id: i.purchase_order_item_id,
          raw_material_id: Number(i.raw_material_id),
          batch_number: i.batch_number,
          manufacturing_date: i.manufacturing_date || null,
          expiry_date: i.expiry_date,
          quantity: Number(i.quantity),
          unit: i.unit,
          unit_price: Number(i.unit_price || 0),
        })),
      }),
    });
    const json = await res.json();
    if (!json.success) {
      setMsg(json.message);
      return;
    }
    setShowGrn(false);
    setGrnItems([]);
    setGrnForm({
      purchase_order_id: "",
      warehouse_id: "",
      receipt_date: new Date().toISOString().slice(0, 10),
    });
    setMsg(
      `GRN ${json.data.grn_number} created · ${json.data.transactions_created} PURCHASE_RECEIVED txn(s) · PO now ${formatPoStatus(json.data.po_status)}`,
    );
    load();
    refreshOpenPos();
  }

  const poColumns: Column<PO>[] = [
    { key: "po_number", header: "PO Number" },
    { key: "supplier_name", header: "Supplier" },
    { key: "order_date", header: "Order Date", render: (r) => formatDate(r.order_date) },
    { key: "expected_date", header: "Expected", render: (r) => formatDate(r.expected_date) },
    { key: "total_amount", header: "Amount", render: (r) => formatMoney(r.total_amount) },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusCell value={formatPoStatus(r.status)} />,
    },
    {
      key: "actions",
      header: "Print",
      render: (r) => (
        <Link
          href={`/print/purchase-orders/${r.id}`}
          target="_blank"
          className="text-sm font-medium text-teal-800 hover:underline"
        >
          PO
        </Link>
      ),
    },
  ];

  const emptyPoItem = (): PoFormItem => ({
    raw_material_id: "",
    ordered_quantity: "",
    unit: "kg",
    unit_price: "",
    expected_date: "",
    remarks: "",
  });

  return (
    <AppLayout title="Purchases" userName={userName}>
      <PageHeader
        title="Purchases & Goods Receipt"
        subtitle="Item-wise partial receiving — total received never exceeds ordered qty"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/reports/transactions?transaction_type=PURCHASE_RECEIVED"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
            >
              Purchase received report
            </Link>
            <Button
              variant="secondary"
              onClick={() => {
                setTab("po");
                setShowPo((v) => !v);
                setShowGrn(false);
              }}
            >
              New PO
            </Button>
            <Button
              onClick={() => {
                setTab("grn");
                setShowGrn((v) => !v);
                setShowPo(false);
                refreshOpenPos();
              }}
            >
              Goods Receipt
            </Button>
          </div>
        }
      />
      {msg ? <Alert type="info">{msg}</Alert> : null}

      {showPo ? (
        <Card className="mb-4 space-y-3">
          <form onSubmit={createPo} className="space-y-3">
            <FormGrid cols={4}>
              <FormField
                label="Supplier *"
                hint="Vendor who will supply these materials"
              >
                <Select
                  value={poForm.supplier_id}
                  onChange={(e) => setPoForm({ ...poForm, supplier_id: e.target.value })}
                  required
                >
                  <option value="">Select</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Order date *" hint="Date this purchase order is raised">
                <Input
                  type="date"
                  value={poForm.order_date}
                  onChange={(e) => setPoForm({ ...poForm, order_date: e.target.value })}
                  required
                />
              </FormField>
              <FormField
                label="Default expected date"
                hint="Fallback delivery date for lines that do not set their own"
              >
                <Input
                  type="date"
                  value={poForm.expected_date}
                  onChange={(e) => setPoForm({ ...poForm, expected_date: e.target.value })}
                />
              </FormField>
              <FormField
                label="Warehouse"
                hint="Preferred receiving warehouse (can change on GRN)"
              >
                <Select
                  value={poForm.warehouse_id}
                  onChange={(e) => setPoForm({ ...poForm, warehouse_id: e.target.value })}
                >
                  <option value="">Optional</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label}
                    </option>
                  ))}
                </Select>
              </FormField>
            </FormGrid>
            {poItems.map((item, idx) => {
              const qty = Number(item.ordered_quantity || 0);
              const price = Number(item.unit_price || 0);
              return (
                <div key={idx} className="rounded border border-slate-200 p-3 space-y-2">
                  <FormGrid cols={3}>
                    <FormField
                      label="Raw material *"
                      hint="Item to purchase — must exist in Raw Materials master"
                    >
                      <Select
                        value={item.raw_material_id}
                        onChange={(e) => {
                          const next = [...poItems];
                          const mat = materials.find((m) => String(m.id) === e.target.value);
                          next[idx] = {
                            ...next[idx],
                            raw_material_id: e.target.value,
                            unit: mat?.unit || next[idx].unit,
                          };
                          setPoItems(next);
                        }}
                      >
                        <option value="">Select material</option>
                        {materials.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField
                      label="Ordered quantity *"
                      hint="Maximum qty you can receive later across all GRNs"
                    >
                      <Input
                        type="number"
                        step="0.0001"
                        value={item.ordered_quantity}
                        onChange={(e) => {
                          const next = [...poItems];
                          next[idx] = { ...next[idx], ordered_quantity: e.target.value };
                          setPoItems(next);
                        }}
                      />
                    </FormField>
                    <FormField label="Unit" hint="Must match material UOM (kg, L, pcs…)">
                      <Input
                        value={item.unit}
                        onChange={(e) => {
                          const next = [...poItems];
                          next[idx] = { ...next[idx], unit: e.target.value };
                          setPoItems(next);
                        }}
                      />
                    </FormField>
                    <FormField
                      label="Unit cost"
                      hint="Price per unit — used for PO total and receipt cost"
                    >
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => {
                          const next = [...poItems];
                          next[idx] = { ...next[idx], unit_price: e.target.value };
                          setPoItems(next);
                        }}
                      />
                    </FormField>
                    <FormField
                      label="Expected delivery (this line)"
                      hint="When this material is expected from supplier"
                    >
                      <Input
                        type="date"
                        value={item.expected_date}
                        onChange={(e) => {
                          const next = [...poItems];
                          next[idx] = { ...next[idx], expected_date: e.target.value };
                          setPoItems(next);
                        }}
                      />
                    </FormField>
                    <FormField label="Line remarks" hint="Optional note for this PO line">
                      <Input
                        value={item.remarks}
                        onChange={(e) => {
                          const next = [...poItems];
                          next[idx] = { ...next[idx], remarks: e.target.value };
                          setPoItems(next);
                        }}
                      />
                    </FormField>
                  </FormGrid>
                  <div className="text-xs text-slate-500">
                    Line total: {formatMoney(qty * price)}
                  </div>
                </div>
              );
            })}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPoItems([...poItems, emptyPoItem()])}
              >
                Add Item
              </Button>
              <Button type="submit">Create PO</Button>
            </div>
          </form>
        </Card>
      ) : null}

      {showGrn ? (
        <Card className="mb-4 space-y-3">
          <p className="text-sm text-slate-600">
            Partial shipments allowed. Example: order 100 KG → receive 40, then 30, then 30 on
            different dates. Each receipt posts a <strong>PURCHASE_RECEIVED</strong> transaction.
          </p>
          <form onSubmit={createGrn} className="space-y-3">
            <FormGrid cols={3}>
              <FormField
                label="Purchase order *"
                hint="Select open PO — lines with remaining qty load automatically"
              >
                <Select
                  value={grnForm.purchase_order_id}
                  onChange={(e) => loadPoForGrn(e.target.value)}
                  required
                >
                  <option value="">Select open PO</option>
                  {pos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                label="Receiving warehouse *"
                hint="Where this shipment will be stored in inventory"
              >
                <Select
                  value={grnForm.warehouse_id}
                  onChange={(e) => setGrnForm({ ...grnForm, warehouse_id: e.target.value })}
                  required
                >
                  <option value="">Select</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                label="Receiving date *"
                hint="Date goods physically arrived — used on stock transactions"
              >
                <Input
                  type="date"
                  value={grnForm.receipt_date}
                  onChange={(e) => setGrnForm({ ...grnForm, receipt_date: e.target.value })}
                  required
                />
              </FormField>
            </FormGrid>

            {loadingPoLines ? <p className="text-sm text-slate-500">Loading PO lines…</p> : null}

            {grnItems.map((item, idx) => (
              <div key={item.purchase_order_item_id} className="rounded border border-slate-200 p-3 space-y-2">
                <div className="text-sm font-medium text-slate-800">{item.material_label}</div>
                <div className="text-xs text-slate-500">
                  Ordered {item.ordered_quantity} · Received {item.received_quantity} · Remaining{" "}
                  <span className="font-semibold text-teal-800">{item.remaining_quantity}</span>{" "}
                  {item.unit}
                  {item.expected_date ? ` · Expected ${formatDate(item.expected_date)}` : ""}
                </div>
                <FormGrid cols={3}>
                  <FormField
                    label="Batch / Lot # *"
                    hint="Supplier batch for traceability and expiry control"
                  >
                    <Input
                      value={item.batch_number}
                      onChange={(e) => {
                        const next = [...grnItems];
                        next[idx] = { ...next[idx], batch_number: e.target.value };
                        setGrnItems(next);
                      }}
                      required
                    />
                  </FormField>
                  <FormField label="Mfg date" hint="Optional manufacturing date of this lot">
                    <Input
                      type="date"
                      value={item.manufacturing_date}
                      onChange={(e) => {
                        const next = [...grnItems];
                        next[idx] = { ...next[idx], manufacturing_date: e.target.value };
                        setGrnItems(next);
                      }}
                    />
                  </FormField>
                  <FormField
                    label="Expiry date *"
                    hint="Required — expired stock cannot be used in production/sales"
                  >
                    <Input
                      type="date"
                      value={item.expiry_date}
                      onChange={(e) => {
                        const next = [...grnItems];
                        next[idx] = { ...next[idx], expiry_date: e.target.value };
                        setGrnItems(next);
                      }}
                      required
                    />
                  </FormField>
                  <FormField
                    label={`Receive qty * (max ${item.remaining_quantity})`}
                    hint="Cannot exceed remaining ordered quantity on this PO line"
                  >
                    <Input
                      type="number"
                      step="0.0001"
                      min={0}
                      max={item.remaining_quantity}
                      value={item.quantity}
                      onChange={(e) => {
                        const next = [...grnItems];
                        next[idx] = { ...next[idx], quantity: e.target.value };
                        setGrnItems(next);
                      }}
                      required
                    />
                  </FormField>
                  <FormField label="Unit" hint="Copied from PO line">
                    <Input value={item.unit} readOnly />
                  </FormField>
                  <FormField label="Unit cost" hint="Cost posted on PURCHASE_RECEIVED transaction">
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => {
                        const next = [...grnItems];
                        next[idx] = { ...next[idx], unit_price: e.target.value };
                        setGrnItems(next);
                      }}
                    />
                  </FormField>
                </FormGrid>
                <div className="text-xs text-slate-500">
                  This receipt total:{" "}
                  {formatMoney(Number(item.quantity || 0) * Number(item.unit_price || 0))}
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={!grnItems.length || loadingPoLines}>
                Post GRN
              </Button>
              <Link
                href="/reports/transactions"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
              >
                Open transaction report
              </Link>
            </div>
          </form>
        </Card>
      ) : null}

      <Card className="mb-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <Button variant={tab === "po" ? "primary" : "secondary"} onClick={() => setTab("po")}>
            Purchase Orders
          </Button>
          <Button variant={tab === "grn" ? "primary" : "secondary"} onClick={() => setTab("grn")}>
            Goods Receipts
          </Button>
        </div>
        <FilterBar className="lg:grid-cols-[minmax(0,1fr)_auto]">
          <SearchInput
            value={search}
            onChange={(v) => {
              setPage(1);
              setSearch(v);
            }}
            label="Search purchase orders"
            hint="Filter by PO number or supplier name"
            placeholder="e.g. PO-2026 or supplier"
          />
          <FilterActions>
            <Button variant="secondary" onClick={load} className="w-full sm:w-auto">
              Refresh
            </Button>
          </FilterActions>
        </FilterBar>
      </Card>

      {tab === "po" ? (
        <ResponsiveTable
          columns={poColumns}
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
          columns={
            [
              { key: "grn_number", header: "GRN" },
              { key: "po_number", header: "PO" },
              { key: "supplier_name", header: "Supplier" },
              { key: "warehouse_name", header: "Warehouse" },
              {
                key: "receipt_date",
                header: "Date",
                render: (r) => formatDate(r.receipt_date),
              },
              { key: "status", header: "Status", render: (r) => <StatusCell value={r.status} /> },
              {
                key: "actions",
                header: "Print",
                render: (r) => (
                  <Link
                    href={`/print/goods-receipts/${r.id}`}
                    target="_blank"
                    className="text-sm font-medium text-teal-800 hover:underline"
                  >
                    GRN
                  </Link>
                ),
              },
            ] as Column<{
              id: number;
              grn_number: string;
              po_number: string;
              supplier_name: string;
              warehouse_name: string;
              receipt_date: string;
              status: string;
            }>[]
          }
          rows={
            grns as {
              id: number;
              grn_number: string;
              po_number: string;
              supplier_name: string;
              warehouse_name: string;
              receipt_date: string;
              status: string;
            }[]
          }
          loading={loading}
          error={error}
          onRetry={load}
        />
      )}
    </AppLayout>
  );
}

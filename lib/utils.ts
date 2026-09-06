export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function formatMoney(value?: number | string | null) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

export function toCsv(rows: Record<string, unknown>[], columns?: string[]) {
  if (!rows.length) return "";
  const cols = columns || Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [cols.join(",")];
  for (const row of rows) {
    lines.push(cols.map((c) => escape(row[c])).join(","));
  }
  return lines.join("\n");
}

export function statusBadgeClass(status?: string) {
  const s = (status || "").toUpperCase();
  if (["ACTIVE", "RELEASED", "COMPLETED", "APPROVED", "PASS", "AVAILABLE", "CONFIRMED"].includes(s)) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
  }
  if (["DRAFT", "PLANNED", "PENDING", "QUARANTINE", "QC_PENDING", "UNDER_REVIEW", "OPEN"].includes(s)) {
    return "bg-amber-50 text-amber-700 ring-amber-600/20";
  }
  if (["INACTIVE", "CANCELLED", "REJECTED", "EXPIRED", "FAILED", "CRITICAL", "OBSOLETE"].includes(s)) {
    return "bg-rose-50 text-rose-700 ring-rose-600/20";
  }
  return "bg-slate-50 text-slate-700 ring-slate-600/20";
}

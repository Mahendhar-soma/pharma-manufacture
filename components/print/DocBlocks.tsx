import type { ReactNode } from "react";

export function DocShell({ children }: { children: ReactNode }) {
  return (
    <div className="print-doc mx-auto max-w-5xl bg-white px-4 py-6 text-slate-900 sm:px-8 sm:py-8">
      {children}
    </div>
  );
}

export function DocHeader({
  docTitle,
  docNumber,
  meta,
}: {
  docTitle: string;
  docNumber: string;
  meta?: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="border-b-2 border-slate-900 pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- print-friendly static asset */}
          <img
            src="/logo.png"
            alt="Pharma Life Sciences"
            className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14"
          />
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-800">
              Pharma Life Sciences
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{docTitle}</h1>
            <div className="mt-1 text-sm text-slate-600">Document No: {docNumber}</div>
          </div>
        </div>
        <div className="text-sm text-slate-600 sm:text-right">
          <div>Manufacturing ERP</div>
          <div>Controlled print copy</div>
        </div>
      </div>
      {meta?.length ? (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {meta.map((m) => (
            <div key={m.label} className="rounded border border-slate-200 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">{m.label}</div>
              <div className="text-sm font-medium">{m.value || "-"}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DocTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<string | number | null | undefined>>;
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="bg-slate-100">
            {headers.map((h) => (
              <th key={h} className="border border-slate-300 px-2 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className="border border-slate-300 px-2 py-1.5 align-top">
                    {cell == null || cell === "" ? "-" : String(cell)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                className="border border-slate-300 px-2 py-3 text-slate-500"
                colSpan={headers.length}
              >
                No line items
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function DocSignatures({
  labels = ["Prepared by", "Checked by", "Approved by"],
}: {
  labels?: string[];
}) {
  return (
    <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
      {labels.map((label) => (
        <div key={label} className="pt-8">
          <div className="border-t border-slate-400 pt-2 text-sm font-medium">{label}</div>
          <div className="mt-1 text-xs text-slate-500">Name / Date / Signature</div>
        </div>
      ))}
    </div>
  );
}

export function DocFooter({ note }: { note?: string }) {
  return (
    <div className="mt-8 border-t border-slate-300 pt-3 text-xs text-slate-500">
      {note ||
        "This document is system-generated for operational use. Verify against electronic records before release decisions."}
      <div className="mt-1">Printed: {new Date().toLocaleString()}</div>
    </div>
  );
}

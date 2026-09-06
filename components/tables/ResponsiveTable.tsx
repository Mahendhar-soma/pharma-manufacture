"use client";

import { Badge, Button, EmptyState } from "@/components/ui";
import { TableSkeleton } from "@/components/skeletons";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render?: (row: T) => React.ReactNode;
  mobileLabel?: string;
};

export default function ResponsiveTable<T extends { id?: number | string }>({
  columns,
  rows,
  loading,
  error,
  emptyTitle = "No records found",
  emptyAction,
  onRetry,
  page,
  totalPages,
  onPageChange,
  minWidth = "900px",
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptyAction?: React.ReactNode;
  onRetry?: () => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  minWidth?: string;
}) {
  if (loading) {
    return <TableSkeleton columns={columns.length || 5} rows={6} />;
  }
  if (error) {
    return (
      <div className="space-y-3">
        <EmptyState title="Unable to load data" description={error} />
        {onRetry ? (
          <div className="flex justify-center">
            <Button onClick={onRetry}>Try Again</Button>
          </div>
        ) : null}
      </div>
    );
  }
  if (!rows.length) {
    return <EmptyState title={emptyTitle} action={emptyAction} />;
  }

  return (
    <div className="space-y-3">
      {/* Desktop / tablet table */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <div className="table-scroll w-full overflow-x-auto">
          <table className="w-full text-left text-sm" style={{ minWidth }}>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={cn("px-4 py-3 font-medium", col.className)}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, idx) => (
                <tr key={String(row.id ?? idx)} className="hover:bg-slate-50/80">
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3 align-top text-slate-700", col.className)}>
                      <div className="max-w-[28rem] break-words">
                        {col.render
                          ? col.render(row)
                          : String((row as Record<string, unknown>)[col.key] ?? "-")}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {rows.map((row, idx) => (
          <div
            key={String(row.id ?? idx)}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="space-y-3">
              {columns.map((col) => (
                <div
                  key={col.key}
                  className="flex flex-col gap-1 border-b border-slate-100 pb-2 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                >
                  <div className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500">
                    {col.mobileLabel || col.header}
                  </div>
                  <div className="min-w-0 break-words text-sm text-slate-800 sm:text-right">
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? "-")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {page && totalPages && onPageChange ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1 sm:flex-none"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              className="flex-1 sm:flex-none"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function StatusCell({ value }: { value: string }) {
  return <Badge status={value}>{value}</Badge>;
}

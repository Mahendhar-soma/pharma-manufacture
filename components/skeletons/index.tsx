import { cn } from "@/lib/utils";

/** Base shimmer block */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-slate-200/90",
        className,
      )}
      aria-hidden
    />
  );
}

export function SkeletonText({
  lines = 1,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3", i === lines - 1 && lines > 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Stat card placeholders (dashboard / hub overviews) */
export function StatCardsSkeleton({
  count = 5,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5"
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-8 w-16" />
          <Skeleton className="mt-2 h-2.5 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Filter / search toolbar placeholder */
export function FilterBarSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
      <div
        className={cn(
          "grid grid-cols-1 gap-4 sm:grid-cols-2",
          fields >= 3 && "lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]",
        )}
      >
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className={i === fields - 1 && fields >= 3 ? "sm:w-auto" : "w-full"}>
            <Skeleton className="mb-1.5 h-4 w-28" />
            <Skeleton className="h-11 w-full rounded-xl sm:h-10" />
            <Skeleton className="mt-1 h-3 w-36" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Table + mobile-card skeleton used by ResponsiveTable while loading.
 * Mirrors desktop table and mobile card layouts.
 */
export function TableSkeleton({
  columns = 5,
  rows = 6,
}: {
  columns?: number;
  rows?: number;
}) {
  const colCount = Math.max(2, Math.min(columns, 10));

  return (
    <div className="space-y-3" role="status" aria-label="Loading data">
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex gap-6">
            {Array.from({ length: colCount }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-20" />
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="flex gap-6 px-4 py-3.5">
              {Array.from({ length: colCount }).map((_, c) => (
                <Skeleton
                  key={c}
                  className={cn("h-4", c === 0 ? "w-28" : c === colCount - 1 ? "w-16" : "w-24")}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {Array.from({ length: Math.min(rows, 4) }).map((_, r) => (
          <div
            key={r}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="space-y-3">
              {Array.from({ length: Math.min(colCount, 5) }).map((_, c) => (
                <div key={c} className="flex items-center justify-between gap-3">
                  <Skeleton className="h-2.5 w-16" />
                  <Skeleton className="h-3.5 w-28" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Module link tiles (hub overview pages) */
export function ModuleTilesSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-3 w-48" />
        </div>
      ))}
    </div>
  );
}

/** Dashboard: stats + charts + module grid */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading dashboard">
      <StatCardsSkeleton count={10} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
          <Skeleton className="h-5 w-40" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3.5 w-36" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
          <Skeleton className="h-5 w-36" />
          <div className="mt-4">
            <StatCardsSkeleton count={4} className="xl:grid-cols-2" />
          </div>
        </div>
      </div>
      <div>
        <Skeleton className="mb-3 h-6 w-44" />
        <ModuleTilesSkeleton count={8} />
      </div>
      <span className="sr-only">Loading dashboard…</span>
    </div>
  );
}

/** Hub overview (Lab / Quality / CRM): stats + links */
export function HubOverviewSkeleton({
  stats = 6,
  links = 4,
}: {
  stats?: number;
  links?: number;
}) {
  return (
    <div className="space-y-6" role="status" aria-label="Loading overview">
      <StatCardsSkeleton
        count={stats}
        className={
          stats <= 4
            ? "xl:grid-cols-4"
            : stats === 5
              ? "xl:grid-cols-5"
              : "xl:grid-cols-3"
        }
      />
      <ModuleTilesSkeleton count={links} />
      <span className="sr-only">Loading overview…</span>
    </div>
  );
}

/** List page shell: filter bar + table */
export function ListPageSkeleton({
  columns = 5,
  filterFields = 3,
}: {
  columns?: number;
  filterFields?: number;
}) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading page">
      <div className="mb-2 space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <FilterBarSkeleton fields={filterFields} />
      <TableSkeleton columns={columns} rows={6} />
      <span className="sr-only">Loading page…</span>
    </div>
  );
}

/** Notification / alert list cards */
export function NotificationListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading notifications">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <Skeleton className="h-2.5 w-28" />
          <Skeleton className="mt-2 h-4 w-56 max-w-full" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-1 h-3 w-3/4" />
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-24 rounded-xl" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading notifications…</span>
    </div>
  );
}

/** Generic content block (replaces plain LoadingBlock text) */
export function PageContentSkeleton({ variant = "list" }: { variant?: "list" | "dashboard" | "hub" }) {
  if (variant === "dashboard") return <DashboardSkeleton />;
  if (variant === "hub") return <HubOverviewSkeleton />;
  return <ListPageSkeleton />;
}

"use client";

import { cn, statusBadgeClass } from "@/lib/utils";
import { ChevronDown, Search } from "lucide-react";
import {
  DashboardSkeleton,
  HubOverviewSkeleton,
  ListPageSkeleton,
  TableSkeleton,
} from "@/components/skeletons";

/** Shared control chrome — full-width, fixed height so rows align */
const fieldControlClass =
  "box-border h-11 w-full max-w-full rounded-xl border border-slate-300 bg-white px-3.5 py-0 text-base leading-normal text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 sm:h-10 sm:text-sm";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          {title}
        </h2>
        {subtitle ? <p className="mt-1 text-sm leading-relaxed text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">{actions}</div>
      ) : null}
    </div>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </Card>
  );
}

export function Badge({ children, status }: { children: React.ReactNode; status?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        statusBadgeClass(status || String(children)),
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const styles = {
    primary: "bg-teal-700 text-white hover:bg-teal-800 active:bg-teal-900",
    secondary:
      "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 active:bg-slate-100",
    danger: "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800",
    ghost: "text-slate-700 hover:bg-slate-100 active:bg-slate-200",
  };
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition disabled:opacity-50 sm:h-10",
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(fieldControlClass, props.className)}
    />
  );
}

/**
 * Styled native select — full width, custom chevron, readable on mobile.
 * Avoids the default OS chrome that looks uneven across browsers.
 */
export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative w-full min-w-0">
      <select
        {...props}
        className={cn(
          fieldControlClass,
          "cursor-pointer appearance-none pe-10",
          // select needs vertical centering for option text
          "py-0",
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown
        size={18}
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
      />
    </div>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "box-border w-full max-w-full min-h-24 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:cursor-not-allowed disabled:bg-slate-50 sm:text-sm resize-y",
        props.className,
      )}
    />
  );
}

export function Label({
  children,
  htmlFor,
  hint,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  hint?: string;
}) {
  return (
    <div className="mb-1.5">
      <label
        htmlFor={htmlFor}
        className="block truncate text-sm font-medium leading-5 text-slate-800"
      >
        {children}
      </label>
      {/* Prefer hint under the control via FormField for row alignment */}
      {hint ? <p className="mt-0.5 text-xs leading-snug text-slate-500">{hint}</p> : null}
    </div>
  );
}

/**
 * Labeled field — label on top, control, then hint underneath.
 * Hint below the control keeps inputs aligned in multi-column rows.
 */
export function FormField({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full min-w-0 flex-col", className)}>
      <label className="mb-1.5 block truncate text-sm font-medium leading-5 text-slate-800">
        {label}
      </label>
      <div className="w-full min-w-0">{children}</div>
      {hint ? (
        <p className="mt-1 min-h-[1.25rem] text-xs leading-snug text-slate-500">{hint}</p>
      ) : (
        <p className="mt-1 min-h-[1.25rem]" aria-hidden />
      )}
    </div>
  );
}

/** Responsive form / filter grid — columns align on the control row */
export function FormGrid({
  children,
  cols = 3,
  className,
  align = "start",
}: {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
  align?: "start" | "end";
}) {
  const colClass =
    cols === 1
      ? "grid-cols-1"
      : cols === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : cols === 4
          ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  return (
    <div
      className={cn(
        "grid w-full gap-x-4 gap-y-3",
        colClass,
        align === "end" ? "items-end" : "items-start",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Search / filter toolbar — fields + action button aligned */
export function FilterBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-1 items-start gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Place next to FormFields in FilterBar so the button lines up with inputs */
export function FilterActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full min-w-0 flex-col sm:w-auto">
      <span className="mb-1.5 hidden h-5 sm:block" aria-hidden />
      <div className="flex w-full flex-wrap gap-2 sm:w-auto">{children}</div>
      <span className="mt-1 hidden min-h-[1.25rem] sm:block" aria-hidden />
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Type to filter the list…",
  label = "Search",
  hint = "Find records by code, name, or related text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
  hint?: string;
}) {
  return (
    <FormField label={label} hint={hint} className="w-full">
      <div className="relative w-full min-w-0">
        <Search
          size={18}
          className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-slate-400"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-11"
          aria-label={label}
        />
      </div>
    </FormField>
  );
}

export function Alert({
  type = "info",
  children,
}: {
  type?: "info" | "error" | "success";
  children: React.ReactNode;
}) {
  const styles = {
    info: "border-sky-200 bg-sky-50 text-sky-800",
    error: "border-rose-200 bg-rose-50 text-rose-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };
  return (
    <div className={cn("rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed", styles[type])}>
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
      <div className="text-base font-medium text-slate-800">{title}</div>
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function LoadingBlock({
  label = "Loading...",
  variant = "list",
}: {
  label?: string;
  variant?: "list" | "dashboard" | "hub" | "table";
}) {
  // Keep label for a11y; visual is skeleton matching page type
  const content =
    variant === "dashboard" ? (
      <DashboardSkeleton />
    ) : variant === "hub" ? (
      <HubOverviewSkeleton />
    ) : variant === "table" ? (
      <TableSkeleton />
    ) : (
      <ListPageSkeleton filterFields={2} />
    );

  return (
    <div role="status" aria-busy="true" aria-label={label}>
      {content}
      <span className="sr-only">{label}</span>
    </div>
  );
}

// Re-export skeletons commonly used from pages
export {
  Skeleton,
  DashboardSkeleton,
  HubOverviewSkeleton,
  TableSkeleton,
  ListPageSkeleton,
  NotificationListSkeleton,
  StatCardsSkeleton,
  FilterBarSkeleton,
} from "@/components/skeletons";

"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { cn } from "@/lib/utils";

type NotificationItem = {
  key: string;
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  href: string;
};

const severityDot: Record<string, string> = {
  critical: "bg-rose-500",
  warning: "bg-amber-500",
  info: "bg-sky-500",
};

export default function NotificationBell() {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=8");
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items || []);
        setTotal(Number(json.data.total || 0));
      }
    } catch {
      // ignore bell errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function dismiss(key: string) {
    await fetch("/api/notifications/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    load();
  }

  function openPanel() {
    setOpen(true);
    load();
  }

  const panel = open && mounted
    ? createPortal(
        <div className="fixed inset-0 z-[80]" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/45"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />

          {/*
            Responsive panel:
            - mobile: bottom sheet, full width
            - tablet+: centered dialog
          */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              "absolute flex flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl",
              // Mobile / small: bottom sheet
              "inset-x-0 bottom-0 max-h-[min(88vh,36rem)] rounded-t-2xl",
              // Tablet and up: centered modal
              "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[min(28rem,calc(100vw-2rem))] sm:max-h-[min(80vh,32rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
            )}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
              <div className="min-w-0">
                <h2 id={titleId} className="text-base font-semibold text-slate-900 sm:text-lg">
                  Notifications
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                  {total > 0
                    ? `${total} active alert${total === 1 ? "" : "s"}`
                    : "No active alerts"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 sm:h-10 sm:w-10"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {loading && !items.length ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500">Loading...</div>
              ) : null}
              {!loading && !items.length ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500">
                  No active alerts
                </div>
              ) : null}
              {items.map((n) => (
                <div
                  key={n.key}
                  className="border-b border-slate-100 px-4 py-3.5 last:border-0 sm:px-5"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                        severityDot[n.severity],
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={n.href}
                        onClick={() => setOpen(false)}
                        className="block break-words text-sm font-medium leading-snug text-slate-900 hover:text-teal-800"
                      >
                        {n.title}
                      </Link>
                      <p className="mt-1 break-words text-xs leading-relaxed text-slate-500 sm:text-sm">
                        {n.message}
                      </p>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Link
                          href={n.href}
                          onClick={() => setOpen(false)}
                          className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-teal-700 px-3 text-xs font-medium text-white hover:bg-teal-800 sm:h-9 sm:w-auto"
                        >
                          Open
                        </Link>
                        <button
                          type="button"
                          className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:h-9 sm:w-auto"
                          onClick={() => dismiss(n.key)}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="shrink-0 border-t border-slate-100 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 hover:bg-slate-100 sm:h-10"
              >
                View all notifications
              </Link>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 sm:h-9 sm:w-9 sm:rounded-lg"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell size={18} className="sm:h-4 sm:w-4" />
        {total > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
            {total > 99 ? "99+" : total}
          </span>
        ) : null}
      </button>
      {panel}
    </>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function dismiss(key: string) {
    await fetch("/api/notifications/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    load();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        className="relative inline-flex rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
        aria-label="Notifications"
      >
        <Bell size={16} />
        {total > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
            {total > 99 ? "99+" : total}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <div className="text-sm font-semibold text-slate-900">Notifications</div>
            <Link
              href="/notifications"
              className="text-xs font-medium text-teal-700 hover:underline"
              onClick={() => setOpen(false)}
            >
              View all
            </Link>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && !items.length ? (
              <div className="px-3 py-6 text-center text-sm text-slate-500">Loading...</div>
            ) : null}
            {!loading && !items.length ? (
              <div className="px-3 py-6 text-center text-sm text-slate-500">No active alerts</div>
            ) : null}
            {items.map((n) => (
              <div
                key={n.key}
                className="border-b border-slate-50 px-3 py-2.5 hover:bg-slate-50"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", severityDot[n.severity])}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className="block text-sm font-medium text-slate-900 hover:text-teal-800"
                    >
                      {n.title}
                    </Link>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.message}</p>
                    <button
                      type="button"
                      className="mt-1 text-[11px] text-slate-400 hover:text-slate-700"
                      onClick={() => dismiss(n.key)}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

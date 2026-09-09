"use client";

import { useEffect, useState } from "react";
import { LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import NotificationBell from "./NotificationBell";
import { Button } from "@/components/ui";
import { BrandMark } from "@/components/brand/BrandLogo";

export default function Header({
  title,
  userName,
  roleName,
  roleCode,
  onMenuClick,
}: {
  title: string;
  userName?: string;
  roleName?: string;
  roleCode?: string;
  onMenuClick: () => void;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!confirmOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loggingOut) setConfirmOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmOpen, loggingOut]);

  async function confirmLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setConfirmOpen(false);
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onMenuClick}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 p-2.5 text-slate-700 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <BrandMark
              size={36}
              className="h-8 w-8 shrink-0 sm:h-9 sm:w-9 lg:hidden"
              priority
            />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-slate-900 sm:text-xl">{title}</h1>
              <p className="hidden text-xs text-slate-500 sm:block">
                Pharmaceutical Life Sciences Management
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell />
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium text-slate-800">{userName || "User"}</div>
              <div className="text-xs text-slate-500">
                {roleName || roleCode || "Signed in"}
                {roleCode ? ` · ${roleCode}` : ""}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
          role="presentation"
          onClick={() => {
            if (!loggingOut) setConfirmOpen(false);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            aria-describedby="logout-confirm-desc"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="logout-confirm-title" className="text-lg font-semibold text-slate-900">
              Confirm logout
            </h2>
            <p id="logout-confirm-desc" className="mt-2 text-sm leading-relaxed text-slate-600">
              Are you sure you want to logout?
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                disabled={loggingOut}
                onClick={() => setConfirmOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={loggingOut}
                onClick={confirmLogout}
                className="w-full sm:w-auto"
              >
                {loggingOut ? "Logging out…" : "Yes, logout"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

"use client";

import { LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import NotificationBell from "./NotificationBell";

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

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 p-2.5 text-slate-700 lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
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
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

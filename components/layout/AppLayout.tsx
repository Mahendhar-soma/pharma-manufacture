"use client";

import { useState } from "react";
import Header from "./Header";
import { DesktopSidebar, MobileSidebar } from "./Sidebar";
import { useAuthSession } from "@/hooks/useAuthSession";

export default function AppLayout({
  children,
  title,
  userName,
}: {
  children: React.ReactNode;
  title: string;
  userName?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, roleCode, roleName } = useAuthSession();

  return (
    <div className="min-h-screen bg-slate-100">
      <DesktopSidebar roleCode={roleCode} />
      <MobileSidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        roleCode={roleCode}
      />
      <div className="lg:pl-64">
        <Header
          title={title}
          userName={userName || user?.name}
          roleName={roleName}
          roleCode={roleCode}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

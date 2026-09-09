"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Activity,
  Beaker,
  Bell,
  Boxes,
  Building2,
  ClipboardCheck,
  Factory,
  FileBarChart,
  FlaskConical,
  LayoutDashboard,
  Microscope,
  Package,
  ShieldCheck,
  Stethoscope,
  Truck,
  Users,
  Warehouse,
  X,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canRead, navHrefModule, type RoleCode } from "@/lib/permissions";
import BrandLogo from "@/components/brand/BrandLogo";

type NavChild = { label: string; href: string };
type NavItem = {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  children?: NavChild[];
};

const nav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
  { label: "Notifications", href: "/notifications", icon: <Bell size={18} /> },
  {
    label: "R&D",
    icon: <FlaskConical size={18} />,
    children: [
      { label: "Drug Discovery", href: "/drug-discovery" },
      { label: "Compounds", href: "/drug-discovery/compounds" },
      { label: "Experiments", href: "/drug-discovery/experiments" },
      { label: "Preclinical", href: "/preclinical" },
      { label: "Clinical Trials", href: "/clinical-trials" },
    ],
  },
  {
    label: "Manufacturing",
    icon: <Factory size={18} />,
    children: [
      { label: "Products", href: "/manufacturing/products" },
      { label: "Raw Materials", href: "/manufacturing/raw-materials" },
      { label: "Suppliers", href: "/manufacturing/suppliers" },
      { label: "Warehouses", href: "/manufacturing/warehouses" },
      { label: "Formulas", href: "/manufacturing/formulas" },
      { label: "Purchases", href: "/purchases" },
      { label: "Inventory", href: "/inventory" },
      { label: "Production", href: "/manufacturing/production" },
      { label: "Batches", href: "/manufacturing/batches" },
      { label: "Sales", href: "/manufacturing/sales" },
      { label: "Traceability", href: "/manufacturing/traceability" },
      { label: "Expiry", href: "/manufacturing/expiry" },
    ],
  },
  {
    label: "Laboratory",
    icon: <Microscope size={18} />,
    children: [
      { label: "Overview", href: "/laboratory" },
      { label: "Samples", href: "/laboratory/samples" },
      { label: "Tests", href: "/laboratory/tests" },
      { label: "Results", href: "/laboratory/results" },
      { label: "Equipment", href: "/laboratory/equipment" },
    ],
  },
  {
    label: "Quality",
    icon: <ShieldCheck size={18} />,
    children: [
      { label: "Overview", href: "/quality" },
      { label: "SOPs", href: "/quality/sops" },
      { label: "Deviations", href: "/quality/deviations" },
      { label: "CAPA", href: "/quality/capa" },
      { label: "Audits", href: "/quality/audits" },
      { label: "Change Control", href: "/quality/change-control" },
    ],
  },
  { label: "Regulatory", href: "/regulatory", icon: <ClipboardCheck size={18} /> },
  {
    label: "CRM",
    icon: <Stethoscope size={18} />,
    children: [
      { label: "Overview", href: "/crm" },
      { label: "Doctors", href: "/crm/doctors" },
      { label: "Hospitals", href: "/crm/hospitals" },
      { label: "Medical Reps", href: "/crm/medical-representatives" },
      { label: "Visits", href: "/crm/visits" },
    ],
  },
  { label: "Reports", href: "/reports", icon: <FileBarChart size={18} /> },
  { label: "Transactions", href: "/reports/transactions", icon: <Boxes size={18} /> },
  { label: "Audit Trail", href: "/audit-trail", icon: <Activity size={18} /> },
];

function filterNav(items: NavItem[], roleCode: RoleCode): NavItem[] {
  return items
    .map((item) => {
      if (item.href) {
        const mod = navHrefModule(item.href);
        if (mod && !canRead(roleCode, mod)) return null;
        return item;
      }
      const children = (item.children || []).filter((child) => {
        const mod = navHrefModule(child.href);
        return !mod || canRead(roleCode, mod);
      });
      if (!children.length) return null;
      return { ...item, children };
    })
    .filter(Boolean) as NavItem[];
}

function NavSection({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isChildActive = item.children?.some((c) => pathname.startsWith(c.href));
  const [open, setOpen] = useState(Boolean(isChildActive));

  if (item.href) {
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
          active
            ? "bg-teal-700 text-white"
            : "text-slate-300 hover:bg-slate-800 hover:text-white",
        )}
      >
        {item.icon}
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition",
          isChildActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white",
        )}
      >
        <span className="flex items-center gap-3">
          {item.icon}
          {item.label}
        </span>
        <ChevronDown size={16} className={cn("transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-1 space-y-1 border-l border-slate-700 ml-4 pl-3">
          {item.children?.map((child) => {
            const active = pathname === child.href || pathname.startsWith(child.href + "/");
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className={cn(
                  "block rounded-md px-2 py-1.5 text-sm transition",
                  active ? "bg-teal-700 text-white" : "text-slate-400 hover:text-white",
                )}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SidebarContent({
  onNavigate,
  roleCode = "VIEWER",
}: {
  onNavigate?: () => void;
  roleCode?: RoleCode;
}) {
  const items = useMemo(() => filterNav(nav, roleCode), [roleCode]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-800 px-3 py-3 sm:px-4 sm:py-4">
        <BrandLogo
          size="md"
          subtitle={roleCode}
          textClassName="text-white"
          priority
        />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => (
          <NavSection key={item.label} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-500">
        Access controlled by role
      </div>
    </div>
  );
}

export function DesktopSidebar({ roleCode }: { roleCode?: RoleCode }) {
  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col bg-slate-950">
      <SidebarContent roleCode={roleCode} />
    </aside>
  );
}

export function MobileSidebar({
  open,
  onClose,
  roleCode,
}: {
  open: boolean;
  onClose: () => void;
  roleCode?: RoleCode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close menu overlay"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 left-0 w-72 bg-slate-950 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
        <SidebarContent roleCode={roleCode} onNavigate={onClose} />
      </div>
    </div>
  );
}

export const sidebarIcons = {
  Activity,
  Beaker,
  Boxes,
  Building2,
  Package,
  Truck,
  Users,
  Warehouse,
};

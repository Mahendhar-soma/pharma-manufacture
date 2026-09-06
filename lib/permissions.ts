/**
 * Shared RBAC matrix (safe for client + Edge middleware).
 * ADMIN = full write everywhere. VIEWER = read-only everywhere.
 */

export const ROLE_CODES = [
  "ADMIN",
  "R_AND_D",
  "CLINICAL",
  "PRODUCTION",
  "WAREHOUSE",
  "LAB",
  "QUALITY",
  "REGULATORY",
  "SALES",
  "VIEWER",
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

export const MODULES = [
  "dashboard",
  "rnd",
  "preclinical",
  "clinical",
  "products",
  "raw_materials",
  "suppliers",
  "warehouses",
  "formulas",
  "purchases",
  "inventory",
  "production",
  "batches",
  "sales",
  "customers",
  "traceability",
  "expiry",
  "lab",
  "quality",
  "regulatory",
  "crm",
  "reports",
  "audit",
] as const;

export type ModuleKey = (typeof MODULES)[number];
export type AccessLevel = "none" | "read" | "write";

type RoleAccess = Partial<Record<ModuleKey, AccessLevel>>;

const ALL_READ: RoleAccess = Object.fromEntries(
  MODULES.map((m) => [m, "read" as AccessLevel]),
);

const ALL_WRITE: RoleAccess = Object.fromEntries(
  MODULES.map((m) => [m, "write" as AccessLevel]),
);

function mergeAccess(...parts: RoleAccess[]): RoleAccess {
  return Object.assign({}, ...parts);
}

const DASHBOARD_REPORTS: RoleAccess = {
  dashboard: "read",
  reports: "read",
};

/** Role → module access */
export const ROLE_PERMISSIONS: Record<RoleCode, RoleAccess> = {
  ADMIN: ALL_WRITE,

  VIEWER: Object.fromEntries(
    MODULES.filter((m) => m !== "audit").map((m) => [m, "read" as AccessLevel]),
  ),

  R_AND_D: mergeAccess(DASHBOARD_REPORTS, {
    rnd: "write",
    preclinical: "write",
    clinical: "read",
    products: "read",
  }),

  CLINICAL: mergeAccess(DASHBOARD_REPORTS, {
    clinical: "write",
    rnd: "read",
    preclinical: "read",
  }),

  PRODUCTION: mergeAccess(DASHBOARD_REPORTS, {
    products: "write",
    raw_materials: "write",
    formulas: "write",
    production: "write",
    batches: "write",
    inventory: "read",
    warehouses: "read",
    suppliers: "read",
    purchases: "read",
    traceability: "read",
    expiry: "read",
    lab: "read",
    quality: "read",
  }),

  WAREHOUSE: mergeAccess(DASHBOARD_REPORTS, {
    warehouses: "write",
    raw_materials: "write",
    suppliers: "write",
    purchases: "write",
    inventory: "write",
    expiry: "write",
    products: "read",
    batches: "read",
    traceability: "read",
    formulas: "read",
  }),

  LAB: mergeAccess(DASHBOARD_REPORTS, {
    lab: "write",
    batches: "read",
    products: "read",
    quality: "read",
    inventory: "read",
  }),

  QUALITY: mergeAccess(DASHBOARD_REPORTS, {
    quality: "write",
    batches: "write",
    lab: "read",
    production: "read",
    products: "read",
    traceability: "read",
    expiry: "read",
    inventory: "read",
    audit: "read",
  }),

  REGULATORY: mergeAccess(DASHBOARD_REPORTS, {
    regulatory: "write",
    products: "read",
    quality: "read",
    batches: "read",
    audit: "read",
  }),

  SALES: mergeAccess(DASHBOARD_REPORTS, {
    sales: "write",
    customers: "write",
    crm: "write",
    batches: "read",
    inventory: "read",
    products: "read",
    expiry: "read",
  }),
};

export function normalizeRole(role?: string | null): RoleCode {
  const code = String(role || "VIEWER").toUpperCase() as RoleCode;
  return ROLE_CODES.includes(code) ? code : "VIEWER";
}

export function getAccess(role: string | null | undefined, module: ModuleKey): AccessLevel {
  const r = normalizeRole(role);
  return ROLE_PERMISSIONS[r][module] || "none";
}

export function canRead(role: string | null | undefined, module: ModuleKey): boolean {
  const level = getAccess(role, module);
  return level === "read" || level === "write";
}

export function canWrite(role: string | null | undefined, module: ModuleKey): boolean {
  return getAccess(role, module) === "write";
}

/** Map UI/API path prefixes to permission modules (longest match wins). */
const PATH_MODULE_RULES: Array<{ prefix: string; module: ModuleKey }> = [
  { prefix: "/api/dashboard", module: "dashboard" },
  { prefix: "/dashboard", module: "dashboard" },

  { prefix: "/api/research-projects", module: "rnd" },
  { prefix: "/api/compounds", module: "rnd" },
  { prefix: "/api/research-experiments", module: "rnd" },
  { prefix: "/api/docking-experiments", module: "rnd" },
  { prefix: "/drug-discovery", module: "rnd" },

  { prefix: "/api/preclinical-studies", module: "preclinical" },
  { prefix: "/preclinical", module: "preclinical" },

  { prefix: "/api/clinical-studies", module: "clinical" },
  { prefix: "/clinical-trials", module: "clinical" },

  { prefix: "/api/products", module: "products" },
  { prefix: "/manufacturing/products", module: "products" },

  { prefix: "/api/raw-materials", module: "raw_materials" },
  { prefix: "/manufacturing/raw-materials", module: "raw_materials" },

  { prefix: "/api/suppliers", module: "suppliers" },
  { prefix: "/manufacturing/suppliers", module: "suppliers" },

  { prefix: "/api/warehouses", module: "warehouses" },
  { prefix: "/manufacturing/warehouses", module: "warehouses" },

  { prefix: "/api/formulas", module: "formulas" },
  { prefix: "/manufacturing/formulas", module: "formulas" },

  { prefix: "/api/purchase-orders", module: "purchases" },
  { prefix: "/api/goods-receipts", module: "purchases" },
  { prefix: "/print/purchase-orders", module: "purchases" },
  { prefix: "/print/goods-receipts", module: "purchases" },
  { prefix: "/purchases", module: "purchases" },

  { prefix: "/api/inventory", module: "inventory" },
  { prefix: "/inventory", module: "inventory" },

  { prefix: "/api/manufacturing-orders", module: "production" },
  { prefix: "/manufacturing/production", module: "production" },

  { prefix: "/api/batches/fefo", module: "batches" },
  { prefix: "/api/batches", module: "batches" },
  { prefix: "/print/batches", module: "batches" },
  { prefix: "/manufacturing/batches", module: "batches" },

  { prefix: "/api/sales", module: "sales" },
  { prefix: "/print/sales", module: "sales" },
  { prefix: "/manufacturing/sales", module: "sales" },

  { prefix: "/api/customers", module: "customers" },

  { prefix: "/api/traceability", module: "traceability" },
  { prefix: "/manufacturing/traceability", module: "traceability" },

  { prefix: "/api/cron/expiry", module: "expiry" },
  { prefix: "/api/expiry", module: "expiry" },
  { prefix: "/manufacturing/expiry", module: "expiry" },

  { prefix: "/api/samples", module: "lab" },
  { prefix: "/api/sample-tests", module: "lab" },
  { prefix: "/api/test-results", module: "lab" },
  { prefix: "/api/equipment", module: "lab" },
  { prefix: "/laboratory", module: "lab" },

  { prefix: "/api/sops", module: "quality" },
  { prefix: "/api/deviations", module: "quality" },
  { prefix: "/api/capa", module: "quality" },
  { prefix: "/api/audits", module: "quality" },
  { prefix: "/api/change-controls", module: "quality" },
  { prefix: "/quality", module: "quality" },

  { prefix: "/api/regulatory", module: "regulatory" },
  { prefix: "/regulatory", module: "regulatory" },

  { prefix: "/api/doctors", module: "crm" },
  { prefix: "/api/hospitals", module: "crm" },
  { prefix: "/api/medical-representatives", module: "crm" },
  { prefix: "/api/doctor-visits", module: "crm" },
  { prefix: "/crm", module: "crm" },

  { prefix: "/api/reports", module: "reports" },
  { prefix: "/reports", module: "reports" },

  { prefix: "/api/audit-logs", module: "audit" },
  { prefix: "/audit-trail", module: "audit" },
];

export function resolveModule(pathname: string): ModuleKey | null {
  const path = pathname.split("?")[0];
  let best: { prefix: string; module: ModuleKey } | null = null;
  for (const rule of PATH_MODULE_RULES) {
    if (path === rule.prefix || path.startsWith(rule.prefix + "/")) {
      if (!best || rule.prefix.length > best.prefix.length) best = rule;
    }
  }
  return best?.module ?? null;
}

export function methodNeedsWrite(method: string): boolean {
  const m = method.toUpperCase();
  return m !== "GET" && m !== "HEAD" && m !== "OPTIONS";
}

export function isPathAllowed(
  role: string | null | undefined,
  pathname: string,
  method = "GET",
): { allowed: boolean; module: ModuleKey | null; reason?: string } {
  // Auth + health always open when authenticated (or public handled separately)
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname === "/" ||
    pathname === "/login"
  ) {
    return { allowed: true, module: null };
  }

  const module = resolveModule(pathname);
  if (!module) {
    // Unknown protected path: allow authenticated users (dashboard siblings)
    return { allowed: true, module: null };
  }

  const needsWrite = methodNeedsWrite(method);
  if (needsWrite) {
    if (!canWrite(role, module)) {
      return {
        allowed: false,
        module,
        reason: `Role lacks write access to ${module}`,
      };
    }
  } else if (!canRead(role, module)) {
    return {
      allowed: false,
      module,
      reason: `Role lacks read access to ${module}`,
    };
  }

  return { allowed: true, module };
}

/** Nav href → module for sidebar filtering */
export function navHrefModule(href: string): ModuleKey | null {
  return resolveModule(href);
}

export function permissionsForRole(role: string | null | undefined) {
  const r = normalizeRole(role);
  const access = ROLE_PERMISSIONS[r];
  return {
    role_code: r,
    modules: MODULES.map((module) => ({
      module,
      access: access[module] || "none",
      can_read: canRead(r, module),
      can_write: canWrite(r, module),
    })),
  };
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  canRead,
  canWrite,
  normalizeRole,
  permissionsForRole,
  type ModuleKey,
  type RoleCode,
} from "@/lib/permissions";

export type AuthMe = {
  id: number;
  email: string;
  name: string;
  role_id: number;
  role_code: string;
  role_name: string;
};

export function useAuthSession() {
  const [user, setUser] = useState<AuthMe | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me");
      const json = await res.json();
      if (json.success) setUser(json.data);
      else setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const roleCode = normalizeRole(user?.role_code) as RoleCode;

  const api = useMemo(
    () => ({
      user,
      loading,
      reload,
      roleCode,
      roleName: user?.role_name || roleCode,
      canRead: (module: ModuleKey) => canRead(roleCode, module),
      canWrite: (module: ModuleKey) => canWrite(roleCode, module),
      permissions: permissionsForRole(roleCode),
    }),
    [user, loading, reload, roleCode],
  );

  return api;
}

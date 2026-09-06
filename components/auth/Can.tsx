"use client";

import { useAuthSession } from "@/hooks/useAuthSession";
import type { ModuleKey } from "@/lib/permissions";

/** Hide children unless the current role can write the module. */
export function CanWrite({
  module,
  children,
  fallback = null,
}: {
  module: ModuleKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { loading, canWrite } = useAuthSession();
  if (loading) return null;
  if (!canWrite(module)) return <>{fallback}</>;
  return <>{children}</>;
}

export function CanRead({
  module,
  children,
  fallback = null,
}: {
  module: ModuleKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { loading, canRead } = useAuthSession();
  if (loading) return null;
  if (!canRead(module)) return <>{fallback}</>;
  return <>{children}</>;
}

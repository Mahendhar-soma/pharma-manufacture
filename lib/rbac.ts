import "server-only";
import { fail } from "@/lib/api";
import { getSession, type SessionUser } from "@/lib/auth";
import {
  canWrite,
  canRead,
  normalizeRole,
  type ModuleKey,
  type RoleCode,
} from "@/lib/permissions";

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function requireRole(...roles: RoleCode[]): Promise<SessionUser> {
  const session = await requireUser();
  const code = normalizeRole(session.role_code);
  if (code !== "ADMIN" && !roles.includes(code)) {
    throw new ForbiddenError(`Requires one of: ${roles.join(", ")}`);
  }
  return session;
}

export async function requireModuleWrite(module: ModuleKey): Promise<SessionUser> {
  const session = await requireUser();
  if (!canWrite(session.role_code, module)) {
    throw new ForbiddenError(`No write permission for ${module}`);
  }
  return session;
}

export async function requireModuleRead(module: ModuleKey): Promise<SessionUser> {
  const session = await requireUser();
  if (!canRead(session.role_code, module)) {
    throw new ForbiddenError(`No read permission for ${module}`);
  }
  return session;
}

/** Only QUALITY or ADMIN may release finished batches. */
export async function requireBatchReleasePermission(): Promise<SessionUser> {
  return requireRole("QUALITY", "ADMIN");
}

export function forbiddenResponse(message = "Forbidden") {
  return fail(message, 403);
}

export function unauthorizedResponse(message = "Unauthorized") {
  return fail(message, 401);
}

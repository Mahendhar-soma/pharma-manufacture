import { NextRequest } from "next/server";
import { fail, getSearchParams, ok, paginate } from "@/lib/api";
import { listAuditLogs } from "@/lib/audit";
import {
  ForbiddenError,
  requireModuleRead,
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/rbac";

export const runtime = "nodejs";

/** Append-only audit trail listing. No POST/PATCH/DELETE — writes happen inside business APIs. */
export async function GET(request: NextRequest) {
  try {
    await requireModuleRead("audit");
    const { page, limit, search, searchParams } = getSearchParams(request);
    const action = (searchParams.get("action") || "").trim();
    const entity_type = (searchParams.get("entity_type") || "").trim();
    const entity_id_raw = searchParams.get("entity_id");
    const user_id_raw = searchParams.get("user_id");

    const { items, total } = await listAuditLogs({
      page,
      limit,
      search,
      action: action || undefined,
      entity_type: entity_type || undefined,
      entity_id: entity_id_raw ? Number(entity_id_raw) : null,
      user_id: user_id_raw ? Number(user_id_raw) : null,
    });

    return ok({
      items,
      pagination: paginate(total, page, limit),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof ForbiddenError) {
      return forbiddenResponse(error.message);
    }
    console.error(error);
    return fail("Unable to load audit logs", 500);
  }
}

import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { adjustStock } from "@/lib/inventory-ops";
import { writeAudit } from "@/lib/audit";
import {
  ForbiddenError,
  requireModuleWrite,
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/rbac";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await requireModuleWrite("inventory");
    const session = await getSession();
    const body = await request.json();

    const inventory_id = Number(body.inventory_id);
    const adjustment_qty = Number(body.adjustment_qty);
    const reason = String(body.reason || "").trim();

    if (!inventory_id || !Number.isFinite(adjustment_qty) || adjustment_qty === 0) {
      return fail("inventory_id and non-zero adjustment_qty are required", 400);
    }
    if (!reason) return fail("reason is required", 400);

    const result = await adjustStock({
      inventoryId: inventory_id,
      adjustmentQty: adjustment_qty,
      reason,
      userId: session?.id || null,
    });

    await writeAudit({
      user: session,
      action: "ADJUST",
      entity_type: "inventory",
      entity_id: inventory_id,
      summary: `Adjusted inventory #${inventory_id} by ${adjustment_qty}: ${reason}`,
      after: result,
      request,
    });

    return ok(result, "Inventory adjusted successfully", 201);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof ForbiddenError) {
      return forbiddenResponse(error.message);
    }
    console.error(error);
    return fail(error instanceof Error ? error.message : "Unable to adjust inventory", 400);
  }
}

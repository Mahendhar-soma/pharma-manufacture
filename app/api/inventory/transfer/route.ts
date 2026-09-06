import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { transferStock } from "@/lib/inventory-ops";
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
    const to_warehouse_id = Number(body.to_warehouse_id);
    const quantity = Number(body.quantity);

    if (!inventory_id || !to_warehouse_id || !quantity) {
      return fail("inventory_id, to_warehouse_id and quantity are required", 400);
    }

    const result = await transferStock({
      inventoryId: inventory_id,
      toWarehouseId: to_warehouse_id,
      quantity,
      remarks: body.remarks,
      userId: session?.id || null,
    });

    await writeAudit({
      user: session,
      action: "TRANSFER",
      entity_type: "inventory",
      entity_id: inventory_id,
      summary: `Transferred ${quantity} from inventory #${inventory_id} to warehouse #${to_warehouse_id}`,
      after: result,
      request,
    });

    return ok(result, "Stock transferred successfully", 201);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    if (error instanceof ForbiddenError) {
      return forbiddenResponse(error.message);
    }
    console.error(error);
    return fail(error instanceof Error ? error.message : "Unable to transfer stock", 400);
  }
}

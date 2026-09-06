import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { getBatchQcSummary } from "@/lib/qc";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const summary = await getBatchQcSummary(Number(id));
    if (!summary) return fail("Batch not found", 404);
    return ok(summary, "QC status loaded");
  } catch (error) {
    console.error(error);
    return fail("Unable to load QC status", 500);
  }
}

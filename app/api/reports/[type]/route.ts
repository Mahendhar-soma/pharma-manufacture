import { fail, ok } from "@/lib/api";
import { isReportType, runReport } from "@/lib/reports";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ type: string }> },
) {
  try {
    const { type } = await context.params;
    if (!isReportType(type)) {
      return fail("Unsupported report type. Valid: inventory, production, purchases, sales, batches, expiry, raw-materials, laboratory, quality, clinical, regulatory, crm");
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const search = searchParams.get("search");

    const { columns, rows } = await runReport(type, from, to, search);
    return ok({ type, columns, rows, count: rows.length });
  } catch (error) {
    console.error("Report error:", error);
    return fail("Unable to generate report", 500);
  }
}

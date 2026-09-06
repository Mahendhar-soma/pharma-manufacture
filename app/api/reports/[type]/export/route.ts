import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { isReportType, runReport } from "@/lib/reports";
import { toCsv } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ type: string }> },
) {
  try {
    const { type } = await context.params;
    if (!isReportType(type)) {
      return fail("Unsupported report type");
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const search = searchParams.get("search");

    const { columns, rows } = await runReport(type, from, to, search);
    const csv = toCsv(rows as Record<string, unknown>[], columns);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}-report.csv"`,
      },
    });
  } catch (error) {
    console.error("Report export error:", error);
    return fail("Unable to export report", 500);
  }
}

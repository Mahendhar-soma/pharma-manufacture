import pool from "@/lib/db";
import { ok, fail } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  try {
    await pool.execute("SELECT 1");
    return ok(null, "Database connected successfully");
  } catch (error) {
    console.error("DB health check failed:", error);
    return fail("Database connection failed", 500);
  }
}

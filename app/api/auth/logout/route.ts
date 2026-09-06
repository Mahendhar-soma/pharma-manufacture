import { logout } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

export const runtime = "nodejs";

export async function POST() {
  try {
    await logout();
    return ok(null, "Logged out successfully");
  } catch (error) {
    console.error("Logout error:", error);
    return fail("Logout failed", 500);
  }
}

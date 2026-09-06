import { getSession } from "@/lib/auth";
import { ok, fail } from "@/lib/api";
import { permissionsForRole } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return fail("Unauthorized", 401);
    return ok(
      {
        ...session,
        permissions: permissionsForRole(session.role_code),
      },
      "Session loaded",
    );
  } catch (error) {
    console.error("Me error:", error);
    return fail("Unable to load session", 500);
  }
}

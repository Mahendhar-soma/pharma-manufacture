import { NextRequest } from "next/server";
import { loginWithPassword } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return fail("Email and password are required", 400);
    }

    const user = await loginWithPassword(email, password);
    if (!user) {
      await writeAudit({
        action: "LOGIN_FAILED",
        entity_type: "session",
        entity_code: email,
        summary: `Failed login attempt for ${email}`,
        request,
      });
      return fail("Invalid email or password", 401);
    }

    await writeAudit({
      user,
      action: "LOGIN",
      entity_type: "session",
      entity_id: user.id,
      entity_code: user.email,
      summary: `User ${user.email} logged in`,
      after: { role_code: user.role_code },
      request,
    });

    return ok(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role_code: user.role_code,
        role_name: user.role_name,
      },
      "Login successful",
    );
  } catch (error) {
    console.error("Login error:", error);
    return fail("Login failed", 500);
  }
}

import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getNotificationsForUser } from "@/lib/notifications";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return fail("Unauthorized", 401);

    const limit = Math.min(
      100,
      Math.max(1, Number(new URL(request.url).searchParams.get("limit") || 50)),
    );
    const data = await getNotificationsForUser(session.id);
    return ok(
      {
        ...data,
        items: data.items.slice(0, limit),
      },
      "Notifications loaded",
    );
  } catch (error) {
    console.error(error);
    return fail("Unable to load notifications", 500);
  }
}

import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  dismissNotification,
  dismissNotifications,
  getNotificationsForUser,
} from "@/lib/notifications";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return fail("Unauthorized", 401);

    const body = await request.json();
    if (body.all === true) {
      const current = await getNotificationsForUser(session.id);
      await dismissNotifications(
        session.id,
        current.items.map((i) => i.key),
      );
      return ok({ dismissed: current.items.length }, "All notifications dismissed");
    }

    const key = String(body.key || "").trim();
    if (!key) return fail("key is required (or all: true)", 400);

    await dismissNotification(session.id, key);
    return ok({ key }, "Notification dismissed");
  } catch (error) {
    console.error(error);
    return fail("Unable to dismiss notification", 500);
  }
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { isPathAllowed } from "@/lib/permissions";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/health/db",
  "/api/cron/expiry",
];

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || "pharma-dev-secret-change-me");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const token = request.cookies.get("pharma_session")?.value;

  if (isPublic) {
    if (token && pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized", data: null },
        { status: 401 },
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const roleCode = String(payload.role_code || "VIEWER");

    const check = isPathAllowed(roleCode, pathname, request.method);
    if (!check.allowed) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            success: false,
            message: check.reason || "Forbidden",
            data: { module: check.module },
          },
          { status: 403 },
        );
      }
      // Send users without page access back to dashboard
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.searchParams.set("denied", check.module || "1");
      return NextResponse.redirect(url);
    }

    const response = NextResponse.next();
    response.headers.set("x-user-role", roleCode);
    response.headers.set("x-user-id", String(payload.sub || ""));
    return response;
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized", data: null },
        { status: 401 },
      );
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("pharma_session");
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

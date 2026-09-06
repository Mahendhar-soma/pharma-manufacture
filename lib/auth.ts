import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { query } from "./db";
import type { RowDataPacket } from "mysql2";

const COOKIE_NAME = "pharma_session";

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role_id: number;
  role_code: string;
  role_name: string;
};

// function getSecret() {
//   const secret = process.env.JWT_SECRET || "pharma-dev-secret-change-me";
//   return new TextEncoder().encode(secret);
// }
function getSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    sub: String(user.id),
    email: user.email,
    name: user.name,
    role_id: user.role_id,
    role_code: user.role_code,
    role_name: user.role_name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN || "1d")
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      id: Number(payload.sub),
      email: String(payload.email || ""),
      name: String(payload.name || ""),
      role_id: Number(payload.role_id || 0),
      role_code: String(payload.role_code || ""),
      role_name: String(payload.role_name || ""),
    };
  } catch {
    return null;
  }
}

export async function loginWithPassword(email: string, password: string) {
  const rows = await query<
    (RowDataPacket & {
      id: number;
      email: string;
      name: string;
      role_id: number;
      role_code: string;
      role_name: string;
    })[]
  >(
    `SELECT u.id, u.email, u.name, u.role_id, r.role_code, r.role_name
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.email = ? AND u.password = ? AND u.status = 'active'
     LIMIT 1`,
    [email, password],
  );

  if (!rows.length) return null;

  const user: SessionUser = {
    id: rows[0].id,
    email: rows[0].email,
    name: rows[0].name,
    role_id: rows[0].role_id,
    role_code: rows[0].role_code,
    role_name: rows[0].role_name,
  };

  const token = await createSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return user;
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

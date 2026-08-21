import "server-only";

import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

import { getEnv } from "@/lib/env";

export const SESSION_COOKIE = "token";

/** 7 hours, matching the Express backend's `expiresIn: '7h'`. */
const SESSION_TTL_SECONDS = 7 * 60 * 60;

export type SessionPayload = {
  id: string;
  email: string;
  loginTime: string;
};

function secret(): Uint8Array {
  return new TextEncoder().encode(getEnv().JWT_SECRET);
}

/**
 * Issues a session token.
 *
 * Deliberately HS256 with the same `{ id, email, loginTime }` payload the
 * Express backend signed, so tokens already sitting in users' browsers keep
 * verifying after the cutover and nobody gets logged out by the migration.
 */
export async function createSessionToken(
  payload: SessionPayload,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.email !== "string" || typeof payload.id !== "string") {
      return null;
    }
    return {
      id: payload.id,
      email: payload.email,
      loginTime:
        typeof payload.loginTime === "string" ? payload.loginTime : "",
    };
  } catch {
    // Expired, tampered with, or signed by a different secret.
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();

  // Match the request scheme: ngrok serves over HTTPS and many browsers refuse
  // to persist a non-Secure cookie there, which breaks proxy.ts route guards
  // even though localStorage still has the token.
  let secure = process.env.NODE_ENV === "production";
  try {
    const headerList = await headers();
    const proto = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim();
    if (proto) secure = proto === "https";
  } catch {
    // headers() is unavailable outside a request scope — keep the default.
  }
  if (process.env.SESSION_COOKIE_SECURE === "true") secure = true;
  if (process.env.SESSION_COOKIE_SECURE === "false") secure = false;

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function readSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

/** Reads and verifies the current session, if any. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = await readSessionToken();
  return token ? verifySessionToken(token) : null;
}

/**
 * Pulls a bearer token out of an Authorization header.
 *
 * The old frontend sent the JWT both as a cookie and as an `Authorization`
 * header depending on the call site, so both paths stay supported.
 */
export function bearerFromHeader(header: string | null): string | null {
  if (!header) return null;
  return header.startsWith("Bearer ") ? header.slice(7) : header;
}

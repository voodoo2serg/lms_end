import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { SessionUser } from "./types";

export const COOKIE = "lms_portal_session";
const MAX_AGE_SEC = 60 * 60 * 12;

const STAFF_EMAIL = process.env.STUB_STAFF_EMAIL || "lms@solo-pr.ru";
const STAFF_PASSWORD = process.env.STUB_STAFF_PASSWORD || "changeme";
const LEARNER_EMAIL = process.env.STUB_LEARNER_EMAIL || "learner@solo-pr.ru";
const LEARNER_PASSWORD = process.env.STUB_LEARNER_PASSWORD || "changeme";

type SessionPayload = SessionUser & { exp: number; iat: number };

export function sessionSecret(): string {
  const secret = (process.env.PORTAL_SESSION_SECRET || "").trim();
  if (secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("PORTAL_SESSION_SECRET (≥16 chars) required in production");
  }
  // Dev/test only — never accept unsigned cookies.
  return "dev-portal-session-secret-change-me";
}

export function authenticateStub(email: string, password: string): SessionUser | null {
  const e = email.trim().toLowerCase();
  if (e === STAFF_EMAIL.toLowerCase() && password === STAFF_PASSWORD) {
    return { email: STAFF_EMAIL, role: "staff", name: "LMS Staff" };
  }
  if (e === LEARNER_EMAIL.toLowerCase() && password === LEARNER_PASSWORD) {
    return { email: LEARNER_EMAIL, role: "learner", name: "Ученик" };
  }
  return null;
}

function b64url(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf;
  return b.toString("base64url");
}

function sign(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** HMAC-signed session: `<payload_b64url>.<sig_b64url>` — role cannot be forged without secret. */
export function encodeSession(user: SessionUser, nowSec = Math.floor(Date.now() / 1000)): string {
  const payload: SessionPayload = {
    ...user,
    iat: nowSec,
    exp: nowSec + MAX_AGE_SEC,
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  const sig = sign(payloadB64, sessionSecret());
  return `${payloadB64}.${sig}`;
}

export function decodeSession(raw: string | undefined | null, nowSec = Math.floor(Date.now() / 1000)): SessionUser | null {
  if (!raw || !raw.includes(".")) return null;
  const [payloadB64, sig, ...rest] = raw.split(".");
  if (!payloadB64 || !sig || rest.length) return null;
  const expected = sign(payloadB64, sessionSecret());
  if (!safeEqual(sig, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as SessionPayload;
    if (!data?.email || (data.role !== "staff" && data.role !== "learner")) return null;
    if (typeof data.exp !== "number" || data.exp < nowSec) return null;
    return { email: data.email, role: data.role, name: data.name || data.email };
  } catch {
    return null;
  }
}

export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  return decodeSession(jar.get(COOKIE)?.value);
}

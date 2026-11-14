import { cookies } from "next/headers";
import type { SessionUser } from "./types";

export const COOKIE = "lms_portal_session";

const STAFF_EMAIL = process.env.STUB_STAFF_EMAIL || "lms@solo-pr.ru";
const STAFF_PASSWORD = process.env.STUB_STAFF_PASSWORD || "changeme";
const LEARNER_EMAIL = process.env.STUB_LEARNER_EMAIL || "learner@solo-pr.ru";
const LEARNER_PASSWORD = process.env.STUB_LEARNER_PASSWORD || "changeme";

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

export function encodeSession(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
}

export function decodeSession(raw: string | undefined | null): SessionUser | null {
  if (!raw) return null;
  try {
    const user = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as SessionUser;
    if (!user?.email || (user.role !== "staff" && user.role !== "learner")) return null;
    return user;
  } catch {
    return null;
  }
}

export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  return decodeSession(jar.get(COOKIE)?.value);
}

import { NextResponse } from "next/server";
import { authenticateStub, COOKIE, encodeSession } from "@/lib/auth";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const user = authenticateStub(body.email || "", body.password || "");
  if (!user) {
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }
  const res = NextResponse.json({ user });
  res.cookies.set(COOKIE, encodeSession(user), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
  });
  return res;
}

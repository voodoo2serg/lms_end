import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { chromeLinks, PORTAL_HOST } from "@/lib/portals";

export async function GET() {
  const user = await currentUser();
  return NextResponse.json({
    host: PORTAL_HOST,
    links: chromeLinks(user?.role ?? null),
  });
}

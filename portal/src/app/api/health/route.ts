import { NextResponse } from "next/server";
import { probeAdapter } from "@/lib/lms-end";
import { PORTAL_HOST } from "@/lib/portals";

export async function GET() {
  const adapter = await probeAdapter();
  return NextResponse.json({
    status: "ok",
    mode: "lms_portal",
    host: PORTAL_HOST,
    bbb_installed: false,
    media_plane: process.env.BBB_MEDIA_PLANE_HOST || null,
    adapter,
  });
}

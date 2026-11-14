import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { setSession } from "@/lib/store";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user || user.role !== "staff") {
    return NextResponse.json({ error: "Только staff" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "start" && body.action !== "end") {
    return NextResponse.json({ error: "action=start|end" }, { status: 422 });
  }
  const meeting = setSession(id, body.action);
  if (!meeting) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    meeting,
    event: {
      type: body.action === "start" ? "session.start" : "session.end",
      kind: body.action === "start" ? "session.start" : "session.end",
      meeting_id: meeting.id,
      externalMeetingId: meeting.externalMeetingId,
      at: body.action === "start" ? meeting.sessionStartedAt : meeting.sessionEndedAt,
    },
    note: "BBB media plane не на текущем VPS — joinUrl stub/external only.",
  });
}

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listMeetings, upsertMeeting } from "@/lib/store";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  return NextResponse.json({
    meetings: listMeetings(),
    bbb_on_vps: false,
    contract: {
      fields: ["externalMeetingId", "joinUrl", "scheduleStart", "scheduleEnd", "recordingRef"],
      events: ["meeting.scheduled", "session.start", "session.end"],
      sor: { join: "lms", announce: "cms/lk", notify: "voronka", money: "crm" },
    },
  });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "staff") {
    return NextResponse.json({ error: "Только staff" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    scheduleStart?: string;
    scheduleEnd?: string;
    externalMeetingId?: string;
  };
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "title обязателен" }, { status: 422 });
  }
  const meeting = upsertMeeting({
    title: body.title.trim(),
    scheduleStart: body.scheduleStart,
    scheduleEnd: body.scheduleEnd,
    externalMeetingId: body.externalMeetingId,
    mediaPlane: "stub",
  });
  return NextResponse.json({ meeting, event: { type: "meeting.scheduled", meeting_id: meeting.id } }, { status: 201 });
}

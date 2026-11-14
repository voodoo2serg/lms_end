import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { backendCreateMeeting, backendListMeetings, usingAdapter } from "@/lib/meetings-backend";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  try {
    const { meetings, store } = await backendListMeetings();
    return NextResponse.json({
      meetings,
      store,
      using_adapter: usingAdapter(),
      bbb_on_vps: false,
      contract: {
        fields: ["externalMeetingId", "joinUrl", "scheduleStart", "scheduleEnd", "recordingRef"],
        events: ["meeting.scheduled", "session.start", "session.end"],
        sor: { join: "lms", announce: "cms/lk", notify: "voronka", money: "crm" },
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "backend error" },
      { status: 502 },
    );
  }
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
  try {
    const { meeting, store } = await backendCreateMeeting({
      title: body.title.trim(),
      scheduleStart: body.scheduleStart,
      scheduleEnd: body.scheduleEnd,
      externalMeetingId: body.externalMeetingId,
    });
    return NextResponse.json(
      { meeting, store, event: { type: "meeting.scheduled", meeting_id: meeting.id } },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "backend error" },
      { status: 502 },
    );
  }
}

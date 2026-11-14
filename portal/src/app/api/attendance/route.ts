import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { attendanceEventPayload, listAttendance, recordAttendance } from "@/lib/store";

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "staff") {
    return NextResponse.json({ error: "Только staff" }, { status: 403 });
  }
  const meetingId = new URL(req.url).searchParams.get("meetingId") || undefined;
  return NextResponse.json({
    attendance: listAttendance(meetingId),
    consumer: "crm RO analytics (CRM-7); LMS keeps academic journal",
  });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== "staff") {
    return NextResponse.json({ error: "Только staff" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    meetingId?: string;
    subject?: string;
    email?: string;
    durationSeconds?: number;
    shareOfSession?: number;
    eventId?: string;
  };
  if (!body.meetingId || !body.subject || !body.email || !body.eventId) {
    return NextResponse.json({ error: "meetingId, subject, email, eventId" }, { status: 422 });
  }
  const result = recordAttendance({
    meetingId: body.meetingId,
    subject: body.subject,
    email: body.email,
    durationSeconds: body.durationSeconds ?? 0,
    shareOfSession: body.shareOfSession ?? 0,
    eventId: body.eventId,
  });
  if (!result) return NextResponse.json({ error: "meeting not found" }, { status: 404 });
  return NextResponse.json(
    {
      attendance: result.record,
      duplicate: result.duplicate,
      outbound_event: attendanceEventPayload(result.record),
    },
    { status: result.duplicate ? 200 : 201 },
  );
}

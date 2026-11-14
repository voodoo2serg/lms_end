import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listSparks, recordSpark, sparkEventPayload } from "@/lib/store";

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const meetingId = new URL(req.url).searchParams.get("meetingId") || undefined;
  return NextResponse.json({
    sparks: listSparks(meetingId),
    note: "Огонечки = feedback moments, не оценка курса OpenOlat",
  });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    meetingId?: string;
    note?: string;
    eventId?: string;
  };
  if (!body.meetingId || !body.eventId) {
    return NextResponse.json({ error: "meetingId, eventId" }, { status: 422 });
  }
  const result = recordSpark({
    meetingId: body.meetingId,
    actor: user.email,
    note: body.note,
    eventId: body.eventId,
  });
  if (!result) return NextResponse.json({ error: "meeting not found" }, { status: 404 });
  return NextResponse.json(
    {
      spark: result.spark,
      duplicate: result.duplicate,
      outbound_event: sparkEventPayload(result.spark),
    },
    { status: result.duplicate ? 200 : 201 },
  );
}

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { backendListAttendance, backendRecordAttendance } from "@/lib/meetings-backend";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user || user.role !== "staff") {
    return NextResponse.json({ error: "Только staff" }, { status: 403 });
  }
  const { id } = await ctx.params;
  try {
    const result = await backendListAttendance(id);
    if (!result) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({
      ...result,
      consumer: "crm RO analytics (CRM-7); LMS keeps academic journal",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "backend error" },
      { status: 502 },
    );
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user || user.role !== "staff") {
    return NextResponse.json({ error: "Только staff" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    subject?: string;
    email?: string;
    durationSeconds?: number;
    shareOfSession?: number;
    eventId?: string;
  };
  if (!body.subject || !body.email || !body.eventId) {
    return NextResponse.json({ error: "subject, email, eventId" }, { status: 422 });
  }
  try {
    const result = await backendRecordAttendance({
      meetingId: id,
      subject: body.subject,
      email: body.email,
      durationSeconds: body.durationSeconds ?? 0,
      shareOfSession: body.shareOfSession ?? 0,
      eventId: body.eventId,
    });
    if (!result) return NextResponse.json({ error: "meeting not found" }, { status: 404 });
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "backend error" },
      { status: 502 },
    );
  }
}

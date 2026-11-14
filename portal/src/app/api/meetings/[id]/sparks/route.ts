import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { backendListSparks, backendRecordSpark } from "@/lib/meetings-backend";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const { id } = await ctx.params;
  return NextResponse.json({
    sparks: await backendListSparks(id),
    note: "Огонечки = feedback moments, не оценка курса OpenOlat",
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { note?: string; eventId?: string };
  if (!body.eventId) {
    return NextResponse.json({ error: "eventId" }, { status: 422 });
  }
  try {
    const result = await backendRecordSpark({
      meetingId: id,
      actor: user.email,
      note: body.note,
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

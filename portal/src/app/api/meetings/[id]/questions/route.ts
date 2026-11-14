import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { backendAddQuestion, backendGetMeeting } from "@/lib/meetings-backend";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const row = await backendGetMeeting(id);
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ questions: row.questions, store: row.store });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "backend error" },
      { status: 502 },
    );
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { body?: string };
  if (!body.body?.trim()) {
    return NextResponse.json({ error: "body required" }, { status: 422 });
  }
  try {
    const result = await backendAddQuestion(id, body.body.trim(), user.email);
    if (!result) return NextResponse.json({ error: "meeting not found" }, { status: 404 });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "backend error" },
      { status: 502 },
    );
  }
}

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { addQuestion, listQuestions } from "@/lib/store";

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const meetingId = new URL(req.url).searchParams.get("meetingId");
  if (!meetingId) return NextResponse.json({ error: "meetingId" }, { status: 422 });
  return NextResponse.json({ questions: listQuestions(meetingId) });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    meetingId?: string;
    body?: string;
  };
  if (!body.meetingId || !body.body?.trim()) {
    return NextResponse.json({ error: "meetingId + body" }, { status: 422 });
  }
  const q = addQuestion(body.meetingId, body.body, user.email);
  if (!q) return NextResponse.json({ error: "meeting not found" }, { status: 404 });
  return NextResponse.json({ question: q }, { status: 201 });
}

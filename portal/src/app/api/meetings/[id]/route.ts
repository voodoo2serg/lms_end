import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getMeeting, listQuestions } from "@/lib/store";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const { id } = await ctx.params;
  const meeting = getMeeting(id);
  if (!meeting) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ meeting, questions: listQuestions(id) });
}

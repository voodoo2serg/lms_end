import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { backendSession } from "@/lib/meetings-backend";

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
  try {
    const result = await backendSession(id, body.action);
    if (!result) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "backend error" },
      { status: 502 },
    );
  }
}

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { backendGetMeeting } from "@/lib/meetings-backend";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const row = await backendGetMeeting(id);
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "backend error" },
      { status: 502 },
    );
  }
}

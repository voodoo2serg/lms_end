import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { listEnrollments } from "@/lib/store";

export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== "staff") {
    return NextResponse.json({ error: "Только staff" }, { status: 403 });
  }
  return NextResponse.json({
    enrollments: listEnrollments(),
    note: "Нет кнопки создания Robokassa order — деньги в voronka.",
  });
}

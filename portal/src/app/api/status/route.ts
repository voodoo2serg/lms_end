import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { launchState, probeAdapter } from "@/lib/lms-end";
import { listEnrollments } from "@/lib/store";

export async function GET() {
  const user = await currentUser();
  const adapter = await probeAdapter();
  const enrollments = listEnrollments();
  const hasActive =
    user?.role === "learner"
      ? enrollments.some((e) => e.email.toLowerCase() === user.email.toLowerCase() && e.state === "active")
      : enrollments.some((e) => e.state === "active");

  const state = launchState({
    adapterConfigured: adapter.configured,
    adapterHealthy: adapter.healthy,
    hasActiveEnrollment: hasActive,
  });

  return NextResponse.json({
    launch_state: state,
    adapter,
    handoff_allowed: state === "ready",
    message:
      state === "lms_off"
        ? "Учебная система ещё не подключена (adapter / OpenOlat выключены)."
        : state === "no_access"
          ? "Система доступна, но у вас нет активного доступа к курсу."
          : "Можно перейти в OpenOlat (handoff).",
  });
}

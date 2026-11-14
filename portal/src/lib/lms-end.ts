import type { EnrollmentRow, LaunchState } from "./types";

export function lmsEndConfigured(): boolean {
  return Boolean(process.env.LMS_END_URL?.trim());
}

export function launchState(opts: {
  adapterConfigured: boolean;
  adapterHealthy: boolean;
  hasActiveEnrollment: boolean;
}): LaunchState {
  if (!opts.adapterConfigured || !opts.adapterHealthy) return "lms_off";
  if (!opts.hasActiveEnrollment) return "no_access";
  return "ready";
}

export async function probeAdapter(): Promise<{
  configured: boolean;
  healthy: boolean;
  detail: string;
  accessAuthority?: string;
}> {
  const base = process.env.LMS_END_URL?.trim();
  if (!base) {
    return {
      configured: false,
      healthy: false,
      detail: "LMS_END_URL не задан — портал в stub-режиме (стек OpenOlat/adapter на VPS не обязателен для UI).",
    };
  }
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/health`, {
      signal: AbortSignal.timeout(4000),
      headers: process.env.LMS_END_TOKEN
        ? { Authorization: `Bearer ${process.env.LMS_END_TOKEN}` }
        : undefined,
    });
    if (!res.ok) {
      return { configured: true, healthy: false, detail: `health HTTP ${res.status}` };
    }
    const body = (await res.json()) as { status?: string; access_authority?: string };
    const healthy = body.status === "ok" || body.status === "degraded";
    return {
      configured: true,
      healthy,
      detail: `adapter status=${body.status ?? "unknown"}`,
      accessAuthority: body.access_authority,
    };
  } catch (err) {
    return {
      configured: true,
      healthy: false,
      detail: err instanceof Error ? err.message : "probe failed",
    };
  }
}

/** Optional future: staff enrollment list from adapter admin. Stub until LMS-20 cutover. */
export async function fetchEnrollmentsFromAdapter(): Promise<EnrollmentRow[] | null> {
  if (!lmsEndConfigured()) return null;
  // Adapter does not yet expose a public staff enrollment list; keep portal store.
  return null;
}

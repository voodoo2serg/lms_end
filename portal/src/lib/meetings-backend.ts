/**
 * Single meeting store gateway: local in-process store OR adapter /api/meetings/*
 * (LMS_END_URL). UI must only call nested /api/meetings/... paths.
 */
import {
  addQuestion,
  getMeeting,
  listAttendance,
  listMeetings,
  listQuestions,
  listSparks,
  recordAttendance,
  recordSpark,
  setSession,
  upsertMeeting,
  attendanceEventPayload,
  sparkEventPayload,
} from "./store";
import type { AttendanceRecord, Meeting, Question, Spark } from "./types";

function adapterBase(): string | null {
  const base = process.env.LMS_END_URL?.trim();
  return base ? base.replace(/\/$/, "") : null;
}

function adapterHeaders(): HeadersInit {
  const token =
    process.env.LMS_END_TOKEN?.trim() ||
    process.env.MEETINGS_API_TOKEN?.trim() ||
    "";
  return {
    "content-type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function adapterFetch(path: string, init?: RequestInit) {
  const base = adapterBase();
  if (!base) throw new Error("adapter not configured");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...adapterHeaders(), ...(init?.headers || {}) },
    signal: AbortSignal.timeout(8000),
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { error: text };
  }
  return { ok: res.ok, status: res.status, body };
}

export function usingAdapter(): boolean {
  return Boolean(adapterBase());
}

export async function backendListMeetings(): Promise<{ meetings: Meeting[]; store: string }> {
  if (!adapterBase()) {
    return { meetings: listMeetings(), store: "portal_local" };
  }
  const r = await adapterFetch("/api/meetings");
  if (!r.ok) throw new Error(`adapter list meetings ${r.status}`);
  const body = r.body as { meetings: Meeting[] };
  return { meetings: body.meetings || [], store: "lms_end_adapter" };
}

export async function backendCreateMeeting(input: {
  title: string;
  scheduleStart?: string;
  scheduleEnd?: string;
  externalMeetingId?: string;
}): Promise<{ meeting: Meeting; store: string }> {
  if (!adapterBase()) {
    return {
      meeting: upsertMeeting({ ...input, mediaPlane: "stub" }),
      store: "portal_local",
    };
  }
  const r = await adapterFetch("/api/meetings", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(`adapter create meeting ${r.status}`);
  return { meeting: (r.body as { meeting: Meeting }).meeting, store: "lms_end_adapter" };
}

export async function backendGetMeeting(id: string): Promise<{
  meeting: Meeting;
  questions: Question[];
  store: string;
} | null> {
  if (!adapterBase()) {
    const meeting = getMeeting(id);
    if (!meeting) return null;
    return { meeting, questions: listQuestions(id), store: "portal_local" };
  }
  const r = await adapterFetch(`/api/meetings/${encodeURIComponent(id)}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`adapter get meeting ${r.status}`);
  const body = r.body as { meeting: Meeting; questions: Question[] };
  return { meeting: body.meeting, questions: body.questions || [], store: "lms_end_adapter" };
}

export async function backendSession(
  id: string,
  action: "start" | "end",
): Promise<{ meeting: Meeting; event: unknown; note?: string; store: string } | null> {
  if (!adapterBase()) {
    const meeting = setSession(id, action);
    if (!meeting) return null;
    return {
      meeting,
      event: {
        type: action === "start" ? "session.start" : "session.end",
        kind: action === "start" ? "session.start" : "session.end",
        meeting_id: meeting.id,
      },
      note: "BBB is not installed on the current VPS; joinUrl is stub/external only.",
      store: "portal_local",
    };
  }
  const r = await adapterFetch(`/api/meetings/${encodeURIComponent(id)}/session`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`adapter session ${r.status}`);
  const body = r.body as { meeting: Meeting; event: unknown; note?: string };
  return { ...body, store: "lms_end_adapter" };
}

export async function backendAddQuestion(
  id: string,
  body: string,
  author: string,
): Promise<{ question: Question; store: string } | null> {
  if (!adapterBase()) {
    const q = addQuestion(id, body, author);
    if (!q) return null;
    return { question: q, store: "portal_local" };
  }
  const r = await adapterFetch(`/api/meetings/${encodeURIComponent(id)}/questions`, {
    method: "POST",
    body: JSON.stringify({ body, author }),
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`adapter question ${r.status}`);
  return { question: (r.body as { question: Question }).question, store: "lms_end_adapter" };
}

export async function backendListAttendance(id: string): Promise<{
  attendance: AttendanceRecord[];
  store: string;
} | null> {
  if (!adapterBase()) {
    if (!getMeeting(id)) return null;
    return { attendance: listAttendance(id), store: "portal_local" };
  }
  const r = await adapterFetch(`/api/meetings/${encodeURIComponent(id)}/attendance`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`adapter attendance list ${r.status}`);
  const body = r.body as { attendance: AttendanceRecord[] };
  return { attendance: body.attendance || [], store: "lms_end_adapter" };
}

export async function backendRecordAttendance(input: {
  meetingId: string;
  subject: string;
  email: string;
  durationSeconds: number;
  shareOfSession: number;
  eventId: string;
}): Promise<{
  attendance: AttendanceRecord;
  duplicate: boolean;
  outbound_event: unknown;
  store: string;
} | null> {
  if (!adapterBase()) {
    const result = recordAttendance(input);
    if (!result) return null;
    return {
      attendance: result.record,
      duplicate: result.duplicate,
      outbound_event: attendanceEventPayload(result.record),
      store: "portal_local",
    };
  }
  const r = await adapterFetch(
    `/api/meetings/${encodeURIComponent(input.meetingId)}/attendance`,
    {
      method: "POST",
      body: JSON.stringify({
        subject: input.subject,
        email: input.email,
        duration_seconds: input.durationSeconds,
        share_of_session: input.shareOfSession,
        event_id: input.eventId,
      }),
    },
  );
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`adapter attendance ${r.status}`);
  const body = r.body as {
    attendance: AttendanceRecord;
    duplicate: boolean;
    outbound_event: unknown;
  };
  return { ...body, store: "lms_end_adapter" };
}

export async function backendRecordSpark(input: {
  meetingId: string;
  actor: string;
  note?: string;
  eventId: string;
}): Promise<{
  spark: Spark;
  duplicate: boolean;
  outbound_event: unknown;
  store: string;
} | null> {
  if (!adapterBase()) {
    const result = recordSpark(input);
    if (!result) return null;
    return {
      spark: result.spark,
      duplicate: result.duplicate,
      outbound_event: sparkEventPayload(result.spark),
      store: "portal_local",
    };
  }
  const r = await adapterFetch(`/api/meetings/${encodeURIComponent(input.meetingId)}/sparks`, {
    method: "POST",
    body: JSON.stringify({
      actor: input.actor,
      note: input.note,
      event_id: input.eventId,
    }),
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`adapter spark ${r.status}`);
  const body = r.body as { spark: Spark; duplicate: boolean; outbound_event: unknown };
  return { ...body, store: "lms_end_adapter" };
}

export async function backendListSparks(id: string): Promise<Spark[]> {
  if (!adapterBase()) return listSparks(id);
  // Adapter has no list-sparks endpoint yet; sparks come from POST responses / get meeting.
  return [];
}

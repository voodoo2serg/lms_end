/**
 * In-process stub store for BBB/meeting UI without a media plane.
 * Idempotent event ids for attendance/sparks. Not a shared DB with CRM.
 */
import { randomUUID } from "crypto";
import type { AttendanceRecord, EnrollmentRow, Meeting, Question, Spark } from "./types";

function iso(d = new Date()): string {
  return d.toISOString();
}

function seedMeetings(): Meeting[] {
  const start = new Date(Date.now() + 2 * 3600_000);
  const end = new Date(start.getTime() + 90 * 60_000);
  return [
    {
      id: "mtg_demo_1",
      title: "Вводный вебинар (stub)",
      externalMeetingId: "ext-demo-001",
      joinUrl: null,
      scheduleStart: start.toISOString(),
      scheduleEnd: end.toISOString(),
      recordingRef: null,
      mediaPlane: "stub",
      status: "scheduled",
      sessionStartedAt: null,
      sessionEndedAt: null,
    },
  ];
}

function seedEnrollments(): EnrollmentRow[] {
  return [
    {
      subject: "kc-sub-anna",
      email: "anna@example.ru",
      course_id: "pr",
      course_title: "Программа PR",
      state: "active",
      sync_error: null,
      updated_at: iso(),
    },
    {
      subject: "kc-sub-boris",
      email: "boris@example.ru",
      course_id: "pr",
      course_title: "Программа PR",
      state: "desired",
      sync_error: "OpenOlat group sync pending (adapter not live)",
      updated_at: iso(),
    },
    {
      subject: "kc-sub-clara",
      email: "clara@example.ru",
      course_id: "club",
      course_title: "Клуб",
      state: "revoked",
      sync_error: null,
      updated_at: iso(),
    },
  ];
}

type Store = {
  meetings: Meeting[];
  questions: Question[];
  attendance: AttendanceRecord[];
  sparks: Spark[];
  enrollments: EnrollmentRow[];
  seenEventIds: Set<string>;
};

const g = globalThis as unknown as { __lmsPortalStore?: Store };

function store(): Store {
  if (!g.__lmsPortalStore) {
    g.__lmsPortalStore = {
      meetings: seedMeetings(),
      questions: [],
      attendance: [],
      sparks: [],
      enrollments: seedEnrollments(),
      seenEventIds: new Set(),
    };
  }
  return g.__lmsPortalStore;
}

export function listMeetings(): Meeting[] {
  return store().meetings.map((m) => ({ ...m }));
}

export function getMeeting(id: string): Meeting | null {
  return store().meetings.find((m) => m.id === id) ?? null;
}

export function upsertMeeting(input: Partial<Meeting> & { title: string }): Meeting {
  const s = store();
  if (input.id) {
    const idx = s.meetings.findIndex((m) => m.id === input.id);
    if (idx >= 0) {
      s.meetings[idx] = { ...s.meetings[idx], ...input } as Meeting;
      return { ...s.meetings[idx] };
    }
  }
  const row: Meeting = {
    id: input.id || `mtg_${randomUUID().slice(0, 8)}`,
    title: input.title,
    externalMeetingId: input.externalMeetingId || `ext-${randomUUID().slice(0, 8)}`,
    joinUrl: input.joinUrl ?? null,
    scheduleStart: input.scheduleStart || iso(),
    scheduleEnd: input.scheduleEnd || iso(new Date(Date.now() + 3600_000)),
    recordingRef: input.recordingRef ?? null,
    mediaPlane: input.mediaPlane || "stub",
    status: input.status || "scheduled",
    sessionStartedAt: input.sessionStartedAt ?? null,
    sessionEndedAt: input.sessionEndedAt ?? null,
  };
  s.meetings.push(row);
  return { ...row };
}

export function setSession(meetingId: string, action: "start" | "end"): Meeting | null {
  const m = store().meetings.find((x) => x.id === meetingId);
  if (!m) return null;
  if (action === "start") {
    m.status = "live";
    m.sessionStartedAt = iso();
    m.sessionEndedAt = null;
    // Join URL stays stub — no BBB install. Document external media plane.
    if (!m.joinUrl) {
      m.joinUrl = `https://bbb.example.invalid/join?meeting=${encodeURIComponent(m.externalMeetingId)}&stub=1`;
    }
  } else {
    m.status = "ended";
    m.sessionEndedAt = iso();
  }
  return { ...m };
}

export function listQuestions(meetingId: string): Question[] {
  return store().questions.filter((q) => q.meetingId === meetingId).map((q) => ({ ...q }));
}

export function addQuestion(meetingId: string, body: string, author: string): Question | null {
  if (!getMeeting(meetingId)) return null;
  const q: Question = {
    id: `q_${randomUUID().slice(0, 8)}`,
    meetingId,
    body: body.trim().slice(0, 2000),
    author: author.slice(0, 120),
    createdAt: iso(),
    answered: false,
  };
  store().questions.push(q);
  return { ...q };
}

export function listEnrollments(): EnrollmentRow[] {
  return store().enrollments.map((e) => ({ ...e }));
}

export function listAttendance(meetingId?: string): AttendanceRecord[] {
  const rows = store().attendance;
  return (meetingId ? rows.filter((a) => a.meetingId === meetingId) : rows).map((a) => ({ ...a }));
}

export function recordAttendance(input: {
  meetingId: string;
  subject: string;
  email: string;
  durationSeconds: number;
  shareOfSession: number;
  eventId: string;
  joinedAt?: string;
  leftAt?: string | null;
}): { record: AttendanceRecord; duplicate: boolean } | null {
  if (!getMeeting(input.meetingId)) return null;
  const s = store();
  if (s.seenEventIds.has(input.eventId)) {
    const existing = s.attendance.find((a) => a.eventId === input.eventId)!;
    return { record: { ...existing }, duplicate: true };
  }
  s.seenEventIds.add(input.eventId);
  const record: AttendanceRecord = {
    id: `att_${randomUUID().slice(0, 8)}`,
    meetingId: input.meetingId,
    subject: input.subject,
    email: input.email,
    joinedAt: input.joinedAt || iso(),
    leftAt: input.leftAt ?? null,
    durationSeconds: Math.max(0, Math.floor(input.durationSeconds)),
    shareOfSession: Math.min(1, Math.max(0, input.shareOfSession)),
    eventId: input.eventId,
  };
  s.attendance.push(record);
  return { record: { ...record }, duplicate: false };
}

export function listSparks(meetingId?: string): Spark[] {
  const rows = store().sparks;
  return (meetingId ? rows.filter((x) => x.meetingId === meetingId) : rows).map((x) => ({ ...x }));
}

export function recordSpark(input: {
  meetingId: string;
  actor: string;
  note?: string;
  eventId: string;
  timestamp?: string;
}): { spark: Spark; duplicate: boolean } | null {
  if (!getMeeting(input.meetingId)) return null;
  const s = store();
  if (s.seenEventIds.has(input.eventId)) {
    const existing = s.sparks.find((x) => x.eventId === input.eventId)!;
    return { spark: { ...existing }, duplicate: true };
  }
  s.seenEventIds.add(input.eventId);
  const spark: Spark = {
    id: `spk_${randomUUID().slice(0, 8)}`,
    meetingId: input.meetingId,
    actor: input.actor.slice(0, 120),
    timestamp: input.timestamp || iso(),
    note: (input.note || "огонёк").slice(0, 200),
    eventId: input.eventId,
  };
  s.sparks.push(spark);
  return { spark: { ...spark }, duplicate: false };
}

/** Pure helpers for unit tests / wire docs */
export function attendanceEventPayload(record: AttendanceRecord) {
  return {
    type: "attendance.recorded",
    kind: "attendance.recorded",
    event_id: record.eventId,
    idempotency_key: record.eventId,
    source: "lms_portal",
    data: {
      meeting_id: record.meetingId,
      subject: record.subject,
      email: record.email,
      duration_seconds: record.durationSeconds,
      share_of_session: record.shareOfSession,
      joined_at: record.joinedAt,
      left_at: record.leftAt,
    },
  };
}

export function sparkEventPayload(spark: Spark) {
  return {
    type: "feedback.spark",
    kind: "feedback.spark",
    event_id: spark.eventId,
    idempotency_key: spark.eventId,
    source: "lms_portal",
    data: {
      meeting_id: spark.meetingId,
      actor: spark.actor,
      timestamp: spark.timestamp,
      note: spark.note,
    },
  };
}

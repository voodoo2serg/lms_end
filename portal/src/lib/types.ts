/** LMS portal domain types — align with lms_end meeting stubs / wire events. */

export type Role = "staff" | "learner";

export type SessionUser = {
  email: string;
  role: Role;
  name: string;
};

/** LMS-24 launch empty-states */
export type LaunchState = "lms_off" | "no_access" | "ready";

export type EnrollmentRow = {
  subject: string;
  email: string;
  course_id: string;
  course_title: string;
  state: "desired" | "active" | "revoked" | "pending";
  sync_error: string | null;
  updated_at: string;
};

export type Meeting = {
  id: string;
  title: string;
  externalMeetingId: string;
  joinUrl: string | null;
  scheduleStart: string;
  scheduleEnd: string;
  recordingRef: string | null;
  /** media plane is external — never current VPS */
  mediaPlane: "stub" | "external";
  status: "scheduled" | "live" | "ended";
  sessionStartedAt: string | null;
  sessionEndedAt: string | null;
};

export type Question = {
  id: string;
  meetingId: string;
  body: string;
  author: string;
  createdAt: string;
  answered: boolean;
};

export type AttendanceRecord = {
  id: string;
  meetingId: string;
  subject: string;
  email: string;
  joinedAt: string;
  leftAt: string | null;
  durationSeconds: number;
  shareOfSession: number;
  eventId: string;
};

/** «Огонечки» — feedback sparks, not OpenOlat grades */
export type Spark = {
  id: string;
  meetingId: string;
  actor: string;
  timestamp: string;
  note: string;
  eventId: string;
};

export type PortalLink = {
  id: string;
  label: string;
  href: string;
};

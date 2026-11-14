import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  attendanceEventPayload,
  getMeeting,
  listMeetings,
  recordAttendance,
  recordSpark,
  setSession,
  sparkEventPayload,
  upsertMeeting,
} from "../src/lib/store";
import { launchState } from "../src/lib/lms-end";

describe("launchState LMS-24", () => {
  it("distinguishes off / no_access / ready", () => {
    assert.equal(
      launchState({ adapterConfigured: false, adapterHealthy: false, hasActiveEnrollment: true }),
      "lms_off",
    );
    assert.equal(
      launchState({ adapterConfigured: true, adapterHealthy: true, hasActiveEnrollment: false }),
      "no_access",
    );
    assert.equal(
      launchState({ adapterConfigured: true, adapterHealthy: true, hasActiveEnrollment: true }),
      "ready",
    );
  });
});

describe("meetings + attendance idempotency", () => {
  it("creates meeting and session stubs without BBB", () => {
    const m = upsertMeeting({ title: "Test webinar" });
    assert.ok(m.externalMeetingId);
    assert.equal(m.mediaPlane, "stub");
    assert.equal(m.joinUrl, null);
    const live = setSession(m.id, "start");
    assert.ok(live);
    assert.equal(live.status, "live");
    assert.ok(live.joinUrl?.includes("stub=1"));
    assert.ok(getMeeting(m.id));
    assert.ok(listMeetings().length >= 1);
  });

  it("attendance and sparks are idempotent by eventId", () => {
    const m = upsertMeeting({ title: "Attn" });
    const a1 = recordAttendance({
      meetingId: m.id,
      subject: "sub1",
      email: "a@ex.ru",
      durationSeconds: 100,
      shareOfSession: 0.5,
      eventId: "evt-att-1",
    });
    const a2 = recordAttendance({
      meetingId: m.id,
      subject: "sub1",
      email: "a@ex.ru",
      durationSeconds: 999,
      shareOfSession: 1,
      eventId: "evt-att-1",
    });
    assert.ok(a1 && a2);
    assert.equal(a1.duplicate, false);
    assert.equal(a2.duplicate, true);
    assert.equal(a2.record.durationSeconds, 100);
    const payload = attendanceEventPayload(a1.record);
    assert.equal(payload.type, "attendance.recorded");
    assert.equal(payload.kind, "attendance.recorded");
    assert.equal(payload.event_id, payload.idempotency_key);

    const s1 = recordSpark({ meetingId: m.id, actor: "staff", eventId: "evt-spk-1" });
    const s2 = recordSpark({ meetingId: m.id, actor: "staff", eventId: "evt-spk-1" });
    assert.ok(s1 && s2);
    assert.equal(s1.duplicate, false);
    assert.equal(s2.duplicate, true);
    assert.equal(sparkEventPayload(s1.spark).type, "feedback.spark");
  });
});

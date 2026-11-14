"use client";

import { useEffect, useState } from "react";
import type { AttendanceRecord, Meeting } from "@/lib/types";

export function AttendanceClient() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [rows, setRows] = useState<AttendanceRecord[]>([]);
  const [meetingId, setMeetingId] = useState("");
  const [email, setEmail] = useState("anna@example.ru");
  const [subject, setSubject] = useState("kc-sub-anna");
  const [duration, setDuration] = useState(1800);
  const [share, setShare] = useState(0.75);
  const [msg, setMsg] = useState("");

  async function refresh(mid?: string) {
    const m = await fetch("/api/meetings").then((r) => r.json());
    setMeetings(m.meetings || []);
    if (!meetingId && m.meetings?.[0]) setMeetingId(m.meetings[0].id);
    const id = mid || meetingId || m.meetings?.[0]?.id;
    if (!id) {
      setRows([]);
      return;
    }
    const a = await fetch(`/api/meetings/${encodeURIComponent(id)}/attendance`).then((r) =>
      r.json(),
    );
    setRows(a.attendance || []);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const eventId = `att_${meetingId}_${subject}_${duration}`;
    const res = await fetch(`/api/meetings/${encodeURIComponent(meetingId)}/attendance`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subject,
        email,
        durationSeconds: duration,
        shareOfSession: share,
        eventId,
      }),
    });
    const data = await res.json();
    setMsg(
      data.duplicate
        ? "Идемпотентный повтор (тот же eventId)"
        : `Записано → ${data.outbound_event?.type}`,
    );
    await refresh(meetingId);
  }

  return (
    <>
      <div className="panel">
        <h2>Записать attendance (stub event)</h2>
        <form className="form" onSubmit={submit}>
          <label>
            Встреча
            <select value={meetingId} onChange={(e) => setMeetingId(e.target.value)}>
              {meetings.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Subject
            <input value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </label>
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Длительность (сек)
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </label>
          <label>
            Доля сессии (0…1)
            <input
              type="number"
              step="0.01"
              min={0}
              max={1}
              value={share}
              onChange={(e) => setShare(Number(e.target.value))}
            />
          </label>
          <button className="btn primary" type="submit">
            attendance.recorded
          </button>
        </form>
        {msg ? <p className="muted">{msg}</p> : null}
      </div>

      <div className="panel">
        <h2>Журнал</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Duration</th>
              <th>Share</th>
              <th>eventId</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.email}</td>
                <td>{r.durationSeconds}s</td>
                <td>{Math.round(r.shareOfSession * 100)}%</td>
                <td>
                  <code>{r.eventId}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

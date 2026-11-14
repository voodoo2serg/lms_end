"use client";

import { useCallback, useEffect, useState } from "react";
import type { Meeting, Question } from "@/lib/types";

export function MeetingsClient() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [title, setTitle] = useState("");
  const [qBody, setQBody] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/meetings");
    const data = (await res.json()) as { meetings: Meeting[] };
    setMeetings(data.meetings || []);
    if (!selected && data.meetings?.[0]) setSelected(data.meetings[0].id);
  }, [selected]);

  const loadQuestions = useCallback(async (id: string) => {
    if (!id) return;
    const res = await fetch(`/api/questions?meetingId=${encodeURIComponent(id)}`);
    const data = (await res.json()) as { questions: Question[] };
    setQuestions(data.questions || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadQuestions(selected);
  }, [selected, loadQuestions]);

  async function createMeeting(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      setMsg("Не удалось создать");
      return;
    }
    setTitle("");
    setMsg("Встреча создана (meeting.scheduled stub)");
    await load();
  }

  async function session(action: "start" | "end") {
    if (!selected) return;
    const res = await fetch(`/api/meetings/${selected}/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setMsg(data.note || `session.${action}`);
    await load();
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    await fetch("/api/questions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ meetingId: selected, body: qBody }),
    });
    setQBody("");
    await loadQuestions(selected);
  }

  async function spark() {
    if (!selected) return;
    const eventId = `spark_${Date.now()}`;
    const res = await fetch("/api/sparks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ meetingId: selected, eventId, note: "огонёк" }),
    });
    const data = await res.json();
    setMsg(data.duplicate ? "дубликат eventId" : "feedback.spark записан");
  }

  const current = meetings.find((m) => m.id === selected);

  return (
    <>
      <div className="panel">
        <h2>Новая встреча</h2>
        <form className="form" onSubmit={createMeeting}>
          <label>
            Название
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <button className="btn primary" type="submit">
            Создать stub
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>Список</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>externalMeetingId</th>
              <th>Status</th>
              <th>joinUrl</th>
            </tr>
          </thead>
          <tbody>
            {meetings.map((m) => (
              <tr key={m.id}>
                <td>
                  <button type="button" className="btn" onClick={() => setSelected(m.id)}>
                    {m.title}
                  </button>
                </td>
                <td>
                  <code>{m.externalMeetingId}</code>
                </td>
                <td>
                  <span className={`badge ${m.status === "live" ? "ok" : "off"}`}>{m.status}</span>
                </td>
                <td className="muted">{m.joinUrl || "— (нет BBB на VPS)"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {current ? (
        <div className="panel">
          <h2>Сессия · {current.title}</h2>
          <p className="muted">
            Timing: start {current.sessionStartedAt || "—"} · end{" "}
            {current.sessionEndedAt || "—"} · mediaPlane={current.mediaPlane}
          </p>
          <div className="row">
            <button type="button" className="btn primary" onClick={() => session("start")}>
              session.start
            </button>
            <button type="button" className="btn" onClick={() => session("end")}>
              session.end
            </button>
            <button type="button" className="btn" onClick={spark}>
              Огонёк
            </button>
          </div>
          <form className="form" style={{ marginTop: "1rem" }} onSubmit={ask}>
            <label>
              Вопрос в эфир (Q&A queue)
              <textarea value={qBody} onChange={(e) => setQBody(e.target.value)} rows={2} required />
            </label>
            <button className="btn" type="submit">
              Добавить вопрос
            </button>
          </form>
          <ul>
            {questions.map((q) => (
              <li key={q.id}>
                <strong>{q.author}</strong>: {q.body}{" "}
                <span className="muted">{new Date(q.createdAt).toLocaleString("ru-RU")}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {msg ? <p className="muted">{msg}</p> : null}
    </>
  );
}

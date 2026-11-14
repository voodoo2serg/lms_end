import { probeAdapter } from "@/lib/lms-end";
import { listAttendance, listMeetings, listSparks } from "@/lib/store";

export default async function StaffHome() {
  const adapter = await probeAdapter();
  const meetings = listMeetings();
  const attendance = listAttendance();
  const sparks = listSparks();

  return (
    <>
      <h1>Обзор</h1>
      <p className="lead">
        Staff shell для авторства/статуса adapter и встреч. Без Robokassa и без
        установки BBB на VPS.
      </p>
      <div className="panel">
        <h2>Adapter / OpenOlat</h2>
        <p>
          <span className={`badge ${adapter.healthy ? "ok" : "off"}`}>
            {adapter.configured ? (adapter.healthy ? "reachable" : "down") : "stub"}
          </span>{" "}
          <span className="muted">{adapter.detail}</span>
        </p>
        {adapter.accessAuthority ? (
          <p className="muted">ACCESS_AUTHORITY={adapter.accessAuthority}</p>
        ) : null}
      </div>
      <div className="panel">
        <h2>Встречи (stub)</h2>
        <p className="muted">
          {meetings.length} встреч · attendance events {attendance.length} · огоньки{" "}
          {sparks.length}
        </p>
        <div className="row">
          <a className="btn" href="/staff/meetings">
            Встречи
          </a>
          <a className="btn" href="/staff/enrollments">
            Enrollment
          </a>
        </div>
      </div>
    </>
  );
}

import { listEnrollments } from "@/lib/store";

export default function EnrollmentsPage() {
  const rows = listEnrollments();
  return (
    <>
      <h1>Enrollment</h1>
      <p className="lead">
        Статус выдачи subject×course от voronka (LMS-23). Ошибки sync без секретов.
        Создать заказ Robokassa из LMS нельзя.
      </p>
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Email</th>
              <th>Курс</th>
              <th>State</th>
              <th>Sync</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={`${e.subject}-${e.course_id}-${e.state}`}>
                <td>
                  <code>{e.subject}</code>
                </td>
                <td>{e.email}</td>
                <td>
                  {e.course_title} <span className="muted">({e.course_id})</span>
                </td>
                <td>
                  <span
                    className={`badge ${
                      e.state === "active" ? "ok" : e.state === "revoked" ? "danger" : "warn"
                    }`}
                  >
                    {e.state}
                  </span>
                </td>
                <td className="muted">{e.sync_error || "ok"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

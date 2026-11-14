import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { chromeLinks } from "@/lib/portals";
import { launchState, probeAdapter } from "@/lib/lms-end";
import { listEnrollments } from "@/lib/store";
import { Chrome } from "@/components/Chrome";

export default async function LearnerPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const adapter = await probeAdapter();
  const mine = listEnrollments().filter(
    (e) => e.email.toLowerCase() === user.email.toLowerCase() || user.role === "staff",
  );
  const hasActive = mine.some((e) => e.state === "active");
  const state = launchState({
    adapterConfigured: adapter.configured,
    adapterHealthy: adapter.healthy,
    hasActiveEnrollment: hasActive,
  });

  const badge =
    state === "lms_off" ? "off" : state === "no_access" ? "warn" : "ok";
  const title =
    state === "lms_off"
      ? "LMS выключен"
      : state === "no_access"
        ? "Нет доступа"
        : "Готово к запуску";

  return (
    <main className="main">
      <Chrome user={user} links={chromeLinks(user.role)} />
      <h1>Моё обучение</h1>
      <p className="lead">
        Три честных состояния (LMS-24): система выключена · нет доступа · ready.
        Handoff ticket только при ready.
      </p>

      <div className="panel state-block">
        <span className={`badge ${badge}`}>{state}</span>
        <h2 style={{ marginTop: "0.5rem" }}>{title}</h2>
        <p className="muted">{adapter.detail}</p>
        {state === "ready" ? (
          <a className="btn primary" href="https://solo-pr.ru/account">
            Продолжить в OpenOlat (через ЛК)
          </a>
        ) : (
          <button className="btn" type="button" disabled>
            Handoff недоступен
          </button>
        )}
      </div>

      <div className="panel">
        <h2>Доступы</h2>
        {mine.length === 0 ? (
          <p className="muted">Нет записей enrollment для этого email (stub store).</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Курс</th>
                <th>Статус</th>
                <th>Ошибка sync</th>
              </tr>
            </thead>
            <tbody>
              {mine.map((e) => (
                <tr key={`${e.subject}-${e.course_id}`}>
                  <td>{e.course_title}</td>
                  <td>
                    <span className={`badge ${e.state === "active" ? "ok" : e.state === "revoked" ? "danger" : "warn"}`}>
                      {e.state}
                    </span>
                  </td>
                  <td className="muted">{e.sync_error || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

import { currentUser } from "@/lib/auth";
import { chromeLinks, PORTAL_HOST } from "@/lib/portals";
import { Chrome } from "@/components/Chrome";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const user = await currentUser();
  if (user?.role === "staff") redirect("/staff");
  if (user?.role === "learner") redirect("/learner");

  return (
    <main className="hero-home">
      <Chrome user={null} links={chromeLinks(null)} />
      <p className="muted">{PORTAL_HOST}</p>
      <h1>LMS</h1>
      <p className="lead">
        Учебная среда Solo PR. OpenOlat и Keycloak живут в{" "}
        <code>lms_end</code>; этот портал — тонкий staff/learner shell и BBB-заглушки
        без медиа-сервера на текущем VPS.
      </p>
      <div className="row">
        <a className="btn primary" href="/login">
          Войти
        </a>
        <a className="btn" href="https://solo-pr.ru/">
          На сайт
        </a>
      </div>
      <p className="muted" style={{ marginTop: "1.5rem" }}>
        Сейчас host может показывать stub до cutover OpenOlat (LMS-20). BBB не
        устанавливается на 213.171.9.30.
      </p>
    </main>
  );
}

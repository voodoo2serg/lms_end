import { MeetingsClient } from "./MeetingsClient";

export default function MeetingsPage() {
  return (
    <>
      <h1>Встречи / BBB stubs</h1>
      <p className="lead">
        LMS-21: модель встречи (join URL, Q&A, timing) без инсталла BBB.
        Join SoR = LMS; анонс = CMS/ЛК; notify = voronka; money = CRM. Media plane —
        внешний host (future ops).
      </p>
      <MeetingsClient />
    </>
  );
}

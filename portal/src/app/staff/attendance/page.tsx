import { AttendanceClient } from "./AttendanceClient";

export default function AttendancePage() {
  return (
    <>
      <h1>Посещаемость и огоньки</h1>
      <p className="lead">
        LMS-22: идемпотентные события attendance (who, duration, share) и feedback.spark.
        CRM потребляет RO; LMS хранит academic journal. Shared DB нет.
      </p>
      <AttendanceClient />
    </>
  );
}

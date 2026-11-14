import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { chromeLinks, PORTAL_HOST } from "@/lib/portals";
import { Chrome } from "@/components/Chrome";
import { StaffNav } from "@/components/StaffNav";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "staff") redirect("/learner");

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          LMS
          <span>{PORTAL_HOST} · staff</span>
        </div>
        <StaffNav />
        <p className="muted">
          SoR: lms_end / OpenOlat. Деньги — voronka. BBB media — вне текущего VPS.
        </p>
      </aside>
      <div className="main">
        <Chrome user={user} links={chromeLinks("staff")} />
        {children}
      </div>
    </div>
  );
}

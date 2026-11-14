"use client";

import type { PortalLink, SessionUser } from "@/lib/types";

export function Chrome({
  user,
  links,
}: {
  user: SessionUser | null;
  links: PortalLink[];
}) {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="chrome">
      <div className="chrome-links">
        {links.map((l) => (
          <a key={l.id} href={l.href}>
            {l.label}
          </a>
        ))}
      </div>
      <div className="row">
        {user ? (
          <>
            <span className="muted">
              {user.name} · {user.role}
            </span>
            <button type="button" className="btn" onClick={logout}>
              Выйти
            </button>
          </>
        ) : (
          <a className="btn" href="/login">
            Войти
          </a>
        )}
      </div>
    </div>
  );
}

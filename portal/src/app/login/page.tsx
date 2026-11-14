"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("lms@solo-pr.ru");
  const [password, setPassword] = useState("changeme");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error || "Ошибка входа");
      return;
    }
    const data = (await res.json()) as { user: { role: string } };
    window.location.href = data.user.role === "staff" ? "/staff" : "/learner";
  }

  return (
    <main className="hero-home">
      <h1>Вход · LMS</h1>
      <p className="lead">
        Stub-login до Keycloak на auth.solo-pr.ru. Staff и ученик — разные учётки
        зоны <code>lms</code>.
      </p>
      <form className="form panel" onSubmit={onSubmit}>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        </label>
        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="badge danger">{error}</p> : null}
        <button className="btn primary" disabled={busy} type="submit">
          {busy ? "…" : "Войти"}
        </button>
        <p className="muted">
          Dev: <code>lms@solo-pr.ru</code> / staff · <code>learner@solo-pr.ru</code> /
          ученик (пароль из .env.example).
        </p>
      </form>
    </main>
  );
}

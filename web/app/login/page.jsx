"use client";
import { useState } from "react";
import { api } from "../../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api.login(email.trim(), password);
      window.location.href = "/"; // full reload so auth state re-initializes
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-brand">
          <span className="logo" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </span>
          <h1 style={{ fontSize: 20, margin: 0 }}>AI Receptionist</h1>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>Sign in to your dashboard</p>
        </div>

        {err && <div className="banner" style={{ marginTop: 16 }}>⚠ {err}</div>}

        <label>Email</label>
        <input type="email" value={email} autoComplete="username"
          onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        <label>Password</label>
        <input type="password" value={password} autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />

        <button type="submit" disabled={busy} style={{ width: "100%", marginTop: 18 }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

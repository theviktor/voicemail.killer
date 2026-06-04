"use client";
import { useState } from "react";
import { api } from "../../lib/api";
import { Icon, BrandMark } from "../Icon";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await api.login(email.trim(), password);
      window.location.href = "/";
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <main className="auth">
      <form className="card auth-card" onSubmit={submit}>
        <div className="auth-brand">
          <div className="brand-mark"><BrandMark /></div>
          <h1 style={{ fontSize: 21, letterSpacing: "-0.03em" }}>Welcome back</h1>
          <p className="muted" style={{ fontSize: "13.5px", marginTop: 5 }}>Sign in to your Vera dashboard</p>
        </div>

        {err && <div className="banner err" style={{ marginBottom: 16 }}><Icon n="alert" /><div>{err}</div></div>}

        <div className="vstack" style={{ gap: 14 }}>
          <label className="field grow"><span className="lbl">Email</span><input type="email" autoComplete="username" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label className="field grow"><span className="lbl">Password</span><input type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <button className="btn block" type="submit" disabled={busy} style={{ marginTop: 6, padding: "11px 15px" }}>{busy ? "Signing in…" : "Sign in"}</button>
        </div>
      </form>
    </main>
  );
}

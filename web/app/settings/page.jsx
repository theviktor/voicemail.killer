"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Icon } from "../Icon";

const VOICES = [
  { id: "james", label: "James", desc: "Conversational, warm" },
  { id: "ivy", label: "Ivy", desc: "Professional, calm" },
  { id: "winter", label: "Winter", desc: "Friendly, bright" },
  { id: "david", label: "David", desc: "Deep, reassuring" },
  { id: "mia", label: "Mia", desc: "Soft, youthful" },
  { id: "sophie", label: "Sophie", desc: "Clear, articulate" },
  { id: "oliver", label: "Oliver", desc: "Narrative, steady" },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [u, setU] = useState(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => { if (user) api.user(user.id).then(setU).catch((e) => setErr(e.message)); }, [user]);
  const set = (f, v) => { setU((p) => ({ ...p, [f]: v })); setSaved(false); };

  async function save() {
    try {
      setU(await api.updateUser(u.id, { ...u, telemarketerTopics: (u.telemarketerTopics || []).filter(Boolean) }));
      setSaved(true);
    } catch (e) { setErr(e.message); }
  }

  if (err) return <main className="page"><div className="banner err"><Icon n="alert" /><div>{err}</div></div></main>;
  if (!u) return <main className="page"><div className="spin">Loading…</div></main>;

  return (
    <main className="page">
      <div className="page-head">
        <div><h1>Settings</h1><p className="sub">How Vera introduces you and handles callers.</p></div>
        <div className="row" style={{ alignItems: "center" }}>
          {saved && <span className="saved"><Icon n="check" />Saved</span>}
          <button className="btn" onClick={save}><Icon n="check" />Save changes</button>
        </div>
      </div>

      <div className="card tight" style={{ marginBottom: 22 }}>
        <div className="card-h"><div><h3>Profile</h3><div className="desc">The basics Vera needs to represent you</div></div></div>
        <div className="card-b vstack">
          <div className="row">
            <label className="field grow"><span className="lbl">Your name</span><input value={u.name || ""} onChange={(e) => set("name", e.target.value)} /></label>
            <label className="field grow"><span className="lbl">Company <span className="hint">· optional</span></span><input value={u.companyName || ""} onChange={(e) => set("companyName", e.target.value)} /></label>
          </div>
          <div style={{ height: 16 }} />
          <label className="field grow"><span className="lbl">Assigned number <span className="hint">· managed by admin</span></span><input className="mono" value={u.twilioNumber || ""} disabled /></label>
          <div style={{ height: 16 }} />
          <label className="field grow"><span className="lbl">Availability <span className="hint">· what Vera tells callers</span></span><input value={u.availability || ""} onChange={(e) => set("availability", e.target.value)} /></label>
          <div style={{ height: 16 }} />
          <label className="field grow"><span className="lbl">Extra instructions <span className="hint">· all callers</span></span><textarea rows={3} value={u.systemPromptAddon || ""} onChange={(e) => set("systemPromptAddon", e.target.value)} /></label>
        </div>
      </div>

      <div className="card tight" style={{ marginBottom: 22 }}>
        <div className="card-h"><div><h3>Voice</h3><div className="desc">The voice callers hear when Vera answers</div></div></div>
        <div className="card-b">
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px,1fr))", gap: 12 }}>
            {VOICES.map((v) => {
              const on = (u.voice || "james") === v.id;
              return (
                <div key={v.id} onClick={() => set("voice", v.id)}
                  style={{ cursor: "pointer", border: "1px solid " + (on ? "var(--accent)" : "var(--border-2)"), boxShadow: on ? "var(--ring)" : "none", borderRadius: "var(--r-md)", padding: 14, display: "flex", alignItems: "center", gap: 11, transition: ".15s", background: "var(--surface)" }}>
                  <span style={{ width: 34, height: 34, borderRadius: 9, display: "grid", placeItems: "center", flexShrink: 0, background: on ? "var(--accent-grad)" : "var(--surface-3)", color: on ? "var(--accent-fg)" : "var(--text-muted)" }}>
                    <Icon n="waveform" style={{ width: 16 }} />
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "13.5px" }}>{v.label}</div>
                    <div className="faint" style={{ fontSize: 12 }}>{v.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card tight">
          <div className="card-h"><div><h3>Alerts</h3><div className="desc">How Vera reaches you about new messages</div></div></div>
          <div className="card-b vstack">
            <label className="field grow"><span className="lbl">Alert email</span><input value={u.alertEmail || ""} onChange={(e) => set("alertEmail", e.target.value)} /></label>
            <div style={{ height: 16 }} />
            <label className="field grow"><span className="lbl">Alert SMS number <span className="hint">· E.164</span></span><input className="mono" value={u.alertPhone || ""} onChange={(e) => set("alertPhone", e.target.value)} /></label>
          </div>
        </div>

        <div className="card tight">
          <div className="card-h"><div><h3>Telemarketers</h3><div className="desc">How Vera screens sales calls</div></div></div>
          <div className="card-b vstack">
            <label className="field grow"><span className="lbl">Topics you're open to <span className="hint">· comma-separated</span></span><input value={(u.telemarketerTopics || []).join(", ")} onChange={(e) => set("telemarketerTopics", e.target.value.split(",").map((s) => s.trim()))} /></label>
            <div style={{ height: 16 }} />
            <label className="field grow"><span className="lbl">Policy for unwanted calls</span><textarea rows={2} value={u.telemarketerPolicy || ""} onChange={(e) => set("telemarketerPolicy", e.target.value)} /></label>
          </div>
        </div>
      </div>
    </main>
  );
}

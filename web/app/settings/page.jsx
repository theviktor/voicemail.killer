"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

const VOICES = ["james", "ivy", "winter", "david", "mia", "sophie", "oliver"];

export default function SettingsPage() {
  const [u, setU] = useState(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.me().then(setU).catch((e) => setErr(e.message));
  }, []);

  function set(field, value) {
    setU((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function save() {
    try {
      const body = { ...u, telemarketerTopics: (u.telemarketerTopics || []).filter(Boolean) };
      setU(await api.updateUser(u.id, body));
      setSaved(true);
    } catch (e) {
      setErr(e.message);
    }
  }

  if (err) return <main className="container"><div className="banner">⚠ {err}</div></main>;
  if (!u) return <main className="container"><div className="spin">Loading…</div></main>;

  return (
    <main className="container">
      <div className="page-head">
        <h1>Settings</h1>
        <p className="sub">How your assistant introduces you and handles callers.</p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Profile</h2>
        <div className="row">
          <div className="field">
            <label>Your name</label>
            <input value={u.name || ""} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="field">
            <label>Company (optional)</label>
            <input value={u.companyName || ""} onChange={(e) => set("companyName", e.target.value)} />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>Assigned Twilio number (E.164)</label>
            <input value={u.twilioNumber || ""} onChange={(e) => set("twilioNumber", e.target.value)} />
          </div>
          <div className="field">
            <label>Agent voice</label>
            <select value={u.voice || "james"} onChange={(e) => set("voice", e.target.value)}>
              {VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <label>Availability (what the agent tells callers)</label>
        <input value={u.availability || ""} onChange={(e) => set("availability", e.target.value)} />
        <label>Extra agent instructions (all callers)</label>
        <textarea rows={3} value={u.systemPromptAddon || ""} onChange={(e) => set("systemPromptAddon", e.target.value)} />
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Alerts</h2>
        <div className="row">
          <div className="field">
            <label>Alert email</label>
            <input value={u.alertEmail || ""} onChange={(e) => set("alertEmail", e.target.value)} />
          </div>
          <div className="field">
            <label>Alert SMS number (E.164)</label>
            <input value={u.alertPhone || ""} onChange={(e) => set("alertPhone", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Telemarketers</h2>
        <label>Topics you ARE interested in (comma-separated)</label>
        <input
          value={(u.telemarketerTopics || []).join(", ")}
          onChange={(e) => set("telemarketerTopics", e.target.value.split(",").map((s) => s.trim()))}
        />
        <label>Policy for unwanted sales calls</label>
        <textarea rows={2} value={u.telemarketerPolicy || ""} onChange={(e) => set("telemarketerPolicy", e.target.value)} />
      </div>

      <div className="row" style={{ alignItems: "center" }}>
        <button onClick={save}>Save changes</button>
        {saved && <span className="saved">✓ Saved</span>}
      </div>
    </main>
  );
}

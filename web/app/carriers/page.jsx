"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function CarriersPage() {
  const [data, setData] = useState(null);
  const [user, setUser] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.carriers().then(setData).catch((e) => setErr(e.message));
    api.me().then(setUser).catch(() => {});
  }, []);

  if (err) return <main className="container"><div className="card">Error: {err}</div></main>;
  if (!data) return <main className="container"><p className="muted">Loading…</p></main>;

  const num = user?.twilioNumber ? user.twilioNumber.replace(/^\+1/, "") : "<TWILIO_NUMBER>";
  const sub = (s) => s.replaceAll("<TWILIO_NUMBER>", num);

  return (
    <main className="container">
      <div className="page-head">
        <h1>Forwarding Setup</h1>
        <p className="sub">
          Set <b>conditional</b> forwarding on your cell so unanswered calls ring through to your assistant
          at <b>{user?.twilioNumber || "your Twilio number"}</b>.
        </p>
      </div>

      <div className="card">
        <p className="muted" style={{ margin: 0 }}>{data.note}</p>
      </div>

      {data.carriers.map((c) => (
        <div key={c.name} className="card">
          <h2 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 10 }}>
            {c.name} <span className="tag plain">{c.type}</span>
          </h2>
          <label>Enable</label>
          <pre className="code">{sub(c.enable)}</pre>
          <label>Disable</label>
          <pre className="code">{sub(c.disable)}</pre>
          {c.notes && <p className="muted" style={{ marginBottom: 0 }}>{c.notes}</p>}
        </div>
      ))}
    </main>
  );
}

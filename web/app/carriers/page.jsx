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
      <h1>Call-Forwarding Setup</h1>
      <div className="card">
        <p>
          Set <b>conditional</b> call forwarding on your cell so unanswered calls ring through to your
          AI receptionist at <b>{user?.twilioNumber || "your Twilio number"}</b>.
        </p>
        <p className="muted">{data.note}</p>
      </div>

      {data.carriers.map((c) => (
        <div key={c.name} className="card">
          <h2 style={{ marginTop: 0 }}>{c.name} <span className="tag">{c.type}</span></h2>
          <label>Enable</label>
          <pre className="code">{sub(c.enable)}</pre>
          <label>Disable</label>
          <pre className="code">{sub(c.disable)}</pre>
          {c.notes && <p className="muted">{c.notes}</p>}
        </div>
      ))}
    </main>
  );
}

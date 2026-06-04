"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Icon } from "../Icon";

export default function CarriersPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => { api.carriers().then(setData).catch((e) => setErr(e.message)); }, []);

  if (err) return <main className="page"><div className="banner err"><Icon n="alert" /><div>{err}</div></div></main>;
  if (!data) return <main className="page"><div className="spin">Loading…</div></main>;

  const num = user?.twilioNumber || "";
  const digits = num.replace(/[^\d]/g, "").replace(/^1/, "");
  const sub = (s) => (s || "").replaceAll("<TWILIO_NUMBER>", digits || "<TWILIO_NUMBER>");
  const copy = (key, val) => { navigator.clipboard?.writeText(val).catch(() => {}); setCopied(key); setTimeout(() => setCopied(null), 1400); };

  const Code = ({ id, label, value }) => (
    <div>
      <label className="lbl" style={{ display: "block", marginBottom: 6 }}>{label}</label>
      <div className="between" style={{ gap: 10 }}>
        <div className="code" style={{ flex: 1 }}>{value}</div>
        <button className="btn secondary sm" onClick={() => copy(id, value)}><Icon n={copied === id ? "check" : "forward"} />{copied === id ? "Copied" : "Copy"}</button>
      </div>
    </div>
  );

  return (
    <main className="page">
      <div className="page-head">
        <div><h1>Forwarding setup</h1><p className="sub">Send unanswered calls to Vera at <b className="mono">{num}</b>.</p></div>
      </div>

      <div className="card pad" style={{ marginBottom: 22, display: "flex", gap: 12, alignItems: "flex-start", background: "var(--accent-soft)", borderColor: "var(--accent-line)" }}>
        <Icon n="sparkle" style={{ width: 18, color: "var(--accent-text)", flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: "13.5px", lineHeight: 1.55 }}>{data.note}</p>
      </div>

      <div className="grid cols-3">
        {data.carriers.map((c) => (
          <div key={c.name} className="card pad">
            <div className="between" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, whiteSpace: "nowrap" }}>{c.name}</h3>
              <span className="tag plain">{c.type}</span>
            </div>
            <div className="vstack" style={{ gap: 14 }}>
              <Code id={c.name + "-on"} label="Enable forwarding" value={sub(c.enable)} />
              <Code id={c.name + "-off"} label="Disable forwarding" value={sub(c.disable)} />
            </div>
            {c.notes && <p className="muted" style={{ fontSize: "12.5px", marginTop: 14, lineHeight: 1.5 }}>{c.notes}</p>}
          </div>
        ))}
      </div>
    </main>
  );
}

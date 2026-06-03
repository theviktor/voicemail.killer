"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";

export default function CallDetail() {
  const { id } = useParams();
  const [call, setCall] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try { setCall(await api.call(id)); } catch (e) { setErr(e.message); }
    })();
  }, [id]);

  if (err) return <main className="container"><div className="banner">⚠ {err}</div></main>;
  if (!call) return <main className="container"><div className="spin">Loading…</div></main>;

  const transcript = Array.isArray(call.transcript) ? call.transcript : [];

  return (
    <main className="container">
      <div className="page-head">
        <Link href="/" className="muted" style={{ fontSize: 13 }}>← Back to calls</Link>
        <h1 style={{ marginTop: 8 }}>{call.callerName || call.callerNumber}</h1>
        <p className="sub" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className={`tag ${call.classification}`}>{call.classification.toLowerCase()}</span>
          <span>{new Date(call.startedAt).toLocaleString()}</span>
          <span className="faint">· {call.status.toLowerCase().replace("_", " ")}</span>
        </p>
      </div>

      {call.messageSummary && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>📩 Message</h2>
          <div className="stack">
            <div><span className="muted">Summary: </span>{call.messageSummary}</div>
            {call.message && <div><span className="muted">Message: </span>{call.message}</div>}
            {call.callbackNumber && <div><span className="muted">Callback: </span>{call.callbackNumber}</div>}
            {call.urgency && <div><span className="muted">Urgency: </span><span className={`tag ${call.urgency}`}>{call.urgency.toLowerCase()}</span></div>}
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>🎧 Recording</h2>
        {call.recordingUrl ? (
          <audio controls style={{ width: "100%" }} src={api.recordingUrl(call.id)} />
        ) : (
          <p className="muted" style={{ margin: 0 }}>No recording available (still processing, or none captured).</p>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>💬 Transcript</h2>
        {transcript.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No transcript captured.</p>
        ) : (
          <div className="transcript">
            {transcript.map((t, i) => (
              <div key={i} className={`bubble ${t.role}`}>
                <div className="who">{t.role}</div>
                {t.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

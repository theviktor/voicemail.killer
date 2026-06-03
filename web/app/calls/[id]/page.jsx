"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "../../../lib/api";

export default function CallDetail() {
  const { id } = useParams();
  const [call, setCall] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setCall(await api.call(id));
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, [id]);

  if (err) return <main className="container"><div className="card">Error: {err}</div></main>;
  if (!call) return <main className="container"><p className="muted">Loading…</p></main>;

  const transcript = Array.isArray(call.transcript) ? call.transcript : [];

  return (
    <main className="container">
      <h1>
        Call from {call.callerName || call.callerNumber}{" "}
        <span className={`tag ${call.classification}`}>{call.classification}</span>
      </h1>
      <p className="muted">
        {new Date(call.startedAt).toLocaleString()} · {call.status}
      </p>

      {call.messageSummary && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Message</h2>
          <p><b>Summary:</b> {call.messageSummary}</p>
          {call.message && <p><b>Message:</b> {call.message}</p>}
          {call.callbackNumber && <p><b>Callback:</b> {call.callbackNumber}</p>}
          {call.urgency && <p><b>Urgency:</b> <span className={`tag ${call.urgency}`}>{call.urgency}</span></p>}
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Recording</h2>
        {call.recordingUrl ? (
          <audio controls style={{ width: "100%" }} src={api.recordingUrl(call.id)} />
        ) : (
          <p className="muted">No recording available (still processing, or none captured).</p>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Transcript</h2>
        {transcript.length === 0 && <p className="muted">No transcript captured.</p>}
        {transcript.map((t, i) => (
          <div key={i} className={`bubble ${t.role}`}>
            <div style={{ fontSize: 12, opacity: 0.6 }}>{t.role}</div>
            {t.text}
          </div>
        ))}
      </div>
    </main>
  );
}

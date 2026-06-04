"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { Icon } from "../../Icon";
import Player from "../../Player";
import { fullTime, dur } from "../../../lib/format";

const TAGS = { KNOWN: ["known", "Known"], UNKNOWN: ["unknown", "Unknown"], TELEMARKETER: ["telemarketer", "Spam"] };

export default function CallDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [call, setCall] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => { api.call(id).then(setCall).catch((e) => setErr(e.message)); }, [id]);

  if (err) return <main className="page"><div className="banner err"><Icon n="alert" /><div>{err}</div></div></main>;
  if (!call) return <main className="page"><div className="spin">Loading…</div></main>;

  const [k, lbl] = TAGS[call.classification] || TAGS.UNKNOWN;
  const transcript = Array.isArray(call.transcript) ? call.transcript : [];

  return (
    <main className="page">
      <button className="crumb" onClick={() => router.push("/")}><Icon n="chevL" />Back to calls</button>
      <div className="page-head" style={{ marginBottom: 22 }}>
        <div>
          <div className="row" style={{ alignItems: "center", gap: 12 }}>
            <h1>{call.callerName || "Unknown caller"}</h1>
            <span className={`tag ${k}`}><span className="d" />{lbl}</span>
            {call.urgency === "HIGH" && <span className="tag high"><span className="d" />Urgent</span>}
          </div>
          <p className="sub"><span className="mono">{call.callerNumber}</span> · {fullTime(call.startedAt)}{call.recordingDurationSec ? ` · ${dur(call.recordingDurationSec)}` : ""}</p>
        </div>
      </div>

      <div className="split">
        <div className="card tight">
          <div className="card-h">
            <div><h3>Transcript</h3><div className="desc">{transcript.length} turns · auto-captured</div></div>
            <span className="tag solid"><Icon n="sparkle" style={{ width: 13 }} /> AI</span>
          </div>
          <div className="card-b">
            {transcript.length === 0 ? (
              <div className="empty"><div className="ic"><Icon n="message" /></div><h3>No transcript</h3><p>This call wasn't transcribed.</p></div>
            ) : (
              <div className="transcript">
                {transcript.map((t, i) => (
                  <div key={i} className={"bub " + (t.role === "agent" ? "agent" : "caller")}>
                    <div className="who">{t.role === "agent" ? "Vera" : (call.callerName || "Caller")}</div>
                    <div className="body">{t.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="vstack" style={{ gap: 22 }}>
          {call.messageSummary && (
            <div className="card pad">
              <div className="row" style={{ alignItems: "center", gap: 9, marginBottom: 14 }}>
                <span className="stat" style={{ all: "unset", width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent-text)" }}><Icon n="message" style={{ width: 15 }} /></span>
                <h3 style={{ fontSize: "14.5px" }}>Message</h3>
              </div>
              {call.message && <p style={{ fontSize: "14.5px", marginBottom: 14 }}>{call.message}</p>}
              <div className="vstack" style={{ gap: 10, fontSize: "13.5px" }}>
                {call.messageSummary && <div className="between"><span className="muted">Summary</span><span style={{ textAlign: "right", maxWidth: "60%" }}>{call.messageSummary}</span></div>}
                {call.callbackNumber && <div className="between"><span className="muted">Callback</span><span className="mono">{call.callbackNumber}</span></div>}
                {call.urgency && <div className="between"><span className="muted">Urgency</span><span className={`tag ${call.urgency === "HIGH" ? "high" : "plain"}`}>{call.urgency === "HIGH" && <span className="d" />}{call.urgency.toLowerCase()}</span></div>}
              </div>
            </div>
          )}
          <div className="card pad">
            <h3 style={{ fontSize: "14.5px", marginBottom: 14 }}>Recording</h3>
            {call.recordingUrl ? (
              <Player src={api.recordingUrl(call.id)} duration={call.recordingDurationSec || 60} />
            ) : (
              <p className="muted" style={{ fontSize: "13.5px" }}>No recording captured for this call.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

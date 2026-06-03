"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";

export default function CallsPage() {
  const [user, setUser] = useState(null);
  const [calls, setCalls] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await api.me();
        setUser(me);
        if (me) setCalls(await api.calls(me.id));
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const withMsg = calls.filter((c) => c.messageSummary).length;
  const telem = calls.filter((c) => c.classification === "TELEMARKETER").length;

  function relTime(d) {
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return new Date(d).toLocaleDateString([], { month: "short", day: "numeric" });
  }

  return (
    <main className="container">
      <div className="page-head">
        <h1>Calls</h1>
        <p className="sub">
          {user ? (
            <>Answering for <b>{user.name}</b> · {user.twilioNumber}</>
          ) : (
            "Recent calls your assistant has handled"
          )}
        </p>
      </div>

      {err && <div className="banner">⚠ {err}. Is the server reachable?</div>}

      <div className="stats">
        <div className="stat"><div className="n">{calls.length}</div><div className="l">Total calls</div></div>
        <div className="stat"><div className="n">{withMsg}</div><div className="l">Messages taken</div></div>
        <div className="stat"><div className="n">{telem}</div><div className="l">Telemarketers</div></div>
      </div>

      {loading ? (
        <div className="spin">Loading calls…</div>
      ) : calls.length === 0 ? (
        <div className="card"><div className="empty"><div className="ico">📭</div>No calls yet.<br />Forward a call to your Twilio number to see it here.</div></div>
      ) : (
        <div className="card tight">
          <div className="table-wrap">
            <table className="responsive">
              <thead>
                <tr><th>When</th><th>Caller</th><th>Type</th><th>Summary</th><th>Rec</th></tr>
              </thead>
              <tbody>
                {calls.map((c) => (
                  <tr key={c.id}>
                    <td data-label="When" className="muted">{relTime(c.startedAt)}</td>
                    <td data-label="Caller">
                      <Link href={`/calls/${c.id}`}>{c.callerName || c.callerNumber || "Unknown"}</Link>
                    </td>
                    <td data-label="Type">
                      <span className={`tag ${c.classification}`}>{c.classification.toLowerCase()}</span>
                      {c.urgency === "HIGH" && <span className="tag HIGH" style={{ marginLeft: 6 }}>urgent</span>}
                    </td>
                    <td data-label="Summary" className="muted">{c.messageSummary || "—"}</td>
                    <td data-label="Rec">{c.recordingUrl ? "🎧" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}

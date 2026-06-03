"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";

export default function CallsPage() {
  const [user, setUser] = useState(null);
  const [calls, setCalls] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await api.me();
        setUser(me);
        if (me) setCalls(await api.calls(me.id));
      } catch (e) {
        setErr(e.message);
      }
    })();
  }, []);

  return (
    <main className="container">
      <h1>Calls</h1>
      {err && <div className="card" style={{ color: "var(--red)" }}>Error: {err}. Is the server running?</div>}
      {user && (
        <p className="muted">
          Answering for <b>{user.name}</b> on <b>{user.twilioNumber}</b>
        </p>
      )}
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Caller</th>
              <th>Type</th>
              <th>Summary</th>
              <th>Rec</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((c) => (
              <tr key={c.id}>
                <td>{new Date(c.startedAt).toLocaleString()}</td>
                <td>
                  <Link href={`/calls/${c.id}`}>
                    {c.callerName || c.callerNumber || "Unknown"}
                  </Link>
                </td>
                <td>
                  <span className={`tag ${c.classification}`}>{c.classification}</span>
                  {c.urgency === "HIGH" && <span className="tag HIGH" style={{ marginLeft: 6 }}>URGENT</span>}
                </td>
                <td className="muted">{c.messageSummary || "—"}</td>
                <td>{c.recordingUrl ? "🎧" : "—"}</td>
              </tr>
            ))}
            {calls.length === 0 && (
              <tr>
                <td colSpan={5} className="muted" style={{ padding: 20 }}>
                  No calls yet. Forward a call to your Twilio number to see it here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

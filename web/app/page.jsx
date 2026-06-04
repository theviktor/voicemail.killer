"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Icon } from "./Icon";
import { initials, relTime, fullTime, dur } from "../lib/format";

const TAGS = { KNOWN: ["known", "Known"], UNKNOWN: ["unknown", "Unknown"], TELEMARKETER: ["telemarketer", "Spam"] };

export default function CallsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [calls, setCalls] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!user) return;
    api.calls(user.id).then(setCalls).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  }, [user]);

  const withMsg = calls.filter((c) => c.messageSummary).length;
  const telem = calls.filter((c) => c.classification === "TELEMARKETER").length;
  const recs = calls.filter((c) => c.recordingUrl).length;
  const needs = calls.filter((c) => c.urgency === "HIGH").length;

  const shown = calls.filter((c) =>
    filter === "all" ? true : filter === "messages" ? !!c.messageSummary : c.urgency === "HIGH");

  const FILTERS = [
    { value: "all", label: "All" },
    { value: "messages", label: "Messages" },
    { value: "attention", label: "Needs callback" },
  ];

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Calls</h1>
          <p className="sub">Answering for <b>{user?.name}</b> · <span className="mono">{user?.twilioNumber}</span></p>
        </div>
        <button className="btn secondary" onClick={() => router.push("/carriers")}><Icon n="forward" />Forwarding setup</button>
      </div>

      {err && <div className="banner err"><Icon n="alert" /><div>{err}. Is the server reachable?</div></div>}

      <div className="stats">
        <Stat icon="phoneIn" label="Calls answered" value={calls.length} />
        <Stat icon="message" label="Messages taken" value={withMsg} />
        <Stat icon="shield" label="Spam screened" value={telem} />
        <Stat icon="voicemail" label="Recordings" value={recs} />
      </div>

      {needs > 0 && (
        <div className="banner err" style={{ marginTop: 18 }}>
          <Icon n="alert" />
          <div><b>{needs} call{needs > 1 ? "s need" : " needs"} a callback.</b> Flagged urgent — review below.</div>
        </div>
      )}

      <div className="card tight" style={{ marginTop: 20 }}>
        <div className="card-h">
          <div><h3>Recent calls</h3><div className="desc">Everything Vera handled, newest first</div></div>
          <div className="seg">
            {FILTERS.map((f) => (
              <button key={f.value} className={filter === f.value ? "on" : ""} onClick={() => setFilter(f.value)}>{f.label}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="spin">Loading calls…</div>
        ) : shown.length === 0 ? (
          <div className="empty"><div className="ic"><Icon n="phone" /></div><h3>No calls yet</h3><p>Forward a call to your number to see it here.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="row-link responsive">
              <thead><tr><th>Caller</th><th>Type</th><th>Summary</th><th>When</th><th style={{ textAlign: "right" }}>Length</th></tr></thead>
              <tbody>
                {shown.map((c) => {
                  const [k, lbl] = TAGS[c.classification] || TAGS.UNKNOWN;
                  return (
                    <tr key={c.id} onClick={() => router.push(`/calls/${c.id}`)}>
                      <td data-label="Caller">
                        <div className="caller">
                          <div className={"ava" + (c.classification === "KNOWN" ? " known" : "")}>
                            {c.classification === "TELEMARKETER" ? <Icon n="shield" /> : initials(c.callerName || "?")}
                          </div>
                          <div>
                            <div className="who">{c.callerName || "Unknown caller"}</div>
                            <div className="sub2 mono">{c.callerNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td data-label="Type">
                        <div className="row" style={{ gap: 6 }}>
                          <span className={`tag ${k}`}><span className="d" />{lbl}</span>
                          {c.urgency === "HIGH" && <span className="tag high"><span className="d" />Urgent</span>}
                        </div>
                      </td>
                      <td data-label="Summary" className="muted" style={{ maxWidth: 320 }}>{c.messageSummary || <span className="faint">No message</span>}</td>
                      <td data-label="When" className="muted" title={fullTime(c.startedAt)}>{relTime(c.startedAt)}</td>
                      <td data-label="Length" className="muted mono" style={{ textAlign: "right" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                          {c.recordingUrl && <Icon n="voicemail" style={{ width: 15, opacity: .6 }} />}
                          {dur(c.recordingDurationSec)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="stat">
      <div className="top"><span className="ic"><Icon n={icon} /></span>{label}</div>
      <div className="n">{value}</div>
    </div>
  );
}

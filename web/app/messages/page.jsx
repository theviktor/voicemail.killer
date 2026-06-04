"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Icon } from "../Icon";
import { initials, relTime } from "../../lib/format";

export default function MessagesPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [contact, setContact] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState(null);

  async function load() {
    setContacts(await api.contacts(user.id));
    setMessages(await api.outbound(user.id));
  }
  useEffect(() => { if (user) load().catch((e) => setErr(e.message)); }, [user]);

  async function leave(e) {
    e.preventDefault();
    if (!contact || !body.trim()) return;
    await api.addOutbound(user.id, { contactId: contact, body });
    setBody(""); setContact("");
    await load();
  }
  async function cancel(id) { await api.cancelOutbound(id); await load(); }

  if (err) return <main className="page"><div className="banner err"><Icon n="alert" /><div>{err}</div></div></main>;

  const pending = messages.filter((m) => m.status === "PENDING");
  const past = messages.filter((m) => m.status !== "PENDING");

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Leave a message</h1>
          <p className="sub">Leave a note for a contact — Vera delivers it out loud the next time they call.</p>
        </div>
      </div>

      <div className="split">
        <div className="vstack" style={{ gap: 22 }}>
          <div className="card pad">
            <h3 style={{ fontSize: "14.5px", marginBottom: 16 }}>Compose</h3>
            <form onSubmit={leave}>
              <label className="field grow"><span className="lbl">For which contact?</span>
                <select value={contact} onChange={(e) => setContact(e.target.value)}>
                  <option value="">— choose a contact —</option>
                  {contacts.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
                </select>
              </label>
              {contacts.length === 0 && <p className="muted" style={{ fontSize: "12.5px", marginTop: 8 }}>Add a contact first on the Contacts page.</p>}
              <div style={{ height: 14 }} />
              <label className="field grow"><span className="lbl">Message</span>
                <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="e.g. Dinner is moved to 7pm Saturday — let me know if that works." />
              </label>
              <div className="between" style={{ marginTop: 16 }}>
                <span className="faint" style={{ fontSize: "12.5px" }}>{body.length} characters · delivered on next call</span>
                <button className="btn" type="submit"><Icon n="message" />Leave message</button>
              </div>
            </form>
          </div>

          {past.length > 0 && (
            <div className="card tight">
              <div className="card-h"><div><h3>History</h3><div className="desc">Previously delivered notes</div></div></div>
              <div className="table-wrap">
                <table className="responsive">
                  <thead><tr><th>For</th><th>Message</th><th>Status</th><th>When</th></tr></thead>
                  <tbody>
                    {past.map((m) => (
                      <tr key={m.id} className="hover-row">
                        <td data-label="For"><span className="who">{m.contact?.name || "?"}</span></td>
                        <td data-label="Message" className="muted" style={{ maxWidth: 260 }}>{m.body}</td>
                        <td data-label="Status"><span className={`tag ${m.status === "DELIVERED" ? "delivered" : "plain"}`}>{m.status === "DELIVERED" && <span className="d" />}{m.status.toLowerCase()}</span></td>
                        <td data-label="When" className="muted">{m.deliveredAt ? relTime(m.deliveredAt) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="card pad">
          <div className="between" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: "14.5px" }}>Pending delivery</h3>
            <span className="tag pending"><span className="d" />{pending.length} waiting</span>
          </div>
          {pending.length === 0 ? (
            <div className="empty"><div className="ic"><Icon n="check" /></div><h3>All clear</h3><p>Nothing waiting to be delivered.</p></div>
          ) : (
            <div className="vstack" style={{ gap: 12 }}>
              {pending.map((m) => (
                <div key={m.id} className="vstack" style={{ gap: 9, border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 14, background: "var(--surface-2)" }}>
                  <div className="between">
                    <div className="row" style={{ alignItems: "center", gap: 8 }}>
                      <div className="ava" style={{ width: 26, height: 26, fontSize: 11, borderRadius: 8, display: "grid", placeItems: "center", background: "var(--surface-3)", color: "var(--text-muted)", border: "1px solid var(--border)", fontWeight: 600 }}>{initials(m.contact?.name)}</div>
                      <span className="who" style={{ fontSize: "13.5px" }}>{m.contact?.name || "?"}</span>
                    </div>
                    <button className="btn danger sm" onClick={() => cancel(m.id)}>Cancel</button>
                  </div>
                  <p style={{ fontSize: "13.5px", lineHeight: 1.5 }}>{m.body}</p>
                  <div className="faint" style={{ fontSize: 12 }}>Left {relTime(m.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

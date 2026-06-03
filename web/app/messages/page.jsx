"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function MessagesPage() {
  const [userId, setUserId] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [form, setForm] = useState({ contactId: "", body: "" });
  const [err, setErr] = useState(null);

  async function load(uid) {
    setContacts(await api.contacts(uid));
    setMessages(await api.outbound(uid));
  }

  useEffect(() => {
    (async () => {
      try {
        const me = await api.me();
        setUserId(me.id);
        await load(me.id);
      } catch (e) { setErr(e.message); }
    })();
  }, []);

  async function add(e) {
    e.preventDefault();
    if (!form.contactId || !form.body.trim()) return;
    await api.addOutbound(userId, form);
    setForm({ contactId: "", body: "" });
    await load(userId);
  }

  async function cancel(id) {
    await api.cancelOutbound(id);
    await load(userId);
  }

  if (err) return <main className="container"><div className="banner">⚠ {err}</div></main>;

  const pending = messages.filter((m) => m.status === "PENDING");
  const past = messages.filter((m) => m.status !== "PENDING");

  return (
    <main className="container">
      <div className="page-head">
        <h1>Leave a Message</h1>
        <p className="sub">Leave a note for a contact — the assistant delivers it out loud the next time they call.</p>
      </div>

      <div className="card">
        <form onSubmit={add}>
          <label>For which contact?</label>
          <select value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })}>
            <option value="">— choose a contact —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.phone}){c.group ? ` · ${c.group.name}` : ""}</option>
            ))}
          </select>
          {contacts.length === 0 && <p className="muted">Add a contact first on the Contacts page.</p>}
          <label>Message</label>
          <textarea rows={3} value={form.body}
            placeholder="e.g. Dinner is moved to 7pm Saturday — let me know if that works."
            onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <div style={{ marginTop: 14 }}><button type="submit">Leave message</button></div>
        </form>
      </div>

      <h2>Pending delivery ({pending.length})</h2>
      {pending.length === 0 ? (
        <div className="card"><div className="empty"><div className="ico">✅</div>Nothing waiting to be delivered.</div></div>
      ) : pending.map((m) => (
        <div key={m.id} className="card">
          <div className="between">
            <div>
              <span className="tag plain">for {m.contact?.name || "?"}</span>{" "}
              <span className="faint" style={{ fontSize: 13 }}>left {new Date(m.createdAt).toLocaleString()}</span>
            </div>
            <button className="danger" onClick={() => cancel(m.id)}>Cancel</button>
          </div>
          <p style={{ marginBottom: 0, marginTop: 10 }}>{m.body}</p>
        </div>
      ))}

      {past.length > 0 && (
        <>
          <h2>History</h2>
          <div className="card tight">
            <div className="table-wrap">
              <table className="responsive">
                <thead><tr><th>For</th><th>Message</th><th>Status</th><th>When</th></tr></thead>
                <tbody>
                  {past.map((m) => (
                    <tr key={m.id}>
                      <td data-label="For"><b>{m.contact?.name || "?"}</b></td>
                      <td data-label="Message" className="muted">{m.body}</td>
                      <td data-label="Status"><span className={`tag ${m.status}`}>{m.status.toLowerCase()}</span></td>
                      <td data-label="When" className="muted">{m.deliveredAt ? new Date(m.deliveredAt).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

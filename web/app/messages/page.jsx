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
      } catch (e) {
        setErr(e.message);
      }
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

  if (err) return <main className="container"><div className="card">Error: {err}</div></main>;

  const pending = messages.filter((m) => m.status === "PENDING");
  const past = messages.filter((m) => m.status !== "PENDING");

  return (
    <main className="container">
      <h1>Leave a Message</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Leave a message for a contact. The next time they call in, the assistant recognizes them
        and delivers it out loud.
      </p>

      <div className="card">
        <form onSubmit={add}>
          <label>For which contact?</label>
          <select value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })}>
            <option value="">— choose a contact —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone}){c.group ? ` · ${c.group.name}` : ""}
              </option>
            ))}
          </select>
          {contacts.length === 0 && (
            <p className="muted">Add a contact first on the Contacts page.</p>
          )}
          <label>Message</label>
          <textarea
            rows={3}
            value={form.body}
            placeholder="e.g. Dinner is moved to 7pm Saturday — let me know if that works."
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
          <div style={{ marginTop: 12 }}>
            <button type="submit">Leave message</button>
          </div>
        </form>
      </div>

      <h2>Pending delivery ({pending.length})</h2>
      {pending.length === 0 && <p className="muted">No messages waiting to be delivered.</p>}
      {pending.map((m) => (
        <div key={m.id} className="card">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="tag">for {m.contact?.name || "?"}</span>{" "}
              <span className="muted">left {new Date(m.createdAt).toLocaleString()}</span>
            </div>
            <button className="danger" onClick={() => cancel(m.id)}>Cancel</button>
          </div>
          <p style={{ marginBottom: 0 }}>{m.body}</p>
        </div>
      ))}

      {past.length > 0 && (
        <>
          <h2>History</h2>
          <div className="card" style={{ padding: 0 }}>
            <table>
              <thead><tr><th>For</th><th>Message</th><th>Status</th><th>When</th></tr></thead>
              <tbody>
                {past.map((m) => (
                  <tr key={m.id}>
                    <td>{m.contact?.name || "?"}</td>
                    <td className="muted">{m.body}</td>
                    <td>
                      <span className="tag" style={{ color: m.status === "DELIVERED" ? "var(--green)" : "var(--muted)" }}>
                        {m.status}
                      </span>
                    </td>
                    <td className="muted">
                      {m.deliveredAt ? new Date(m.deliveredAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}

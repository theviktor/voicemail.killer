"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";

const EMPTY = { name: "", email: "", password: "", companyName: "", twilioNumber: "", role: "USER" };

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [numbers, setNumbers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  async function load() {
    setUsers(await api.adminUsers());
    try { setNumbers(await api.adminTwilioNumbers()); } catch { setNumbers([]); }
  }

  useEffect(() => { if (user?.role === "ADMIN") load(); }, [user]);

  if (user && user.role !== "ADMIN")
    return <main className="container"><div className="banner">⚠ Admins only.</div></main>;

  async function create(e) {
    e.preventDefault();
    setErr(null); setMsg(null);
    try {
      const res = await api.adminCreateUser(form);
      let m = `Created ${res.user.name} (${res.user.email}).`;
      if (res.twilio) m += res.twilio.ok ? " Twilio webhook configured ✓" : ` Twilio: ${res.twilio.error}`;
      setMsg(m);
      setForm(EMPTY);
      await load();
    } catch (e) { setErr(e.message); }
  }

  async function changeRole(u, role) {
    await api.adminUpdateUser(u.id, { role });
    await load();
  }
  async function resetPw(u) {
    const pw = prompt(`New password for ${u.name}:`);
    if (!pw) return;
    await api.adminUpdateUser(u.id, { password: pw });
    setMsg(`Password reset for ${u.name}.`);
  }
  async function rewire(u) {
    const r = await api.adminConfigureTwilio(u.id);
    setMsg(r.ok ? `Twilio webhook re-pointed for ${u.name} ✓` : `Twilio: ${r.error}`);
  }
  async function del(u) {
    if (!confirm(`Delete ${u.name} and ALL their data? This cannot be undone.`)) return;
    await api.adminDeleteUser(u.id);
    await load();
  }

  const usable = numbers.filter((n) => n.phoneNumber);

  return (
    <main className="container">
      <div className="page-head">
        <h1>Admin</h1>
        <p className="sub">Create and manage user accounts and their assistant phone numbers.</p>
      </div>

      {err && <div className="banner">⚠ {err}</div>}
      {msg && <div className="card" style={{ borderColor: "rgba(54,211,153,.35)", background: "rgba(54,211,153,.06)" }}>{msg}</div>}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Create user</h2>
        <form onSubmit={create}>
          <div className="row">
            <div className="field">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="field">
              <label>Company (optional)</label>
              <input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="field">
              <label>Temporary password</label>
              <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label>Twilio number {usable.length > 0 && <span className="faint">(pick from account or type)</span>}</label>
              <input list="twilio-numbers" placeholder="+1XXXXXXXXXX"
                value={form.twilioNumber} onChange={(e) => setForm({ ...form, twilioNumber: e.target.value })} />
              <datalist id="twilio-numbers">
                {usable.map((n) => (
                  <option key={n.sid} value={n.phoneNumber}>
                    {n.friendlyName || n.phoneNumber}{n.voiceConfigured ? " — in use" : ""}
                  </option>
                ))}
              </datalist>
            </div>
            <div className="field">
              <label>Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
            Assigning a number auto-points its Twilio voice webhook at the assistant.
          </p>
          <button type="submit">Create user</button>
        </form>
      </div>

      <h2>Users ({users.length})</h2>
      <div className="card tight">
        <div className="table-wrap">
          <table className="responsive">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Number</th><th>Calls</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td data-label="Name"><b>{u.name}</b></td>
                  <td data-label="Email" className="muted">{u.email || "—"}</td>
                  <td data-label="Role">
                    <select value={u.role} onChange={(e) => changeRole(u, e.target.value)}
                      style={{ width: "auto", padding: "5px 26px 5px 10px", fontSize: 13 }}
                      disabled={u.id === user?.id}>
                      <option value="USER">User</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td data-label="Number" className="muted">
                    {u.twilioNumber?.startsWith("+") ? u.twilioNumber : <span className="faint">unassigned</span>}
                  </td>
                  <td data-label="Calls" className="muted">{u.counts?.calls ?? 0}</td>
                  <td data-label="Actions">
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {u.twilioNumber?.startsWith("+") && (
                        <button className="secondary sm" onClick={() => rewire(u)}>Re-wire</button>
                      )}
                      <button className="secondary sm" onClick={() => resetPw(u)}>Reset pw</button>
                      {u.id !== user?.id && <button className="danger" onClick={() => del(u)}>Delete</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

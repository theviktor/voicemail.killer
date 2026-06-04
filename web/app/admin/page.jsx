"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Icon } from "../Icon";
import { initials } from "../../lib/format";

const EMPTY = { name: "", email: "", password: "", companyName: "", twilioNumber: "", role: "USER" };

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [numbers, setNumbers] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  async function load() {
    setUsers(await api.adminUsers());
    try { setNumbers(await api.adminTwilioNumbers()); } catch { setNumbers([]); }
  }
  useEffect(() => { if (user?.role === "ADMIN") load().catch((e) => setErr(e.message)); }, [user]);

  if (user && user.role !== "ADMIN")
    return <main className="page"><div className="banner err"><Icon n="alert" /><div>Admins only.</div></div></main>;

  async function create(e) {
    e.preventDefault();
    setErr(null); setMsg(null);
    try {
      const res = await api.adminCreateUser(form);
      let m = `Created ${res.user.name} (${res.user.email}).`;
      if (res.twilio) m += res.twilio.ok ? " Twilio webhook configured." : ` Twilio: ${res.twilio.error}`;
      setMsg(m); setForm(EMPTY); setCreating(false);
      await load();
    } catch (e) { setErr(e.message); }
  }
  async function changeRole(u, role) { await api.adminUpdateUser(u.id, { role }); await load(); }
  async function resetPw(u) { const pw = prompt(`New password for ${u.name}:`); if (!pw) return; await api.adminUpdateUser(u.id, { password: pw }); setMsg(`Password reset for ${u.name}.`); }
  async function rewire(u) { const r = await api.adminConfigureTwilio(u.id); setMsg(r.ok ? `Webhook re-pointed for ${u.name}.` : `Twilio: ${r.error}`); }
  async function del(u) { if (!confirm(`Delete ${u.name} and ALL their data?`)) return; await api.adminDeleteUser(u.id); await load(); }

  const usable = numbers.filter((n) => n.phoneNumber);
  const inUse = users.filter((u) => u.twilioNumber?.startsWith("+")).length;
  const totalCalls = users.reduce((s, u) => s + (u.counts?.calls || 0), 0);
  const available = usable.filter((n) => !n.voiceConfigured).length;

  return (
    <main className="page">
      <div className="page-head">
        <div><h1>Admin</h1><p className="sub">Manage accounts and their assistant phone numbers.</p></div>
        <button className="btn" onClick={() => setCreating((c) => !c)}><Icon n={creating ? "x" : "plus"} />{creating ? "Close" : "Create user"}</button>
      </div>

      {err && <div className="banner err"><Icon n="alert" /><div>{err}</div></div>}
      {msg && <div className="banner ok"><Icon n="check" /><div>{msg}</div></div>}

      <div className="stats" style={{ marginBottom: 22 }}>
        <Stat icon="users" label="Total users" value={users.length} />
        <Stat icon="phone" label="Numbers in use" value={inUse} delta={`${available} available`} />
        <Stat icon="phoneIn" label="Calls handled" value={totalCalls.toLocaleString()} />
      </div>

      {creating && (
        <div className="card pad" style={{ marginBottom: 22 }}>
          <h3 style={{ fontSize: "14.5px", marginBottom: 16 }}>Create user</h3>
          <form onSubmit={create}>
            <div className="row">
              <label className="field grow"><span className="lbl">Name</span><input placeholder="Jane Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
              <label className="field grow"><span className="lbl">Company <span className="hint">· optional</span></span><input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></label>
            </div>
            <div style={{ height: 14 }} />
            <div className="row">
              <label className="field grow"><span className="lbl">Email</span><input type="email" placeholder="jane@acme.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
              <label className="field grow"><span className="lbl">Temporary password</span><input placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
            </div>
            <div style={{ height: 14 }} />
            <div className="row">
              <label className="field grow"><span className="lbl">Twilio number <span className="hint">· auto-wires the webhook</span></span>
                <input list="tw-nums" className="mono" placeholder="+1XXXXXXXXXX" value={form.twilioNumber} onChange={(e) => setForm({ ...form, twilioNumber: e.target.value })} />
                <datalist id="tw-nums">{usable.map((n) => <option key={n.sid} value={n.phoneNumber}>{n.friendlyName || n.phoneNumber}{n.voiceConfigured ? " · in use" : ""}</option>)}</datalist>
              </label>
              <label className="field grow"><span className="lbl">Role</span><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="USER">USER</option><option value="ADMIN">ADMIN</option></select></label>
            </div>
            <div className="row" style={{ marginTop: 18 }}>
              <button className="btn" type="submit"><Icon n="check" />Create user</button>
              <button className="btn ghost" type="button" onClick={() => setCreating(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card tight">
        <div className="card-h"><div><h3>Users · {users.length}</h3><div className="desc">Assigning a number auto-points its Twilio webhook at Vera</div></div></div>
        <div className="table-wrap">
          <table className="responsive">
            <thead><tr><th>Name</th><th>Role</th><th>Number</th><th style={{ textAlign: "right" }}>Calls</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="hover-row">
                  <td data-label="Name"><div className="caller"><div className="ava">{initials(u.name)}</div><div><div className="who">{u.name}</div><div className="sub2">{u.email}</div></div></div></td>
                  <td data-label="Role">
                    <select value={u.role} onChange={(e) => changeRole(u, e.target.value)} disabled={u.id === user?.id} style={{ width: "auto", padding: "5px 26px 5px 10px", fontSize: "12.5px" }}>
                      <option value="USER">USER</option><option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td data-label="Number" className="muted mono">{u.twilioNumber?.startsWith("+") ? u.twilioNumber : <span className="faint" style={{ fontFamily: "var(--font)" }}>unassigned</span>}</td>
                  <td data-label="Calls" className="muted mono" style={{ textAlign: "right" }}>{u.counts?.calls ?? 0}</td>
                  <td data-label="">
                    <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                      {u.twilioNumber?.startsWith("+") && <button className="btn secondary sm" onClick={() => rewire(u)}><Icon n="forward" />Re-wire</button>}
                      <button className="btn secondary sm" onClick={() => resetPw(u)} title="Reset password"><Icon n="key" /></button>
                      {u.id !== user?.id && <button className="btn danger sm" onClick={() => del(u)}><Icon n="trash" /></button>}
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

function Stat({ icon, label, value, delta }) {
  return (
    <div className="stat">
      <div className="top"><span className="ic"><Icon n={icon} /></span>{label}</div>
      <div className="n">{value}</div>
      {delta && <div className="delta">{delta}</div>}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Icon } from "../Icon";
import { initials } from "../../lib/format";

const PALETTE = ["#12a474", "#5b6cff", "#e0a106", "#f0506a", "#9b5cf0", "#19b67e"];
const colorFor = (i) => PALETTE[i % PALETTE.length];

export default function ContactsPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", groupId: "", notes: "" });
  const [groupName, setGroupName] = useState("");
  const [err, setErr] = useState(null);

  async function load() {
    setContacts(await api.contacts(user.id));
    setGroups(await api.groups(user.id));
  }
  useEffect(() => { if (user) load().catch((e) => setErr(e.message)); }, [user]);

  async function addContact(e) {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    await api.addContact(user.id, { ...form, groupId: form.groupId || null });
    setForm({ name: "", phone: "", groupId: "", notes: "" });
    setAdding(false);
    await load();
  }
  async function addGroup(e) {
    e.preventDefault();
    if (!groupName) return;
    await api.addGroup(user.id, { name: groupName });
    setGroupName("");
    await load();
  }
  async function delContact(id) { await api.deleteContact(id); await load(); }

  if (err) return <main className="page"><div className="banner err"><Icon n="alert" /><div>{err}</div></div></main>;

  const countFor = (g) => contacts.filter((c) => c.groupId === g.id).length;

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Contacts</h1>
          <p className="sub">Known callers are greeted by name and follow their group's rules.</p>
        </div>
        <button className="btn" onClick={() => setAdding((a) => !a)}><Icon n={adding ? "x" : "plus"} />{adding ? "Close" : "Add contact"}</button>
      </div>

      {adding && (
        <div className="card pad" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: "14.5px", marginBottom: 16 }}>New contact</h3>
          <form onSubmit={addContact}>
            <div className="row">
              <label className="field grow"><span className="lbl">Name</span><input placeholder="Jane Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label className="field grow"><span className="lbl">Phone <span className="hint">· E.164</span></span><input className="mono" placeholder="+1 415…" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
              <label className="field grow"><span className="lbl">Group</span>
                <select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
                  <option value="">— none —</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </label>
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="field grow"><span className="lbl">Notes <span className="hint">· per-caller agent instructions</span></span><input placeholder="e.g. Always greet warmly" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
            </div>
            <div className="row" style={{ marginTop: 18 }}>
              <button className="btn" type="submit"><Icon n="check" />Save contact</button>
              <button className="btn ghost" type="button" onClick={() => setAdding(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="section-label">Groups</div>
      <form onSubmit={addGroup} className="row" style={{ alignItems: "flex-end", marginBottom: 14 }}>
        <label className="field grow" style={{ maxWidth: 280 }}><span className="lbl">New group name</span><input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Family, VIP, Vendors…" /></label>
        <button className="btn secondary" type="submit"><Icon n="plus" />Add group</button>
      </form>

      {groups.length > 0 && (
        <div className="grid cols-3">
          {groups.map((g, i) => <GroupCard key={g.id} group={g} color={colorFor(i)} count={countFor(g)} onChanged={load} />)}
        </div>
      )}

      <div className="section-label">All contacts · {contacts.length}</div>
      {contacts.length === 0 ? (
        <div className="card"><div className="empty"><div className="ic"><Icon n="users" /></div><h3>No contacts</h3><p>Add your first contact above.</p></div></div>
      ) : (
        <div className="card tight">
          <div className="table-wrap">
            <table className="responsive">
              <thead><tr><th>Name</th><th>Phone</th><th>Group</th><th>Notes</th><th></th></tr></thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id} className="hover-row">
                    <td data-label="Name"><div className="caller"><div className="ava">{initials(c.name)}</div><span className="who">{c.name}</span></div></td>
                    <td data-label="Phone" className="muted mono">{c.phone}</td>
                    <td data-label="Group">{c.group ? <span className="tag plain"><span className="dot-chip" style={{ background: colorFor(groups.findIndex((g) => g.id === c.groupId)) }} />{c.group.name}</span> : <span className="faint">—</span>}</td>
                    <td data-label="Notes" className="muted">{c.notes || <span className="faint">—</span>}</td>
                    <td data-label=""><button className="btn danger sm" onClick={() => delContact(c.id)}><Icon n="trash" /></button></td>
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

function GroupCard({ group, color, count, onChanged }) {
  const [g, setG] = useState(group);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (f, v) => { setG((p) => ({ ...p, [f]: v })); setSaved(false); };
  const topics = Array.isArray(g.allowedTopics) ? g.allowedTopics : [];

  async function save() {
    await api.updateGroup(g.id, {
      name: g.name, greeting: g.greeting, systemPromptAddon: g.systemPromptAddon,
      allowedTopics: typeof g.allowedTopics === "string" ? g.allowedTopics.split(",") : g.allowedTopics,
    });
    setSaved(true);
    onChanged?.();
  }
  async function remove() {
    if (!confirm(`Delete group "${g.name}"? Contacts stay but lose this group.`)) return;
    await api.deleteGroup(g.id);
    onChanged?.();
  }
  const topicsStr = Array.isArray(g.allowedTopics) ? g.allowedTopics.join(", ") : g.allowedTopics || "";

  return (
    <div className="card pad">
      <div className="between" style={{ marginBottom: 10 }}>
        <div className="row" style={{ alignItems: "center", gap: 9 }}>
          <span className="dot-chip" style={{ background: color, width: 10, height: 10 }} />
          <h3 style={{ fontSize: "14.5px" }}>{group.name}</h3>
        </div>
        <span className="faint" style={{ fontSize: "12.5px" }}>{count} {count === 1 ? "person" : "people"}</span>
      </div>
      <p className="muted clamp2" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 12, minHeight: 39 }}>
        {group.greeting ? `“${group.greeting}”` : <span className="faint">No custom greeting</span>}
      </p>
      <div className="row" style={{ gap: 6, marginBottom: 14 }}>
        {topics.slice(0, 2).map((t) => <span key={t} className="tag plain">{t}</span>)}
        {topics.length > 2 && <span className="tag plain">+{topics.length - 2}</span>}
      </div>
      <div className="row">
        <button className="btn secondary sm" onClick={() => setEditing((e) => !e)}>{editing ? "Done" : "Customize"}</button>
        <button className="btn danger sm" onClick={remove}><Icon n="trash" /></button>
      </div>

      {editing && (
        <div className="vstack" style={{ marginTop: 16, borderTop: "1px solid var(--hairline)", paddingTop: 16, gap: 12 }}>
          <label className="field grow"><span className="lbl">Greeting</span><textarea rows={2} value={g.greeting || ""} onChange={(e) => set("greeting", e.target.value)} /></label>
          <label className="field grow"><span className="lbl">Behavior <span className="hint">· appended to prompt</span></span><textarea rows={2} value={g.systemPromptAddon || ""} onChange={(e) => set("systemPromptAddon", e.target.value)} /></label>
          <label className="field grow"><span className="lbl">Allowed topics</span><input value={topicsStr} onChange={(e) => set("allowedTopics", e.target.value)} /></label>
          <div className="row" style={{ alignItems: "center" }}>
            <button className="btn sm" onClick={save}><Icon n="check" />Save</button>
            {saved && <span className="saved"><Icon n="check" />Saved</span>}
          </div>
        </div>
      )}
    </div>
  );
}

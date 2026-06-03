"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function ContactsPage() {
  const [userId, setUserId] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", groupId: "", notes: "" });
  const [groupName, setGroupName] = useState("");
  const [err, setErr] = useState(null);

  async function load(uid) {
    setContacts(await api.contacts(uid));
    setGroups(await api.groups(uid));
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

  async function addContact(e) {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    await api.addContact(userId, { ...form, groupId: form.groupId || null });
    setForm({ name: "", phone: "", groupId: "", notes: "" });
    await load(userId);
  }

  async function addGroup(e) {
    e.preventDefault();
    if (!groupName) return;
    await api.addGroup(userId, { name: groupName });
    setGroupName("");
    await load(userId);
  }

  async function del(id) {
    await api.deleteContact(id);
    await load(userId);
  }

  if (err) return <main className="container"><div className="banner">⚠ {err}</div></main>;

  return (
    <main className="container">
      <div className="page-head">
        <h1>Contacts</h1>
        <p className="sub">Known callers are greeted by name and follow their group's rules.</p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Add contact</h2>
        <form onSubmit={addContact}>
          <div className="row">
            <div className="field">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Phone (E.164)</label>
              <input value={form.phone} placeholder="+1415…" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="field">
              <label>Group</label>
              <select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
                <option value="">— none —</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          </div>
          <label>Notes (per-caller agent instructions)</label>
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div style={{ marginTop: 14 }}><button type="submit">Add contact</button></div>
        </form>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Groups</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Customize the greeting and behavior for everyone in a group (Family, VIP, Vendors…).
        </p>
        <form onSubmit={addGroup} className="row" style={{ alignItems: "flex-end" }}>
          <div className="field">
            <label>New group name</label>
            <input value={groupName} onChange={(e) => setGroupName(e.target.value)} />
          </div>
          <button className="secondary" type="submit">Add group</button>
        </form>
      </div>

      {groups.map((g) => <GroupEditor key={g.id} group={g} onChanged={() => load(userId)} />)}

      <h2>All contacts</h2>
      {contacts.length === 0 ? (
        <div className="card"><div className="empty"><div className="ico">👥</div>No contacts yet.</div></div>
      ) : (
        <div className="card tight">
          <div className="table-wrap">
            <table className="responsive">
              <thead><tr><th>Name</th><th>Phone</th><th>Group</th><th>Notes</th><th></th></tr></thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id}>
                    <td data-label="Name"><b>{c.name}</b></td>
                    <td data-label="Phone" className="muted">{c.phone}</td>
                    <td data-label="Group">{c.group ? <span className="tag plain">{c.group.name}</span> : <span className="faint">—</span>}</td>
                    <td data-label="Notes" className="muted">{c.notes || "—"}</td>
                    <td data-label=""><button className="danger" onClick={() => del(c.id)}>Delete</button></td>
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

function GroupEditor({ group, onChanged }) {
  const [g, setG] = useState(group);
  const [saved, setSaved] = useState(false);

  function set(field, value) { setG((p) => ({ ...p, [field]: value })); setSaved(false); }

  async function save() {
    await api.updateGroup(g.id, {
      name: g.name,
      greeting: g.greeting,
      systemPromptAddon: g.systemPromptAddon,
      allowedTopics: typeof g.allowedTopics === "string" ? g.allowedTopics.split(",") : g.allowedTopics,
    });
    setSaved(true);
    onChanged?.();
  }

  async function remove() {
    if (!confirm(`Delete group "${g.name}"? Contacts stay, but lose this group.`)) return;
    await api.deleteGroup(g.id);
    onChanged?.();
  }

  const topicsStr = Array.isArray(g.allowedTopics) ? g.allowedTopics.join(", ") : g.allowedTopics || "";

  return (
    <div className="card">
      <div className="between">
        <input value={g.name} onChange={(e) => set("name", e.target.value)} style={{ maxWidth: 260, fontWeight: 600 }} />
        <button className="danger" onClick={remove}>Delete</button>
      </div>
      <label>Custom greeting (first thing the agent says to this group)</label>
      <textarea rows={2} value={g.greeting || ""} onChange={(e) => set("greeting", e.target.value)} />
      <label>Behavior instructions (appended to the agent's prompt)</label>
      <textarea rows={2} value={g.systemPromptAddon || ""} onChange={(e) => set("systemPromptAddon", e.target.value)}
        placeholder="e.g. Be warm and casual. You may share that Alex is doing well." />
      <label>Topics the agent may answer (comma-separated)</label>
      <input value={topicsStr} onChange={(e) => set("allowedTopics", e.target.value)}
        placeholder="e.g. when Alex will be free, whether Alex is okay" />
      <div className="row" style={{ alignItems: "center", marginTop: 14 }}>
        <button className="sm" onClick={save}>Save group</button>
        {saved && <span className="saved">✓ Saved</span>}
      </div>
    </div>
  );
}

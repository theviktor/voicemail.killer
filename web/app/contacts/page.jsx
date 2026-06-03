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
      } catch (e) {
        setErr(e.message);
      }
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

  if (err) return <main className="container"><div className="card">Error: {err}</div></main>;

  return (
    <main className="container">
      <h1>Contacts</h1>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Add contact</h2>
        <form onSubmit={addContact}>
          <div className="row">
            <div style={{ flex: 1, minWidth: 180 }}>
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label>Phone (E.164)</label>
              <input value={form.phone} placeholder="+1415..." onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label>Group</label>
              <select value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
                <option value="">— none —</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          </div>
          <label>Notes (per-caller agent instructions)</label>
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div style={{ marginTop: 12 }}><button type="submit">Add contact</button></div>
        </form>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Groups</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Customize how the agent greets and behaves for everyone in a group (e.g. Family, VIP, Vendors).
          Assign contacts to a group above.
        </p>
        <form onSubmit={addGroup} className="row" style={{ alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label>New group name</label>
            <input value={groupName} onChange={(e) => setGroupName(e.target.value)} />
          </div>
          <button className="secondary" type="submit">Add group</button>
        </form>
      </div>

      {groups.map((g) => (
        <GroupEditor key={g.id} group={g} onChanged={() => load(userId)} />
      ))}
      {groups.length === 0 && <p className="muted">No groups yet. Add one above.</p>}

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>Name</th><th>Phone</th><th>Group</th><th>Notes</th><th></th></tr></thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.phone}</td>
                <td>{c.group?.name || "—"}</td>
                <td className="muted">{c.notes || "—"}</td>
                <td><button className="danger" onClick={() => del(c.id)}>Delete</button></td>
              </tr>
            ))}
            {contacts.length === 0 && <tr><td colSpan={5} className="muted" style={{ padding: 16 }}>No contacts.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function GroupEditor({ group, onChanged }) {
  const [g, setG] = useState(group);
  const [saved, setSaved] = useState(false);

  function set(field, value) {
    setG((p) => ({ ...p, [field]: value }));
    setSaved(false);
  }

  async function save() {
    await api.updateGroup(g.id, {
      name: g.name,
      greeting: g.greeting,
      systemPromptAddon: g.systemPromptAddon,
      allowedTopics: typeof g.allowedTopics === "string"
        ? g.allowedTopics.split(",")
        : g.allowedTopics,
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
      <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
        <input
          value={g.name}
          onChange={(e) => set("name", e.target.value)}
          style={{ maxWidth: 240, fontWeight: 600 }}
        />
        <button className="danger" onClick={remove}>Delete</button>
      </div>

      <label>Custom greeting (what the agent says first to this group)</label>
      <textarea rows={2} value={g.greeting || ""} onChange={(e) => set("greeting", e.target.value)} />

      <label>Behavior instructions (appended to the agent's prompt for this group)</label>
      <textarea
        rows={2}
        value={g.systemPromptAddon || ""}
        onChange={(e) => set("systemPromptAddon", e.target.value)}
        placeholder="e.g. Be warm and casual. You may share that Alex is doing well and will call back soon."
      />

      <label>Topics the agent may answer for this group (comma-separated)</label>
      <input
        value={topicsStr}
        onChange={(e) => set("allowedTopics", e.target.value)}
        placeholder="e.g. when Alex will be free, whether Alex is okay"
      />

      <div className="row" style={{ alignItems: "center", marginTop: 12 }}>
        <button onClick={save}>Save group</button>
        {saved && <span style={{ color: "var(--green)" }}>Saved ✓</span>}
      </div>
    </div>
  );
}

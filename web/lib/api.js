const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const apiBase = BASE;

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    ...opts,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  me: () => req("/api/me"),
  user: (id) => req(`/api/users/${id}`),
  updateUser: (id, body) => req(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  calls: (userId) => req(`/api/users/${userId}/calls`),
  call: (id) => req(`/api/calls/${id}`),
  recordingUrl: (id) => `${BASE}/api/calls/${id}/recording`,

  contacts: (userId) => req(`/api/users/${userId}/contacts`),
  addContact: (userId, body) =>
    req(`/api/users/${userId}/contacts`, { method: "POST", body: JSON.stringify(body) }),
  deleteContact: (id) => req(`/api/contacts/${id}`, { method: "DELETE" }),

  groups: (userId) => req(`/api/users/${userId}/groups`),
  addGroup: (userId, body) =>
    req(`/api/users/${userId}/groups`, { method: "POST", body: JSON.stringify(body) }),
  updateGroup: (id, body) =>
    req(`/api/groups/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteGroup: (id) => req(`/api/groups/${id}`, { method: "DELETE" }),

  outbound: (userId) => req(`/api/users/${userId}/outbound`),
  addOutbound: (userId, body) =>
    req(`/api/users/${userId}/outbound`, { method: "POST", body: JSON.stringify(body) }),
  cancelOutbound: (id) => req(`/api/outbound/${id}`, { method: "DELETE" }),

  carriers: () => req("/api/carriers"),
};

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const TOKEN_KEY = "vk_token";

export const apiBase = BASE;

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setToken(t) {
  if (typeof window !== "undefined") window.localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
}

async function req(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { cache: "no-store", ...opts, headers });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Not authenticated");
  }
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try { const j = await res.json(); if (j.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // auth
  login: async (email, password) => {
    const { token, user } = await req("/api/auth/login", {
      method: "POST", body: JSON.stringify({ email, password }),
    });
    setToken(token);
    return user;
  },
  logout: () => clearToken(),
  me: () => req("/api/auth/me"),

  // self-service
  user: (id) => req(`/api/users/${id}`),
  updateUser: (id, body) => req(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  calls: (userId) => req(`/api/users/${userId}/calls`),
  call: (id) => req(`/api/calls/${id}`),
  recordingUrl: (id) => `${BASE}/api/calls/${id}/recording`,

  contacts: (userId) => req(`/api/users/${userId}/contacts`),
  addContact: (userId, body) => req(`/api/users/${userId}/contacts`, { method: "POST", body: JSON.stringify(body) }),
  deleteContact: (id) => req(`/api/contacts/${id}`, { method: "DELETE" }),

  groups: (userId) => req(`/api/users/${userId}/groups`),
  addGroup: (userId, body) => req(`/api/users/${userId}/groups`, { method: "POST", body: JSON.stringify(body) }),
  updateGroup: (id, body) => req(`/api/groups/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteGroup: (id) => req(`/api/groups/${id}`, { method: "DELETE" }),

  outbound: (userId) => req(`/api/users/${userId}/outbound`),
  addOutbound: (userId, body) => req(`/api/users/${userId}/outbound`, { method: "POST", body: JSON.stringify(body) }),
  cancelOutbound: (id) => req(`/api/outbound/${id}`, { method: "DELETE" }),

  carriers: () => req("/api/carriers"),

  // admin
  adminUsers: () => req("/api/admin/users"),
  adminCreateUser: (body) => req("/api/admin/users", { method: "POST", body: JSON.stringify(body) }),
  adminUpdateUser: (id, body) => req(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  adminDeleteUser: (id) => req(`/api/admin/users/${id}`, { method: "DELETE" }),
  adminConfigureTwilio: (id) => req(`/api/admin/users/${id}/configure-twilio`, { method: "POST" }),
  adminTwilioNumbers: () => req("/api/admin/twilio-numbers"),
};

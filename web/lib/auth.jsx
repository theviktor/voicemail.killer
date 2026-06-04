"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, getToken, clearToken } from "./api";

const AuthCtx = createContext({ user: null, loading: true, reload: () => {}, logout: () => {} });
export const useAuth = () => useContext(AuthCtx);

const PUBLIC_PATHS = ["/login"];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const path = usePathname();
  const router = useRouter();

  async function load() {
    if (!getToken()) { setUser(null); setLoading(false); return; }
    try { setUser(await api.me()); }
    catch { clearToken(); setUser(null); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  // Redirect logic once auth state is known.
  useEffect(() => {
    if (loading) return;
    const isPublic = PUBLIC_PATHS.includes(path);
    if (!user && !isPublic) router.replace("/login");
    if (user && isPublic) router.replace("/");
  }, [loading, user, path]);

  function logout() {
    clearToken();
    setUser(null);
    router.replace("/login");
  }

  const value = { user, loading, reload: load, logout };

  let body;
  if (loading) body = <div className="spin">Loading…</div>;
  else if (PUBLIC_PATHS.includes(path)) body = children;
  else if (!user) body = <div className="spin">Redirecting…</div>;
  else body = children;

  return <AuthCtx.Provider value={value}>{body}</AuthCtx.Provider>;
}

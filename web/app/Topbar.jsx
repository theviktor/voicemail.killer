"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { Icon, BrandMark } from "./Icon";
import { initials } from "../lib/format";

const NAV = [
  { href: "/", label: "Calls", icon: "grid" },
  { href: "/messages", label: "Leave a message", icon: "message" },
  { href: "/contacts", label: "Contacts", icon: "users" },
  { href: "/settings", label: "Settings", icon: "settings" },
  { href: "/carriers", label: "Forwarding", icon: "forward" },
  { href: "/admin", label: "Admin", icon: "shield", admin: true },
];

function ThemeToggle() {
  const [mode, setMode] = useState("light");
  useEffect(() => {
    setMode(document.documentElement.getAttribute("data-mode") || "light");
  }, []);
  function toggle() {
    const next = mode === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-mode", next);
    try { localStorage.setItem("vera-mode", next); } catch {}
    setMode(next);
  }
  return (
    <button className="iconbtn" onClick={toggle} title="Toggle appearance" aria-label="Toggle theme">
      <Icon n={mode === "dark" ? "sun" : "moon"} />
    </button>
  );
}

export default function Topbar() {
  const path = usePathname();
  const { user, logout } = useAuth();
  const isActive = (href) => (href === "/" ? path === "/" || path.startsWith("/calls") : path.startsWith(href));

  if (!user || path === "/login") return null;

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand">
          <div className="brand-mark"><BrandMark /></div>
          <span className="brand-name">Vera</span>
        </Link>
        <nav className="nav">
          {NAV.filter((n) => !n.admin || user.role === "ADMIN").map((n) => (
            <Link key={n.href} href={n.href} className={isActive(n.href) ? "active" : ""}>
              <Icon n={n.icon} /><span className="lbl-txt">{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="topbar-right">
          <ThemeToggle />
          <button className="usr" onClick={logout} title="Sign out">
            <div className="avatar">{initials(user.name)}</div>
            <span className="usr-name">{user.name}<span className="role">{user.role === "ADMIN" ? "Admin" : "Member"}</span></span>
          </button>
        </div>
      </div>
    </header>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth";

const LINKS = [
  { href: "/", label: "Calls" },
  { href: "/messages", label: "Leave a Message" },
  { href: "/contacts", label: "Contacts" },
  { href: "/settings", label: "Settings" },
  { href: "/carriers", label: "Forwarding" },
];

export default function Nav() {
  const path = usePathname();
  const { user, logout } = useAuth();
  const isActive = (href) => (href === "/" ? path === "/" : path.startsWith(href));

  // Hidden on the login screen / before auth resolves.
  if (!user || path === "/login") return null;

  return (
    <header className="appbar">
      <div className="appbar-inner">
        <Link href="/" className="brand">
          <span className="logo" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </span>
          <span>AI Receptionist</span>
        </Link>
        <nav className="navlinks">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={isActive(l.href) ? "active" : ""}>
              {l.label}
            </Link>
          ))}
          {user.role === "ADMIN" && (
            <Link href="/admin" className={isActive("/admin") ? "active" : ""}>Admin</Link>
          )}
        </nav>
        <div className="navuser">
          <span className="navuser-name" title={user.email}>{user.name}</span>
          <button className="secondary sm" onClick={logout}>Log out</button>
        </div>
      </div>
    </header>
  );
}

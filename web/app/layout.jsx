import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "AI Receptionist",
  description: "Personal AI receptionist dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <span className="brand">📞 AI Receptionist</span>
          <Link href="/">Calls</Link>
          <Link href="/messages">Leave a Message</Link>
          <Link href="/settings">Settings</Link>
          <Link href="/contacts">Contacts</Link>
          <Link href="/carriers">Forwarding Setup</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}

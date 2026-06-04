import "./globals.css";
import Topbar from "./Topbar";
import { AuthProvider } from "../lib/auth";

export const metadata = {
  title: "Vera — your front desk, answered",
  description: "Vera answers, screens, and takes messages on your line.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

// Restore appearance before paint (defaults to light). Direction is locked to Pine.
const themeScript = `(function(){try{var m=localStorage.getItem('vera-mode')||'light';var e=document.documentElement;e.setAttribute('data-mode',m);e.setAttribute('data-dir','pine');}catch(e){document.documentElement.setAttribute('data-mode','light');document.documentElement.setAttribute('data-dir','pine');}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-mode="light" data-dir="pine" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AuthProvider>
          <Topbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

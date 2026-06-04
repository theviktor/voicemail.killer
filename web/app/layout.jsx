import "./globals.css";
import Nav from "./Nav";
import { AuthProvider } from "../lib/auth";

export const metadata = {
  title: "AI Receptionist",
  description: "Your personal AI receptionist — answers, screens, and takes messages.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0c12",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Nav />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

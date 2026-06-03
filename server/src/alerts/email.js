import nodemailer from "nodemailer";
import { env } from "../env.js";

let _transport = null;

function transport() {
  if (_transport) return _transport;
  _transport = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });
  return _transport;
}

export async function sendEmail({ to, subject, text, html }) {
  if (!to) {
    console.warn("[email] no recipient; skipping");
    return;
  }
  const from = `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`;
  await transport().sendMail({ from, to, subject, text, html });
  console.log(`[email] sent to ${to}: ${subject}`);
}

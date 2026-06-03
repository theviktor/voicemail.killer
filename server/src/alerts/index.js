import { sendEmail } from "./email.js";
import { sendSms } from "./sms.js";
import { env } from "../env.js";

/**
 * Notify the user that a caller left a message. Email + SMS are best-effort and
 * independent — one failing does not block the other.
 *
 * @param {object} user  the User row (alertEmail / alertPhone / name)
 * @param {object} call  the updated CallRecord row
 */
export async function sendMessageAlert(user, call) {
  const who = call.callerName || call.callerNumber || "an unknown caller";
  const urgency = (call.urgency || "NORMAL").toLowerCase();
  const summary = call.messageSummary || "New message";
  const dashboardUrl = env.publicServerUrl
    ? `${env.publicServerUrl.replace(/:\d+$/, "")}` // best-effort link back
    : "";

  const lines = [
    `New call message for ${user.name}`,
    `From: ${who}`,
    `Urgency: ${urgency}`,
    `Summary: ${summary}`,
    call.message ? `Message: ${call.message}` : null,
    call.callbackNumber ? `Callback: ${call.callbackNumber}` : null,
  ].filter(Boolean);

  const text = lines.join("\n");

  const tasks = [];

  if (user.alertEmail) {
    tasks.push(
      sendEmail({
        to: user.alertEmail,
        subject: `[${urgency.toUpperCase()}] Message from ${who}`,
        text:
          text +
          (dashboardUrl ? `\n\nView full transcript & recording in your dashboard.` : ""),
        html: `<h2>New call message</h2><pre style="font-family:inherit">${escapeHtml(
          text
        )}</pre>`,
      }).catch((e) => console.error("[alert] email failed:", e.message))
    );
  }

  if (user.alertPhone) {
    const smsBody =
      `📞 ${who} (${urgency}): ${summary}` +
      (call.callbackNumber ? ` — callback ${call.callbackNumber}` : "");
    tasks.push(
      sendSms({ to: user.alertPhone, body: smsBody.slice(0, 600) }).catch((e) =>
        console.error("[alert] sms failed:", e.message)
      )
    );
  }

  await Promise.all(tasks);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

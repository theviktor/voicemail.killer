// One-shot local end-to-end wiring:
//  1. find the running ngrok tunnel's https URL (or use --url=...)
//  2. patch PUBLIC_SERVER_URL in the repo-root .env
//  3. point the Twilio number's voice webhook at <url>/twilio/voice
//
// Usage:
//   node scripts/e2e.mjs                 # auto-detect ngrok
//   node scripts/e2e.mjs --url=https://abcd.ngrok-free.app
//
// Prereqs in .env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, DEMO_TWILIO_NUMBER
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import dotenv from "dotenv";
import twilio from "twilio";

const here = dirname(fileURLToPath(import.meta.url)); // server/scripts
const ENV_PATH = join(here, "../../.env");

dotenv.config({ path: ENV_PATH });

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : undefined;
}

async function detectNgrok() {
  const override = arg("url");
  if (override) return override.replace(/\/$/, "");
  try {
    const res = await fetch("http://127.0.0.1:4040/api/tunnels");
    const data = await res.json();
    const https = (data.tunnels || []).find((t) => t.public_url?.startsWith("https://"));
    if (https) return https.public_url.replace(/\/$/, "");
  } catch {
    /* ngrok not running */
  }
  return null;
}

function patchEnv(key, value) {
  let body = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : "";
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(body)) body = body.replace(re, line);
  else body += (body.endsWith("\n") || body === "" ? "" : "\n") + line + "\n";
  writeFileSync(ENV_PATH, body);
}

async function main() {
  const url = await detectNgrok();
  if (!url) {
    console.error(
      "\n✖ No ngrok tunnel found.\n" +
        "  Start one in another terminal:  ngrok http 8080\n" +
        "  Then re-run:                     npm run e2e:setup\n" +
        "  (or pass it directly:            npm run e2e:setup -- --url=https://<your>.ngrok-free.app)\n"
    );
    process.exit(1);
  }
  console.log(`✔ Public URL: ${url}`);

  patchEnv("PUBLIC_SERVER_URL", url);
  console.log(`✔ Wrote PUBLIC_SERVER_URL to .env`);

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const number = process.env.DEMO_TWILIO_NUMBER;
  if (!sid || !token || !number || number.includes("X")) {
    console.error(
      "\n✖ Missing Twilio config in .env. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and DEMO_TWILIO_NUMBER (E.164).\n"
    );
    process.exit(1);
  }

  const client = twilio(sid, token);

  // Find the IncomingPhoneNumber resource for this number.
  const matches = await client.incomingPhoneNumbers.list({ phoneNumber: number, limit: 20 });
  if (matches.length === 0) {
    console.error(
      `\n✖ ${number} is not an IncomingPhoneNumber on this Twilio account.\n` +
        "  Check DEMO_TWILIO_NUMBER (E.164, e.g. +14155551234) and the account creds.\n"
    );
    process.exit(1);
  }

  const voiceUrl = `${url}/twilio/voice`;
  const pn = matches[0];
  await client.incomingPhoneNumbers(pn.sid).update({
    voiceUrl,
    voiceMethod: "POST",
  });

  console.log(`✔ Twilio ${number} voice webhook → ${voiceUrl} (POST)`);
  console.log("\nNext:");
  console.log("  • Make sure the server is running and reachable on :8080");
  console.log("  • Forward your cell to this number (see the Forwarding Setup page) OR");
  console.log("    just call the Twilio number directly to test the agent.");
  console.log("");
}

main().catch((e) => {
  console.error("e2e setup failed:", e.message);
  process.exit(1);
});

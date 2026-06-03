import { toolDefinitions } from "../tools/registry.js";

/** Format an E.164 number for natural speech, e.g. +13157239126 → (315) 723-9126. */
export function formatPhone(raw) {
  if (!raw) return null;
  const d = raw.replace(/[^\d]/g, "");
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  if (ten.length === 10) return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
  return raw;
}

/** Anonymous / withheld caller id has no usable number. */
function hasCallerId(callerNumber) {
  return !!callerNumber && /\d/.test(callerNumber) && !/anonymous|private|unavailable|restricted/i.test(callerNumber);
}

/**
 * Build the per-caller system prompt from the user, the matched contact/group,
 * the call classification, and the caller's caller-ID number.
 */
function buildSystemPrompt({ user, contact, group, classification, callerNumber, outboundMessages = [] }) {
  const parts = [];

  parts.push(
    `You are a warm, concise, professional phone receptionist for ${user.name}` +
      (user.companyName ? ` at ${user.companyName}` : "") +
      `. You are answering because ${user.name} could not pick up.`
  );
  parts.push(
    `${user.name} is currently ${user.availability}. Do not claim ${user.name} is available. ` +
      `Your job is to greet the caller, find out why they are calling, and either answer permitted ` +
      `questions or take a message. Keep replies short and natural for a phone call. Ask one question at a time.`
  );

  // The caller's number, so the agent can use it as the default callback and
  // never has to ask the caller to recite their own caller ID.
  if (hasCallerId(callerNumber)) {
    parts.push(
      `The caller is calling from ${formatPhone(callerNumber)} (their caller ID). ` +
        `Use this as the default callback number. When taking a message, confirm it naturally — ` +
        `e.g. "I have your number as ${formatPhone(callerNumber)}, is that the best one?" — instead of ` +
        `asking them to read it out. Only ask for a different number if they want to be reached elsewhere.`
    );
  } else {
    parts.push(
      `The caller's caller ID is withheld or unavailable, so you do not have their number. ` +
        `If you take a message, ask them for the best callback number.`
    );
  }

  // Recording disclosure (demo): the greeting also mentions it.
  parts.push(`This call may be recorded for ${user.name}. If asked, confirm that politely.`);

  if (classification === "KNOWN" && contact) {
    parts.push(
      `The caller is recognized as ${contact.name}, a known contact of ${user.name}` +
        (group ? ` in the "${group.name}" group` : "") +
        `. Greet them by name and be especially helpful.`
    );
    if (contact.notes) parts.push(`Notes about this contact: ${contact.notes}`);
    if (group?.systemPromptAddon) parts.push(group.systemPromptAddon);
    if (group?.allowedTopics?.length) {
      parts.push(
        `You may answer questions about: ${group.allowedTopics.join(", ")}. ` +
          `For anything outside that, take a message instead.`
      );
    }
  } else if (classification === "TELEMARKETER") {
    parts.push(
      `This appears to be a telemarketer, sales, or robocall. ${user.telemarketerPolicy} ` +
        `Call the flag_telemarketer tool. Do not take a personal message for these.`
    );
    if (user.telemarketerTopics?.length) {
      parts.push(
        `${user.name} is only interested in these topics: ${user.telemarketerTopics.join(", ")}. ` +
          `If the call is clearly about one of these, you may take a message instead of declining.`
      );
    }
  } else {
    parts.push(
      `The caller is not in ${user.name}'s contacts. Be polite but a bit more careful. ` +
        `Find out who they are and why they're calling. If it sounds like a sales or robocall, ` +
        `call flag_telemarketer and follow this policy: ${user.telemarketerPolicy}`
    );
  }

  parts.push(
    `When you have enough detail, call the take_message tool with a short summary, the full message, ` +
      `and a callback number. After it succeeds, let the caller know ${user.name} will get the message, ` +
      `then say goodbye.`
  );

  // Messages the user left FOR this caller, to deliver during the call.
  const pending = outboundMessages || [];
  if (pending.length) {
    const who = contact?.name || "the caller";
    const list = pending
      .map((m) => `  - [id: ${m.id}] "${m.body}"`)
      .join("\n");
    parts.push(
      `IMPORTANT: ${user.name} left ${pending.length === 1 ? "a message" : "messages"} for ${who}. ` +
        `Early in the call (after greeting and confirming who they are), deliver ${pending.length === 1 ? "it" : "each one"} ` +
        `naturally, e.g. "${user.name} asked me to let you know: …". Immediately after you read each one aloud, ` +
        `call the mark_message_delivered tool with its id so it isn't repeated next time.\n${list}`
    );
  }

  if (user.systemPromptAddon) parts.push(user.systemPromptAddon);

  return parts.join("\n\n");
}

/** Build the greeting the agent speaks first (immutable after session.ready). */
function buildGreeting({ user, contact, group, classification }) {
  if (group?.greeting) return group.greeting;

  if (classification === "KNOWN" && contact) {
    return `Hi ${contact.name}, you've reached ${user.name}'s assistant. ${user.name} can't take the call right now, but I can help or pass along a message. This call may be recorded. What can I do for you?`;
  }
  return `Hi, you've reached ${user.name}'s assistant. ${user.name} isn't available right now, but I can help or take a message. This call may be recorded. How can I help you?`;
}

/**
 * Build the full session.update payload for the Voice Agent API.
 * Telephony: input AND output use audio/pcmu so Twilio's μ-law 8kHz passes
 * through end-to-end with zero resampling.
 *
 * NOTE: `greeting` and `output.voice` are IMMUTABLE after session.ready, so they
 * must be correct here in the very first session.update.
 */
export function buildSessionUpdate(ctx) {
  const { user, contact } = ctx;
  // callerNumber may live on ctx.call (from the bridge) or directly on ctx.
  const callerNumber = ctx.callerNumber ?? ctx.call?.callerNumber ?? null;
  const promptCtx = { ...ctx, callerNumber };

  // Keyterms improve recognition of names the caller is likely to say.
  const keyterms = [user.name, user.companyName, contact?.name].filter(Boolean).slice(0, 100);

  return {
    type: "session.update",
    session: {
      system_prompt: buildSystemPrompt(promptCtx),
      greeting: buildGreeting(promptCtx),
      input: {
        format: { encoding: "audio/pcmu" }, // G.711 μ-law 8kHz from Twilio
        keyterms,
        turn_detection: {
          vad_threshold: 0.5,
          min_silence: 800,
          max_silence: 3500, // callers pause while composing a message
          interrupt_response: true,
        },
      },
      output: {
        voice: user.voice || "james",
        format: { encoding: "audio/pcmu" }, // μ-law back to Twilio
      },
      tools: toolDefinitions({ canDeliver: (ctx.outboundMessages || []).length > 0 }),
    },
  };
}

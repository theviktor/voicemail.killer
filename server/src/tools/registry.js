import { takeMessage } from "./takeMessage.js";
import { flagTelemarketer } from "./flagTelemarketer.js";
import { markMessageDelivered } from "./markMessageDelivered.js";

/**
 * Voice Agent API tool definitions use a FLAT schema:
 *   { type:"function", name, description, parameters, execution_mode?, timeout_seconds? }
 * NOT OpenAI's nested { type:"function", function:{...} } form.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.canDeliver] include the mark_message_delivered tool
 */
export function toolDefinitions(opts = {}) {
  const tools = [
    {
      type: "function",
      name: "take_message",
      description:
        "Record a message from the caller for the user and notify the user. " +
        "Call this once you have a clear reason for the call and any message the " +
        "caller wants to leave. Always confirm a callback number if the caller is not recognized.",
      parameters: {
        type: "object",
        properties: {
          caller_name: { type: "string", description: "The caller's name, if given." },
          summary: {
            type: "string",
            description: "One short sentence summarizing the reason for the call.",
          },
          message: {
            type: "string",
            description: "The full message the caller wants to leave, verbatim where possible.",
          },
          callback_number: {
            type: "string",
            description:
              "Best number to call back. If the caller confirms their caller ID is fine, " +
              "you may omit this and it defaults to their caller-ID number.",
          },
          urgency: {
            type: "string",
            enum: ["low", "normal", "high"],
            description: "How urgent the caller says this is.",
          },
        },
        required: ["summary", "message"],
      },
      execution_mode: "interactive",
      timeout_seconds: 15,
    },
    {
      type: "function",
      name: "flag_telemarketer",
      description:
        "Call this when you determine the caller is a telemarketer, sales call, or robocall " +
        "that the user has not expressed interest in.",
      parameters: {
        type: "object",
        properties: {
          company: { type: "string", description: "Company or product being pitched, if stated." },
          reason: { type: "string", description: "Why you concluded this is a telemarketer." },
        },
        required: [],
      },
      execution_mode: "interactive",
      timeout_seconds: 15,
    },
  ];

  if (opts.canDeliver) {
    tools.push({
      type: "function",
      name: "mark_message_delivered",
      description:
        "Call this immediately after you have read out a message that the user left for this " +
        "caller, so it is not delivered again next time. Pass the message's id.",
      parameters: {
        type: "object",
        properties: {
          message_id: { type: "string", description: "The id of the delivered message." },
        },
        required: ["message_id"],
      },
      execution_mode: "interactive",
      timeout_seconds: 15,
    });
  }

  return tools;
}

const HANDLERS = {
  take_message: takeMessage,
  flag_telemarketer: flagTelemarketer,
  mark_message_delivered: markMessageDelivered,
};

/**
 * Execute a tool by name. `args` is already-parsed JSON from the tool.call event.
 * Returns a JSON-serializable result object.
 */
export async function dispatchTool(name, args, ctx) {
  const handler = HANDLERS[name];
  if (!handler) {
    return { error: `Unknown tool: ${name}` };
  }
  try {
    return await handler(args || {}, ctx);
  } catch (e) {
    console.error(`[tool:${name}] failed:`, e);
    return { error: `Tool ${name} failed: ${e.message}` };
  }
}

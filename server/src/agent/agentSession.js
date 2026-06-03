import WebSocket from "ws";
import { env } from "../env.js";
import { dispatchTool } from "../tools/registry.js";

/**
 * Manages one AssemblyAI Voice Agent API WebSocket session for a single call.
 *
 * Wiring notes verified against the events reference:
 *  - Auth: `Authorization: Bearer <key>` (Bearer IS required for the Voice Agent API).
 *  - reply.audio carries base64 audio in the `data` field (NOT `audio`).
 *  - input.audio carries base64 audio in the `audio` field.
 *  - tool.call.arguments is an object; tool.result.result must be a JSON string.
 *  - greeting / output.voice are immutable after session.ready, so the first
 *    session.update must already be correct.
 */
export class AgentSession {
  /**
   * @param {object} opts
   * @param {object} opts.sessionUpdate  full session.update payload
   * @param {object} opts.toolContext    passed to tool handlers ({ callRecordId, user })
   * @param {(b64:string)=>void} opts.onAgentAudio   base64 μ-law chunk to play to caller
   * @param {()=>void} opts.onInterrupted             caller barged in — flush playback
   * @param {(role:string,text:string)=>void} opts.onTranscript
   * @param {()=>void} [opts.onReady]
   * @param {()=>void} [opts.onClose]
   */
  constructor(opts) {
    this.opts = opts;
    this.ws = null;
    this.ready = false;
    this.sessionId = null;
    this.replyInProgress = false;
    /** call_id -> { result|undefined } pending tool results awaiting reply.done */
    this.pending = new Map();
  }

  connect() {
    this.ws = new WebSocket(env.agentWsUrl, {
      headers: { Authorization: `Bearer ${env.assemblyAiKey}` },
    });

    this.ws.on("open", () => {
      // Send session.update immediately — don't wait for session.ready.
      this._send(this.opts.sessionUpdate);
    });

    this.ws.on("message", (raw) => this._onMessage(raw));
    this.ws.on("error", (err) => console.error("[agent] ws error:", err.message));
    this.ws.on("close", (code) => {
      console.log(`[agent] closed (${code})`);
      this.opts.onClose?.();
    });
  }

  _send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  /** Forward a base64 μ-law chunk from Twilio to the agent. */
  sendAudio(b64) {
    if (!this.ready) return; // drop until session.ready (greeting plays first)
    this._send({ type: "input.audio", audio: b64 });
  }

  close() {
    try {
      this._send({ type: "session.close" });
    } catch {}
    try {
      this.ws?.close();
    } catch {}
  }

  async _onMessage(raw) {
    let ev;
    try {
      ev = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (ev.type) {
      case "session.ready":
        this.ready = true;
        this.sessionId = ev.session_id;
        this.opts.onReady?.();
        break;

      case "reply.started":
        this.replyInProgress = true;
        break;

      case "reply.audio":
        // base64 μ-law (because output.format.encoding === "audio/pcmu")
        if (ev.data) this.opts.onAgentAudio?.(ev.data);
        break;

      case "transcript.user":
        if (ev.text) this.opts.onTranscript?.("caller", ev.text);
        break;

      case "transcript.agent":
        if (ev.text) this.opts.onTranscript?.("agent", ev.text);
        break;

      case "reply.done": {
        this.replyInProgress = false;
        const interrupted = ev.status === "interrupted";
        if (interrupted) {
          this.pending.clear();
          this.opts.onInterrupted?.();
        } else {
          this._flushToolResults();
        }
        break;
      }

      case "tool.call":
        this._handleToolCall(ev);
        break;

      case "error":
        console.error("[agent] error event:", ev.error || ev.message || ev);
        break;

      default:
        // input.speech.started/stopped, transcript.user.delta, session.update echo, etc.
        break;
    }
  }

  async _handleToolCall(ev) {
    const result = await dispatchTool(ev.name, ev.arguments || {}, this.opts.toolContext);
    this.pending.set(ev.call_id, result);
    // If no reply is mid-flight, send right away; otherwise wait for reply.done.
    if (!this.replyInProgress) this._flushToolResults();
  }

  _flushToolResults() {
    for (const [callId, result] of this.pending.entries()) {
      this._send({
        type: "tool.result",
        call_id: callId,
        result: JSON.stringify(result), // tool.result.result must be a JSON string
      });
    }
    this.pending.clear();
  }
}

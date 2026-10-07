import type { Attachment } from "./types";

export class ChatError extends Error {
  constructor(message: string, public status = 0, public notConfigured = false) {
    super(message);
  }
}

export interface StreamBody {
  model: string;
  messages: { role: "user" | "assistant"; content: string; attachments?: Attachment[] }[];
  agent?: boolean;
  projectContext?: string;
  customInstructions?: string;
  temperature?: number;
}

export interface StreamHandlers {
  onMeta?: (m: { provider: string; model: string }) => void;
  onStage?: (stage: string) => void;
  onDelta: (text: string) => void;
}

/** Streams a chat completion from our backend (SSE over fetch). Resolves when finished; throws ChatError on failure. */
export async function streamChat(body: StreamBody, signal: AbortSignal, h: StreamHandlers): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ChatError("Network error. Check your connection and try again.");
  }
  if (!res.ok || !res.body) {
    let msg = `Request failed (${res.status})`;
    let nc = false;
    try {
      const j = await res.json();
      msg = j.message || j.error || msg;
      nc = j.error === "not_configured";
    } catch {}
    throw new ChatError(msg, res.status, nc);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  const handle = (frame: string) => {
    const line = frame.split("\n").find((l) => l.startsWith("data:"));
    if (!line) return;
    let ev: { type: string; [k: string]: unknown };
    try {
      ev = JSON.parse(line.slice(5).trim());
    } catch {
      return;
    }
    if (ev.type === "delta") h.onDelta(String(ev.text ?? ""));
    else if (ev.type === "stage") h.onStage?.(String(ev.stage));
    else if (ev.type === "meta") h.onMeta?.({ provider: String(ev.provider), model: String(ev.model) });
    else if (ev.type === "error") throw new ChatError(String(ev.message || "The model returned an error."));
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      handle(buf.slice(0, i));
      buf = buf.slice(i + 2);
    }
  }
  if (buf.trim()) handle(buf);
}

export async function uploadFile(file: File, signal?: AbortSignal): Promise<Attachment> {
  const fd = new FormData();
  fd.append("file", file);
  let res: Response;
  try {
    res = await fetch("/api/upload", { method: "POST", body: fd, signal });
  } catch {
    throw new Error("Upload failed. Check your connection.");
  }
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `Upload failed (${res.status})`);
  return j.attachment as Attachment;
}

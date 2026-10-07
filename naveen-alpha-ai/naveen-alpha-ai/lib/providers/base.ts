import type { Attachment } from "@/lib/types";
import {
  AIProvider,
  GenerateOptions,
  ProviderError,
  ProviderId,
  ProviderMessage,
  ToolCallResult,
  ToolDef,
} from "./types";

/** Parse a text/event-stream response into its `data:` payloads. */
export async function* sseData(res: Response): AsyncGenerator<string, void, void> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  const extract = (raw: string) =>
    raw
      .split(/\r?\n/)
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trimStart())
      .join("\n");
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let m: RegExpMatchArray | null;
    while ((m = buf.match(/\r?\n\r?\n/)) && m.index !== undefined) {
      const raw = buf.slice(0, m.index);
      buf = buf.slice(m.index + m[0].length);
      const data = extract(raw);
      if (data) yield data;
    }
  }
  const tail = extract(buf);
  if (tail) yield tail;
}

/** Wrap file content so models treat it as untrusted data, not instructions. */
export function renderAttachmentText(a: Attachment): string {
  const body = (a.text ?? "").replace(/<\/attached_file>/gi, "<\\/attached_file>");
  return `<attached_file name="${a.name.replace(/"/g, "'")}" type="${a.mime}"${a.truncated ? ' truncated="true"' : ""}>\n${body}\n</attached_file>`;
}

export function userText(m: ProviderMessage): string {
  const docs = (m.attachments ?? []).filter((a) => a.text && a.kind !== "image");
  if (!docs.length) return m.content;
  return `${docs.map(renderAttachmentText).join("\n\n")}\n\n${m.content}`.trim();
}

export function imagesOf(m: ProviderMessage): Attachment[] {
  return (m.attachments ?? []).filter((a) => a.kind === "image" && a.dataUrl);
}

export function splitDataUrl(url: string): { mime: string; data: string } {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(url);
  if (!match) throw new ProviderError("Invalid image data", 400);
  return { mime: match[1], data: match[2] };
}

export async function httpError(res: Response, label: string): Promise<ProviderError> {
  let detail = "";
  try {
    const t = await res.text();
    try {
      const j = JSON.parse(t);
      detail = j?.error?.message ?? j?.error ?? j?.message ?? t;
      if (typeof detail !== "string") detail = JSON.stringify(detail);
    } catch {
      detail = t;
    }
  } catch {}
  detail = detail.replace(/(key|token|bearer)[=:\s"']+[A-Za-z0-9_\-\.]{12,}/gi, "$1=[redacted]").slice(0, 400);
  return new ProviderError(`${label} request failed (${res.status})${detail ? `: ${detail}` : ""}`, res.status);
}

export abstract class BaseProvider implements AIProvider {
  abstract readonly id: ProviderId;
  abstract readonly label: string;
  abstract isConfigured(): boolean;
  abstract generate(o: GenerateOptions): Promise<string>;
  abstract stream(o: GenerateOptions): AsyncGenerator<string, void, void>;

  async analyzeImage(o: Omit<GenerateOptions, "messages"> & { image: Attachment; prompt: string }) {
    const { image, prompt, ...rest } = o;
    return this.generate({ ...rest, messages: [{ role: "user", content: prompt, attachments: [image] }] });
  }

  async analyzeDocument(o: Omit<GenerateOptions, "messages"> & { document: Attachment; prompt: string }) {
    const { document, prompt, ...rest } = o;
    return this.generate({ ...rest, messages: [{ role: "user", content: prompt, attachments: [document] }] });
  }

  async generateStructuredOutput<T = unknown>(
    o: Omit<GenerateOptions, "messages"> & { prompt: string; schema: Record<string, unknown> }
  ): Promise<T> {
    const { prompt, schema, system, ...rest } = o;
    const sys = `${system ?? ""}\nRespond with a single valid JSON value matching this JSON Schema. No prose, no code fences.\n${JSON.stringify(schema)}`.trim();
    const text = await this.generate({ ...rest, system: sys, messages: [{ role: "user", content: prompt }] });
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      throw new ProviderError("Model did not return valid JSON", 502);
    }
  }

  async toolCall(_o: GenerateOptions & { tools: ToolDef[] }): Promise<ToolCallResult> {
    throw new ProviderError(`Tool calling is not implemented for provider "${this.id}"`, 501);
  }
}

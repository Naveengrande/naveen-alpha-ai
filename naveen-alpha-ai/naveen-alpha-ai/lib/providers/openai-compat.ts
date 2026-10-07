import { BaseProvider, httpError, imagesOf, sseData, userText } from "./base";
import { GenerateOptions, ProviderError, ProviderId, ToolCallResult, ToolDef } from "./types";

interface Cfg {
  id: ProviderId;
  label: string;
  keyEnv: string;
  baseEnv?: string;
  defaultBase: string;
  tokenParam: "max_tokens" | "max_completion_tokens";
  headers?: Record<string, string>;
}

/** Works for OpenAI, OpenRouter and any OpenAI-compatible gateway. */
export class OpenAICompatProvider extends BaseProvider {
  readonly id: ProviderId;
  readonly label: string;
  constructor(private cfg: Cfg) {
    super();
    this.id = cfg.id;
    this.label = cfg.label;
  }

  isConfigured() {
    return !!process.env[this.cfg.keyEnv];
  }

  private base() {
    return ((this.cfg.baseEnv && process.env[this.cfg.baseEnv]) || this.cfg.defaultBase).replace(/\/$/, "");
  }

  private body(o: GenerateOptions, stream: boolean, extra: Record<string, unknown> = {}) {
    const messages: unknown[] = [];
    if (o.system) messages.push({ role: "system", content: o.system });
    for (const m of o.messages) {
      if (m.role === "assistant") {
        messages.push({ role: "assistant", content: m.content });
        continue;
      }
      const imgs = imagesOf(m);
      if (imgs.length) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: userText(m) || "Describe the attached image." },
            ...imgs.map((a) => ({ type: "image_url", image_url: { url: a.dataUrl } })),
          ],
        });
      } else {
        messages.push({ role: "user", content: userText(m) });
      }
    }
    const b: Record<string, unknown> = { model: o.model, messages, stream, ...extra };
    if (o.temperature !== undefined) b.temperature = o.temperature;
    if (o.maxTokens) b[this.cfg.tokenParam] = o.maxTokens;
    return b;
  }

  private async post(body: unknown, signal?: AbortSignal) {
    const key = process.env[this.cfg.keyEnv];
    if (!key) throw new ProviderError(`${this.label} is not configured`, 503);
    const res = await fetch(`${this.base()}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, ...this.cfg.headers },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) throw await httpError(res, this.label);
    return res;
  }

  async generate(o: GenerateOptions) {
    const res = await this.post(this.body(o, false), o.signal);
    const j = await res.json();
    return j?.choices?.[0]?.message?.content ?? "";
  }

  async *stream(o: GenerateOptions) {
    const res = await this.post(this.body(o, true), o.signal);
    for await (const data of sseData(res)) {
      if (data === "[DONE]") return;
      try {
        const j = JSON.parse(data);
        if (j?.error) throw new ProviderError(j.error.message ?? "Provider stream error", 502);
        const t = j?.choices?.[0]?.delta?.content;
        if (t) yield t as string;
      } catch (e) {
        if (e instanceof ProviderError) throw e;
      }
    }
  }

  async toolCall(o: GenerateOptions & { tools: ToolDef[] }): Promise<ToolCallResult> {
    const tools = o.tools.map((t) => ({
      type: "function",
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
    const res = await this.post(this.body(o, false, { tools }), o.signal);
    const msg = (await res.json())?.choices?.[0]?.message ?? {};
    const calls = (msg.tool_calls ?? []).map((c: { function: { name: string; arguments: string } }) => {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(c.function.arguments || "{}");
      } catch {}
      return { name: c.function.name, arguments: args };
    });
    return { text: msg.content ?? "", calls };
  }
}

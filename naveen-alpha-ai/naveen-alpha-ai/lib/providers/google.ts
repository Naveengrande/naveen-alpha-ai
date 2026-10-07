import { BaseProvider, httpError, imagesOf, splitDataUrl, sseData, userText } from "./base";
import { GenerateOptions, ProviderError, ProviderId, ToolCallResult, ToolDef } from "./types";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export class GoogleProvider extends BaseProvider {
  readonly id: ProviderId = "google";
  readonly label = "Google";

  isConfigured() {
    return !!process.env.GOOGLE_API_KEY;
  }

  private body(o: GenerateOptions, extra: Record<string, unknown> = {}) {
    const contents = o.messages.map((m) => {
      if (m.role === "assistant") return { role: "model", parts: [{ text: m.content }] };
      const parts: unknown[] = [{ text: userText(m) || "Describe the attached image." }];
      for (const a of imagesOf(m)) {
        const { mime, data } = splitDataUrl(a.dataUrl!);
        parts.push({ inlineData: { mimeType: mime, data } });
      }
      return { role: "user", parts };
    });
    const generationConfig: Record<string, unknown> = {};
    if (o.temperature !== undefined) generationConfig.temperature = o.temperature;
    if (o.maxTokens) generationConfig.maxOutputTokens = o.maxTokens;
    const b: Record<string, unknown> = { contents, generationConfig, ...extra };
    if (o.system) b.systemInstruction = { parts: [{ text: o.system }] };
    return b;
  }

  private async post(model: string, method: string, body: unknown, signal?: AbortSignal) {
    const key = process.env.GOOGLE_API_KEY;
    if (!key) throw new ProviderError("Google is not configured", 503);
    const res = await fetch(`${BASE}/${encodeURIComponent(model)}:${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) throw await httpError(res, "Google");
    return res;
  }

  private textOf(j: { candidates?: { content?: { parts?: { text?: string }[] } }[] }) {
    return (j?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  }

  async generate(o: GenerateOptions) {
    const res = await this.post(o.model, "generateContent", this.body(o), o.signal);
    return this.textOf(await res.json());
  }

  async *stream(o: GenerateOptions) {
    const res = await this.post(o.model, "streamGenerateContent?alt=sse", this.body(o), o.signal);
    for await (const data of sseData(res)) {
      try {
        const t = this.textOf(JSON.parse(data));
        if (t) yield t;
      } catch {}
    }
  }

  async toolCall(o: GenerateOptions & { tools: ToolDef[] }): Promise<ToolCallResult> {
    const tools = [{ functionDeclarations: o.tools.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters })) }];
    const res = await this.post(o.model, "generateContent", this.body(o, { tools }), o.signal);
    const j = await res.json();
    const parts = (j?.candidates?.[0]?.content?.parts ?? []) as { text?: string; functionCall?: { name: string; args?: Record<string, unknown> } }[];
    return {
      text: parts.map((p) => p.text ?? "").join(""),
      calls: parts.filter((p) => p.functionCall).map((p) => ({ name: p.functionCall!.name, arguments: p.functionCall!.args ?? {} })),
    };
  }
}

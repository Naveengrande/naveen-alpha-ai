import { BaseProvider, httpError, imagesOf, splitDataUrl, sseData, userText } from "./base";
import { GenerateOptions, ProviderError, ProviderId, ToolCallResult, ToolDef } from "./types";

export class AnthropicProvider extends BaseProvider {
  readonly id: ProviderId = "anthropic";
  readonly label = "Anthropic";

  isConfigured() {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  private body(o: GenerateOptions, stream: boolean, extra: Record<string, unknown> = {}) {
    const messages = o.messages.map((m) => {
      if (m.role === "assistant") return { role: "assistant", content: m.content };
      const imgs = imagesOf(m);
      const text = userText(m) || "Describe the attached image.";
      if (!imgs.length) return { role: "user", content: text };
      return {
        role: "user",
        content: [
          ...imgs.map((a) => {
            const { mime, data } = splitDataUrl(a.dataUrl!);
            return { type: "image", source: { type: "base64", media_type: mime, data } };
          }),
          { type: "text", text },
        ],
      };
    });
    const b: Record<string, unknown> = {
      model: o.model,
      max_tokens: o.maxTokens ?? 8192,
      messages,
      stream,
      ...extra,
    };
    if (o.system) b.system = o.system;
    if (o.temperature !== undefined) b.temperature = Math.min(o.temperature, 1);
    return b;
  }

  private async post(body: unknown, signal?: AbortSignal) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new ProviderError("Anthropic is not configured", 503);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) throw await httpError(res, "Anthropic");
    return res;
  }

  async generate(o: GenerateOptions) {
    const j = await (await this.post(this.body(o, false), o.signal)).json();
    return (j?.content ?? []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("");
  }

  async *stream(o: GenerateOptions) {
    const res = await this.post(this.body(o, true), o.signal);
    for await (const data of sseData(res)) {
      try {
        const j = JSON.parse(data);
        if (j.type === "error") throw new ProviderError(j.error?.message ?? "Anthropic stream error", 502);
        if (j.type === "content_block_delta" && j.delta?.type === "text_delta" && j.delta.text) yield j.delta.text as string;
        if (j.type === "message_stop") return;
      } catch (e) {
        if (e instanceof ProviderError) throw e;
      }
    }
  }

  async toolCall(o: GenerateOptions & { tools: ToolDef[] }): Promise<ToolCallResult> {
    const tools = o.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters }));
    const j = await (await this.post(this.body(o, false, { tools }), o.signal)).json();
    const blocks = (j?.content ?? []) as { type: string; text?: string; name?: string; input?: Record<string, unknown> }[];
    return {
      text: blocks.filter((b) => b.type === "text").map((b) => b.text).join(""),
      calls: blocks.filter((b) => b.type === "tool_use").map((b) => ({ name: b.name!, arguments: b.input ?? {} })),
    };
  }
}

import type { Attachment } from "@/lib/types";

export type ProviderId = "openai" | "anthropic" | "google" | "openrouter" | "groq" | "mistral" | "deepseek" | "xai" | "together";

export interface ProviderMessage {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
}

export interface GenerateOptions {
  model: string;
  system?: string;
  messages: ProviderMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface ToolDef {
  name: string;
  description: string;
  /** JSON Schema object describing the arguments. */
  parameters: Record<string, unknown>;
}

export interface ToolCallResult {
  text: string;
  calls: { name: string; arguments: Record<string, unknown> }[];
}

/**
 * Every backend (OpenAI, Anthropic, Google, OpenRouter, or your own gateway) implements this.
 * The UI and API routes only ever talk to this interface, so providers can be swapped via env vars.
 */
export interface AIProvider {
  readonly id: ProviderId;
  readonly label: string;
  isConfigured(): boolean;
  generate(o: GenerateOptions): Promise<string>;
  stream(o: GenerateOptions): AsyncGenerator<string, void, void>;
  analyzeImage(o: Omit<GenerateOptions, "messages"> & { image: Attachment; prompt: string }): Promise<string>;
  analyzeDocument(o: Omit<GenerateOptions, "messages"> & { document: Attachment; prompt: string }): Promise<string>;
  generateStructuredOutput<T = unknown>(
    o: Omit<GenerateOptions, "messages"> & { prompt: string; schema: Record<string, unknown> }
  ): Promise<T>;
  toolCall(o: GenerateOptions & { tools: ToolDef[] }): Promise<ToolCallResult>;
}

export class ProviderError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

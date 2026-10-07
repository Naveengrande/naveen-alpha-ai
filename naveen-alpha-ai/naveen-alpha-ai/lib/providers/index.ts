import { AnthropicProvider } from "./anthropic";
import { GoogleProvider } from "./google";
import { OpenAICompatProvider } from "./openai-compat";
import type { AIProvider, ProviderId } from "./types";
import { MODELS, ModelStatus } from "@/lib/types";

/** Any OpenAI-compatible API. Base URL can be overridden with <ID>_BASE_URL. */
function compat(id: ProviderId, label: string, keyEnv: string, defaultBase: string) {
  return new OpenAICompatProvider({ id, label, keyEnv, baseEnv: `${id.toUpperCase()}_BASE_URL`, defaultBase, tokenParam: "max_tokens" });
}

export const providers: Record<ProviderId, AIProvider> = {
  openai: new OpenAICompatProvider({
    id: "openai",
    label: "OpenAI",
    keyEnv: "OPENAI_API_KEY",
    baseEnv: "OPENAI_BASE_URL",
    defaultBase: "https://api.openai.com/v1",
    tokenParam: "max_completion_tokens",
  }),
  anthropic: new AnthropicProvider(),
  google: new GoogleProvider(),
  openrouter: new OpenAICompatProvider({
    id: "openrouter",
    label: "OpenRouter",
    keyEnv: "OPENROUTER_API_KEY",
    defaultBase: "https://openrouter.ai/api/v1",
    tokenParam: "max_tokens",
    headers: { "X-Title": "NAVEEN ALPHA AI" },
  }),
  groq: compat("groq", "Groq", "GROQ_API_KEY", "https://api.groq.com/openai/v1"),
  mistral: compat("mistral", "Mistral", "MISTRAL_API_KEY", "https://api.mistral.ai/v1"),
  deepseek: compat("deepseek", "DeepSeek", "DEEPSEEK_API_KEY", "https://api.deepseek.com/v1"),
  xai: compat("xai", "xAI", "XAI_API_KEY", "https://api.x.ai/v1"),
  together: compat("together", "Together AI", "TOGETHER_API_KEY", "https://api.together.xyz/v1"),
};

/** Fallback model per provider when a mapped provider isn't configured. */
const PROVIDER_DEFAULT: Record<ProviderId, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-5",
  google: "gemini-2.0-flash",
  openrouter: "openai/gpt-4o-mini",
  groq: "llama-3.3-70b-versatile",
  mistral: "mistral-large-latest",
  deepseek: "deepseek-chat",
  xai: "grok-4",
  together: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
};

const ENV_FOR: Record<string, string> = {
  "naveen-alpha": "NAVEEN_ALPHA_MODEL",
  "naveen-alpha-fast": "NAVEEN_ALPHA_FAST_MODEL",
  "naveen-vision": "NAVEEN_VISION_MODEL",
  "naveen-code": "NAVEEN_CODE_MODEL",
};

const ORDER: ProviderId[] = ["anthropic", "openai", "google", "groq", "mistral", "deepseek", "xai", "together", "openrouter"];

export interface Resolved {
  provider: AIProvider;
  model: string;
}

/** Map a public Naveen model id to a concrete provider + model id, or null when nothing is configured. */
export function resolveModel(modelId: string): Resolved | null {
  const spec = process.env[ENV_FOR[modelId] ?? ""];
  if (spec && spec.includes(":")) {
    const [pid, ...rest] = spec.split(":");
    const p = providers[pid as ProviderId];
    const model = rest.join(":");
    if (p && model && p.isConfigured()) return { provider: p, model };
  }
  for (const pid of ORDER) {
    const p = providers[pid];
    if (p.isConfigured()) return { provider: p, model: PROVIDER_DEFAULT[pid] };
  }
  return null;
}

export function modelStatuses(): ModelStatus[] {
  return MODELS.map((m) => {
    const r = resolveModel(m.id);
    return {
      id: m.id,
      configured: !!r,
      provider: r?.provider.id ?? null,
      providerLabel: r?.provider.label ?? null,
      model: r?.model ?? null,
    };
  });
}

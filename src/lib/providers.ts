/**
 * Provider and model catalogue. This is config, kept in one place so it is easy
 * to update when providers add models or change prices.
 *
 * Prices are US dollars per million tokens. They change often, so check them
 * against each provider's pricing page before relying on cost figures.
 */

export const PROVIDER_IDS = ["openai", "anthropic", "google"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export interface ModelInfo {
  id: string;
  label: string;
  /** USD per 1M input tokens. */
  inputPerMTok: number;
  /** USD per 1M output tokens. */
  outputPerMTok: number;
}

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  keyUrl: string;
  pricingUrl: string;
  defaultModel: string;
  /** A cheap model used by the "Test key" button. */
  testModel: string;
  models: ModelInfo[];
}

/** Date the prices below were last checked against the providers' pages. */
export const PRICES_LAST_CHECKED = "not yet verified";

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  openai: {
    id: "openai",
    label: "OpenAI",
    keyUrl: "https://platform.openai.com/api-keys",
    pricingUrl: "https://openai.com/api/pricing/",
    defaultModel: "gpt-5-mini",
    testModel: "gpt-5-mini",
    models: [
      { id: "gpt-5", label: "GPT-5", inputPerMTok: 1.25, outputPerMTok: 10 },
      { id: "gpt-5-mini", label: "GPT-5 mini", inputPerMTok: 0.25, outputPerMTok: 2 },
    ],
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic",
    keyUrl: "https://console.anthropic.com/settings/keys",
    pricingUrl: "https://www.anthropic.com/pricing#api",
    defaultModel: "claude-sonnet-5-5",
    testModel: "claude-haiku-5-5",
    models: [
      { id: "claude-opus-5-5", label: "Claude Opus 5.5", inputPerMTok: 5, outputPerMTok: 25 },
      { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", inputPerMTok: 3, outputPerMTok: 15 },
      { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", inputPerMTok: 1, outputPerMTok: 5 },
    ],
  },
  google: {
    id: "google",
    label: "Google",
    keyUrl: "https://aistudio.google.com/app/apikey",
    pricingUrl: "https://ai.google.dev/gemini-api/docs/pricing",
    defaultModel: "gemini-2.5-flash",
    testModel: "gemini-2.5-flash",
    models: [
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", inputPerMTok: 1.25, outputPerMTok: 10 },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", inputPerMTok: 0.3, outputPerMTok: 2.5 },
    ],
  },
};

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && (PROVIDER_IDS as readonly string[]).includes(value);
}

export function findModel(provider: ProviderId, modelId: string): ModelInfo | undefined {
  return PROVIDERS[provider].models.find((m) => m.id === modelId);
}

/** Cost in USD of a call, from the price table. Returns null for unknown models. */
export function estimateCost(
  provider: ProviderId,
  modelId: string,
  usage: { inputTokens?: number; outputTokens?: number },
): number | null {
  const model = findModel(provider, modelId);
  if (!model) return null;
  const input = (usage.inputTokens ?? 0) * model.inputPerMTok;
  const output = (usage.outputTokens ?? 0) * model.outputPerMTok;
  return (input + output) / 1_000_000;
}

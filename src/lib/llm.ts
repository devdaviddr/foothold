/**
 * The single provider interface. Agents, the runner and the settings page make
 * every model call through this file, so adding a provider (or local models
 * later) means changing one place.
 */
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, type LanguageModel } from "ai";
import type { Db } from "@/db/client";
import { PROVIDERS, estimateCost, type ProviderId } from "./providers";
import { allSecrets, getApiKey, redactSecrets, resolveModelChoice } from "./settings";

export function createModel(provider: ProviderId, apiKey: string, modelId: string): LanguageModel {
  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey })(modelId);
    case "anthropic":
      return createAnthropic({ apiKey })(modelId);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(modelId);
  }
}

export class ModelCallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelCallError";
  }
}

export interface CallResult {
  text: string;
  provider: ProviderId;
  model: string;
  inputTokens: number | undefined;
  outputTokens: number | undefined;
  /** From the price table; null when the model is not in it. */
  costUsd: number | null;
}

export interface CallOptions {
  role: "main" | "judge";
  prompt: string;
  system?: string;
  maxOutputTokens?: number;
}

/** Turn any thrown value into a message that never contains a key. */
export function safeErrorMessage(error: unknown, secrets: readonly string[]): string {
  const raw = error instanceof Error ? error.message : String(error);
  return redactSecrets(raw, secrets).slice(0, 500);
}

async function run(
  provider: ProviderId,
  apiKey: string,
  model: string,
  opts: Omit<CallOptions, "role">,
): Promise<CallResult> {
  try {
    const result = await generateText({
      model: createModel(provider, apiKey, model),
      system: opts.system,
      prompt: opts.prompt,
      maxOutputTokens: opts.maxOutputTokens,
      maxRetries: 1,
    });
    const { inputTokens, outputTokens } = result.usage;
    return {
      text: result.text,
      provider,
      model,
      inputTokens,
      outputTokens,
      costUsd: estimateCost(provider, model, { inputTokens, outputTokens }),
    };
  } catch (error) {
    throw new ModelCallError(safeErrorMessage(error, [apiKey]));
  }
}

/** Call the model configured for a role (main or judge) with the stored key. */
export async function callModel(db: Db, opts: CallOptions): Promise<CallResult> {
  const { provider, model } = await resolveModelChoice(db, opts.role);
  const apiKey = await getApiKey(db, provider);
  if (!apiKey) {
    throw new ModelCallError(`No API key is set for ${PROVIDERS[provider].label}. Add one in Settings.`);
  }
  try {
    return await run(provider, apiKey, model, opts);
  } catch (error) {
    throw new ModelCallError(safeErrorMessage(error, await allSecrets(db)));
  }
}

export type TestKeyResult =
  | { ok: true; model: string; reply: string }
  | { ok: false; error: string };

/** One tiny call to confirm a key works. */
export async function testApiKey(provider: ProviderId, apiKey: string): Promise<TestKeyResult> {
  const model = PROVIDERS[provider].testModel;
  try {
    const result = await run(provider, apiKey, model, {
      prompt: "Reply with the single word OK.",
      // Leaves room for models that reason before answering.
      maxOutputTokens: 64,
    });
    return { ok: true, model, reply: result.text.trim().slice(0, 100) };
  } catch (error) {
    return { ok: false, error: safeErrorMessage(error, [apiKey]) };
  }
}

import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db/client";
import { appSettings, providerKeys } from "@/db/schema";
import { PROVIDER_IDS, PROVIDERS, isProviderId, type ProviderId } from "./providers";

// Settings keys in the app_settings table.
const MAIN_PROVIDER = "mainProvider";
const JUDGE_PROVIDER = "judgeProvider";
const JUDGE_MODEL = "judgeModel";
const modelKey = (provider: ProviderId) => `model:${provider}`;

export const apiKeyInput = z
  .string()
  .trim()
  .min(8, "That looks too short to be an API key.")
  .max(500, "That looks too long to be an API key.")
  .regex(/^\S+$/, "API keys do not contain spaces.");

export const modelIdInput = z
  .string()
  .trim()
  .min(1, "Pick a model.")
  .max(200)
  .regex(/^[\w.\-:/@]+$/, "That does not look like a model id.");

/** Show just enough of a key to recognise it: "sk-…abcd". */
export function maskKey(key: string): string {
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 3)}…${key.slice(-4)}`;
}

/** Remove any of the given secrets from a message before it is shown or logged. */
export function redactSecrets(message: string, secrets: readonly string[]): string {
  let out = message;
  for (const secret of secrets) {
    if (secret.length >= 4) out = out.split(secret).join("[redacted]");
  }
  return out;
}

// ---- low-level storage -------------------------------------------------------

async function writeSetting(db: Db, key: string, value: string | null): Promise<void> {
  if (value === null) {
    await db.delete(appSettings).where(eq(appSettings.key, key));
    return;
  }
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } });
}

// ---- API keys (server-side only) --------------------------------------------

export async function setApiKey(db: Db, provider: ProviderId, apiKey: string): Promise<void> {
  const key = apiKeyInput.parse(apiKey);
  const updatedAt = new Date();
  await db
    .insert(providerKeys)
    .values({ provider, apiKey: key, updatedAt })
    .onConflictDoUpdate({ target: providerKeys.provider, set: { apiKey: key, updatedAt } });
}

export async function removeApiKey(db: Db, provider: ProviderId): Promise<void> {
  await db.delete(providerKeys).where(eq(providerKeys.provider, provider));
}

/** The raw key. Never send this to the browser. */
export async function getApiKey(db: Db, provider: ProviderId): Promise<string | undefined> {
  const rows = await db
    .select()
    .from(providerKeys)
    .where(eq(providerKeys.provider, provider))
    .limit(1);
  return rows[0]?.apiKey;
}

async function allKeys(db: Db): Promise<Map<ProviderId, { apiKey: string; updatedAt: Date }>> {
  const rows = await db.select().from(providerKeys);
  const map = new Map<ProviderId, { apiKey: string; updatedAt: Date }>();
  for (const row of rows) {
    if (isProviderId(row.provider)) map.set(row.provider, row);
  }
  return map;
}

/** Every stored key, for redacting error messages. */
export async function allSecrets(db: Db): Promise<string[]> {
  return [...(await allKeys(db)).values()].map((k) => k.apiKey);
}

// ---- choices -----------------------------------------------------------------

export async function setMainProvider(db: Db, provider: ProviderId): Promise<void> {
  await writeSetting(db, MAIN_PROVIDER, provider);
}

export async function setProviderModel(db: Db, provider: ProviderId, model: string): Promise<void> {
  await writeSetting(db, modelKey(provider), modelIdInput.parse(model));
}

/** Pass null for the provider to go back to the automatic default. */
export async function setJudge(db: Db, provider: ProviderId | null, model: string | null): Promise<void> {
  await writeSetting(db, JUDGE_PROVIDER, provider);
  await writeSetting(db, JUDGE_MODEL, provider && model ? modelIdInput.parse(model) : null);
}

// ---- resolved view -----------------------------------------------------------

export interface ModelChoice {
  provider: ProviderId;
  model: string;
}

export interface ProviderSettingsView {
  id: ProviderId;
  label: string;
  hasKey: boolean;
  maskedKey: string | null;
  keyUpdatedAt: Date | null;
  model: string;
}

export interface SettingsView {
  main: ModelChoice;
  judge: ModelChoice & { source: "chosen" | "default" };
  providers: ProviderSettingsView[];
  warnings: string[];
}

/**
 * Everything the settings page needs, with keys masked. Safe to pass to the
 * browser.
 */
export async function getSettings(db: Db): Promise<SettingsView> {
  const keys = await allKeys(db);
  const rows = await db.select().from(appSettings);
  const stored = new Map(rows.map((r) => [r.key, r.value]));

  const modelFor = (p: ProviderId) => stored.get(modelKey(p)) ?? PROVIDERS[p].defaultModel;
  const hasKey = (p: ProviderId) => keys.has(p);

  const storedMain = stored.get(MAIN_PROVIDER);
  const mainProvider: ProviderId = isProviderId(storedMain)
    ? storedMain
    : (PROVIDER_IDS.find(hasKey) ?? PROVIDER_IDS[0]);

  const storedJudge = stored.get(JUDGE_PROVIDER);
  const judgeChosen = isProviderId(storedJudge);
  const others = PROVIDER_IDS.filter((p) => p !== mainProvider);

  let judgeProvider: ProviderId;
  if (judgeChosen) {
    judgeProvider = storedJudge;
  } else {
    // Default: a different provider from the main one, preferring one with a key.
    judgeProvider = others.find(hasKey) ?? (hasKey(mainProvider) ? mainProvider : others[0]!);
  }
  const judgeModel =
    (judgeChosen && stored.get(JUDGE_MODEL)) || modelFor(judgeProvider);

  const warnings: string[] = [];
  if (keys.size === 0) {
    warnings.push("Add an API key for at least one provider before Foothold can call a model.");
  } else if (!hasKey(mainProvider)) {
    warnings.push(`${PROVIDERS[mainProvider].label} is the main provider but has no API key.`);
  }
  if (keys.size === 1 && judgeProvider === mainProvider) {
    warnings.push(
      `Only one provider key is set, so the judge will use the same provider as the main model (${PROVIDERS[mainProvider].label}). A judge from a different provider gives a more independent score.`,
    );
  } else if (judgeProvider === mainProvider && keys.size > 1) {
    warnings.push("The judge uses the same provider as the main model, so scores may be less independent.");
  } else if (keys.size > 0 && !hasKey(judgeProvider)) {
    warnings.push(`The judge is set to ${PROVIDERS[judgeProvider].label}, which has no API key.`);
  }

  return {
    main: { provider: mainProvider, model: modelFor(mainProvider) },
    judge: { provider: judgeProvider, model: judgeModel, source: judgeChosen ? "chosen" : "default" },
    providers: PROVIDER_IDS.map((id) => {
      const key = keys.get(id);
      return {
        id,
        label: PROVIDERS[id].label,
        hasKey: Boolean(key),
        maskedKey: key ? maskKey(key.apiKey) : null,
        keyUpdatedAt: key?.updatedAt ?? null,
        model: modelFor(id),
      };
    }),
    warnings,
  };
}

/** Which provider and model a role should use. */
export async function resolveModelChoice(db: Db, role: "main" | "judge"): Promise<ModelChoice> {
  const settings = await getSettings(db);
  const { provider, model } = role === "main" ? settings.main : settings.judge;
  return { provider, model };
}

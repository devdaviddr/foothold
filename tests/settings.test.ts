import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import type { Db } from "@/db/client";
import { estimateCost, PROVIDERS } from "@/lib/providers";
import {
  getApiKey,
  getSettings,
  maskKey,
  redactSecrets,
  removeApiKey,
  resolveModelChoice,
  setApiKey,
  setJudge,
  setMainProvider,
  setProviderModel,
} from "@/lib/settings";
import { tempDb } from "./helpers";

// Obviously fake keys; never put real ones in tests.
const FAKE_OPENAI = "sk-test-0000000000000000abcd";
const FAKE_ANTHROPIC = "sk-ant-test-1111111111111111wxyz";

let db: Db;
let cleanup: () => void;

beforeEach(async () => {
  ({ db, cleanup } = await tempDb());
});
afterEach(() => cleanup());

describe("maskKey and redactSecrets", () => {
  it("shows only a short prefix and the last four characters", () => {
    expect(maskKey(FAKE_OPENAI)).toBe("sk-…abcd");
    expect(maskKey("short")).toBe("••••");
  });

  it("removes every occurrence of a secret", () => {
    const msg = `Bad key ${FAKE_OPENAI} (again: ${FAKE_OPENAI})`;
    const out = redactSecrets(msg, [FAKE_OPENAI]);
    expect(out).not.toContain(FAKE_OPENAI);
    expect(out).toBe("Bad key [redacted] (again: [redacted])");
  });
});

describe("API key storage", () => {
  it("adds, replaces and removes a key", async () => {
    await setApiKey(db, "openai", FAKE_OPENAI);
    expect(await getApiKey(db, "openai")).toBe(FAKE_OPENAI);

    await setApiKey(db, "openai", `  ${FAKE_OPENAI}9  `);
    expect(await getApiKey(db, "openai")).toBe(`${FAKE_OPENAI}9`);

    await removeApiKey(db, "openai");
    expect(await getApiKey(db, "openai")).toBeUndefined();
  });

  it("rejects values that are not plausible keys", async () => {
    await expect(setApiKey(db, "openai", "abc")).rejects.toBeInstanceOf(ZodError);
    await expect(setApiKey(db, "openai", "has a space in it")).rejects.toBeInstanceOf(ZodError);
  });

  it("never exposes raw keys in the settings view", async () => {
    await setApiKey(db, "openai", FAKE_OPENAI);
    await setApiKey(db, "anthropic", FAKE_ANTHROPIC);
    const view = await getSettings(db);
    const json = JSON.stringify(view);
    expect(json).not.toContain(FAKE_OPENAI);
    expect(json).not.toContain(FAKE_ANTHROPIC);
    expect(view.providers.find((p) => p.id === "openai")?.maskedKey).toBe("sk-…abcd");
    expect(view.providers.find((p) => p.id === "google")?.hasKey).toBe(false);
  });
});

describe("model choices", () => {
  it("uses each provider's default model until one is chosen", async () => {
    const view = await getSettings(db);
    for (const p of view.providers) expect(p.model).toBe(PROVIDERS[p.id].defaultModel);

    await setProviderModel(db, "anthropic", "claude-opus-5-5");
    await setMainProvider(db, "anthropic");
    expect(await resolveModelChoice(db, "main")).toEqual({
      provider: "anthropic",
      model: "claude-opus-5-5",
    });
  });

  it("defaults the main provider to the first one with a key", async () => {
    await setApiKey(db, "google", "AIza-test-22222222");
    expect((await getSettings(db)).main.provider).toBe("google");
  });

  it("defaults the judge to a different provider from the main one", async () => {
    await setApiKey(db, "openai", FAKE_OPENAI);
    await setApiKey(db, "anthropic", FAKE_ANTHROPIC);
    await setMainProvider(db, "openai");
    const view = await getSettings(db);
    expect(view.judge.provider).toBe("anthropic");
    expect(view.judge.source).toBe("default");
    expect(view.judge.model).toBe(PROVIDERS.anthropic.defaultModel);
    expect(view.warnings).toEqual([]);
  });

  it("prefers a different provider for the judge even with no keys", async () => {
    await setMainProvider(db, "google");
    expect((await getSettings(db)).judge.provider).not.toBe("google");
  });

  it("warns when only one key is set and the judge shares the provider", async () => {
    await setApiKey(db, "openai", FAKE_OPENAI);
    await setMainProvider(db, "openai");
    const view = await getSettings(db);
    expect(view.judge.provider).toBe("openai");
    expect(view.warnings.join(" ")).toMatch(/judge will use the same provider/);
  });

  it("respects an explicit judge choice and can reset it", async () => {
    await setApiKey(db, "openai", FAKE_OPENAI);
    await setApiKey(db, "google", "AIza-test-22222222");
    await setMainProvider(db, "openai");
    await setJudge(db, "google", "gemini-2.5-pro");
    expect(await resolveModelChoice(db, "judge")).toEqual({
      provider: "google",
      model: "gemini-2.5-pro",
    });

    await setJudge(db, null, null);
    expect((await getSettings(db)).judge.source).toBe("default");
  });

  it("rejects malformed model ids", async () => {
    await expect(setProviderModel(db, "openai", "gpt 5; drop table")).rejects.toBeInstanceOf(ZodError);
  });
});

describe("price table", () => {
  it("computes cost per call from per-million-token prices", () => {
    const model = PROVIDERS.openai.models[0]!;
    const cost = estimateCost("openai", model.id, { inputTokens: 1_000_000, outputTokens: 500_000 });
    expect(cost).toBeCloseTo(model.inputPerMTok + model.outputPerMTok / 2);
    expect(estimateCost("openai", "not-a-model", { inputTokens: 1 })).toBeNull();
  });
});

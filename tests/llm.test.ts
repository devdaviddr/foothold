import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { callModel, ModelCallError, safeErrorMessage } from "@/lib/llm";
import { tempDb } from "./helpers";

let db: Db;
let cleanup: () => void;

beforeEach(async () => {
  ({ db, cleanup } = await tempDb());
});
afterEach(() => cleanup());

describe("provider interface", () => {
  it("refuses to call a model without a key, with a helpful message", async () => {
    const call = callModel(db, { role: "main", prompt: "hi" });
    await expect(call).rejects.toBeInstanceOf(ModelCallError);
    await expect(call).rejects.toThrow(/No API key is set/);
  });

  it("scrubs keys out of error messages", () => {
    const key = "sk-test-secret-value-1234";
    const msg = safeErrorMessage(new Error(`401: invalid key ${key}`), [key]);
    expect(msg).not.toContain(key);
    expect(msg).toContain("[redacted]");
  });
});

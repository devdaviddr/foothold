"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db/client";
import { testApiKey } from "@/lib/llm";
import { createProject, deleteProject } from "@/lib/projects";
import { isProviderId, type ProviderId } from "@/lib/providers";
import {
  getApiKey,
  removeApiKey,
  setApiKey,
  setJudge,
  setMainProvider,
  setProviderModel,
} from "@/lib/settings";

export interface FormState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    out[field] ??= issue.message;
  }
  return out;
}

function providerFrom(form: FormData, field = "provider"): ProviderId {
  const value = form.get(field);
  if (!isProviderId(value)) throw new Error("Unknown provider.");
  return value;
}

// ---- projects ----------------------------------------------------------------

export async function createProjectAction(_prev: FormState, form: FormData): Promise<FormState> {
  const db = await getDb();
  let id: string;
  try {
    const project = await createProject(db, {
      name: String(form.get("name") ?? ""),
      goal: String(form.get("goal") ?? ""),
    });
    id = project.id;
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, errors: fieldErrors(error) };
    throw error;
  }
  revalidatePath("/projects");
  redirect(`/projects/${id}`);
}

export async function deleteProjectAction(form: FormData): Promise<void> {
  const db = await getDb();
  await deleteProject(db, String(form.get("id") ?? ""));
  revalidatePath("/projects");
  redirect("/projects");
}

// ---- settings ----------------------------------------------------------------

export async function saveKeyAction(_prev: FormState, form: FormData): Promise<FormState> {
  const db = await getDb();
  const provider = providerFrom(form);
  try {
    await setApiKey(db, provider, String(form.get("apiKey") ?? ""));
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, message: error.issues[0]?.message };
    throw error;
  }
  revalidatePath("/settings");
  return { ok: true, message: "Key saved." };
}

export async function removeKeyAction(form: FormData): Promise<void> {
  const db = await getDb();
  await removeApiKey(db, providerFrom(form));
  revalidatePath("/settings");
}

export async function testKeyAction(_prev: FormState, form: FormData): Promise<FormState> {
  const db = await getDb();
  const provider = providerFrom(form);
  const key = await getApiKey(db, provider);
  if (!key) return { ok: false, message: "Save a key first." };
  const result = await testApiKey(provider, key);
  return result.ok
    ? { ok: true, message: `Key works. ${result.model} replied: “${result.reply || "(empty)"}”` }
    : { ok: false, message: `Key test failed: ${result.error}` };
}

export async function saveModelsAction(_prev: FormState, form: FormData): Promise<FormState> {
  const db = await getDb();
  try {
    await setMainProvider(db, providerFrom(form, "mainProvider"));
    for (const [field, value] of form.entries()) {
      const match = /^model:(.+)$/.exec(field);
      if (match && isProviderId(match[1])) await setProviderModel(db, match[1], String(value));
    }
    // "auto", or "provider::model".
    const judge = String(form.get("judge") ?? "auto");
    if (judge === "auto") {
      await setJudge(db, null, null);
    } else {
      const [judgeProvider, judgeModel] = judge.split("::");
      if (!isProviderId(judgeProvider) || !judgeModel) throw new Error("Unknown judge choice.");
      await setJudge(db, judgeProvider, judgeModel);
    }
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, message: error.issues[0]?.message };
    throw error;
  }
  revalidatePath("/settings");
  return { ok: true, message: "Model choices saved." };
}

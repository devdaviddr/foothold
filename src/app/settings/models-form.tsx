"use client";

import { useActionState } from "react";
import type { ProviderId, ProviderInfo } from "@/lib/providers";
import { saveModelsAction, type FormState } from "@/server/actions";

interface Props {
  providers: ProviderInfo[];
  current: {
    mainProvider: ProviderId;
    models: Record<string, string>;
    /** "auto" or "provider::model". */
    judge: string;
  };
  resolvedJudge: string;
}

function price(m: { inputPerMTok: number; outputPerMTok: number }) {
  return `$${m.inputPerMTok} in / $${m.outputPerMTok} out`;
}

export function ModelsForm({ providers, current, resolvedJudge }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveModelsAction, {});

  return (
    <form action={action} className="card stack">
      <label>
        Main provider
        <select name="mainProvider" defaultValue={current.mainProvider}>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      {providers.map((p) => {
        const selected = current.models[p.id] ?? p.defaultModel;
        const known = p.models.some((m) => m.id === selected);
        return (
          <label key={p.id}>
            Default {p.label} model
            <select name={`model:${p.id}`} defaultValue={selected}>
              {!known && <option value={selected}>{selected} (custom)</option>}
              {p.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} ({price(m)})
                </option>
              ))}
            </select>
          </label>
        );
      })}

      <label>
        Judge model
        <select name="judge" defaultValue={current.judge}>
          <option value="auto">Automatic: a different provider from the main one</option>
          {providers.flatMap((p) =>
            p.models.map((m) => (
              <option key={`${p.id}::${m.id}`} value={`${p.id}::${m.id}`}>
                {p.label} · {m.label}
              </option>
            )),
          )}
        </select>
        <span className="muted" style={{ fontWeight: "normal" }}>
          The judge scores results. Currently: {resolvedJudge}
        </span>
      </label>

      <div>
        <button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save model choices"}
        </button>
      </div>
      {state.message && <div className={`notice ${state.ok ? "ok" : "err"}`}>{state.message}</div>}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import type { ProviderId } from "@/lib/providers";
import {
  removeKeyAction,
  saveKeyAction,
  testKeyAction,
  type FormState,
} from "@/server/actions";

interface Props {
  provider: ProviderId;
  label: string;
  keyUrl: string;
  maskedKey: string | null;
  updatedAt: string | null;
}

function Notice({ state }: { state: FormState }) {
  if (!state.message) return null;
  return <div className={`notice ${state.ok ? "ok" : "err"}`}>{state.message}</div>;
}

export function ProviderKeyCard({ provider, label, keyUrl, maskedKey, updatedAt }: Props) {
  const [saveState, saveAction, saving] = useActionState<FormState, FormData>(saveKeyAction, {});
  const [testState, testAction, testing] = useActionState<FormState, FormData>(testKeyAction, {});

  return (
    <section className="card">
      <h3>{label}</h3>
      <p className="muted">
        {maskedKey ? (
          <>
            Key saved: <code>{maskedKey}</code>
            {updatedAt && <> · updated {new Date(updatedAt).toLocaleString()}</>}
          </>
        ) : (
          <>
            No key yet.{" "}
            <a href={keyUrl} target="_blank" rel="noreferrer">
              Get a {label} key
            </a>
          </>
        )}
      </p>

      <form action={saveAction} className="row">
        <input type="hidden" name="provider" value={provider} />
        <input
          type="password"
          name="apiKey"
          aria-label={`${label} API key`}
          placeholder={maskedKey ? "Paste a new key to replace it" : "Paste your API key"}
          autoComplete="off"
          spellCheck={false}
          required
          style={{ flex: 1, minWidth: "14rem" }}
        />
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : maskedKey ? "Replace" : "Save"}
        </button>
      </form>
      <Notice state={saveState} />

      {maskedKey && (
        <div className="row" style={{ marginTop: "0.75rem" }}>
          <form action={testAction}>
            <input type="hidden" name="provider" value={provider} />
            <button type="submit" className="secondary" disabled={testing}>
              {testing ? "Testing…" : "Test key"}
            </button>
          </form>
          <form action={removeKeyAction}>
            <input type="hidden" name="provider" value={provider} />
            <button type="submit" className="danger">
              Remove
            </button>
          </form>
        </div>
      )}
      <Notice state={testState} />
    </section>
  );
}

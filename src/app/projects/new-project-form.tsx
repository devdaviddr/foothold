"use client";

import { useActionState } from "react";
import { createProjectAction, type FormState } from "@/server/actions";

export function NewProjectForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createProjectAction, {});

  return (
    <form action={action} className="stack">
      <label>
        Name
        <input name="name" required maxLength={120} placeholder="Support email triage" />
        {state.errors?.name && <span className="field-error">{state.errors.name}</span>}
      </label>
      <label>
        Goal
        <textarea
          name="goal"
          required
          maxLength={4000}
          placeholder="Sort incoming support emails into billing, technical and account questions so the right team sees them first."
        />
        {state.errors?.goal && <span className="field-error">{state.errors.goal}</span>}
      </label>
      <div>
        <button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create project"}
        </button>
      </div>
    </form>
  );
}

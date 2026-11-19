import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import type { Db } from "@/db/client";
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from "@/lib/projects";
import { tempDb } from "./helpers";

let db: Db;
let cleanup: () => void;

beforeEach(async () => {
  ({ db, cleanup } = await tempDb());
});
afterEach(() => cleanup());

describe("projects", () => {
  it("creates and reads back a project", async () => {
    const created = await createProject(db, { name: "  Ticket triage ", goal: "Sort support tickets." });
    expect(created.id).toMatch(/[0-9a-f-]{36}/);
    expect(created.name).toBe("Ticket triage");

    const fetched = await getProject(db, created.id);
    expect(fetched).toEqual(created);
  });

  it("lists projects newest first", async () => {
    const a = await createProject(db, { name: "A", goal: "first" });
    await new Promise((r) => setTimeout(r, 5));
    const b = await createProject(db, { name: "B", goal: "second" });
    const list = await listProjects(db);
    expect(list.map((p) => p.id)).toEqual([b.id, a.id]);
  });

  it("rejects an empty name or goal", async () => {
    await expect(createProject(db, { name: " ", goal: "x" })).rejects.toBeInstanceOf(ZodError);
    await expect(createProject(db, { name: "x", goal: "" })).rejects.toBeInstanceOf(ZodError);
    expect(await listProjects(db)).toHaveLength(0);
  });

  it("updates a project", async () => {
    const p = await createProject(db, { name: "Old", goal: "Old goal" });
    const updated = await updateProject(db, p.id, { goal: "New goal" });
    expect(updated?.name).toBe("Old");
    expect(updated?.goal).toBe("New goal");
    expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(p.updatedAt.getTime());
    expect(await updateProject(db, "missing", { name: "x" })).toBeUndefined();
  });

  it("deletes a project", async () => {
    const p = await createProject(db, { name: "Gone", goal: "soon" });
    expect(await deleteProject(db, p.id)).toBe(true);
    expect(await getProject(db, p.id)).toBeUndefined();
    expect(await deleteProject(db, p.id)).toBe(false);
  });
});

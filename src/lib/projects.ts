import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db/client";
import { projects, type Project } from "@/db/schema";

export const projectInput = z.object({
  name: z.string().trim().min(1, "Give the project a name.").max(120, "Keep the name under 120 characters."),
  goal: z
    .string()
    .trim()
    .min(1, "Describe the goal in a sentence or two.")
    .max(4000, "Keep the goal under 4000 characters."),
});

export type ProjectInput = z.input<typeof projectInput>;

export async function createProject(db: Db, input: ProjectInput): Promise<Project> {
  const data = projectInput.parse(input);
  const now = new Date();
  const project: Project = { id: randomUUID(), ...data, createdAt: now, updatedAt: now };
  await db.insert(projects).values(project);
  return project;
}

export async function listProjects(db: Db): Promise<Project[]> {
  return db.select().from(projects).orderBy(desc(projects.createdAt));
}

export async function getProject(db: Db, id: string): Promise<Project | undefined> {
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows[0];
}

export async function updateProject(
  db: Db,
  id: string,
  input: Partial<ProjectInput>,
): Promise<Project | undefined> {
  const data = projectInput.partial().parse(input);
  const rows = await db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();
  return rows[0];
}

export async function deleteProject(db: Db, id: string): Promise<boolean> {
  const rows = await db.delete(projects).where(eq(projects.id, id)).returning({ id: projects.id });
  return rows.length > 0;
}

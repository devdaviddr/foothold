import Link from "next/link";
import { getDb } from "@/db/client";
import { listProjects } from "@/lib/projects";
import { NewProjectForm } from "./new-project-form";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await listProjects(await getDb());

  return (
    <>
      <h1>Projects</h1>

      {projects.length === 0 ? (
        <p className="muted">No projects yet. Create your first one below.</p>
      ) : (
        <ul className="project-list">
          {projects.map((p) => (
            <li key={p.id}>
              <Link href={`/projects/${p.id}`}>
                <strong>{p.name}</strong>
              </Link>
              <div className="muted">{p.goal.length > 160 ? `${p.goal.slice(0, 160)}…` : p.goal}</div>
            </li>
          ))}
        </ul>
      )}

      <div className="card">
        <h2>New project</h2>
        <NewProjectForm />
      </div>
    </>
  );
}

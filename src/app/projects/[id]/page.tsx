import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { getProject } from "@/lib/projects";
import { deleteProjectAction } from "@/server/actions";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(await getDb(), id);
  if (!project) notFound();

  return (
    <>
      <p>
        <Link href="/projects">← All projects</Link>
      </p>
      <h1>{project.name}</h1>

      <div className="card">
        <h2>Goal</h2>
        <p style={{ whiteSpace: "pre-wrap" }}>{project.goal}</p>
        <p className="muted">Created {project.createdAt.toLocaleString()}</p>
      </div>

      <p className="muted">
        Next steps (interview, data, workflow design and evals) arrive in later milestones.
      </p>

      <form action={deleteProjectAction}>
        <input type="hidden" name="id" value={project.id} />
        <button type="submit" className="danger">
          Delete project
        </button>
      </form>
    </>
  );
}

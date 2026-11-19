import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <h1>Get AI working on your problem</h1>
      <p>
        Foothold helps you set a goal in plain language, bring your own documents or data (or
        generate some), and work with a team of agents to design and test an AI solution. You
        don&apos;t need to build any test harness yourself.
      </p>

      <div className="card">
        <h2>Get started</h2>
        <ol>
          <li>
            <Link href="/settings">Add an API key</Link> for OpenAI, Anthropic or Google. It stays
            on this machine.
          </li>
          <li>
            <Link href="/projects">Create a project</Link> with a name and a goal.
          </li>
        </ol>
      </div>

      <p className="muted">
        This is an early skeleton. The agents, evals and canvas arrive in later milestones.
      </p>
    </>
  );
}

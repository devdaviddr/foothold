# workflow-studio

> Working name only. Status: **early ideation**, no code yet. Licence: TBD.

An autonomous AI workflow studio. You upload a dataset and describe a goal. A team of agents, working on a live canvas, interviews you, profiles the data, designs a workflow, designs the evaluation, runs it and iterates until the goal is met, pausing at approval checkpoints along the way.

## The problem

Most tools in this space give a human a canvas to build a workflow, or a lab to evaluate one. Almost none take a dataset and a goal, then keep going as a team until a signed-off target is hit. That gap is the idea.

## How it works

### Agent roles

These are jobs, not necessarily seven separate model calls.

| Role | Owns |
| --- | --- |
| Interviewer | Grilling the user on the goal, constraints, audience, failure modes and how "done" is judged |
| Data analyst | Profiling the data: schema, quality, leakage, class balance, splits, sensitive fields |
| Workflow architect | The workflow itself: prompts, models, retrieval, tools and steps |
| Eval designer | Metrics, test set, judges and the pass bar |
| Runner | Executing the workflow and eval in a sandbox, with traces and cost |
| Critic / judge | Scoring runs, explaining misses, recommending the next change |
| Orchestrator | Sequencing, checkpoints, budgets, and deciding when to loop, ask or stop |

### The loop

1. Grill and brief (checkpoint: confirm the brief)
2. Understand the data (checkpoint: confirm the data report)
3. Agree the pass bar (checkpoint if the agents proposed it)
4. Design the workflow (checkpoint: approve the architecture)
5. Design the eval (checkpoint: approve the eval plan)
6. Run in a sandbox
7. Judge and critique
8. Iterate (back to 4 to 7) or export (checkpoint before export)

"Done" is either a target the user sets up front, or one the agents propose and the user signs off.

Stop conditions: target met and export confirmed; user accepts a lower score; user rejects the work; dollar or token cap reached; iteration or wall-clock cap reached; no improvement for N iterations or the orchestrator is blocked.

Every project has a dollar cap and a token cap, warns at about 80% and hard-stops at 100%. Judge calls count against the same budget.

### The canvas

The canvas is the product surface: the workflow graph and the agent stations on one board, live activity, a scoreboard (target versus current, with history), and checkpoint panels (Approve, Edit, Send back). Checkpoints must be resumable, so closing the laptop never loses a run.

## Outputs

- A runnable workflow (code and prompts)
- An eval harness and test set
- A design write-up in Markdown explaining what was built and why

## Differentiators

- Adversarial red-team sign-off
- A receipt for every decision
- Interviewer that pushes back on vague goals
- Search for the cheapest workflow that passes, with a cost/quality curve
- Time-travel replay and branching on the canvas
- Exports that ship with eval and drift monitoring
- Local-models option
- Start from a handful of examples

## MVP scope

Single user, one project at a time, one dataset and one goal taken through the whole loop.

In:
- Upload CSV, JSON or a folder of text/documents; goal in natural language
- Interviewer; target set by the user or proposed and signed off
- Seven roles on a live canvas with checkpoints, visible cost cap and resumable pause
- First eval layer: held-out split, a few deterministic metrics, optional LLM-as-judge
- Export of workflow, eval harness and Markdown write-up

Out (for now): team workspaces, one-click hosting, fine-tuning, audio/video/huge data lakes, enterprise SSO and compliance, a workflow marketplace.

Candidate first use cases: support ticket classification; structured field extraction from documents. A later milestone: question answering over a document set.

## Planned stack (a starting point, not locked)

- App: Next.js and TypeScript
- Canvas: React Flow
- Agent loop: LangGraph (Python), with interrupts and Postgres checkpointers
- State: Postgres; local disk for datasets and exports
- Sandbox: Docker, no network by default, CPU/memory limits, hard timeout
- Evals: a small built-in harness first; hosted eval tools possible later
- Alternative considered: Mastra for an all-TypeScript stack

## Open questions

Tracked as issues labelled `question`.

## Status

Early ideation, no code yet. Licence to be decided (none yet, so all rights reserved by default). Planning lives in the GitHub Project board linked to this repo.

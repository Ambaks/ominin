---
name: commit
description: Write a detailed commit explaining the work done, keep the README project status and the graphify knowledge graph current, then commit and push. Trigger: /commit
---

# /commit

Commit and push the current changes with a detailed, reviewable message,
following this repo's workflow rules (see `CLAUDE.md`). Invoke as `/commit`,
optionally with scope, e.g. `/commit only the backend changes`.

## Execution requirement

This skill must always be carried out by a Haiku-model agent, never by the
invoking agent directly. As soon as this skill is triggered, dispatch a
single `Agent` call with `subagent_type: "claude"` and `model: "haiku"`,
passing the full text of Steps 1-6 below (plus any scope the user gave, e.g.
"only the backend changes") as the prompt. Run it in the foreground
(`run_in_background: false`) since the commit must finish, and its report
must be relayed back to the user, before the turn ends. Do not execute Steps
1-6 yourself in the main conversation.

## What you must do when invoked

Follow these steps in order. Do not skip steps.

### Step 1 — Understand what changed

- Run `git status --short`, `git diff`, and `git diff --cached`.
- Read enough of the changed files to describe the work accurately. The
  message must explain what was done and why — not just list files.
- Run `git log --oneline -5` to match the repo's existing message style.
- If there are no changes, say so and stop.

### Step 2 — Project upkeep (required before every push)

- If source code changed (not just docs/config) and `graphify-out/graph.json`
  exists, run `graphify update .` and include the refreshed `graphify-out/`
  in the commit.
- Update the "Project status" section of `README.md` so it describes the
  project state after this commit, and include it in the commit.

### Step 3 — Safety checks

- Stage with `git add -A`, then review `git diff --cached --name-only`.
- Never commit: `.env` or any file containing real secrets or API keys,
  `node_modules/`, `.venv/`, build output (`.next/`, `dist/`), `.DS_Store`.
  If staged, unstage and fix `.gitignore`.
- Exception: `.claude/` and `graphify-out/` are deliberately committed in
  this repo. Never add them to `.gitignore`.
- If a real secret has been written into a tracked file, stop and tell the
  user. Do not commit it.

### Step 4 — Write the commit message

- Summary line: imperative mood, ≤ 72 characters, states what the change
  accomplishes.
- Blank line, then a body grouped by area of the repo that explains:
  - what was done and the reasoning behind decisions, not just the diff;
  - what was verified and how (builds run, endpoints hit, tests passed);
  - follow-ups deliberately left for later, if any.
- No filler ("various fixes", "misc changes", "updates"). A collaborator
  who was not in the session must understand the work from the message alone.
- End with the co-author trailer your harness specifies, if any.

### Step 5 — Commit and push

- Commit, then push to `origin` on the current branch.
- Never force-push. If the push is rejected because the remote is ahead,
  run `git pull --rebase`; if conflicts are non-trivial, stop and ask the
  user instead of resolving by guesswork.

### Step 6 — Report back

State the commit hash, the summary line, the number of files changed, and
the branch/remote pushed to.

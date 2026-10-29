---
name: pull
description: Start of a work session — pull the latest changes, refresh the local graphify knowledge graph with them, and tell the user what came in. Trigger: /pull, or "on pull", "début de session".
---

# /pull

The start-of-session routine. `graphify-out/` is not versioned: each person
keeps their own graph and refreshes it here.

## Steps

1. **Pull.** `git status` first: uncommitted changes → ask before going
   further. Then `git pull --rebase` on the current branch. On another
   branch than `main`, also `git fetch origin main` and say how far behind
   `origin/main` the branch is (`git rev-list --count HEAD..origin/main`);
   merge it only if the user wants.

2. **Graph.** Run `graphify update .` at the repo root (incremental,
   AST-only, no API cost). If graphify is not installed, say so and
   continue: the pull is what matters.

3. **Report** briefly, in French: the commits that came in
   (`git log --oneline ORIG_HEAD..HEAD`, grouped by author), any new
   migration in `supabase/migrations/` among them, and whether the graph
   was refreshed. For the details of what the other person did, point to
   the Discord #journal channel.

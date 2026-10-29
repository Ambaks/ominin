---
name: push
description: End of a work session — update the README "Project status", commit, push the current branch, then post a short summary of what was done to the team journal (Discord #journal) so the other person sees it. Trigger: /push, or "pousse", "on pousse", "fin de session".
---

# /push

The end-of-session routine. The other person (Marwan or Ambaka) reads the
journal entry tomorrow to know what you did today: write it for them.

## Steps

1. **Look at what is going out.** `git status` and `git diff` (staged and
   not), plus `git log @{u}..` if the branch already has unpushed commits.
   Nothing to commit and nothing to push → say so and stop.

2. **README.** Add one entry at the top of `## Project status` in
   `README.md`, in the existing format:
   `> **<What changed> (<YYYY-MM-DD>, <branch>, <migration state>) :** …`
   Say what changed for the user, the files that matter, what was verified
   (`tsc`, `eslint`, screenshots…) and what was not. Mention any migration
   and whether it is applied in production.

3. **Commit and push.** Stage the session's files by name (never
   `backend/.env` or anything secret; `graphify-out/` is local and ignored),
   commit with a French message in the repo's style, then
   `git push -u origin <branch>`. If the push is rejected, `git pull
   --rebase`, resolve, push again — never force.

4. **Journal.** Write the summary to a temporary file (the scratchpad when
   there is one), then from `frontend/`:
   `npm run journal -- "<titre>" <fichier>`
   - Title: one line, what was done, in French (e.g. « Journal de l'équipe
     dans l'admin, tâches supprimables »).
   - Summary: 2 to 6 lines starting with `- `, in French, for a teammate
     who did not follow the session: what changed for the user, what is
     left to do or to decide, anything they must do (apply a migration,
     add an env variable, test on a phone). No file lists, no jargon
     beyond what they need.
   The script writes through the Supabase CLI linked to production (the
   `npm run db:login` session), signs the entry with `OMININ_OWNER` from
   `backend/.env` and records the branch and commit. If it fails (no
   `OMININ_OWNER`, CLI not logged in or not linked), tell the user why:
   the push itself is done.

5. **Report** in two or three sentences: branch pushed, journal entry
   written (or why not).

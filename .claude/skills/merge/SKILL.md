---
name: merge
description: Once a big piece of work is finished — bring the branch up to date with main, open or reuse its pull request, wait for the Vercel deployment check, merge it into main with admin rights, apply pending migrations, and note it in the team journal. Trigger: /merge, or "merge", "on merge", "mets en prod".
---

# /merge

Puts a finished branch on `main`, so it goes live (Vercel deploys `main`).
Run it after `/push`, on the branch to merge.

Several sessions often work in the main checkout at the same time. Never
switch its branch, stash, or reset it: anything that needs another branch
checked out happens in a separate `git worktree` based on `origin/<branch>`,
removed at the end (`git worktree remove`).

## Steps

1. **Clean and pushed.** `git status` must be clean for this session's
   files (untracked local files such as `.vscode/`, or other sessions'
   files, are not yours: leave them) and `git log @{u}..` empty. Otherwise
   run the `/push` routine first. On `main` itself → nothing to merge, stop.

2. **Up to date with main.** `git fetch origin`, then
   `git merge-tree --write-tree origin/<branch> origin/main` to detect
   conflicts. If `main` moved, merge it into the branch (`git merge
   --no-edit origin/main`; never rebase a pushed branch, never force).
   Conflicts in the README "Project status" are the usual case: keep every
   entry, newest first. Anything else: resolve it understanding both sides,
   or stop and ask. Run `npx tsc --noEmit` in `frontend/` if code was
   merged in, then push.

3. **Pull request.** `gh pr list --head <branch> --state open`. None →
   `gh pr create --base main` with a French title in the repo's style and a
   short body (what changes for the user, migrations, what was verified).

4. **Wait for the deployment.** `gh pr checks <n> --watch`. Only
   **Vercel – ominin** matters: it must pass. **Vercel – flg-aerogommage**
   is another project and always fails, ignore it. If Vercel – ominin
   fails, read its logs (`npx vercel inspect <deployment> --logs`), fix,
   push, wait again. Never merge a red build.

5. **Merge with admin rights, without asking.** `gh pr merge <n> --squash
   --admin`: `main` requires a review, the team bypasses it with the admin
   flag (standing authorization from Marwan). If the auto-mode guard still
   refuses it, say so in one sentence and give the user that exact command.

6. **After.** Do not `git switch main` in the main checkout. From
   `frontend/`, check
   `npx supabase --workdir .. migration list --linked --output-format text`
   and apply any pending migration with `npm run db:push` without asking
   (standing authorization). Then wait for the production deployment of
   the merge commit (`gh api "repos/Ambaks/ominin/deployments?sha=<sha>"`,
   environment `Production – ominin`); if it fails while the PR preview
   passed, it is usually a Vercel hiccup: an empty commit merged the same
   way redeploys it. The `journal-merge` GitHub Action announces the merge
   in the journal; only if a migration was applied, add an entry from
   `frontend/`: `npm run journal -- "Migration : <PR title>" <file>`.

7. **Report** in two sentences: PR number merged, deployment and
   migrations state.

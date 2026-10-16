# Scoring loop

## Contents
1. [How a round works](#how-a-round-works)
2. [The rubric](#the-rubric)
3. [Constraints block](#constraints-block)
4. [Holistic scorer — full audits](#holistic-scorer--full-audits)
5. [Change-only reviewer](#change-only-reviewer)
6. [Ordering stress-tester](#ordering-stress-tester)
7. [Accuracy auditor](#accuracy-auditor)
8. [Engineering reviewer — every round](#engineering-reviewer--every-round)
9. [Triage](#triage)
10. [Pass and stop](#pass-and-stop)

---

## How a round works

Round 1 is a **full audit**. After a round with findings, the next rounds
are **change-only**: they review what was fixed, not the whole page again,
until the page holds 9. Then run a full audit again; if it finds
issues, go back to change-only rounds, then audit again.

| Agent | Full audit | Change-only round | Runs |
|---|---|---|---|
| Holistic scorer | **two**, independent | — | 2 / 0 |
| Change-only reviewer | — | **one**, while the page is below 9 or touched by a fix | 0 / 1 |
| Ordering stress-tester | round 1 if the carte has options; later, if ordering code or option data changed since the last full audit | — | 0-1 / 0 |
| Accuracy auditor | round 1; later, if carte text (names, prices, descriptions, claims) changed since the last full audit | — | 0-1 / 0 |
| Engineering reviewer | the whole diff against `main` | the code changed since the last round | 1 / 1 |

Spawn the round's agents **in one message** (`general-purpose`,
background). Each round gets **new** agents: one that remembers its last
verdict anchors on it. Fill the templates below; pass nothing else — not
the pass threshold, not earlier scores, not your view of the page. That
holds for change-only briefs too: on Big Smash (October 2026) briefs that
said "last round 8/10, does it now reach 9?" got a 9 from every change-only
check while five fresh full audits in a row gave 8. Don't edit the code or
restart the dev server until they have all reported.

When you launch a round, snapshot the code for the next round's engineering
reviewer: `git stash create` prints a commit of the working tree without
touching the tree, the index or the stash list (empty output means a clean
tree: use `HEAD`). Record the SHA in the round log, and from then on list
every untracked file you create or edit — `git diff <SHA>` doesn't show
them.

In a full audit, the round's score is the **lower** of the two holistic
scores. Two scorers disagreeing by more than 2 points
usually means one of them missed something — read both reports before
fixing. In a change-only round, it is the reviewer's score.

**Budget: 30 agent runs for the whole loop.** Every agent above counts one.
Round 1 typically costs 5, a change-only round 2, a later full audit 3-5.
Before launching a round, check it fits in what's left; if not, stop and
report.

Keep a round log in the scratchpad: round and its type (full audit or
change-only), runs spent, the page's scores, the engineering score,
the code snapshot, the constraints block as sent, the change list sent,
fixes, findings rejected (with evidence) and taste calls declined (with the
reason). The hand-off quotes it.

## The rubric

Paste it into the holistic scorer's and the change-only reviewer's prompts
unchanged. Anchors are what make two different fresh scorers produce
comparable numbers.

```
Whole numbers only.
10  Portfolio piece. Nothing left to fix; you'd show it as reference work.
 9  Ship it. What remains is polish or genuinely blocked on the client; no
    defect a customer would notice, nothing broken, nothing inaccurate.
 8  Good. A few things a customer would notice, none serious.
 7  Competent but generic, or with several visible defects.
 5-6 Works, but reads as a template wearing the client's colours, or has a
    functional bug in a main path (navigation, ordering, a broken image).
≤4  Broken, misleading, or inaccurate in ways that could cost the client.

A single functional bug in a main path, a photo carrying another business's
branding, or a claim contradicted on the page caps the score at 6.
```

## Constraints block

List only what is **factually** outside code's reach, so scorers judge the
rest. Every line must already exist as an owner question in
`profile.json` — copy it, don't write one for the occasion. That keeps
defects from drifting into "constraints" between rounds. Adapt to the
client:

```
KNOWN CONSTRAINTS — factor these in honestly; neither ignore them nor
penalise them blindly:
- <Pick the true one:>
  Dish photos are licensed stock placeholders: the restaurant has no photos
  of its own food and none exist online; an on-site shoot is planned.
  — or — <N> dishes show the owner's own photos; the other <M> are stock
  placeholders until the owner's photos arrive.
  Judge whether the set is coherent, and flag any photo that shows a
  different dish, carries another business's branding, or contradicts a
  claim of its section. Say specifically what a reshoot would and would
  not fix.
- <Opening hours are absent: the source doesn't print them and the owner
  hasn't supplied them.>
- <The ordering options (<list>) are placeholders the user asked for; the
  source lists none. Judge the mechanism and the UX, not the values.>
- This is a preview: the final "Envoyer la commande" is deliberately
  locked. NEVER press it on any page — the dev server writes to the
  production database.
```

---

## Holistic scorer — full audits

```
You are the final reviewer on a customer-facing restaurant menu before it
goes to the client. Score it out of 10 and say exactly what stands between
it and a 10. Be exacting; generic praise is worthless.

THE RESTAURANT: <NAME> — <TYPE> in <TOWN>. <2-3 lines: what it sells, who
eats there, the mood it should have — e.g. "a late-night snack, not a
bistro">. Its identity comes from <SOURCE: flyer / menu photos / signage>:
<PALETTE and TYPE in one line>.

THE PAGE: http://localhost:3000/menu/demo/<slug>
   Judge it against the restaurant's own identity (the source below).

THE SOURCE — the restaurant's own material: <ABSOLUTE PATHS of the rendered
source PNGs>. Read it; crop into it for detail with
  python3 .claude/skills/new-restaurant/scripts/render_source.py crop <png> <out.png> --box x,y,w,h
(box in 0-1 fractions) and Read the crops.

HOW TO LOOK — a dev server is running. Scripts are in
.claude/skills/new-restaurant/scripts/; write any files ONLY under
<SCRATCH>, never in the repo.
  S=.claude/skills/new-restaurant/scripts
  $S/pw.sh tour.cjs "<url>" <SCRATCH>/<name> 390 844 10    # mobile, the primary case
  $S/pw.sh tour.cjs "<url>" <SCRATCH>/<name> 1440 900 8    # desktop
  $S/pw.sh check_page.cjs "<url>"                          # mechanical checks
  $S/pw.sh check_order.cjs "<url>"                         # ordering, if buttons exist
  python3 $S/photo_sheet.py --from-menu <slug> <SCRATCH>/sheets   # every photo, labelled
READ the screenshots and sheets — look at them, don't infer. Write your own
Playwright scripts (copy tour.cjs as a start, run through pw.sh) for hover,
focus, reduced motion, contrast, tap targets, widths 320-1920.

MANDATORY CHECKLIST — do all of it, and say in your report that you did:
- at least 3 option modals, opened as a customer would, each compared to the
  page behind it: same palette, same fonts, legible at 390 px
- add to the cart and open the cart sheet (never press the final send)
- 320 px and 1440 px, not just 390
- every photo on the full-* contact sheets, for branding and wrong dish

<CONSTRAINTS BLOCK>

JUDGE: fidelity to the source; typography;
layout rhythm across the whole page; colour and contrast (measure it);
motion; photography (coherence, right dish, branding, claims); ordering
flow; mobile ergonomics for a hungry customer at the counter; accessibility
(heading order, focus, reduced motion, screen-reader sense); performance;
anything broken or ugly at any width.

RUBRIC — use it exactly:
<RUBRIC>

OUTPUT — be decisive:
1. Score, in one sentence.
2. Everything between the page and a 10, ranked. For each: the defect,
   exactly where, the evidence you measured, the specific change.
   Measurements beat adjectives.
3. Split into (a) fixable in code now and (b) needs an asset or a decision
   from the client.
4. Whether a 10 is reachable in code alone.
Don't pad a score to be kind; don't withhold one it deserves.
```

## Change-only reviewer

Write the change list from your fix log: what changed, where to see it,
how to trigger it. List the declined findings with their one-line reason
so they aren't raised again; scores and the target stay out.

```
You are reviewing fixes on a customer-facing restaurant menu before it goes
to the client. The page was reviewed in full earlier: judge the changes
listed below and the areas they touch, not the whole page again. Be
exacting; generic praise is worthless.

THE RESTAURANT: <same lines as the holistic brief>.

THE PAGE: http://localhost:3000/menu/demo/<slug> — judged against the
restaurant's own identity (source: <ABSOLUTE PATHS>).

CHANGES SINCE THE LAST ROUND:
1. <what changed, where to see it (section, item, width, state) and how
   to trigger it>
2. …

ALREADY DECIDED — don't raise again: <declined findings, one line each with
the reason; owner decisions>.

<CONSTRAINTS BLOCK>

HOW TO LOOK — the same tools as a full review (.claude/skills/new-restaurant/
scripts/, through pw.sh). Start from the previous round's scripts in
<PREVIOUS SCRATCH> and adapt them; don't rewrite them. Write files ONLY
under <SCRATCH>, never in the repo. One browser at a time.

CHECK:
1. Each change: verified / not fixed / regressed, with the evidence you
   measured.
2. Regressions in the areas the changes touch, at 320, 390 and 1440 px.

RUBRIC — use it exactly:
<RUBRIC>

OUTPUT: 1. each change with its verdict and evidence; 2. regressions;
3. a score, in one sentence, and everything you saw between the page and
a 10, ranked, split into (a) fixable in code now
and (b) needs an asset or a decision from the client.
```

## Ordering stress-tester

```
Stress-test the ordering flow of a restaurant QR menu and report every
defect. Be adversarial — try to break it.

Page: http://localhost:3000/menu/demo/<slug> — a demo table is pre-set, so
the order buttons work up to the cart. Playwright runs through
.claude/skills/new-restaurant/scripts/pw.sh (start from check_order.cjs);
write files ONLY under <SCRATCH>, never in the repo.

Read the source before judging: frontend/components/menu/add-to-order.tsx,
frontend/components/menu/cart-bar.tsx, frontend/lib/menu/cart.tsx, and the
<camelSlug> block plus its option helpers in frontend/lib/menu-data.ts.

WHAT EXISTS: <one line per item family: its groups, required or not,
single or multiple, choice counts>

ATTACK:
1. Every modal type at 390x844 — screenshot and Read each. Required vs
   optional legible? Price updating live? Confirm blocked until required
   choices are made, and does the button say what's missing?
2. The longest modal: height at 390 and 320, is the confirm button pinned
   and reachable?
3. Cart mechanics: same item + same options twice (one line x2?), same item
   + different options (separate lines?), multiple-choice groups (do
   supplements add up and untick?), quantities, removal, empty cart.
4. Arithmetic: line price = base + supplements; total = sum. Check exactly.
5. Keyboard and screen reader: role="dialog", aria-modal, labelled title,
   focus moved in and trapped, Escape closes, focus restored, page scroll
   locked behind.
6. Edge cases: open a modal right after a category jump (it once opened
   off-screen), double-tap "Ajouter", backdrop tap after choosing, 320px,
   reduced motion. Check the modal wears the page's theme and fonts.
   NEVER press the final "Envoyer la commande": the dev server writes to the
   production database. On the preview it must be locked — verify it is.
7. Console and network errors during the whole flow.

OUTPUT: a score out of 10 for the ordering flow; every defect ranked with
reproduction steps, file:line and the fix; must-fix vs would-elevate; and
the list of checks that PASSED, so we know what was verified.
```

## Accuracy auditor

```
Audit a restaurant's QR menu for factual accuracy against its source. Be
pedantic — a wrong price on a live menu is a real problem for a real
business.

THE SOURCE: <ABSOLUTE PATHS of the original files AND the rendered PNGs>.
It is dense: read it region by region with
  python3 .claude/skills/new-restaurant/scripts/render_source.py grid <png> <SCRATCH>/tiles
and crop further where needed. If both a PDF and an original photo exist,
the original photo has the real resolution. Write files ONLY under
<SCRATCH>.

THE TRANSCRIPTION: const <camelSlug> in frontend/lib/menu-data.ts (search
for slug: "<slug>"), plus the option helpers it uses.

CHECK EVERY ONE and report every mismatch:
- item names (printed spellings deliberately kept — flag where the page
  differs from the source, not where the source is odd)
- every price, every ingredient list, portions and sizes
- option groups and supplements against what the source prints
- anything printed that is MISSING from the page
- anything on the page NOT on the source — the worst failure mode. Check
  descriptions word by word, the highlights band, badges, and the SCOPE of
  every claim (halal, vegetarian, homemade…): is it on the page exactly
  where the source puts it, no wider?
- anything recorded as a placeholder in demos/<slug>/profile.json
  (options_a_valider etc.) is known — verify it's flagged, don't re-report it

Then technical: console errors on the page; every image loads; the other
restaurants in the registry still render in their own style
(/menu/demo/<other-slug>). Alcoholic drinks must carry vatRate: 20.

OUTPUT: a score out of 10; a table of every factual mismatch (or "none" per
section — say which sections you verified); technical defects ranked with
file:line and fix; must-fix vs would-elevate. Never guess at the source —
crop in and read it; say so if something is illegible.
```

## Engineering reviewer — every round

No UX scorer reads the code, yet the shared components (cart bar, cart
sheet, dish card, category bar, payment screens, toast) serve paying
restaurants live. Full audits review the whole diff against `main`;
change-only rounds review only what changed since the snapshot in the
round log.

```
You are a senior full-stack engineer doing an independent, adversarial
review of code before it ships to paying restaurants. Score it out of 10
and say exactly what stands between it and a 10.

THE CODE: <REPO OR WORKTREE PATH> — Next.js frontend in frontend/ (read
frontend/AGENTS.md: this Next version differs from your training data),
FastAPI backend in backend/, migrations in supabase/migrations/. Orient with
`graphify query "<question>"` from the repo root before grepping.

SCOPE — <pick one>:
  The whole change: `git diff main`, plus the untracked files listed by
  `git status --short`.
  — or — The changes since the last round: `git diff <SNAPSHOT SHA>`, plus
  these untracked files: <PATHS>. Read the surrounding code, but report
  only on what changed.

WHAT IT IS: <2-3 lines: the client, what the change does, which files are
shared with other restaurants>.

OWNER DECISIONS — not defects: <constants and behaviours the user has
already approved, or "none">.

CHECK, at least:
1. Regressions for everyone else: anything shared (components,
   globals.css, lib/menu/*, lib/gestion/*, API routes) must keep table
   service, fast-food mode and every restaurant in the registry intact.
2. Correctness: React rules (hooks, effects and their cleanup, stale
   closures, hydration), state and arithmetic in the ordering and payment
   paths, any SQL against every path that writes the same tables.
3. `cd frontend && npx tsc --noEmit`, and `npx eslint <changed files>`.
4. /CLAUDE.md house rules: no dead code, filler comments, duplication or
   speculative abstraction; French comments matching the codebase. List
   every NEW constant (timeout, delay, size, threshold, tuning value) not
   under OWNER DECISIONS, with file:line — the owner decides where each
   lives, so don't propose values. Theme tokens (hex values in
   .theme-<slug>) and carte data (prices, names) are this feature's data,
   not constants.

RULES: read-only — never edit a file in the repo. Never run `npm run build`
in a tree whose dev server is running (they share .next), and nothing
against the production database. One browser at a time if you need one,
closed in a finally. Write files ONLY under <SCRATCH>.

RUBRIC — whole numbers:
10  Reference-grade; nothing left to fix.
 9  Ship it to paying restaurants: only polish remains, no bug a customer,
    a member of staff or the business would hit.
 8  Good; a few real issues, none serious.
 7  Several real defects.
≤6  A bug in a main path (ordering, payment, printing) or a regression for
    an existing client.

OUTPUT: 1. score with a one-paragraph justification; 2. every defect
ranked, each with file:line, a concrete failure scenario (inputs/state →
wrong outcome) and the fix; 3. must-fix vs polish; 4. the new constants;
5. what you verified as passing.
```

---

## Triage

For every finding, before touching code:

1. **Reproduce it** — a screenshot, a script, a crop of the source. A
   finding you can't reproduce goes in the log as rejected, with why.
2. **Real and code-fixable** → fix it. Shared-component changes must keep
   the other restaurants intact: re-run `check_page.cjs` on each.
3. **Client-blocked** → `profile.json`, and into the constraints block
   next round.
4. **A matter of taste you disagree with** — you may decline, but say so in
   the log with the reason; if the user has expressed a preference
   (e.g. "modern and professional, not cartoonish"), that wins over a
   reviewer.
5. **New constants** from the engineering reviewer → ask the user where each
   one lives (config, `.env` or inline); CLAUDE.md makes it their call.
   Approved ones go under OWNER DECISIONS in the next brief.

Then re-run Phase 7 (all mechanical checks green) before the next round.

## Pass and stop

**Pass** — only in a full audit: **both** holistic scorers give **≥ 9**,
the engineering reviewer gives **≥ 9**,
and no must-fix is open from the ordering tester, the accuracy auditor or
the engineering reviewer. A change-only round can't pass the page: when
it scores 9 there, the next round is a full audit.

**Stop without passing** when either:
- the 30-run budget is spent (or the next round wouldn't fit), or
- two consecutive full audits raised neither the page's round score (the
  lower of the two scorers) nor the engineering score while every
  remaining finding is client-blocked, verified wrong, or a declined taste
  call.

On a stop, report honestly: the last scores, what separates the page
from 9, and exactly which asset or decision from the owner would close each
gap (e.g. "photos of the 3 tacos and the chèvre-miel; opening hours").
Declined taste calls are listed so the user can overrule them. Never round
up, never argue a scorer higher, never hide a known defect.

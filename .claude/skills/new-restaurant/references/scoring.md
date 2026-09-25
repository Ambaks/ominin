# Scoring loop

## Contents
1. [How a round works](#how-a-round-works)
2. [The rubric](#the-rubric)
3. [Constraints block](#constraints-block)
4. [Holistic scorer — every round](#holistic-scorer--every-round)
5. [Ordering stress-tester](#ordering-stress-tester)
6. [Accuracy auditor](#accuracy-auditor)
7. [Triage](#triage)
8. [Pass and stop](#pass-and-stop)

---

## How a round works

| Agent | Round 1 | Later rounds | Runs |
|---|---|---|---|
| Holistic scorer | **two**, independent | two, every round | 2 |
| Ordering stress-tester | if the carte has options | when ordering code or option data changed | 0-1 |
| Accuracy auditor | yes | when carte text (names, prices, descriptions, claims) changed | 0-1 |

Spawn the round's agents **in one message** (`general-purpose`, background).
Each round gets **new** agents: one that remembers its last verdict anchors
on it. Fill the templates below; pass nothing else — not the pass
threshold, not earlier scores, not your view of the page. Don't edit the
code or restart the dev server until they have all reported.

The round's score for each version is the **lower** of the two holistic
scores. Two scorers disagreeing by more than 2 points usually means one of
them missed something — read both reports before fixing.

**Budget: 30 agent runs for the whole loop.** Every agent above counts one.
Round 1 typically costs 4, later rounds 2-3: that's roughly 10-12 rounds.
Before launching a round, check it fits in what's left; if not, stop and
report.

Keep a round log in the scratchpad: round, runs spent, both scores per
version, the constraints block as sent, fixes, findings rejected (with
evidence) and taste calls declined (with the reason). The hand-off quotes
it.

## The rubric

Paste it into the holistic scorer's prompt unchanged. Anchors are what make
two different fresh scorers produce comparable numbers.

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

## Holistic scorer — every round

```
You are the final reviewer on a customer-facing restaurant menu before it
goes to the client. Score it out of 10 and say exactly what stands between
it and a 10. Be exacting; generic praise is worthless.

THE RESTAURANT: <NAME> — <TYPE> in <TOWN>. <2-3 lines: what it sells, who
eats there, the mood it should have — e.g. "a late-night snack, not a
bistro">. Its identity comes from <SOURCE: flyer / menu photos / signage>:
<PALETTE and TYPE in one line>.

TWO VERSIONS OF THE SAME CARTE — score each separately:
A. Restaurant version: http://localhost:3000/menu/demo/<slug>
   Judge it against the restaurant's own identity (the source below).
B. Ominin version: http://localhost:3000/menu/demo/<slug>?theme=ominin
   Judge it against Ominin's house style — warm near-black, gold ember
   accents, Fraunces + Instrument Sans — NOT against the restaurant's
   brand. It must stand on its own as a polished menu.

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
- version B in both colour modes: use the sun/moon toggle in the category
  bar (it exists only on B)
- 320 px and 1440 px, not just 390
- every photo on the full-* contact sheets, for branding and wrong dish

<CONSTRAINTS BLOCK>

JUDGE: fidelity to the source (A) or to the house style (B); typography;
layout rhythm across the whole page; colour and contrast (measure it);
motion; photography (coherence, right dish, branding, claims); ordering
flow; mobile ergonomics for a hungry customer at the counter; accessibility
(heading order, focus, reduced motion, screen-reader sense); performance;
anything broken or ugly at any width.

RUBRIC — use it exactly:
<RUBRIC>

OUTPUT — be decisive:
1. Score for A and score for B, one sentence each.
2. Everything between each version and a 10, ranked. For each: the defect,
   exactly where, the evidence you measured, the specific change.
   Measurements beat adjectives.
3. Split into (a) fixable in code now and (b) needs an asset or a decision
   from the client.
4. For each version, whether a 10 is reachable in code alone.
Don't pad a score to be kind; don't withhold one it deserves.
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
Audit a restaurant's QR menu for factual accuracy against its source, and
for code quality. Be pedantic — a wrong price on a live menu is a real
problem for a real business.

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

Then technical: `cd frontend && npx tsc --noEmit` and `npx eslint` on the
changed files; console errors on the page; every image loads; the other
restaurants in the registry still render in their own style
(/menu/demo/<other-slug>); code against /CLAUDE.md house rules (no dead
code, no speculative abstraction, French comments are the convention).
Theme tokens (hex values in .theme-<slug>) and carte data (prices, names)
ARE the data of this feature — they are not "hardcoded constants" in the
CLAUDE.md sense; don't report them as such. Alcoholic drinks must carry
vatRate: 20.

OUTPUT: a score out of 10; a table of every factual mismatch (or "none" per
section — say which sections you verified); technical defects ranked with
file:line and fix; must-fix vs would-elevate. Never guess at the source —
crop in and read it; say so if something is illegible.
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

Then re-run Phase 7 (all mechanical checks green) before the next round.

## Pass and stop

**Pass** — in one round: **both** holistic scorers give **≥ 9 to version A
and ≥ 9 to version B**, and no must-fix is open from the ordering tester or
the accuracy auditor.

**Stop without passing** when either:
- the 30-run budget is spent (or the next round wouldn't fit), or
- two consecutive rounds raised neither version's round score (the lower of
  the two scorers) while every remaining finding is client-blocked,
  verified wrong, or a declined taste call.

On a stop, report honestly: the last scores, what separates each version
from 9, and exactly which asset or decision from the owner would close each
gap (e.g. "photos of the 3 tacos and the chèvre-miel; opening hours").
Declined taste calls are listed so the user can overrule them. Never round
up, never argue a scorer higher, never hide a known defect.

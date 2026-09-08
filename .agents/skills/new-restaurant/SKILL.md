---
name: new-restaurant
description: Onboard a new restaurant client — gather info, research online, verify findings with user, build tailored demo profile. Trigger: /new-restaurant
---

# /new-restaurant

Onboard a new restaurant as an Ominin client. The goal is to produce a
complete `demos/<slug>/profile.json` with real data — menu, branding, design
cues — so a tailored Connect demo can be built and shown during a sales visit.

## What you must do when invoked

Follow these phases in order. Do not skip phases.

---

### Phase 1 — Intake

Ask the user for the following. Accept whatever they have; mark the rest as
"to research".

| Field | Required | Example |
|---|---|---|
| Restaurant name | yes | "Le Petit Bistrot" |
| Location (city / address) | yes | "12 rue de la Paix, Lyon 2e" |
| TikTok handle or URL | if available | @lepetitbistrot |
| Instagram handle or URL | if available | @lepetitbistrot |
| Website URL | if available | lepetitbistrot.fr |
| Google Maps link | if available | |
| Any other context | optional | "They do Lebanese fusion, modern interior" |

Use the AskUserQuestion tool to collect this cleanly. Do NOT proceed to
Phase 2 until the user has answered.

---

### Phase 2 — Research

Use WebSearch and WebFetch to find as much as possible about the restaurant.
Search for all of the following:

1. **Website & online presence** — official site, Google Maps listing, review
   sites (TripAdvisor, Google Reviews, TheFork/LaFourchette).
2. **Menu** — look for their actual menu (website, delivery platforms like
   Uber Eats / Deliveroo / Just Eat, TripAdvisor photos). Extract dish names,
   descriptions, prices, and categories.
3. **Interior & ambiance** — search for interior photos (Google Images,
   TripAdvisor photos, Instagram posts, Google Maps photos). Note the vibe:
   modern, rustic, industrial, traditional, cozy, upscale, etc.
4. **Branding & design** — look at their logo, website colors, social media
   aesthetic. Extract a color palette (primary, secondary, accent as hex
   codes).
5. **Cuisine type & positioning** — what kind of food, price range, target
   clientele.
6. **Social media content** — check their TikTok and Instagram for the kind
   of content they post (dish photos, behind-the-scenes, reels, etc.).

Be thorough. The more you find, the more tailored the demo will be.

---

### Phase 3 — Verify with user

Present your findings to the user in a structured format. Use an Artifact
(HTML page) to display:

- **Restaurant overview**: name, cuisine, location, hours found
- **Design direction**: colors extracted, interior vibe, style notes
- **Reference images**: URLs of interior/exterior photos you found (show them
  inline in the artifact so the user can visually confirm)
- **Menu items**: organized by category with prices — flag any you're unsure
  about
- **Social media**: summary of their online presence and content style

Ask the user to:
1. Confirm the information is correct (or provide corrections)
2. Validate the design direction
3. Add any missing menu items or categories
4. Confirm which photos represent the restaurant accurately

Do NOT proceed to Phase 4 until the user confirms.

---

### Phase 4 — Build the demo profile

Create `demos/<slug>/profile.json` using the verified data. The slug should
be a kebab-case version of the restaurant name (e.g. "le-petit-bistrot").

The profile.json must follow the template structure at `demos/_template/profile.json`:

```
demos/
  _template/
    profile.json          <- schema/template (never modified)
  <restaurant-slug>/
    profile.json          <- filled with real, verified data
```

Fill in every field you have data for. For menu items:
- Use kebab-case IDs derived from the dish name
- Include descriptions from the real menu
- Use actual prices
- Add image URLs if found (from their website/social media)

For design:
- Set colors based on their actual branding (logo, website, interior)
- Describe the interior vibe concisely
- Include reference image URLs

For collect_settings:
- Use sensible defaults (prep_minutes: 15, etc.) — these can be adjusted
  later per the restaurant's actual workflow.

---

### Phase 5 — Summary

Tell the user:
1. What was created and where (`demos/<slug>/profile.json`)
2. A brief summary of the restaurant profile
3. Next steps: building the actual tailored Connect demo pages using this
   data

---

## Updating an existing profile

When invoked as `/new-restaurant update <slug>` — or when the user provides
new data (menu, photos, hours, corrections) for a restaurant that already has
a `demos/<slug>/profile.json` — skip Phases 1–3 and go straight to updating:

1. Read the existing `demos/<slug>/profile.json`.
2. Merge in the new data. Menu photos or text from the user are the source of
   truth — transcribe items exactly (names, descriptions, prices in euros),
   kebab-case IDs derived from dish names.
3. Clear any resolved "pending" items from `notes`; keep what is still
   missing.
4. Show the user a short diff-style summary of what changed and ask them to
   confirm anything you were unsure about (illegible photo text, ambiguous
   prices).

This path exists so a partner can send a menu photo from the restaurant and
the profile is updated in minutes, ready for the demo.

## Important notes

- All text in the profile and demo should be in **French** (this is a
  French-market product).
- Never fabricate menu items or prices — only use what was found or confirmed
  by the user.
- If you can't find certain information, say so explicitly and ask the user.
- The profile.json is the source of truth for building the demo — it must be
  accurate.

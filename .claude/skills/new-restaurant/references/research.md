# Research brief

Launch one `general-purpose` agent with the brief below as soon as you know
the restaurant's name and town, and keep building while it runs. What it
finds feeds `profile.json` (`research`, `legal`, `socials`, `address`) and
the hand-off — often as sales arguments.

On LZ.FOOD this found: the flyer's postcode was wrong (34000 printed,
34070 real); "near Port Marianne" was *in* Port Marianne, 180 m from a tram
stop; the legal entity, its director and a two-month-old start date; no
Google Business listing at all, while the previous tenant's dead page still
held 4.8★ over 87 reviews at the same address; a closed Uber Eats shell
still labelled with the old tenant's name.

## The brief

Fill in the placeholders; paste everything the user told you into CONTEXT.

```
Research a restaurant for a client onboarding profile. Load WebSearch and
WebFetch first: ToolSearch with query "select:WebSearch,WebFetch".
Write any file ONLY under <SCRATCH>; never write in the repository.

THE RESTAURANT: <NAME> (as printed: "<EXACT BRANDING>"), <TYPE> in <TOWN>.
CONTEXT (from the owner's material and the user): <address as printed,
phone, what it sells, claims such as halal/delivery, anything the user said
about location or history>

Find, and for EACH fact give a confidence level (confirmed / likely / not
found) and the URL you actually fetched:

1. ADDRESS — the exact postal address. Verify it against the Base Adresse
   Nationale (https://api-adresse.data.gouv.fr/search/?q=<address>) and
   La Poste; printed materials often carry a wrong postcode or a
   de-accented street name. Which quartier it sits in; distance to what
   the owner described as nearby; nearest transport stop.
2. LEGAL ENTITY — https://recherche-entreprises.api.gouv.fr/search?q=<name>
   and pappers.fr: raison sociale, form, SIREN/SIRET, NAF, director,
   creation and start-of-activity dates, registered address.
3. OPENING HOURS — days and times.
4. GOOGLE MAPS — the listing URL, rating, review count, the "write a review"
   link. If there is no listing, say so explicitly and note what else is
   listed at that address (a previous tenant's page is a sales argument).
5. SOCIAL MEDIA — Instagram, TikTok, Facebook, Snapchat, WhatsApp. Say
   whether you could verify each handle belongs to THIS restaurant or only
   found a plausible candidate.
6. DELIVERY PLATFORMS — Uber Eats, Deliveroo, Just Eat: URL, open/closed,
   and whether menu and prices there match the owner's material.
7. WEBSITE or online ordering page of their own.
8. VISUAL IDENTITY — logo, sign colours, storefront and interior photos
   (describe them, give URLs). Anything about the name's meaning or the
   owner.
9. REVIEWS — recurring praise and complaints, if any exist.

Search in French. Try the name with and without punctuation, the address,
the phone number, and "<name> <town>" on each platform.

Be rigorous: do NOT invent details. "Not found" is a valid and useful
answer. Distinguish what you verified on a page you fetched from what you
infer, and flag any contradiction between sources (e.g. a closure date that
precedes the start of activity) rather than resolving it silently.

Report a compact structured summary, then a short "what this means for
onboarding" list: sales opportunities and questions for the owner.
```

## Using the result

- Put the **verified** address, phone and hours on the carte; keep the
  printed variant and the discrepancy in `profile.json → research`.
- Unverified handles go in `profile.json` as candidates, never on the page.
- Contradictions become owner questions, not decisions you make.
- Opportunities (no Google listing, dead delivery page, strong reviews to
  surface) go in the hand-off message.

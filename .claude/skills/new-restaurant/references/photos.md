# Photos — sourcing brief and audit

Photos make or break a menu page, and they are where LZ.FOOD went wrong
most often: nine carried another restaurant's branding, three contradicted
the "Halal" claim of their section, several showed a different dish than
the one named (a margherita with anchovies, a "sandwich" that was a
brioche burger), others were framed so the card crop kept the tablecloth
and cut the food.

## Order of preference

1. **The restaurant's own photos** of the dish (user-supplied) — always
   first, even if imperfect. See build.md §4 for conversion.
2. **Stock** from Pexels or Unsplash, sourced by background agents with the
   brief below. Split the carte across two agents (e.g. pizzas / everything
   else) so they return together.
3. **No photo** is better than a wrong one. The card renders fine without
   `image`.

## The sourcing brief

Launch `general-purpose` agents with this, filled in. Give each agent its
list of items with the **exact menu description** of each — the photo must
match that text, not the dish's generic idea.

```
Source real, working photo URLs for <RESTAURANT>'s online menu — a <TYPE>
in <TOWN>. The page is a <dark/light>, <warm/cool> theme. Load WebSearch
and WebFetch first: ToolSearch with query "select:WebSearch,WebFetch".
Download candidates ONLY under <SCRATCH>; never write in the repository.

URL forms — prefer Pexels:
  https://images.pexels.com/photos/<token>?auto=compress&cs=tinysrgb&w=1200
  (token like 1234567/pexels-photo-1234567.jpeg)
Unsplash accepted:
  https://images.unsplash.com/<photo-id>?auto=format&fit=crop&w=1200&q=75

ITEMS (id — menu text, exactly as the customer will read it):
<id> — <name> : "<description>"
...

HARD RULES — every one of these has already cost this project a round:
1. Verify each URL: curl -sS -o /dev/null -w "%{http_code} %{content_type}\n" "<url>"
   must print 200 and image/...
2. Download every candidate and READ IT AT FULL SIZE, corners at 2x zoom.
   Reject any readable third-party branding: business name, logo,
   watermark, printed liner/wrapper/box/crate, newspaper, menu card, QR
   code, branded utensil or bottle. Restaurant stock photography is usually
   shot FOR a restaurant and carries its name, invisible as a thumbnail.
   (Products the restaurant actually sells — a Coca-Cola can for "Canette" —
   are fine.)
3. The photo must show THIS dish: the ingredients in the menu text,
   nothing that contradicts it (anchovies on a "sauce tomate, olive"
   margherita is a contradiction).
4. <DIET RULE, if the section carries a claim — e.g. "The pizza sections
   are labelled Halal: reject prosciutto, salami, pepperoni, chorizo,
   bacon rashers. Cooked ham (pale, flat, matte), chicken, minced beef,
   merguez are fine." Or "Végétarien: no meat or fish visible.">
5. Framing: the card shows a CENTRED 16:9 crop with object-fit: cover.
   Judge each candidate by that crop — the dish centred and filling it.
6. House look: <e.g. dark wood, black slate, near-black; avoid white
   marble, bright daylight, cold blue casts>.
7. No token used twice. Already in use: <TOKENS>. Blocklisted ranges:
   <paste the blocklist below>.
8. Items in the same section are seen side by side — vary angle, surface
   and crop so they don't read as one shot.

If no acceptable photo exists for an item, say so plainly. Keeping no
photo is better than a wrong one, and we'd rather know.

OUTPUT: compact JSON
{"<id>": {"token", "kind": "pexels|unsplash", "shows",
          "centred_16x9_crop_shows", "branding_check": "clean",
          "diet_check", "exact": true|false}, ...}
plus one line per item on what you actually saw, and every candidate you
rejected for branding (with the reason) so the blocklist can grow.
```

## Auditing — yours, not the agent's

The agent's "clean" is a claim. Check it:

```bash
python3 $S/photo_sheet.py --from-menu <slug> <scratch>/sheets
```

Read **every** `full-*.png` (branding, right dish, diet) and `card-*.png`
(the crop a customer sees). Zoom where something looks like text:
`render_source.py crop <scratch>/sheets/img/NN-<id>.jpg <out> --box …`.
Also reject a photo whose visible count contradicts the printed portion
when it's glaring ("x3" tenders over a heap of eight).

Fixes:
- subject off-centre → `pexelsRecadre(token, 800)`; re-check the card sheet
- anything else → back to an agent with the specific reason, or no photo

Two stock photos from the same shoot on one page read as a set, which can
be good — unless the shoot is branded (see the blocklist).

## Blocklist — contaminated Pexels series

Branded shoots come in runs of consecutive ids. Skip these ranges entirely;
**add every new one you find**, with what's printed, so the next client
doesn't pay for it again.

| Range | Brand visible |
|---|---|
| `334575xx`, `334576xx`, `334580xx` | "Dubai Gastro" wordmark on the parchment liner |
| `373244xx`, `376241xx` | "THE BIG BREAKFAST" roundel on the paper |
| `16007xx`, `16038xx`, `16335xx` | "SAUDI BROASTED" crate in the background |
| `29306xxx` | "ÖMER KEBAB" printed wrapper |
| `37025062` | "POLLO … HERMA…" printed wrapper |
| `41092xx` | McDonald's red fry box, hands (O’Crousti, fries) |
| Unsplash `photo-1746635*` | "Sidral Mundet" soda bottles on yellow |

Single photos rejected for branding on LZ.FOOD: `14979836` (logo on
wrapper), `18852568` and `33718644` (newsprint), `14866627` (Russian menu
card), `15611221` ("G" logo sweatshirt), `27024683` ("hecer" pizza cutter),
`20793369` (Acqua Alma bottle), `7919421` ("Kitchen Maestro" board),
`20652782` (newspaper under the plate), `36863577` (newspaper liner and a
sauce sachet with a phone number), Unsplash `photo-1773620494344-a9b87d73031b`
(labelled sauce bottle). On O’Crousti Poulet: `7731979`, `7731983` and Unsplash
`photo-1642447944075-895b146ccbf2` (McDonald's fry box), `15754939` ("MEAT
burger" paper), `9932888` (printed fry cup), `11659577` (Mirinda), Unsplash
`photo-1690988109029-aa2377d08b12` (Coke Studio promo with a QR code).

## French dishes stock libraries don't have

Tell the agent up front, so it neither wastes an hour nor substitutes the
wrong thing:

- **Tacos français** (pressed rectangular parcel): no certified photo on
  Pexels or Unsplash — every "tacos" result is Mexican. Grill-marked pressed
  wraps read correctly; the LZ.FOOD three are `5779364`, `15913640` and
  Unsplash `photo-1773620494884-940e0db95e46`.
- **Pizza chèvre-miel**: none — a white cheese pizza is the least-wrong
  stand-in.
- **Sandwich "américain"** (baguette, steak, fries inside): none; steak-and-
  cheese subs are the closest.
- **Pizza kebab on a red base with white sauce**: rare; `12261064` is close.

These are the first dishes to put on the owner's photo-shoot list.

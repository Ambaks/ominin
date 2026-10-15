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
| `334579xx` | printed « …bar » liner (same series) |
| `373244xx`, `376241xx` | "THE BIG BREAKFAST" roundel on the paper |
| `16007xx`, `16038xx`, `16335xx` | "SAUDI BROASTED" crate in the background |
| `29306xxx` | "ÖMER KEBAB" printed wrapper |
| `37025062` | "POLLO … HERMA…" printed wrapper |
| `176921xx` (17692187–92) | "SUMIBOZU / GÀ NƯỚNG THAN" chopstick sleeve |
| `19205235` | Ülker chocolate wrappers |
| `30350296` | printed plate rim |
| `32641693`, `32645121`–`32645123` | Versace-pattern plates |
| `41092xx` | McDonald's red fry box, hands (O’Crousti, fries) |
| Unsplash `photo-1746635*` | "Sidral Mundet" soda bottles on yellow |
| `3675xxxx`–`3678xxxx` (speckled gold-rimmed plates, e.g. `36782573`) | gold "PA…" wordmark on the plate rim |
| Unsplash `photo-176658915*` | burned logo on the board, branded beer bottle |
| `129916xx` | newspaper under the prosciutto |
| `303502xx` | printed « …dough » liner (same shoot as `30350296`) |
| `165331xx` (`16533148`, `16533156`) | « Street Food News » newsprint |

Single photos rejected for branding on LZ.FOOD: `14979836` (logo on
wrapper), `18852568` and `33718644` (newsprint), `14866627` (Russian menu
card), `15611221` ("G" logo sweatshirt), `27024683` ("hecer" pizza cutter),
`20793369` (Acqua Alma bottle), `7919421` ("Kitchen Maestro" board),
`20652782` (newspaper under the plate), `36863577` (newspaper liner and a
sauce sachet with a phone number), Unsplash `photo-1773620494344-a9b87d73031b`
(labelled sauce bottle). On O’Crousti Poulet: `7731979`, `7731983` and Unsplash
`photo-1642447944075-895b146ccbf2` (McDonald's fry box), `15754939` ("MEAT
burger" paper), `9932888` (printed fry cup), `11659577` (Mirinda), Unsplash
`photo-1690988109029-aa2377d08b12` (Coke Studio promo with a QR code). On BOHO:
Unsplash `photo-1778855400007-37cbd89592ef` (Gemini watermark, AI image),
Unsplash `photo-1731703698022-2bcf47d3d09b` ("SANDYS" printed paper),
`10115297` (labelled water bottle). On Caffè Panis: `12916029` (« Café de
Nicole's Flower » on the tiramisu's chocolate plaque).
On the Écusson bars (October 2026): `25068078` (Italian printed placemat),
`4083582` (labelled wine bottle), `29819346` (FIX beer), `37279725` (« the
frazzled cook » liner), `12758949` and `34528321`, `10970330`, `17366877`,
`29189498`, `7961933` (printed liners), `38366578` (« SEÑOR BARRIO »),
`12653308` (menu card), `10794112` (branded knife), `37044083` (wine label),
`30557313` (shop sign), `9200544` (« Choco Nussa »), `11136513` (stamps),
`12099847` (newspaper), `14141170` (book page), `18465600` (« …rest in queso »
skillet), `19370451`, `13741662` (« PUBTIME »), `21235061` and `30776098`
(newsprint), `25048973` (« CANDELAS » cup), `4871277`, `5863643` (menu card),
`12824133`, `17313960` (« BURGERS & FRIES » bag), `17132991`, `27459857`,
Unsplash `photo-1629386199824-700da7af2097` (maker's stamp on the plate),
`40036735` (« SCALA » napkin), `16677728` (newspaper), `38774775` (« THE
VEN… » liner), `3682837` (printed lettering), `19260942`, `37347960`,
`4748485` (labelled bottles), `16446218` (« ITALIA » print), `38712743`
(menu card), `9546272` (printed placemat), Unsplash
`photo-1671794313460-d8a0294f75bb` (menu card under the bowl), Unsplash
`photo-1724116382212-b0af49d9eb5f` (« GINA'S » on the peel), `36799467`,
`34554515`, `19674142` (printed liners), Unsplash
`photo-1550942356-fcfc6eba2acb` (signage), `15387326` (« YENI RAKI »),
`9524171` (burned mark on the board), `33312298` (printed coaster),
`1126728` (beer label), `11164379` (printed paper), `32767085` (tin label),
`3861132` (monogram on the rim), `15279743` (jar and cheese-box labels),
`253900xx` (script card behind the board), `29732924` (name on the plate
rim), `33017545`, `1397514`, `39413021` (spread jars), `37964137`,
`33469313`, `33709319` (menu text), `37964139` (glasses), `25856532`
(printed liner), Unsplash `photo-1565599837634-134bc3aadce8` (newspaper
liner), `photo-1586185158460-950e01e6982a`,
`photo-1586185158675-17a2b0dc1cb0` (wine glass),
`photo-1767974963436-2208b3553561` (glasses), `14924014`, `1123249`,
`33307827`, `10560080` (printed liners), `19250682` (Estrella Galicia),
`13526267`, `8250377`, `8250426`, `8250693` (stall signs, chalk boards), `31596394` (printed board), `7463364`, `7463311` (menu card and napkin), `192607xx`–`192609xx` (« Acqua & Farina » box), `17692688`, `36430335` (jar labels), `29516111` (« WE ARE OPEN »), `38103950` (« Bon Appetit » plate), `29807155` (leaflet), Unsplash `photo-1621523439264`, `photo-1677175202003`, `photo-1660297730980` (labels, packet, emblem), `268386xx` (« SAL DE RISO »), `13991927`, `13991929` (jug logo, neon), `16119657` (Russian menu card), `11100906` (« Prego »), `11675721`–`22` (« S » plaques), `14467432` (newspaper), `7013982`, `7013983`, `7013989` (« EXCEPTIONAL QUALITY » pick), `31906030` (« AUPA »), `37284048` (« SINGLE ORIGIN »), `23996337` (Coca-Cola), `4958950` (printed bag), `28760157` (« MOON » flag), `34985106` (sign), `29200682` (« CHOCOLABS »), `8161427` (embossed jar), `25469620` (menu card), `25003390` (wine label), Unsplash `photo-1541950747932-b59b50dcc0d5` (book spines), `photo-1667390034698-c2369cd1668b` (shirt logo), `photo-1597564684442-b603ab8dcdcf` (printed wrapper), `photo-1628412277659-b4bb70d40b7c` (labelled bottle), `photo-1630334337820-84afb05acf3a` (« BULL'S EYE »), `29121112` (printed URL on the placemat), `33002473` (« NAPOLI » liner), `37604434` (newspaper), `166777xx` (newspaper), `34425xxx` (printed menus on the table), `20793365` (bottle label), Unsplash `photo-17715085582*` (« CUCINA ITALIANA » apron), `photo-1724116382291-02878f4a13e5` (« GINA'S » peel), `830926`, `6427775`, `4762721`, Unsplash `photo-1503726800290-d5f1a00e05b0` (engraved mugs), `5433781` (mixer label), `10779226` (bar sign), `20094378`, `10085714`, `18070096`, `18070094` (« APEROL SPRITZ » glasses), `11912753` (bar mat), `6895932` (printed coaster), Unsplash `photo-1664451314616-6c93f17b9da3` (gelato box), `37110022`, `9501344` (printed logos), Unsplash `photo-1635491231222-8e524584da52` (a candle, not a sundae), `8029207` (« ÉLAN »), `34291660` (plate emblem), `10289311` (Corona), `13741669` (Coca-Cola, napkin), `33414289` (printed placemat), Unsplash `photo-1550424557-39930b383cd5` (Coca-Cola can), `photo-1615830783066-26a99bc9d959` (newspaper liner), `12436857` (NESCAFÉ can), Unsplash `photo-1624781740834-fbfbf5fd221a` (OREO), `30102165` (book text), `30335686` (newspaper, signs), `30500766` (« Burger » cup), `34487807` (« SOY FRESA » cup), `34926740` (Ferrero Rocher), `8774282` (stencilled crate).

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

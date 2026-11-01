---
name: ominin-pdf
description: The Ominin PDF design system, "liquid glass", and the kit that generates it. Use it every time Ominin produces a designed PDF, whatever the subject: brochures, leaflets, sales documents, pitch PDFs, tutorials, guides, reports, one-pagers, internal abstracts, flyers, anything to print, send or leave with someone, even if the user only says "make me a PDF", "a doc for restaurants", "une plaquette", "un tuto" or "un document". Don't improvise the design and don't use the generic pdf skill to create these. Not for reading, merging or filling existing PDFs, nor for legal or invoice PDFs the app generates in code.
---

# Ominin PDF

Every designed Ominin PDF should look like it comes from the same house. This kit gives you that: dark and pearl pages, a molten Ominin chevron, frosted glass panels with real blur and edge refraction, and sharp vector text on top.

Browsers can't produce this in a PDF. Chromium's export drops `backdrop-filter`, so `scripts/glass.py` calculates the glass into each page's background image, from panel positions that `scripts/measure.cjs` reads off your HTML. The consequence to remember: **the backgrounds depend on your layout, so always build with `build.sh`**, which redoes both. Otherwise the glass stops lining up with the text.

## Workflow

1. Start a folder for the document, where the user wants it, usually `marketing/<nom>/`. `<skill>` is this skill's folder:
   ```bash
   mkdir -p marketing/mon-doc/img
   cp <skill>/assets/template/index.html <skill>/assets/template/ominin-glass.css marketing/mon-doc/
   cp -r <skill>/assets/fonts marketing/mon-doc/fonts
   ```
2. Write the pages in `index.html`. Each page is a `<section class="page">` directly in `<body>`, holding one `.inner`. Keep `ominin-glass.css` unchanged, so documents stay identical; put anything specific to a document in a small `<style>` block.
3. Build:
   ```bash
   <skill>/scripts/build.sh marketing/mon-doc Mon-document
   ```
   This writes `Mon-document.pdf` (trimmed A4, for screens and sending), `Mon-document-impression.pdf` (3 mm bleed, for the print shop) and images of each page in `relecture/`. It stops with the page number if text overflows.
4. Read every image in `relecture/` and fix what you see, then rebuild. These are renders of the real PDF, and they catch what a browser preview hides. Don't report a document as done without looking at them.

It needs `uv` and `playwright-core`. The script finds a copy in the npx cache, or set `PLAYWRIGHT_CORE`. Before a first print run, ask for a proof: the file is RGB and Chromium embeds fonts as Type 3, which some print shops flag.

## Pages

```html
<section class="page" data-theme="dark" data-chevron="158,142,240" data-clear="66,303">
```

- `data-theme`: `dark` or `paper` (the pale pearl). Alternate them for rhythm. Use `paper` for tables and long reading.
- `data-chevron`: chevron centre x, centre y and width, in mm from the top left of the 216 × 303 page. Move it from page to page, so each page shows a different crop. `none` removes it.
- `data-clear`: top and bottom heights in mm between which the chevron shows. Set the top just under the title block and the bottom above any small print or bottom panel, so text never sits on a bright stripe.

When content fills the top of a page, drop the chevron below it: a centre y near 235 with a clear top near 150 works well on A4. The template has examples of each page type, so adapt the nearest one.

## Components

The template shows these in place, and `ominin-glass.css` has them all:

- `.glass` makes any element a glass panel. Add `.tight` for smaller padding and `.solid` for a nearly opaque white panel someone can write on with a pen.
- `.cover-title`, `.cover-lead`, `.stagger`, `.cover-stage`: the cover. It gives the name, one sentence, then four same-size rectangles offset so each overlaps a corner of the previous one, with screens below. Keep text out of the overlapped corners. For a document with no screens, use `class="stagger tall"` and remove `.cover-stage`.
- `.row` with `.visual`: half image, half text, alternating sides from one row to the next.
- `.phone`, `.tablet`, `.phone.behind`: device frames. They always sit above the glass, with the phone over the tablet. Add a screen with `<figure class="phone"><img src="img/x.jpg" alt=""></figure>`.
- `.grid2`, `.grid3`, `.grid4`, `.stat`, `.panel`: figures and charts. Draw charts as inline SVG so they stay sharp, using the `dataviz` skill for form and colour.
- `table` with `class="glass"` and cells `.o`: a comparison where one column stands out dark.
- `.steps`: numbered steps, with `class="glass"` on each `li`. Number things only when they are a real sequence. To continue numbering on a later page, add `style="counter-reset: s 2"` to the `ol`, where 2 is the number of steps already shown.
- `.contact` with `.glass.solid`, `.line`, `.mail`, `.qr`: the contact block.
- `.hd`, `.kicker`, `.lead`, `.note`: page header, small label, intro, and sources at the bottom of the page.

For QR codes, write a dark vector SVG and always decode it from the rendered PDF:
```bash
uv run --with segno python -c "import segno; segno.make('https://menu.ominin.com', error='m').save('img/qr.svg', border=0, dark='#15110d', light=None, scale=4)"
```
Place QR codes only on `.solid` panels or pale pages, so they scan.

## Design rules

These came from real corrections, so keep to them unless the user asks otherwise.

- **Sentence case.** No all-caps labels, and no decorative "01 / 02" numbering.
- **Keep text off the chevron.** The chevron is the one loud thing on the page. Titles and body text sit on calm background or inside glass.
- **Real screens only.** Use captures of the real product. Gestion captures come from a local database with fictional data, never from production or a client's account, and the page says "chiffres fictifs". Retake screens when the product has changed.
- **Solid accent colours on text.** Chromium print draws stray lines around `background-clip: text`, so no gradient text.
- **Avoid `transform` on absolutely positioned elements.** Print export misplaces them; use flex and margins, as `.phone.behind` does.

## Content rules

- French by default, in plain language, with the point of each page in its title.
- Never show what Ominin earns from a restaurant, as an amount or a worked example, unless the user asks for that in this document. Pricing terms such as "0 € par mois, 3 % sur les commandes payées en ligne, frais de carte PSP en sus" are fine.
- Check prices against `frontend/lib/landing-data.ts` (`pricingSection`, `starterKit`), because they change. Say "cartes de table" to prospects; the site's product name is "Cachets".
- Every figure needs a source named on the page. Don't invent statistics, and flag any claim you can't support, especially about a named competitor. Tell the user plainly rather than printing it silently.
- Don't name a real client, or show their figures, without the user's OK.
- Contact address is `support@ominin.com` on printed documents.

## Other sizes

The kit assumes A4. For another format, override `@page` and `.page` in the document's `<style>`, keeping 3 mm of bleed on each side, and adjust chevrons. `.inner` keeps the margins. The backgrounds adapt to the page size on their own.

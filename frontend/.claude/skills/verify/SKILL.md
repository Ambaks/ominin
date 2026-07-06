---
name: verify
description: Drive the Ominin frontend in a real browser to verify changes end-to-end. Use after modifying frontend/ code.
---

# Verifying the Ominin frontend

## Launch

A dev server is usually already running at http://localhost:3000 (check with
`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/gestion`).
`npm run dev` refuses to start a second instance for the same dir — reuse the
running one; Turbopack hot-reloads your changes.

## Drive (Playwright)

Playwright is not a project dependency, but v1.61+ lives in the npx cache with
browsers already downloaded:

```bash
PW=$(dirname "$(grep -rl '"name": "playwright"' ~/.npm/_npx/*/node_modules/playwright/package.json | head -1)")/..
NODE_PATH="$PW" node your-script.js
```

Write driver scripts in the session scratchpad, not the repo.

## Gotchas

- /gestion pages are client-rendered from localStorage (`ominin.gestion`,
  versioned — see `lib/gestion/constants.ts`). A fresh browser context seeds
  demo data automatically; curl only shows the skeleton.
- The demo switcher selects are `select[title="Offre"]` and
  `select[title="Rôle"]` (role select only exists on offres with the
  `roles` feature).
- To assert QR code contents, decode the PNG (`jsqr` + `pngjs`, install in
  scratchpad) — never byte-compare against Node-side `qrcode` output; the
  browser build encodes PNGs via canvas, so bytes differ for identical codes.
- Print layout: `page.emulateMedia({ media: "print" })` then screenshot;
  shell chrome is `print:hidden`.
- Check mobile too: `viewport: { width: 390, height: 844 }` — the topbar and
  bottom nav are where layouts break.

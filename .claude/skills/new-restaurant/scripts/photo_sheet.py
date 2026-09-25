#!/usr/bin/env python3
"""
Audit a menu's photos the way a customer will see them — and the way a
competitor's lawyer would.

  photo_sheet.py --from-menu <slug> <outdir>      every photo of that carte
  photo_sheet.py <outdir> <ref> [<ref> ...]         candidate photos

A <ref> is a Pexels path ("1234567/pexels-photo-1234567.jpeg"), an Unsplash
id ("photo-1773…"), a full https URL, or a local file. With --from-menu the
registry is loaded through `npx tsx`, so every item comes out with the exact
URL the page requests, whatever helper or factory built it. Items without a
photo are listed, not failed: no photo beats a wrong one.

For every photo it checks the URL answers 200 with an image/* type, flags
duplicates, then draws labelled 3x3 contact sheets in two framings:

  full-N.png   the whole frame. READ THESE FOR BRANDING — nine photos had to
               be pulled from the LZ.FOOD carte for another business's name
               printed on a liner, a wrapper or a crate, invisible at card
               size and legible here. Also check the dish matches its menu
               description, and that nothing contradicts a claim the section
               makes (charcuterie that reads as pork under "Halal", meat
               under "Végétarien").
  card-N.png   the centred 16:9 crop the menu card actually shows
               (aspect-video + object-cover). A dish sitting low or to one
               side gets decapitated here; fix it with pexelsRecadre or a
               better photo.

Each tile is numbered; the index printed below maps numbers to item ids.
Exit code 1 if any photo failed to download or is a duplicate.
"""

import argparse
import json
import os
import re
import subprocess
import sys
import urllib.request
from collections import Counter

import CoreText
import Quartz
from Foundation import NSAttributedString

SHEET_COLS, SHEET_ROWS = 3, 3
FULL_CELL = (600, 450)
CARD_CELL = (640, 360)  # 16:9, the card's aspect-video
AUDIT_WIDTH = 1000


def repo_root():
    out = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True)
    return out.stdout.strip() or os.getcwd()


# --- References -------------------------------------------------------------

def url_for(helper, arg, width=AUDIT_WIDTH):
    if helper == "pexels":
        return f"https://images.pexels.com/photos/{arg}?auto=compress&cs=tinysrgb&w={width}"
    if helper == "pexelsRecadre":
        return (f"https://images.pexels.com/photos/{arg}?auto=compress&cs=tinysrgb"
                f"&w={width}&h={round(width * 9 / 16)}&fit=crop&crop=entropy")
    if helper == "unsplash":
        return f"https://images.unsplash.com/{arg}?auto=format&fit=crop&w={width}&q=75"
    raise ValueError(helper)


def ref_to_source(ref):
    """(label, url_or_path) for a free-form ref."""
    if ref.startswith("http"):
        return ref, ref
    if os.path.exists(ref):
        return os.path.basename(ref), ref
    if ref.startswith("photo-"):
        return ref, url_for("unsplash", ref)
    if "/pexels-photo-" in ref:
        return ref.split("/")[0], url_for("pexels", ref)
    sys.exit(f"référence non reconnue : {ref}")


def refs_from_menu(slug):
    """[(item_id, source)] for every item of that restaurant.

    Asks TypeScript for the registry rather than parsing the file: items built
    by a factory, options written before the image, any helper — the URL comes
    out exactly as the page will request it.
    """
    root = repo_root()
    code = (
        'import { getRestaurant } from "./lib/menu-data";'
        f"const r = getRestaurant({json.dumps(slug)});"
        'if (!r) { console.error("slug inconnu dans le registre"); process.exit(3); }'
        "console.log(JSON.stringify(r.categories.flatMap((c) =>"
        " c.items.map((i) => ({ id: i.id, image: i.image ?? null })))));"
    )
    run = subprocess.run(
        ["npx", "tsx", "--eval", code],
        cwd=os.path.join(root, "frontend"), capture_output=True, text=True,
    )
    if run.returncode != 0:
        sys.exit(f"registre illisible pour « {slug} » :\n{run.stderr.strip()[:600]}")
    items = json.loads(run.stdout.strip().splitlines()[-1])
    found = []
    for item in items:
        image = item["image"]
        if image and image.startswith("/"):
            image = os.path.join(root, "frontend/public", image.lstrip("/"))
        elif image and image.startswith("http"):
            # Le registre demande 800 px ; l'audit veut de quoi lire un logo.
            image = re.sub(r"([?&])w=\d+", rf"\g<1>w={AUDIT_WIDTH}", image)
            image = re.sub(r"([?&])h=\d+", rf"\g<1>h={round(AUDIT_WIDTH * 9 / 16)}", image)
        found.append((item["id"], image))
    return found


# --- Download ---------------------------------------------------------------

def fetch(source, dest):
    """None if fine, else a reason string."""
    if source is None:
        return "aucune image"
    if not source.startswith("http"):
        return None if os.path.exists(source) else "fichier absent"
    req = urllib.request.Request(source, headers={"User-Agent": "Mozilla/5.0 (menu audit)"})
    try:
        with urllib.request.urlopen(req, timeout=40) as resp:
            ctype = resp.headers.get("Content-Type", "")
            if resp.status != 200 or not ctype.startswith("image/"):
                return f"HTTP {resp.status} {ctype}"
            with open(dest, "wb") as f:
                f.write(resp.read())
    except Exception as exc:  # noqa: BLE001 — any failure is a finding here
        return str(exc)[:80]
    return None


# --- Drawing ----------------------------------------------------------------

def load_image(path):
    url = Quartz.CFURLCreateWithFileSystemPath(None, os.path.abspath(path), Quartz.kCFURLPOSIXPathStyle, False)
    src = Quartz.CGImageSourceCreateWithURL(url, None)
    if src is None:
        return None
    opts = {
        Quartz.kCGImageSourceCreateThumbnailFromImageAlways: True,
        Quartz.kCGImageSourceCreateThumbnailWithTransform: True,
        Quartz.kCGImageSourceThumbnailMaxPixelSize: 1400,
    }
    return Quartz.CGImageSourceCreateThumbnailAtIndex(src, 0, opts)


def draw_label(ctx, text, x, y):
    font = CoreText.CTFontCreateWithName("Helvetica-Bold", 22, None)
    attrs = {
        CoreText.kCTFontAttributeName: font,
        CoreText.kCTForegroundColorAttributeName: Quartz.CGColorCreateGenericRGB(1, 1, 1, 1),
    }
    line = CoreText.CTLineCreateWithAttributedString(
        NSAttributedString.alloc().initWithString_attributes_(text, attrs)
    )
    width = CoreText.CTLineGetTypographicBounds(line, None, None, None)[0]
    Quartz.CGContextSetRGBFillColor(ctx, 0.85, 0.05, 0.25, 0.92)
    Quartz.CGContextFillRect(ctx, Quartz.CGRectMake(x, y, width + 16, 32))
    Quartz.CGContextSetTextPosition(ctx, x + 8, y + 9)
    CoreText.CTLineDraw(line, ctx)


def draw_sheet(tiles, cell, mode, out):
    cw, ch = cell
    W, H = SHEET_COLS * cw, SHEET_ROWS * ch
    ctx = Quartz.CGBitmapContextCreate(
        None, W, H, 8, 0, Quartz.CGColorSpaceCreateDeviceRGB(), Quartz.kCGImageAlphaPremultipliedFirst
    )
    Quartz.CGContextSetRGBFillColor(ctx, 0.06, 0.05, 0.05, 1)
    Quartz.CGContextFillRect(ctx, Quartz.CGRectMake(0, 0, W, H))
    for slot, (number, image) in enumerate(tiles):
        col, row = slot % SHEET_COLS, slot // SHEET_COLS
        x, y = col * cw, H - (row + 1) * ch
        if image is not None:
            iw, ih = Quartz.CGImageGetWidth(image), Quartz.CGImageGetHeight(image)
            # full: whole frame letterboxed; card: centred cover crop.
            scale = min(cw / iw, ch / ih) if mode == "full" else max(cw / iw, ch / ih)
            dw, dh = iw * scale, ih * scale
            Quartz.CGContextSaveGState(ctx)
            Quartz.CGContextClipToRect(ctx, Quartz.CGRectMake(x, y, cw, ch))
            Quartz.CGContextDrawImage(ctx, Quartz.CGRectMake(x + (cw - dw) / 2, y + (ch - dh) / 2, dw, dh), image)
            Quartz.CGContextRestoreGState(ctx)
        Quartz.CGContextSetRGBStrokeColor(ctx, 0, 0, 0, 1)
        Quartz.CGContextStrokeRectWithWidth(ctx, Quartz.CGRectMake(x, y, cw, ch), 3)
        draw_label(ctx, str(number), x + 6, y + ch - 38)
    url = Quartz.CFURLCreateWithFileSystemPath(None, os.path.abspath(out), Quartz.kCFURLPOSIXPathStyle, False)
    dest = Quartz.CGImageDestinationCreateWithURL(url, "public.png", 1, None)
    Quartz.CGImageDestinationAddImage(dest, Quartz.CGBitmapContextCreateImage(ctx), None)
    Quartz.CGImageDestinationFinalize(dest)


# --- Main -------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--from-menu", metavar="SLUG")
    ap.add_argument("outdir")
    ap.add_argument("refs", nargs="*")
    a = ap.parse_args()

    if a.from_menu:
        entries = refs_from_menu(a.from_menu)
    elif a.refs:
        entries = [ref_to_source(r) for r in a.refs]
    else:
        ap.error("donne --from-menu <slug> ou au moins une référence")

    img_dir = os.path.join(a.outdir, "img")
    os.makedirs(img_dir, exist_ok=True)

    problems = []
    without_photo = [label for label, source in entries if source is None]
    entries = [(label, source) for label, source in entries if source is not None]
    tiles = []
    for number, (label, source) in enumerate(entries, start=1):
        dest = os.path.join(img_dir, f"{number:02d}-{re.sub(r'[^A-Za-z0-9._-]', '_', label)[:60]}.jpg")
        reason = fetch(source, dest)
        path = dest if source and source.startswith("http") else source
        image = load_image(path) if reason is None else None
        if reason is None and image is None:
            reason = "image illisible"
        if reason:
            problems.append(f"#{number} {label} : {reason}")
        tiles.append((number, label, source, image))

    stripped = [re.sub(r"[?&](w|h|fit|crop|q|auto|cs)=[^&]*", "", s or "") for _, _, s, _ in tiles]
    for source, count in Counter(s for s in stripped if s).items():
        if count > 1:
            numbers = [str(n) for (n, _, _, _), s in zip(tiles, stripped) if s == source]
            problems.append(f"photo en double sur les tuiles {', '.join(numbers)}")

    per_sheet = SHEET_COLS * SHEET_ROWS
    for sheet in range(0, len(tiles), per_sheet):
        chunk = tiles[sheet: sheet + per_sheet]
        n = sheet // per_sheet
        pairs = [(num, img) for num, _, _, img in chunk]
        draw_sheet(pairs, FULL_CELL, "full", os.path.join(a.outdir, f"full-{n}.png"))
        draw_sheet(pairs, CARD_CELL, "card", os.path.join(a.outdir, f"card-{n}.png"))
        print(f"\nfull-{n}.png / card-{n}.png")
        for num, label, _, _ in chunk:
            print(f"  {num:>3}  {label}")

    print(f"\n{len(tiles)} photo(s) dans {a.outdir}")
    if without_photo:
        print(f"{len(without_photo)} article(s) sans photo : {', '.join(without_photo)}")
    if problems:
        print("\nPROBLÈMES :")
        for p in problems:
            print(f"  - {p}")
        sys.exit(1)
    print("Toutes les URL répondent 200 image/*, aucun doublon. "
          "Reste à LIRE les planches full-* (marques, plat, régime) et card-* (cadrage).")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Measure a brand's colours instead of eyeballing them.

  sample_palette.py <image> [--box x,y,w,h] [--step 4]

Prints, per hue family, how much of the image it covers and its dominant
value. Run it on the client's source (flyer, logo, storefront photo) to pick
the theme tokens, then on a full-page screenshot of the built menu to check
the page carries the brand in comparable proportions — the LZ.FOOD flyer was
14 % raspberry red, the first build 0.6 %, and that gap was the single
loudest reviewer complaint.

A photographed flyer is warm-shifted and desaturated by the room light:
treat the output as the neighbourhood of the real colour, then nudge towards
the saturated value the printer was aiming for (LZ.FOOD sampled #D00040,
shipped #E11B4C).

--box restricts the measurement (fractions 0-1, or pixels) — e.g. to exclude
the table the flyer was photographed on.
"""

import argparse
import colorsys
import os
import sys
from collections import Counter, defaultdict

import Quartz

FAMILIES = [  # (label, hue_from, hue_to) in degrees
    ("rouge", 345, 12),
    ("orange", 12, 42),
    ("jaune", 42, 70),
    ("vert", 70, 170),
    ("cyan", 170, 200),
    ("bleu", 200, 255),
    ("violet", 255, 290),
    ("rose/magenta", 290, 345),
]


def load(path):
    url = Quartz.CFURLCreateWithFileSystemPath(
        None, os.path.abspath(path), Quartz.kCFURLPOSIXPathStyle, False
    )
    src = Quartz.CGImageSourceCreateWithURL(url, None)
    if src is None:
        sys.exit(f"illisible : {path}")
    opts = {
        Quartz.kCGImageSourceCreateThumbnailFromImageAlways: True,
        Quartz.kCGImageSourceCreateThumbnailWithTransform: True,
        Quartz.kCGImageSourceThumbnailMaxPixelSize: 2000,
    }
    img = Quartz.CGImageSourceCreateThumbnailAtIndex(src, 0, opts)
    W, H = Quartz.CGImageGetWidth(img), Quartz.CGImageGetHeight(img)
    ctx = Quartz.CGBitmapContextCreate(
        None, W, H, 8, W * 4, Quartz.CGColorSpaceCreateDeviceRGB(),
        Quartz.kCGImageAlphaNoneSkipLast | Quartz.kCGBitmapByteOrder32Big,
    )
    Quartz.CGContextDrawImage(ctx, Quartz.CGRectMake(0, 0, W, H), img)
    # Copie : le tampon pointe dans la mémoire du contexte, libérée dès que
    # ctx sort de portée — le lire ensuite fait planter le processus.
    data = bytes(Quartz.CGBitmapContextGetData(ctx).as_buffer(W * H * 4))
    return data, W, H


def family(h_deg):
    for label, lo, hi in FAMILIES:
        if (lo <= h_deg < hi) if lo < hi else (h_deg >= lo or h_deg < hi):
            return label
    return "rouge"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("image")
    ap.add_argument("--box")
    ap.add_argument("--step", type=int, default=4)
    a = ap.parse_args()

    data, W, H = load(a.image)
    x0, y0, x1, y1 = 0, 0, W, H
    if a.box:
        bx, by, bw, bh = (float(v) for v in a.box.split(","))
        if max(bx, by, bw, bh) <= 1:
            bx, by, bw, bh = bx * W, by * H, bw * W, bh * H
        x0, y0, x1, y1 = int(bx), int(by), int(bx + bw), int(by + bh)

    total = 0
    buckets = Counter()
    colours = defaultdict(Counter)
    for y in range(y0, y1, a.step):
        row = (H - 1 - y) * W * 4  # the bitmap is stored bottom-up
        for x in range(x0, x1, a.step):
            i = row + x * 4
            r, g, b = data[i], data[i + 1], data[i + 2]
            total += 1
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if l < 0.12:
                key = "quasi-noir"
            elif l > 0.9:
                key = "quasi-blanc"
            elif s < 0.25:
                key = "gris / neutres"
            else:
                key = family(h * 360)
            buckets[key] += 1
            colours[key][(r // 8 * 8, g // 8 * 8, b // 8 * 8)] += 1

    print(f"{a.image}  ({x1 - x0}x{y1 - y0} px analysés, {total} échantillons)\n")
    print(f"{'famille':<16}{'part':>8}   dominante")
    for key, n in buckets.most_common():
        (r, g, b), _ = colours[key].most_common(1)[0]
        print(f"{key:<16}{100 * n / total:>7.2f} %   #{r:02x}{g:02x}{b:02x}")


if __name__ == "__main__":
    main()

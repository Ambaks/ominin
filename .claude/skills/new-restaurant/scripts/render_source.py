#!/usr/bin/env python3
"""
Turn whatever the client handed over into images you can actually read.

  render <input> <out.png> [--scale 3]
      HEIC / JPEG / PNG  -> upright PNG at full resolution (EXIF orientation
                           applied — iPhone photos are stored sideways).
      PDF                -> one PNG per page, rendered at --scale x 72 dpi.
                           Multi-page PDFs write out-1.png, out-2.png, ...

  grid <image> <outdir> [--rows 4] [--cols 2] [--overlap 0.08]
      Overlapping tiles for systematic transcription: a whole flyer read at
      once is too small to trust, a tile at a time is legible.

  crop <image> <out.png> --box x,y,w,h
      Box in fractions of the image (0-1) or in pixels (>1).

macOS only (Quartz / PyObjC ships with the system Python).
"""

import argparse
import os
import sys

import Quartz


def _url(path):
    return Quartz.CFURLCreateWithFileSystemPath(
        None, os.path.abspath(path), Quartz.kCFURLPOSIXPathStyle, False
    )


def _write_png(image, path):
    dest = Quartz.CGImageDestinationCreateWithURL(_url(path), "public.png", 1, None)
    Quartz.CGImageDestinationAddImage(dest, image, None)
    if not Quartz.CGImageDestinationFinalize(dest):
        sys.exit(f"écriture impossible : {path}")


def load_upright(path):
    """Full-resolution image with its EXIF orientation applied."""
    source = Quartz.CGImageSourceCreateWithURL(_url(path), None)
    if source is None:
        sys.exit(f"illisible : {path}")
    props = Quartz.CGImageSourceCopyPropertiesAtIndex(source, 0, None) or {}
    longest = max(props.get("PixelWidth", 0), props.get("PixelHeight", 0)) or 8000
    options = {
        Quartz.kCGImageSourceCreateThumbnailFromImageAlways: True,
        Quartz.kCGImageSourceCreateThumbnailWithTransform: True,
        Quartz.kCGImageSourceThumbnailMaxPixelSize: longest,
    }
    return Quartz.CGImageSourceCreateThumbnailAtIndex(source, 0, options)


def render_pdf(path, out, scale):
    doc = Quartz.CGPDFDocumentCreateWithURL(_url(path))
    if doc is None:
        sys.exit(f"PDF illisible : {path}")
    pages = Quartz.CGPDFDocumentGetNumberOfPages(doc)
    stem, ext = os.path.splitext(out)
    written = []
    for n in range(1, pages + 1):
        page = Quartz.CGPDFDocumentGetPage(doc, n)
        box = Quartz.CGPDFPageGetBoxRect(page, Quartz.kCGPDFMediaBox)
        w, h = int(box.size.width * scale), int(box.size.height * scale)
        ctx = Quartz.CGBitmapContextCreate(
            None, w, h, 8, 0, Quartz.CGColorSpaceCreateDeviceRGB(),
            Quartz.kCGImageAlphaPremultipliedFirst,
        )
        Quartz.CGContextSetRGBFillColor(ctx, 1, 1, 1, 1)
        Quartz.CGContextFillRect(ctx, Quartz.CGRectMake(0, 0, w, h))
        Quartz.CGContextScaleCTM(ctx, scale, scale)
        Quartz.CGContextDrawPDFPage(ctx, page)
        target = out if pages == 1 else f"{stem}-{n}{ext}"
        _write_png(Quartz.CGBitmapContextCreateImage(ctx), target)
        written.append((target, w, h))
    return written


def cmd_render(args):
    if args.input.lower().endswith(".pdf"):
        written = render_pdf(args.input, args.out, args.scale)
    else:
        image = load_upright(args.input)
        _write_png(image, args.out)
        written = [(args.out, Quartz.CGImageGetWidth(image), Quartz.CGImageGetHeight(image))]
    for path, w, h in written:
        print(f"{path}  {w}x{h}")
    print(
        "Note : un PDF qui n'embarque qu'une photo (flyer scanné) n'a pas plus "
        "de détail que cette photo — si le client a aussi fourni l'original "
        "(HEIC/JPEG), c'est lui qui fait foi pour lire les petits caractères."
    )


def _crop(image, x, y, w, h, out):
    # CGImageCreateWithImageInRect works in top-left image coordinates.
    tile = Quartz.CGImageCreateWithImageInRect(image, Quartz.CGRectMake(x, y, w, h))
    _write_png(tile, out)


def cmd_grid(args):
    image = load_upright(args.image)
    W, H = Quartz.CGImageGetWidth(image), Quartz.CGImageGetHeight(image)
    os.makedirs(args.outdir, exist_ok=True)
    tw, th = W / args.cols, H / args.rows
    ox, oy = tw * args.overlap, th * args.overlap
    for r in range(args.rows):
        for c in range(args.cols):
            x0, y0 = max(0, c * tw - ox), max(0, r * th - oy)
            x1, y1 = min(W, (c + 1) * tw + ox), min(H, (r + 1) * th + oy)
            out = os.path.join(args.outdir, f"tile-r{r + 1}-c{c + 1}.png")
            _crop(image, int(x0), int(y0), int(x1 - x0), int(y1 - y0), out)
            print(f"{out}  (lignes {r + 1}/{args.rows}, colonne {c + 1}/{args.cols})")


def cmd_crop(args):
    image = load_upright(args.image)
    W, H = Quartz.CGImageGetWidth(image), Quartz.CGImageGetHeight(image)
    x, y, w, h = (float(v) for v in args.box.split(","))
    if max(x, y, w, h) <= 1:
        x, y, w, h = x * W, y * H, w * W, h * H
    _crop(image, int(x), int(y), int(w), int(h), args.out)
    print(f"{args.out}  {int(w)}x{int(h)}")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)

    r = sub.add_parser("render")
    r.add_argument("input")
    r.add_argument("out")
    r.add_argument("--scale", type=float, default=3.0)
    r.set_defaults(func=cmd_render)

    g = sub.add_parser("grid")
    g.add_argument("image")
    g.add_argument("outdir")
    g.add_argument("--rows", type=int, default=4)
    g.add_argument("--cols", type=int, default=2)
    g.add_argument("--overlap", type=float, default=0.08)
    g.set_defaults(func=cmd_grid)

    c = sub.add_parser("crop")
    c.add_argument("image")
    c.add_argument("out")
    c.add_argument("--box", required=True)
    c.set_defaults(func=cmd_crop)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()

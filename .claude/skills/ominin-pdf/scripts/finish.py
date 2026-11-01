"""Du PDF brut aux fichiers livrés : <nom>-impression.pdf (fond perdu, TrimBox), <nom>.pdf (coupé), et les pages en images pour la relecture.
Usage : finish.py <brut.pdf> <dossier> <nom>"""
import sys
from pathlib import Path

import pymupdf
from pypdf import PdfReader, PdfWriter
from pypdf.generic import RectangleObject

raw, folder, name = sys.argv[1], Path(sys.argv[2]), sys.argv[3]
BLEED = 3 * 72 / 25.4
outputs = ((f"{name}-impression.pdf", False), (f"{name}.pdf", True))
for filename, trimmed in outputs:
    writer = PdfWriter(clone_from=PdfReader(raw))
    for page in writer.pages:
        w, h = float(page.mediabox.width), float(page.mediabox.height)
        trim = RectangleObject([BLEED, BLEED, w - BLEED, h - BLEED])
        page.trimbox = trim
        page.bleedbox = RectangleObject([0, 0, w, h])
        if trimmed:
            page.cropbox = trim
            page.mediabox = trim
    writer.write(folder / filename)

review = folder / "relecture"
review.mkdir(exist_ok=True)
for old in review.glob("p*.png"):
    old.unlink()
document = pymupdf.open(folder / f"{name}.pdf")
for number, page in enumerate(document, start=1):
    page.get_pixmap(dpi=90).save(review / f"p{number}.png")
print(f"{len(document)} pages, {(folder / f'{name}.pdf').stat().st_size // 1024} Ko : {folder / name}.pdf, {folder / name}-impression.pdf, relecture dans {review}")

"""Du PDF brut aux fichiers livrés : <nom>-impression.pdf (fond perdu, TrimBox), <nom>.pdf (coupé), et les pages en images pour la relecture.
Usage : finish.py <brut.pdf> <dossier> <nom>"""
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import pymupdf
from pypdf import PdfReader, PdfWriter
from pypdf.generic import RectangleObject

raw, folder, name = sys.argv[1], Path(sys.argv[2]), sys.argv[3]
BLEED = 3 * 72 / 25.4
REVIEW_PX = 1050
writer = PdfWriter(clone_from=PdfReader(raw))
for page in writer.pages:
    w, h = float(page.mediabox.width), float(page.mediabox.height)
    page.trimbox = RectangleObject([BLEED, BLEED, w - BLEED, h - BLEED])
    page.bleedbox = RectangleObject([0, 0, w, h])
print_file = folder / f"{name}-impression.pdf"
writer.write(print_file)

# La version coupée repart de l'origine (0, 0) : avec des boîtes décalées, CoreGraphics laisse une marge blanche.
# Les pages passent en bloc, car décaler leur contenu laisserait les motifs de Chromium (images arrondies, dégradés) à leur ancienne place.
source = pymupdf.open(print_file)
trimmed = pymupdf.open()
for number, page in enumerate(source):
    page.set_cropbox(page.trimbox)
    trimmed.new_page(width=page.rect.width, height=page.rect.height).show_pdf_page(page.rect, source, number)
for number, page in enumerate(source):
    for link in page.get_links():
        if link.get("page", -1) >= 0:
            trimmed[number].insert_link({"kind": pymupdf.LINK_GOTO, "from": link["from"], "page": link["page"], "to": pymupdf.Point(0, 0)})
        elif link.get("uri"):
            trimmed[number].insert_link({"kind": pymupdf.LINK_URI, "from": link["from"], "uri": link["uri"]})
trimmed.set_metadata(source.metadata)
trimmed.save(folder / f"{name}.pdf", garbage=1, deflate=True)

review = folder / "relecture"
review.mkdir(exist_ok=True)
for old in review.glob("p*.png"):
    old.unlink()
document = pymupdf.open(folder / f"{name}.pdf")
# Sur Mac, la relecture passe par CoreGraphics, le moteur d'iOS et d'Aperçu : MuPDF cache ce qu'il casse.
sips = shutil.which("sips")
for number, page in enumerate(document, start=1):
    image = review / f"p{number}.png"
    if sips:
        single = pymupdf.open()
        single.insert_pdf(document, from_page=number - 1, to_page=number - 1)
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "page.pdf"
            single.save(path)
            subprocess.run([sips, "-s", "format", "png", str(path), "--out", str(image), "-Z", str(REVIEW_PX)], check=True, capture_output=True)
    else:
        page.get_pixmap(dpi=90).save(image)
print(f"{len(document)} pages, {(folder / f'{name}.pdf').stat().st_size // 1024} Ko : {folder / name}.pdf, {folder / name}-impression.pdf, relecture dans {review}")

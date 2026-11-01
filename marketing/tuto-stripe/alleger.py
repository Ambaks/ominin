"""Prépare le PDF pour les téléphones : seuls les flux JPEG des fonds sont réencodés, et chaque page repart de l'origine (0, 0),
car le recadrage du kit laisse une marge blanche dans certains lecteurs (sips).
Usage : uv run --with pymupdf --with pillow python alleger.py <entrée.pdf> <sortie.pdf>"""
import io
import sys

import pymupdf
from PIL import Image

JPEG_QUALITY = 74

source = pymupdf.open(sys.argv[1])
for xref in {image[0] for page in source for image in page.get_images(full=True) if image[8] == "DCTDecode"}:
    buffer = io.BytesIO()
    Image.open(io.BytesIO(source.xref_stream_raw(xref))).save(buffer, "JPEG", quality=JPEG_QUALITY, subsampling=2, optimize=True)
    source.update_stream(xref, buffer.getvalue(), compress=False)
    source.xref_set_key(xref, "Filter", "/DCTDecode")

# Une page rapatriée en bloc : décaler son contenu laisserait les motifs de Chromium (images arrondies, dégradés) à leur ancienne place.
output = pymupdf.open()
for number, page in enumerate(source):
    output.new_page(width=page.rect.width, height=page.rect.height).show_pdf_page(page.rect, source, number)
output.set_metadata(source.metadata)
output.save(sys.argv[2], garbage=1, deflate=True)

# /// script
# requires-python = ">=3.13"
# dependencies = ["pymupdf"]
# ///
"""Découpe les plaquettes PDF en images, affichées dans l'espace commercial.

À relancer quand un PDF de frontend/public/commercial/plaquettes change, puis
reporter le nombre de pages dans frontend/lib/commercial/demos.ts :
    uv run scripts/plaquette_pages.py
"""

from pathlib import Path

import pymupdf

PLAQUETTES = Path(__file__).parents[2] / "frontend/public/commercial/plaquettes"
DPI = 170
JPEG_QUALITY = 82


def main() -> None:
    for pdf in sorted(PLAQUETTES.glob("*.pdf")):
        folder = PLAQUETTES / pdf.stem
        folder.mkdir(exist_ok=True)
        with pymupdf.open(pdf) as document:
            for number, page in enumerate(document, start=1):
                image = page.get_pixmap(dpi=DPI)
                image.save(folder / f"{number}.jpg", jpg_quality=JPEG_QUALITY)
            print(f"{pdf.stem}: {len(document)} pages, {image.width}x{image.height}")


if __name__ == "__main__":
    main()

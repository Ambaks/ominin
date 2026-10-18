"""L'accord du chef — Claude lit la carte en ligne d'un établissement et
propose les accords que son menu QR suggère au panier.

Usage (from backend/):
    uv run python scripts/pairings.py <slug>

Écrit frontend/lib/menu/accords/<slug>.json, que le registre de
l'établissement importe (lib/menu-data.ts). Relu avant d'être versionné :
le fichier est la seule source des accords, rien ne part en base.
"""

import json
import sys
from pathlib import Path

# Lancé par chemin, sys.path[0] est scripts/ — pas la racine qui contient app.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.clients.claude import parse_structured
from app.clients.supabase import get_supabase
from app.prompts.pairings import PAIRINGS_SYSTEM, CartePairings

OUT_DIR = Path(__file__).resolve().parents[2] / "frontend" / "lib" / "menu" / "accords"


def carte(slug: str) -> list[tuple[str, list[dict]]]:
    """Les rubriques et leurs articles disponibles, dans l'ordre de la carte."""
    row = (
        get_supabase()
        .table("etablissements")
        .select(
            "categories(id, name, position), "
            "items!items_etablissement_id_fkey(name, description, price, options, "
            "disponible, category_id, position)"
        )
        .eq("slug", slug)
        .single()
        .execute()
        .data
    )
    by_category: dict[str, list[dict]] = {}
    for item in sorted(row["items"], key=lambda item: item["position"] or 0):
        if item["disponible"] is not False:
            by_category.setdefault(item["category_id"], []).append(item)
    return [
        (category["name"], by_category[category["id"]])
        for category in sorted(row["categories"], key=lambda c: c["position"] or 0)
        if category["id"] in by_category
    ]


def direct(item: dict) -> bool:
    """S'ajoute d'un toucher : sans questions (lib/menu/pairings.ts)."""
    return not item["options"]


def render(sections: list[tuple[str, list[dict]]]) -> str:
    lines: list[str] = []
    for name, items in sections:
        lines.append(f"## {name}")
        for item in items:
            price = f"{item['price']:.2f}".replace(".", ",")
            tag = " [direct]" if direct(item) else ""
            description = f" — {item['description']}" if item["description"] else ""
            lines.append(f"- {item['name']} · {price} €{tag}{description}")
    return "\n".join(lines)


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: uv run python scripts/pairings.py <slug>")
    slug = sys.argv[1]
    sections = carte(slug)
    items = {item["name"]: item for _, section in sections for item in section}
    result = parse_structured(PAIRINGS_SYSTEM, render(sections), CartePairings)

    # Un nom mal recopié ou un accord vers un article à questions ne
    # s'afficherait pas : écarté ici, et dit.
    notes: dict[str, list[dict[str, str]]] = {}
    dropped: list[str] = []
    for dish in result.dishes:
        if dish.dish not in items:
            dropped.append(dish.dish)
            continue
        kept = []
        for pairing in dish.pairings:
            target = items.get(pairing.with_dish)
            if target and direct(target) and pairing.with_dish != dish.dish:
                kept.append({"with": pairing.with_dish, "why": pairing.why})
            else:
                dropped.append(f"{dish.dish} → {pairing.with_dish}")
        if kept:
            notes[dish.dish] = kept

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"{slug}.json"
    out.write_text(json.dumps(notes, ensure_ascii=False, indent=2) + "\n")
    print(f"{len(notes)} articles accordés → {out}")
    for name in dropped:
        print(f"  écarté : {name}")


if __name__ == "__main__":
    main()

"""Les graphiques des pages de données, tirés du relevé terrain (frontend/lib/report/data.json)."""
import json
from pathlib import Path

R = json.loads((Path(__file__).parent / "../../frontend/lib/report/data.json").read_text())
ACCENT, COOL, RULE = "#c9622f", "#5f95cf", "rgba(243,236,225,.14)"


def fr(n, d=0):
    return f"{n:,.{d}f}".replace(",", " ").replace(".", ",")


def heatmap():
    hours, rows = R["heat"]["hours"], R["heat"]["rows"]
    days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
    top = max(max(r) for r in rows)
    cw, ch, x0, y0 = 50, 25, 34, 20
    out = [f'<text x="{x0 + i * cw + cw / 2}" y="12" class="a" text-anchor="middle">{h} h</text>' for i, h in enumerate(hours)]
    for j, row in enumerate(rows):
        y = y0 + j * ch
        out.append(f'<text x="0" y="{y + 16}" class="a">{days[j]}</text>')
        for i, v in enumerate(row):
            opacity = 0.06 + (v / top) ** 0.8 * 0.94
            out.append(f'<rect x="{x0 + i * cw}" y="{y}" width="{cw - 2}" height="{ch - 2}" rx="3" fill="{ACCENT}" fill-opacity="{opacity:.2f}"/>')
            if v >= top * 0.5:
                out.append(f'<text x="{x0 + i * cw + cw / 2 - 1}" y="{y + 16}" class="c" text-anchor="middle">{round(v)}</text>')
    return f'<svg viewBox="0 0 436 198" role="img" aria-label="Commandes par heure et par jour">{"".join(out)}</svg>'


def load_chart():
    rows = R["load"]
    top = max(r["med"] for r in rows)
    bw, x0, base = 62, 2, 118
    out = [f'<line x1="0" x2="{x0 + bw * len(rows)}" y1="{base}" y2="{base}" stroke="{RULE}"/>']
    for i, r in enumerate(rows):
        h = r["med"] / top * 92
        x = x0 + i * bw
        out.append(
            f'<rect x="{x + 7}" y="{base - h}" width="{bw - 18}" height="{h}" rx="4" fill="{ACCENT}"/>'
            f'<text x="{x + bw / 2 - 2}" y="{base - h - 6}" class="v" text-anchor="middle">{int(r["med"] // 60)}:{int(r["med"] % 60):02d}</text>'
            f'<text x="{x + bw / 2 - 2}" y="{base + 15}" class="a" text-anchor="middle">{r["label"]}</text>'
        )
    return f'<svg viewBox="0 0 376 138" role="img" aria-label="Attente au comptoir selon la charge">{"".join(out)}</svg>'


def mix_chart():
    """La façon de payer, avant le paiement à table et au dernier week-end relevé."""
    modes = [("en_ligne", "En ligne", ACCENT), ("carte", "Carte au comptoir", COOL), ("especes", "Espèces", "#8d8077")]
    rows = [("Avant", R["mix"]["before"]), ("Dernier week-end", R["mix"]["last_weekend"])]
    out, width = [], 320
    for i, (label, mix) in enumerate(rows):
        y, x = i * 46, 0
        out.append(f'<text x="0" y="{y + 12}" class="t">{label}</text>')
        for key, _, color in modes:
            w = mix[key] / 100 * width
            if w:
                out.append(f'<rect x="{x}" y="{y + 18}" width="{w - 1}" height="16" rx="3" fill="{color}"/>')
                if mix[key] >= 15:
                    out.append(f'<text x="{x + 5}" y="{y + 31}" class="c">{fr(mix[key])} %</text>')
            x += w
    x = 0
    for _, name, color in modes:
        out.append(f'<rect x="{x}" y="96" width="9" height="9" rx="2" fill="{color}"/><text x="{x + 13}" y="105" class="a">{name}</text>')
        x += 13 + len(name) * 6.2 + 12
    return f'<svg viewBox="0 0 320 110" role="img" aria-label="Part de chaque moyen de paiement">{"".join(out)}</svg>'

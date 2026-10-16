"""Mot-symbole de l'enseigne : « le petit ■■■ / ■■■ [café ■ bar] nice ».

Tracés de Questrial (le nom) et de Poppins SemiBold (l'étiquette), d'après
la photo de l'enseigne du store : trois carrés rose, ocre, lilas après
« petit » ; dessous, lilas, ocre, rose, l'étiquette « café ■ bar » et
« nice ».

  python3 mot-symbole.py Questrial-Regular.ttf Poppins-SemiBold.ttf sortie.svg \
      <encre> <fond de l'étiquette> <rose> <ocre> <lilas>
"""
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

name_font, tag_font, out, ink, tag_ink, rose, ocre, lilas = sys.argv[1:9]


class Face:
    def __init__(self, path):
        self.font = TTFont(path)
        self.glyphs = self.font.getGlyphSet()
        self.cmap = self.font.getBestCmap()
        self.hmtx = self.font["hmtx"]
        self.xh = self.font["OS/2"].sxHeight

    def run(self, text, x0, y0, scale=1.0):
        """[(chemin, bornes)] du texte posé à (x0, ligne de base y0), y vers le bas."""
        x, out = x0, []
        for ch in text:
            name = self.cmap[ord(ch)]
            if ch != " ":
                t = (scale, 0, 0, -scale, x, y0)
                pen, bounds = SVGPathPen(self.glyphs), BoundsPen(self.glyphs)
                self.glyphs[name].draw(TransformPen(pen, t))
                self.glyphs[name].draw(TransformPen(bounds, t))
                out.append((pen.getCommands(), bounds.bounds))
            x += self.hmtx[name][0] * scale
        return out


def extent(paths):
    return min(b[0] for _, b in paths), max(b[2] for _, b in paths)


q = Face(name_font)
p = Face(tag_font)
xh = q.xh
s = round(xh * 0.42)
gap = round(xh * 0.15)

line1 = q.run("le petit", 0, 0)
left, end1 = extent(line1)
squares1 = [(end1 + xh * 0.22 + i * (s + gap), -xh / 2 - s / 2, rose if i == 0 else ocre if i == 1 else lilas) for i in range(3)]

base2 = round(xh * 1.62)
mid2 = base2 - xh / 2
squares2 = [(left + i * (s + gap), mid2 - s / 2, lilas if i == 0 else ocre if i == 1 else rose) for i in range(3)]

# L'étiquette : « café ■ bar » en Poppins, sur un pavé arrondi, juste après
# les carrés ; « nice » la suit.
tag_scale = (s * 0.72) / p.xh
cafe = p.run("café", 0, 0, tag_scale)
bar = p.run("bar", 0, 0, tag_scale)
cw = extent(cafe)[1] - extent(cafe)[0]
bw = extent(bar)[1] - extent(bar)[0]
dot = s * 0.26
inner_gap = s * 0.28
pad_x = s * 0.36
tag_h = s * 1.25
tag_w = pad_x * 2 + cw + inner_gap * 2 + dot + bw
tag_x = squares2[-1][0] + s + gap * 1.6
tag_y = mid2 - tag_h / 2
text_base = mid2 + p.xh * tag_scale / 2
cafe = p.run("café", tag_x + pad_x - extent(cafe)[0], text_base, tag_scale)
dot_x = tag_x + pad_x + cw + inner_gap
bar = p.run("bar", dot_x + dot + inner_gap - extent(bar)[0], text_base, tag_scale)

nice = q.run("nice", 0, base2)
nice = q.run("nice", tag_x + tag_w + xh * 0.22 - extent(nice)[0], base2)

boxes = [b for _, b in line1 + nice] + [(x, y, x + s, y + s) for x, y, _ in squares1 + squares2]
boxes.append((tag_x, tag_y, tag_x + tag_w, tag_y + tag_h))
minx, miny = min(b[0] for b in boxes), min(b[1] for b in boxes)
maxx, maxy = max(b[2] for b in boxes), max(b[3] for b in boxes)
pad = xh * 0.05
vb_w, vb_h = maxx - minx + 2 * pad, maxy - miny + 2 * pad
vb = f"{minx - pad:.0f} {miny - pad:.0f} {vb_w:.0f} {vb_h:.0f}"

parts = [f'<path fill="{ink}" d="{"".join(d for d, _ in line1 + nice)}"/>']
parts += [f'<rect x="{x:.0f}" y="{y:.0f}" width="{s}" height="{s}" fill="{c}"/>' for x, y, c in squares1 + squares2]
parts.append(f'<rect x="{tag_x:.0f}" y="{tag_y:.0f}" width="{tag_w:.0f}" height="{tag_h:.0f}" rx="{s * 0.22:.0f}" fill="{ink}"/>')
parts.append(f'<path fill="{tag_ink}" d="{"".join(d for d, _ in cafe + bar)}"/>')
parts.append(f'<rect x="{dot_x:.0f}" y="{mid2 - dot / 2:.0f}" width="{dot:.0f}" height="{dot:.0f}" fill="{tag_ink}"/>')
# Une taille propre (un dixième des unités) : sans elle, une image dans un
# conteneur qui se règle sur son contenu s'effondre à 0 × 0.
svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{vb_w / 10:.0f}" height="{vb_h / 10:.0f}" viewBox="{vb}">{"".join(parts)}</svg>\n'
open(out, "w").write(svg)
print(out, vb, len(svg), "octets")

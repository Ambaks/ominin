"""
Le Grand Large, l'hôtel fictif de la démo Ominin Hôtels, en blocs de jouet.

À exécuter dans Blender (3.4+), suivi d'export.py qui l'exporte en GLB
(Draco) pour la page Chambres de la gestion et en rend l'image fixe :
    blender -b -P build_grand_large.py -P export.py
Les noms d'objets sont lus par le moteur Three.js (plan-sim.ts) :
- level-* (extra `base`, la hauteur du sol) : les étages qu'on coupe ;
- room-<numéro> : la tuile de sol de chaque chambre, colorée par son statut ;
- nav/* : le réseau de déplacement, extras `links`, `level`, `spot`, `patrol` ;
- rest/rest-<lieu> : où la figurine se pose à un endroit, extra `yaw` ;
- poi/poi-<lieu> : les points de vue des boutons « Aller à », extras `dist`
  et `level`.

Le plan : deux ailes de chambres (4 étages, 36 chambres par étage) de part et
d'autre d'un pavillon central — grand hall à double hauteur, réception,
salons autour d'une fontaine, bar, restaurant Horizon et sa cuisine, toit-
terrasse. Au rez des ailes, le spa et la salle de sport. Côté mer, la
piscine, la pataugeoire, le tennis, la plage, ses cabanes et le ponton ; côté
rue, la cour d'honneur et sa fontaine, le parking.

Repères (Blender, Z vers le haut) : X le long de la façade, Y négatif vers la
mer, une unité = un mètre de jouet.
"""

import math
import random

import bmesh
import bpy
from mathutils import Matrix, Vector

# ── Remise à zéro ──────────────────────────────────────────────────────
for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob, do_unlink=True)
for block in (bpy.data.meshes, bpy.data.materials, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
    for item in list(block):
        block.remove(item)
scene = bpy.context.scene
coll = scene.collection


def srgb(hex_):
    hex_ = hex_.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(hex_[i : i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return out


def mat(name, hex_, rough=0.55, metal=0.0, alpha=1.0, emit=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    r, g, bl = srgb(hex_)
    b.inputs["Base Color"].default_value = (r, g, bl, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
        m.blend_method = "BLEND"
        m.shadow_method = "NONE"
    if emit:
        b.inputs["Emission"].default_value = (r, g, bl, 1)
        b.inputs["Emission Strength"].default_value = emit
    return m


plaster = mat("plaster", "#f3e5c9", 0.6)
cream = mat("cream", "#e6cfa6", 0.65)
stone = mat("stone", "#dcc6a0", 0.7)
paving = mat("paving", "#d2ba90", 0.75)
gravel = mat("gravel", "#e3d3b0", 0.95)
marble = mat("marble", "#f5ede0", 0.25)
sand = mat("sand", "#ecd5a3", 0.85)
navy = mat("navy", "#1c2340", 0.5)
navy_soft = mat("navy-soft", "#2c3560", 0.6)
brass = mat("brass", "#c9a05a", 0.35, 0.6)
water = mat("water", "#4cc3cf", 0.15)
sea = mat("sea", "#2f93ad", 0.25)
shallows = mat("shallows", "#56c0c6", 0.2)
deep = mat("deep", "#1f6f8f", 0.3)
ripple = mat("ripple", "#3b9fb6", 0.2)
foam = mat("foam", "#e6f6f3", 0.4)
grass = mat("grass", "#86a96f", 0.8)
lawn = mat("lawn", "#7a9f62", 0.85)
hedge = mat("hedge", "#4f7a4a", 0.8)
leaf = mat("leaf", "#5f8f55", 0.7)
olive = mat("olive", "#8f9e6c", 0.75)
lavender = mat("lavender", "#8d7bb5", 0.8)
wood = mat("wood", "#a8774c", 0.6)
wood_dark = mat("wood-dark", "#6e4a2f", 0.6)
walnut = mat("walnut", "#5e4130", 0.55)
walnut_light = mat("walnut-light", "#6c4b37", 0.55)
canvas = mat("canvas", "#fbf8f2", 0.7)
linen = mat("linen", "#fffdf8", 0.75)
terracotta = mat("terracotta", "#c8734f", 0.7)
glass = mat("glass", "#bfe6ee", 0.05, 0.0, 0.3)
lift_glass = mat("lift-glass", "#d6eef2", 0.05, 0.0, 0.22)
slate = mat("slate", "#26305a", 0.45)
zinc = mat("zinc", "#6f7a93", 0.5, 0.2)
steel = mat("steel", "#c7ccd3", 0.3, 0.7)
carpet = mat("carpet", "#33407a", 0.9)
room_floor = mat("room-floor", "#dcc8a6", 0.65)
court = mat("court", "#3d6f9e", 0.8)
court_line = mat("court-line", "#f8f6f0", 0.6)
asphalt = mat("asphalt", "#8f8a82", 0.9)
taxi = mat("taxi", "#f2c14e", 0.4)
car_red = mat("car-red", "#b8483c", 0.4)
car_green = mat("car-green", "#3f6b55", 0.4)
car_cream = mat("car-cream", "#efe4c8", 0.4)
bulb = mat("bulb", "#ffe3a3", 0.4, 0.0, 1.0, 3.0)
straw = mat("straw", "#d9b77a", 0.9)
tile = mat("tile", "#d9e9ea", 0.3)
rubber = mat("rubber", "#3b3f4a", 0.8)
oak = mat("oak", "#c9ab80", 0.6)
mirror = mat("mirror", "#dfe8ec", 0.05, 0.9)


class Group:
    """Une pièce de la maquette : des blocs fusionnés en un seul maillage, un matériau par face."""

    def __init__(self, name, parent=None):
        self.name = name
        self.parent = parent
        self.bm = bmesh.new()
        self.mats = []

    def _idx(self, m):
        if m not in self.mats:
            self.mats.append(m)
        return self.mats.index(m)

    def _finish_geom(self, verts, m, bevel):
        idx = self._idx(m)
        for f in {f for v in verts for f in v.link_faces}:
            f.material_index = idx
        if bevel:
            edges = list({e for v in verts for e in v.link_edges})
            bmesh.ops.bevel(self.bm, geom=list(verts) + edges, offset=bevel, segments=1, affect="EDGES", material=idx, clamp_overlap=True)

    def box(self, x0, y0, z0, x1, y1, z1, m, bevel=0.0, rot=0.0, pivot=None):
        x0, x1 = min(x0, x1), max(x0, x1)
        y0, y1 = min(y0, y1), max(y0, y1)
        z0, z1 = min(z0, z1), max(z0, z1)
        verts = bmesh.ops.create_cube(self.bm, size=1.0)["verts"]
        sx, sy, sz = x1 - x0, y1 - y0, z1 - z0
        c = Vector(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
        for v in verts:
            v.co = Vector((v.co.x * sx, v.co.y * sy, v.co.z * sz)) + c
        if rot:
            bmesh.ops.rotate(self.bm, verts=verts, cent=pivot or c, matrix=Matrix.Rotation(rot, 3, "Z"))
        self._finish_geom(verts, m, min(bevel, sx * 0.3, sy * 0.3, sz * 0.3) if bevel else 0)

    def cyl(self, x, y, z0, z1, r, m, seg=12, r2=None, rot=0.0):
        verts = bmesh.ops.create_cone(self.bm, cap_ends=True, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=z1 - z0)["verts"]
        if rot:
            bmesh.ops.rotate(self.bm, verts=verts, cent=Vector(), matrix=Matrix.Rotation(rot, 3, "Z"))
        for v in verts:
            v.co += Vector((x, y, (z0 + z1) / 2))
        self._finish_geom(verts, m, 0)

    def ball(self, x, y, z, r, m, seg=10):
        verts = bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=max(4, seg // 2 + 1), radius=r)["verts"]
        for v in verts:
            v.co += Vector((x, y, z))
        self._finish_geom(verts, m, 0)

    def rod(self, a, b, w, m):
        """Une barre de section carrée w, d'un point à un autre, dans n'importe quelle direction."""
        a, b = Vector(a), Vector(b)
        verts = bmesh.ops.create_cube(self.bm, size=1.0)["verts"]
        d = b - a
        place = Matrix.Translation((a + b) / 2) @ d.to_track_quat("Z", "Y").to_matrix().to_4x4() @ Matrix.Diagonal((w, w, d.length, 1))
        bmesh.ops.transform(self.bm, matrix=place, verts=verts)
        self._finish_geom(verts, m, 0)

    def finish(self):
        me = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.mats:
            me.materials.append(m)
        ob = bpy.data.objects.new(self.name, me)
        coll.objects.link(ob)
        ob.parent = self.parent
        return ob


def empty(name, loc=(0, 0, 0), parent=None, **extras):
    ob = bpy.data.objects.new(name, None)
    ob.empty_display_type = "PLAIN_AXES"
    ob.empty_display_size = 0.4
    ob.location = loc
    coll.objects.link(ob)
    ob.parent = parent
    for k, v in extras.items():
        ob[k] = v
    return ob


# ── Repères ─────────────────────────────────────────────────────────────
G = 0.6  # terrasse
GF = G + 0.2  # sol du rez-de-chaussée
FLOOR_H = 3.0
F1 = G + 4.0
FLOORS = 4
WROOF = F1 + FLOORS * FLOOR_H  # toit des ailes
CROOF = G + 8.0  # toit-terrasse du pavillon
ROOM_W = 4.0
ROOMS_PER_SIDE = 9
WY0, WY1 = -2.0, 10.5  # profondeur des ailes
CORR0, CORR1 = 3.5, 5.0  # couloir des ailes
WINGS = {"w": (-57.0, -21.0), "e": (21.0, 57.0)}
CX0, CX1, CY0, CY1 = -17.0, 17.0, -8.0, 16.0  # pavillon central
LIFT_Y = (3.0, 6.0)
LIFTS = {"w": (-21.0, -17.0), "e": (17.0, 21.0)}

grounds_root = empty("grounds")
level_bases = {"level-0": GF, **{f"level-{f}": F1 + (f - 1) * FLOOR_H + 0.24 for f in range(1, FLOORS + 1)}, "level-roof": CROOF + 0.25}
levels = {name: empty(name, base=base) for name, base in level_bases.items()}
nav_root = empty("nav")
spots = {}
# Où la figurine se pose à un endroit (pieds ou bassin), et vers où elle regarde (lacet Three.js, 0 = vers la mer).
rest = {}


def yaw_to(dx, dy):
    """Lacet Three.js pour regarder dans la direction Blender (dx, dy)."""
    return math.atan2(dx, -dy)


def palm(grp, x, y, z, h=3.6):
    for i in range(4):
        grp.cyl(x + 0.06 * i, y, z + i * h / 4, z + (i + 1) * h / 4, 0.22 - 0.025 * i, wood_dark, 8)
    top = z + h
    for a in range(7):
        ang = a * 2 * math.pi / 7
        grp.box(x, y - 0.2, top - 0.08, x + 1.8, y + 0.2, top + 0.06, leaf, 0, rot=ang, pivot=Vector((x, y, top)))
    grp.ball(x, y, top, 0.32, leaf, 8)


def cypress(grp, x, y, z, h=4.2):
    grp.cyl(x, y, z, z + 0.4, 0.12, wood_dark, 6)
    grp.cyl(x, y, z + 0.4, z + h, 0.55, hedge, 8, 0.08)


def round_tree(grp, x, y, z):
    grp.cyl(x, y, z, z + 1.6, 0.16, wood_dark, 6)
    grp.ball(x, y, z + 2.4, 1.2, leaf, 10)


def lantern(grp, x, y, z):
    grp.cyl(x, y, z, z + 2.2, 0.06, navy, 6)
    grp.ball(x, y, z + 2.35, 0.18, bulb, 8)


def car(grp, x, y, z, body, rot=0.0):
    piv = Vector((x, y, z))
    grp.box(x - 1.2, y - 0.75, z + 0.25, x + 1.2, y + 0.75, z + 0.85, body, 0.18, rot, piv)
    grp.box(x - 0.7, y - 0.65, z + 0.85, x + 0.6, y + 0.65, z + 1.35, glass, 0, rot, piv)
    grp.box(x - 0.7, y - 0.65, z + 1.35, x + 0.6, y + 0.65, z + 1.42, body, 0.03, rot, piv)
    for dx in (-0.75, 0.75):
        for dy in (-0.78, 0.78):
            grp.box(x + dx - 0.3, y + dy - 0.1, z, x + dx + 0.3, y + dy + 0.1, z + 0.5, rubber, 0, rot, piv)


def table_set(grp, x, y, z, chairs=2, top=plaster, seat=navy_soft, r=0.55):
    grp.cyl(x, y, z, z + 0.7, 0.07, brass, 8)
    grp.cyl(x, y, z + 0.7, z + 0.77, r, top, 16)
    for i in range(chairs):
        a = i * 2 * math.pi / chairs
        cx, cy = x + math.cos(a) * (r + 0.35), y + math.sin(a) * (r + 0.35)
        grp.box(cx - 0.24, cy - 0.24, z, cx + 0.24, cy + 0.24, z + 0.45, seat, 0.06)


def olive_tree(grp, x, y, z, k=1.0):
    grp.cyl(x, y, z, z + 1.1 * k, 0.14 * k, wood_dark, 6, 0.1 * k)
    for dx, dy, dz, r in ((0.0, 0.0, 1.75, 0.95), (0.6, 0.25, 1.45, 0.7), (-0.55, -0.3, 1.5, 0.7)):
        grp.ball(x + dx * k, y + dy * k, z + dz * k, r * k, olive, 8)


def lavender_rows(grp, x0, y0, x1, y1, z, along_x=True, pitch=1.1):
    """Un parterre de lavande en rangs, sur un lit de gravier."""
    grp.box(x0, y0, z, x1, y1, z + 0.06, gravel)
    n = int(((y1 - y0) if along_x else (x1 - x0)) / pitch)
    for i in range(n):
        c = (y0 if along_x else x0) + (i + 0.5) * pitch
        if along_x:
            grp.box(x0 + 0.3, c - 0.33, z + 0.06, x1 - 0.3, c + 0.33, z + 0.55, lavender, 0.2)
        else:
            grp.box(c - 0.33, y0 + 0.3, z + 0.06, c + 0.33, y1 - 0.3, z + 0.55, lavender, 0.2)


def bench(grp, x, y, z, rot=0.0):
    piv = Vector((x, y, z))
    grp.box(x - 0.9, y - 0.25, z + 0.38, x + 0.9, y + 0.25, z + 0.46, walnut, 0.03, rot, piv)
    grp.box(x - 0.9, y + 0.2, z + 0.46, x + 0.9, y + 0.27, z + 0.85, walnut, 0.02, rot, piv)
    for dx in (-0.75, 0.75):
        grp.box(x + dx - 0.05, y - 0.22, z, x + dx + 0.05, y + 0.22, z + 0.38, navy, 0, rot, piv)


def parasol(grp, x, y, z, cloth=canvas, h=2.5, r=1.2):
    grp.cyl(x, y, z, z + h, 0.05, brass, 6)
    grp.cyl(x, y, z + h - 0.25, z + h + 0.3, r, cloth, 12, 0.06)


def planter(grp, x, y, z, w=0.8, tree=True):
    grp.box(x - w / 2, y - w / 2, z, x + w / 2, y + w / 2, z + 0.7, navy, 0.06)
    grp.box(x - w / 2 - 0.03, y - w / 2 - 0.03, z + 0.66, x + w / 2 + 0.03, y + w / 2 + 0.03, z + 0.72, brass)
    if tree:
        olive_tree(grp, x, y, z + 0.7, 0.55)
    else:
        grp.ball(x, y, z + 0.95, w * 0.55, leaf, 8)


# ── Socle, mer, plage ───────────────────────────────────────────────────
g = Group("grounds-mesh", grounds_root)
PX0, PX1, PY0, PY1 = -62.0, 62.0, -66.0, 48.0
g.box(PX0, PY0, -1.8, PX1, PY1, 0, navy, 0.3)
g.box(PX0 - 0.15, PY0 - 0.15, -0.6, PX1 + 0.15, PY1 + 0.15, -0.4, brass, 0.05)
# La mer : le large plus sombre, les hauts-fonds turquoise, une frange
# d'écume le long du rivage et quelques rides.
g.box(PX0 + 0.4, PY0 + 0.4, 0, PX1 - 0.4, -46, 0.15, sea)
g.box(PX0 + 0.4, PY0 + 0.4, 0.15, PX1 - 0.4, -59.0, 0.16, deep)
g.box(PX0 + 0.4, -50.5, 0.15, PX1 - 0.4, -46, 0.17, shallows)
rng = random.Random(7)
x = PX0 + 0.4
while x < PX1 - 0.4:
    w = rng.uniform(2.5, 6.0)
    g.box(x, -47.4 - rng.uniform(0.0, 0.7), 0.17, min(x + w, PX1 - 0.4), -46.0, 0.22, foam, 0.06)
    x += w
for _ in range(14):
    wx, wy = rng.uniform(PX0 + 4, PX1 - 4), rng.uniform(-64, -53)
    for dx, dy in ((0.0, 0.0), (rng.uniform(0.6, 1.2), rng.uniform(-0.5, 0.5))):
        g.box(wx + dx - 1.0, wy + dy - 0.7, 0.15, wx + dx + 1.0, wy + dy + 0.7, 0.18, ripple, 0.25)
g.box(PX0 + 0.4, -46, 0, PX1 - 0.4, -32, 0.45, sand, 0.1)
for i, cx in enumerate(range(-44, 45, 8)):
    cy = -40.0
    g.box(cx - 1.5, cy - 1.5, 0.45, cx + 1.5, cy + 1.5, 0.65, wood, 0.05)
    for (dx, dy) in [(-1.35, -1.35), (1.35, -1.35), (-1.35, 1.35), (1.35, 1.35)]:
        g.cyl(cx + dx, cy + dy, 0.65, 3.1, 0.07, plaster, 6)
    g.box(cx - 1.7, cy - 1.7, 3.1, cx + 1.7, cy + 1.7, 3.4, canvas, 0.12)
    g.box(cx - 1.5, cy + 1.3, 0.65, cx + 1.5, cy + 1.4, 3.0, canvas)
    g.box(cx - 1.45, cy - 1.1, 0.65, cx - 1.35, cy + 1.3, 3.0, canvas)
    g.box(cx + 1.35, cy - 1.1, 0.65, cx + 1.45, cy + 1.3, 3.0, canvas)
    g.box(cx - 1.0, cy - 0.3, 0.65, cx + 1.0, cy + 1.0, 0.95, navy_soft if i % 2 else terracotta, 0.08)
    spots[f"cabane-{i + 1}"] = (cx, cy - 2.0, 0.45, "level-0", "cabane")
    rest[f"cabane-{i + 1}"] = (cx - 0.9, cy + 0.35, 0.95, -math.pi / 2)
# Paillote de la plage
g.box(50, -42, 0.45, 56, -37, 1.6, wood, 0.08)
g.box(49.8, -42.2, 1.6, 56.2, -36.8, 1.7, brass, 0.04)
g.cyl(53, -39.5, 1.7, 3.8, 0.14, wood_dark, 8)
g.cyl(53, -39.5, 3.4, 4.6, 4.0, straw, 12, 0.1)
for i in range(4):
    g.cyl(49.2, -41.5 + i * 1.3, 0.45, 1.2, 0.25, brass, 10)
# Ponton et bateaux
g.box(-31.5, -58, 0.5, -28.5, -46, 0.75, wood, 0.05)
for py in range(-57, -46, 2):
    g.cyl(-31.6, py, 0, 0.8, 0.15, wood_dark, 6)
    g.cyl(-28.4, py, 0, 0.8, 0.15, wood_dark, 6)
spots["ponton-1"] = (-30.0, -55.5, 0.75, "level-0", "ponton")
spots["ponton-2"] = (-30.0, -51.0, 0.75, "level-0", "ponton")
rest["ponton-1"] = (-30.0, -56.0, 0.75, 0.0)
rest["ponton-2"] = (-29.0, -51.0, 0.75, -math.pi / 2)
for (bx, by, sail) in [(-24, -55, True), (-44, -58, True), (10, -56, False)]:
    g.box(bx - 3.5, by - 0.9, 0.15, bx + 3.5, by + 0.9, 0.85, plaster, 0.25)
    g.box(bx - 3.5, by - 0.9, 0.8, bx + 3.5, by + 0.9, 0.9, navy)
    if sail:
        g.cyl(bx, by, 0.9, 7.2, 0.09, wood_dark, 6)
        g.box(bx + 0.1, by - 0.05, 1.4, bx + 3.4, by + 0.05, 6.8, canvas)
    else:
        g.box(bx - 1.5, by - 0.7, 0.9, bx + 0.8, by + 0.7, 1.7, wood, 0.1)
# Palmiers de la plage
for (px, py) in [(-56, -36), (-36, -35), (-20, -44), (-4, -35), (20, -44), (36, -35), (58, -34)]:
    palm(g, px, py, 0.45)

# ── Terrasse, piscine, tennis ───────────────────────────────────────────
POOL = (-12.0, -28.0, 20.0, -16.0)
g.box(PX0 + 0.4, -32, 0, PX1 - 0.4, PY1 - 0.4, G, stone, 0.08)
g.box(POOL[0], POOL[1], G - 0.3, POOL[2], POOL[3], G + 0.005, water)
for (a, b, c, d) in [(POOL[0] - 0.4, POOL[1] - 0.4, POOL[2] + 0.4, POOL[1]), (POOL[0] - 0.4, POOL[3], POOL[2] + 0.4, POOL[3] + 0.4),
                     (POOL[0] - 0.4, POOL[1], POOL[0], POOL[3]), (POOL[2], POOL[1], POOL[2] + 0.4, POOL[3])]:
    g.box(a, b, G, c, d, G + 0.14, marble)
# Pataugeoire
g.box(-24, -27, G - 0.15, -17, -21, G + 0.01, water)
g.box(-24.3, -27.3, G, -16.7, -27, G + 0.12, marble)
g.box(-24.3, -21, G, -16.7, -20.7, G + 0.12, marble)
g.box(-24.3, -27, G, -24, -21, G + 0.12, marble)
g.box(-17, -27, G, -16.7, -21, G + 0.12, marble)
g.ball(-20.5, -24, G + 0.2, 0.5, taxi, 10)
# Transats et parasols
num = 1
for y, facing in ((-29.6, 1), (-14.4, -1)):
    for i in range(15):
        x = -10 + i * 2
        g.box(x - 0.42, y - 0.95, G, x + 0.42, y + 0.95, G + 0.28, linen, 0.05)
        hy = y + 0.62 * facing
        g.box(x - 0.42, hy - 0.32, G + 0.28, x + 0.42, hy + 0.32, G + 0.64, linen, 0.05)
        g.box(x - 0.44, y - 0.97, G - 0.02, x + 0.44, y + 0.97, G + 0.08, wood)
        if i % 2 == 0:
            g.cyl(x + 1.0, y, G, G + 2.4, 0.05, steel, 6)
            g.cyl(x + 1.0, y, G + 2.2, G + 2.7, 1.1, navy_soft if (i // 2) % 2 else canvas, 10, 0.05)
        spots[f"transat-{num}"] = (x, y - 1.2 * facing, G, "level-0", "transat")
        rest[f"transat-{num}"] = (x, y - 0.9 * facing, G + 0.3, 0.0 if facing == 1 else math.pi)
        num += 1
# Bar de la piscine
g.box(24, -26, G, 30, -20, G + 1.15, navy, 0.1)
g.box(23.9, -26.1, G + 1.15, 30.1, -19.9, G + 1.25, brass, 0.04)
for (cx, cy) in [(24.2, -25.8), (29.8, -25.8), (24.2, -20.2), (29.8, -20.2)]:
    g.cyl(cx, cy, G + 1.25, G + 3.2, 0.09, plaster, 8)
g.box(23.4, -26.6, G + 3.2, 30.6, -19.4, G + 3.5, canvas, 0.12)
for i in range(5):
    g.cyl(23.3, -25.4 + i * 1.2, G, G + 0.8, 0.24, brass, 10)
# Tennis
CT = (-54.0, -31.0, -38.0, -11.0)
g.box(CT[0] - 1.5, CT[1] - 0.5, G, CT[2] + 1.5, CT[3] + 0.5, G + 0.05, terracotta)
g.box(CT[0], CT[1], G + 0.05, CT[2], CT[3], G + 0.08, court)
for (a, b, c, d) in [(CT[0], CT[1], CT[2], CT[1] + 0.15), (CT[0], CT[3] - 0.15, CT[2], CT[3]), (CT[0], CT[1], CT[0] + 0.15, CT[3]),
                     (CT[2] - 0.15, CT[1], CT[2], CT[3]), ((CT[0] + CT[2]) / 2 - 0.07, CT[1], (CT[0] + CT[2]) / 2 + 0.07, CT[3])]:
    g.box(a, b, G + 0.08, c, d, G + 0.1, court_line)
g.box(CT[0] - 0.3, -21.05, G, CT[2] + 0.3, -20.95, G + 1.0, canvas)
g.box(CT[0] - 0.3, -21.1, G + 1.0, CT[2] + 0.3, -20.9, G + 1.08, navy)
spots["tennis-1"] = (-46.0, -28.5, G + 0.08, "level-0", "tennis")
spots["tennis-2"] = (-46.0, -13.5, G + 0.08, "level-0", "tennis")
rest["tennis-1"] = (-46.0, -28.5, G + 0.08, math.pi)
rest["tennis-2"] = (-46.0, -13.5, G + 0.08, 0.0)
# Nageurs dans la grande piscine
for i, (nx, ny) in enumerate([(-8, -25), (-2, -19), (4, -24), (9, -20), (14, -25), (17, -19), (-6, -21), (11, -23)]):
    spots[f"nage-{i + 1}"] = (nx, ny, G - 0.12, "level-0", "nage")
    rest[f"nage-{i + 1}"] = (nx, ny, G - 0.12, i * 0.9)
# Dallage de travertin en damier autour de la piscine (hors bassins)
holes = [(POOL[0] - 0.5, POOL[1] - 0.5, POOL[2] + 0.5, POOL[3] + 0.5), (-24.5, -27.5, -16.5, -20.5)]
for gx in range(-26, 34, 2):
    for gy in range(-32, -8, 2):
        if (gx + gy) % 4 or any(a < gx + 2 and gx < c and b < gy + 2 and gy < d for a, b, c, d in holes):
            continue
        g.box(gx, max(gy, -31.6), G, gx + 2, min(gy + 2, -8.4), G + 0.012, paving)
# Jardins devant les ailes
for (a, b, c, d) in [(-60, -30, -56, -4), (-36, -31, -26, -6), (34, -31, 60, -6), (-60, -3, -58, 12), (58, -3, 60, 12)]:
    g.box(a, b, G, c, d, G + 0.1, grass, 0.06)
for (px, py) in [(-34, -29), (-28, -9), (32, -9), (38, -29), (46, -12), (54, -26), (-58, -8), (-58, -26), (58, -12)]:
    palm(g, px, py, G)
for x in range(-56, 57, 8):
    lantern(g, x + 2, -31.2, G)
# Jardin méditerranéen (est) : oliviers, lavande, terrain de pétanque
lavender_rows(g, 35.5, -9.4, 57.5, -6.8, G + 0.1)
lavender_rows(g, -35.4, -27.0, -26.6, -23.6, G + 0.1)
for (ox, oy) in [(37, -15), (37, -21), (37, -25.5), (58, -18), (58, -23), (50, -27.5), (42.5, -27.5), (51, -13.5), (-31, -14), (-31, -19)]:
    olive_tree(g, ox, oy, G + 0.1)
g.box(41, -21.2, G + 0.1, 55, -17.8, G + 0.14, gravel)
for (a, b, c, d) in [(40.8, -21.4, 55.2, -21.2), (40.8, -17.8, 55.2, -17.6), (40.8, -21.2, 41, -17.8), (55, -21.2, 55.2, -17.8)]:
    g.box(a, b, G + 0.1, c, d, G + 0.3, walnut)
for (bx, by, col) in [(44.2, -19.1, steel), (44.6, -19.7, steel), (51.5, -19.4, brass)]:
    g.ball(bx, by, G + 0.22, 0.09 if col is steel else 0.05, col, 8)
for bx in (44.0, 52.0):
    bench(g, bx, -23.0, G + 0.1)
# Jardin du spa (devant l'aile ouest) : miroir d'eau, cyprès, lits de repos
g.box(-56, -9.2, G, -37, -3.2, G + 0.1, lawn, 0.05)
g.box(-52.4, -7.2, G + 0.1, -41.6, -5.4, G + 0.18, marble)
g.box(-52.0, -6.9, G + 0.1, -42.0, -5.7, G + 0.2, water)
for cx in (-54.5, -39.5):
    cypress(g, cx, -6.3, G + 0.1, 3.6)
for i in range(4):
    lx = -50.5 + i * 2.6
    g.box(lx - 0.4, -8.9, G + 0.1, lx + 0.4, -7.8, G + 0.36, linen, 0.06)
    g.box(lx - 0.4, -8.1, G + 0.36, lx + 0.4, -7.75, G + 0.62, linen, 0.05)
    spots[f"lit-{12 + i}"] = (lx, -9.55, G, "level-0", "lit")
    rest[f"lit-{12 + i}"] = (lx, -8.85, G + 0.36, 0.0)
for i in range(8):
    g.ball(-55.0 + i * 2.4, -3.8, G + 0.6, 0.55, hedge, 8)
# Restaurant : terrasse
terrace_tables = [(-15.0, -13.0), (-11.0, -13.0), (-7.0, -13.0), (-15.0, -10.0), (-11.0, -10.0), (-7.0, -10.0)]
for i, (tx, ty) in enumerate(terrace_tables):
    table_set(g, tx, ty, G, 2, plaster, terracotta, 0.5)
    if i < 3:
        g.cyl(tx + 1.4, ty + 1.5, G, G + 2.4, 0.05, steel, 6)
        g.cyl(tx + 1.4, ty + 1.5, G + 2.2, G + 2.7, 1.2, canvas, 10, 0.05)
    spots[f"terrasse-{i + 1}"] = (tx, ty - 1.05, G, "level-0", "terrasse")
    rest[f"terrasse-{i + 1}"] = (tx + 0.85, ty, G + 0.45, yaw_to(-1, 0))

# ── Côté rue : cour d'honneur, fontaine, parking ────────────────────────
# Pelouses de la cour, allée de gravier depuis la grille, boucle de dépose
# autour de la fontaine jusqu'à la marquise, passage vers le parking.
FX, FY = 7.0, 29.0
g.box(-12, 16, G, 26, 42.8, G + 0.03, lawn)
g.box(-11, 25, G, -3.5, PY1 - 0.4, G + 0.05, gravel)
g.cyl(FX, FY, G + 0.03, G + 0.05, 11.6, gravel, 40)
g.box(2.4, 16, G + 0.03, 11.6, 19, G + 0.05, gravel)
g.box(18, 28.6, G + 0.03, 32.5, 31.4, G + 0.05, gravel)
g.box(19, 16, G + 0.03, 25, 20, G + 0.05, gravel)
for (tx, ty) in [(-8.5, 19.5), (-8.5, 22.5), (22.5, 39.5), (22.5, 36.5), (0.5, 40.5), (14.0, 40.5)]:
    g.box(tx - 0.08, ty - 0.08, G + 0.03, tx + 0.08, ty + 0.08, G + 0.45, wood_dark)
    g.ball(tx, ty, G + 1.0, 0.75, hedge, 10)
for (ox, oy) in [(21.5, 24.0), (-0.5, 38.5), (20.5, 34.0)]:
    olive_tree(g, ox, oy, G + 0.03, 1.2)
lavender_rows(g, -12.0, 16.2, 1.8, 17.8, G + 0.03, False, 1.0)
lavender_rows(g, 12.2, 16.2, 16.8, 17.8, G + 0.03, False, 1.0)
for y in (30.0, 36.0, 42.0):
    lantern(g, -11.6, y, G)
g.cyl(FX, FY, G + 0.04, G + 0.1, 7.2, grass, 24)
g.cyl(FX, FY, G + 0.1, G + 0.8, 4.4, marble, 24)
g.cyl(FX, FY, G + 0.55, G + 0.85, 4.0, water, 24)
g.cyl(FX, FY, G + 0.8, G + 2.0, 0.6, marble, 12)
g.cyl(FX, FY, G + 2.0, G + 2.3, 2.0, marble, 16)
g.cyl(FX, FY, G + 2.15, G + 2.35, 1.75, water, 16)
g.cyl(FX, FY, G + 2.3, G + 3.4, 0.3, marble, 10)
g.cyl(FX, FY, G + 3.4, G + 3.6, 0.9, marble, 12)
g.ball(FX, FY, G + 3.9, 0.35, brass, 10)
for a in range(8):
    ang = a * math.pi / 4
    g.ball(FX + math.cos(ang) * 2.7, FY + math.sin(ang) * 2.7, G + 0.86, 0.12, foam, 6)
for a in range(6):
    ang = a * math.pi / 3 + 0.3
    fx, fy = FX + math.cos(ang) * 5.2, FY + math.sin(ang) * 5.2
    spots[f"fontaine-{a + 1}"] = (fx, fy, G + 0.04, "level-0", "fontaine")
    rest[f"fontaine-{a + 1}"] = (fx, fy, G + 0.04, yaw_to(FX - fx, FY - fy))
# Haies et arbres de la cour, ouverte vers le parking
for (a, b, c, d) in [(-16, 17, -13, 44), (27, 17, 30, 28.4), (27, 31.6, 30, 44), (-3, 43, 18, 44.5)]:
    g.box(a, b, G, c, d, G + 1.0, hedge, 0.2)
for y in range(20, 44, 5):
    cypress(g, -14.5, y, G)
    if abs(y - 30) > 2:
        cypress(g, 28.5, y, G)
# Marquise de l'entrée (porte-cochère) : colonnes, auvent bleu nuit, liseré laiton
CANOPY = CROOF - 4.2
g.box(2.5, 17.3, CANOPY - 0.12, 11.5, 21.3, CANOPY, brass, 0.03)
g.box(2.6, 17.4, CANOPY, 11.4, 21.2, CANOPY + 0.36, navy, 0.1)
g.box(2.7, 17.5, CANOPY + 0.36, 11.3, 21.1, CANOPY + 0.42, brass)
for cx in (3.1, 10.9):
    for cy in (18.1, 20.7):
        g.cyl(cx, cy, G, G + 0.25, 0.32, brass, 12)
        g.cyl(cx, cy, G + 0.25, CANOPY - 0.3, 0.2, plaster, 12)
        g.cyl(cx, cy, CANOPY - 0.3, CANOPY - 0.12, 0.3, brass, 12)
g.box(4, 16, G + 0.05, 10, 21, G + 0.08, carpet)
car(g, 4.7, 19.4, G + 0.05, taxi)
car(g, -0.7, 23.6, G + 0.05, car_green, -0.96)
# Parking, avec un terre-plein planté
g.box(32, 16, G, 60, 44, G + 0.04, asphalt)
g.box(33, 26.8, G + 0.04, 59, 33.2, G + 0.2, lawn, 0.1)
g.box(33, 26.8, G + 0.04, 59, 27.1, G + 0.5, hedge, 0.1)
g.box(33, 32.9, G + 0.04, 59, 33.2, G + 0.5, hedge, 0.1)
for x in range(36, 58, 7):
    round_tree(g, x, 30.0, G + 0.2)
# Pelouse entre l'aile est et le parking
g.box(21.5, 10.6, G, 61.5, 15.8, G + 0.08, lawn, 0.05)
g.box(31.5, 15.4, G + 0.08, 61.5, 15.8, G + 0.8, hedge, 0.12)
for x in range(26, 60, 8):
    olive_tree(g, x, 13.0, G + 0.08)
# Derrière l'aile ouest : allées de gravier, oliveraie et lavande, coin des
# enfants, pétanque, potager du chef.
g.box(-61.5, 10.6, G, -16.2, 44.0, G + 0.08, lawn, 0.05)
g.box(-61, 26.4, G + 0.08, -16.2, 28.6, G + 0.1, gravel)
g.box(-39.1, 10.6, G + 0.08, -36.9, 43.6, G + 0.1, gravel)
for i, (ox, oy) in enumerate([(x, y) for x in (-56, -50, -44) for y in (31.5, 36.5, 41.5)]):
    olive_tree(g, ox + (1.2 if i % 2 else 0.0), oy, G + 0.08, 1.1)
for ly in (29.2, 33.8, 38.8):
    lavender_rows(g, -59.6, ly, -40.4, ly + 1.2, G + 0.08)
g.box(-35, 30.2, G + 0.08, -19, 42.6, G + 0.16, sand, 0.05)
for (a, b, c, d) in [(-35.2, 30.0, -18.8, 30.2), (-35.2, 42.6, -18.8, 42.8), (-35.2, 30.2, -35.0, 42.6), (-19.0, 30.2, -18.8, 42.6)]:
    g.box(a, b, G + 0.08, c, d, G + 0.4, walnut)
for sx in (-32.4, -28.6):
    for dy in (-0.9, 0.9):
        g.box(sx - 0.08, 37.0 + dy - 0.08, G + 0.16, sx + 0.08, 37.0 + dy + 0.08, G + 2.6, navy)
g.box(-32.6, 36.0, G + 2.6, -28.4, 38.0, G + 2.72, brass)
for sx in (-31.4, -29.6):
    g.box(sx - 0.05, 36.98, G + 0.9, sx + 0.05, 37.02, G + 2.6, steel)
    g.box(sx - 0.35, 36.8, G + 0.75, sx + 0.35, 37.2, G + 0.85, terracotta, 0.02)
g.box(-24.5, 37.0, G + 0.16, -21.0, 40.5, G + 2.0, canvas, 0.08)
g.cyl(-22.75, 38.75, G + 2.0, G + 3.4, 2.6, terracotta, 4, 0.05, rot=math.pi / 4)
g.box(-23.2, 36.95, G + 0.16, -22.3, 37.05, G + 1.3, navy)
g.cyl(-27.0, 33.0, G + 0.16, G + 0.6, 0.15, navy, 8)
g.box(-29.2, 32.75, G + 0.55, -24.8, 33.25, G + 0.65, taxi, 0.04)
for bx in (-34.0, -25.0):
    bench(g, bx, 29.2, G + 0.1)
for cy in (13.2, 18.6):
    g.box(-58.0, cy, G + 0.08, -42.0, cy + 3.6, G + 0.12, gravel)
    for (a, b, c, d) in [(-58.2, cy - 0.2, -41.8, cy), (-58.2, cy + 3.6, -41.8, cy + 3.8), (-58.2, cy, -58.0, cy + 3.6), (-42.0, cy, -41.8, cy + 3.6)]:
        g.box(a, b, G + 0.08, c, d, G + 0.3, walnut)
for (tx, ty) in [(-60.0, 24.2), (-50.0, 24.2), (-40.4, 15.0)]:
    round_tree(g, tx, ty, G + 0.08)
bench(g, -50.0, 23.4, G + 0.1)
for i in range(6):
    bx, by = -34.5 + (i % 3) * 5.6, 13.2 + (i // 3) * 6.2
    g.box(bx, by, G + 0.08, bx + 4.4, by + 4.0, G + 0.55, walnut, 0.05)
    g.box(bx + 0.2, by + 0.2, G + 0.55, bx + 4.2, by + 3.8, G + 0.6, wood_dark)
    for k in range(4):
        g.box(bx + 0.45, by + 0.5 + k * 0.85, G + 0.6, bx + 3.95, by + 0.9 + k * 0.85, G + 0.85, leaf if (i + k) % 3 else olive, 0.12)
for i in range(7):
    x = 34 + i * 3.8
    g.box(x - 0.06, 18, G + 0.04, x + 0.06, 24, G + 0.06, court_line)
    g.box(x - 0.06, 36, G + 0.04, x + 0.06, 42, G + 0.06, court_line)
for i, (x, y, body) in enumerate([(35.9, 21, car_red), (39.7, 21, car_cream), (47.3, 21, car_green), (51.1, 21, navy_soft), (39.7, 39, taxi), (43.5, 39, car_cream), (54.9, 39, car_red)]):
    car(g, x, y, G + 0.04, body, math.pi / 2)
for x in range(-60, 61, 10):
    if -16 < x < 32:
        continue
    round_tree(g, x, 45.8, G)
# Vélos
for i in range(6):
    x = 19 + i * 0.7
    g.box(x - 0.04, 17.5, G + 0.3, x + 0.04, 19.2, G + 0.38, navy)
    g.cyl(x, 17.7, G, G + 0.55, 0.28, rubber, 10)
    g.cyl(x, 19.0, G, G + 0.55, 0.28, rubber, 10)
g.finish()


# ── Rez-de-chaussée : le pavillon, le spa, la salle de sport ────────────
l0 = Group("level-0-mesh", levels["level-0"])
# Le haut du pavillon (double hauteur) et le lustre sont rangés avec le 1er
# étage : choisir « RDC » montre le hall vu d'en haut, sans rien devant.
hi = Group("pavilion-upper", levels["level-1"])


def tall(x0, y0, z0, x1, y1, z1, m, bevel=0.0):
    """Un bloc du pavillon coupé à la hauteur du 1er étage : le bas au rez, le haut avec l'étage."""
    if z1 <= F1:
        l0.box(x0, y0, z0, x1, y1, z1, m, bevel)
    elif z0 >= F1:
        hi.box(x0, y0, z0, x1, y1, z1, m, bevel)
    else:
        l0.box(x0, y0, z0, x1, y1, F1, m, bevel)
        hi.box(x0, y0, F1, x1, y1, z1, m, bevel)


def glass_lift(grp, lx0, lx1, z0, z1):
    """Un tronçon de cage d'ascenseur vitrée (un étage), cadre et bague de laiton."""
    ya, yb = LIFT_Y[0] - 0.15, LIFT_Y[1] + 0.15
    grp.box(lx0, ya, z0, lx1, LIFT_Y[0], z1, lift_glass)
    grp.box(lx0, LIFT_Y[1], z0, lx1, yb, z1, lift_glass)
    for px in (lx0, lx1):
        for py in (ya, yb):
            grp.box(px - 0.09, py - 0.09, z0, px + 0.09, py + 0.09, z1, brass)
    for py in (ya, LIFT_Y[1]):
        grp.box(lx0, py - 0.03, z0, lx1, py + 0.18, z0 + 0.12, brass)


def wing_corners(grp, x0w, x1w, z0, z1):
    """Les pilastres d'angle d'une aile, sur la hauteur d'un étage."""
    for cx in (x0w + 0.2, x1w - 0.2):
        for (ya, yb) in ((WY0 - 1.4, WY0 - 0.4), (WY1 - 0.2, WY1 + 0.6)):
            grp.box(cx - 0.5, ya, z0, cx + 0.5, yb, z1, cream, 0.06)


# Pavillon : sol de marbre, murs, colonnes
l0.box(CX0, CY0, G, CX1, CY1, GF, marble, 0.06)
# Mur côté rue, ouvert sous la travée d'entrée (DOOR) ; la fontaine du hall en IFX, IFY
IFX, IFY = 7.0, 2.5
DOOR = (5.4, 8.6, GF + 3.6)
tall(CX0, CY1 - 0.3, GF, DOOR[0], CY1, CROOF - 0.3, cream)
tall(DOOR[1], CY1 - 0.3, GF, CX1, CY1, CROOF - 0.3, cream)
tall(DOOR[0], CY1 - 0.3, DOOR[2], DOOR[1], CY1, CROOF - 0.3, cream)
tall(CX0, CY0, GF, CX0 + 0.3, LIFT_Y[0], CROOF - 0.3, cream)
tall(CX0, 4.0, GF, CX0 + 0.3, CY1, CROOF - 0.3, cream)
tall(CX1 - 0.3, CY0, GF, CX1, LIFT_Y[0], CROOF - 0.3, cream)
tall(CX1 - 0.3, LIFT_Y[1], GF, CX1, CY1, CROOF - 0.3, cream)
tall(CX0, CY0 - 0.05, GF, CX1, CY0 + 0.05, CROOF - 0.6, glass)
for i in range(9):
    cx = CX0 + 0.4 + i * (CX1 - CX0 - 0.8) / 8
    tall(cx - 0.35, CY0 - 0.35, GF, cx + 0.35, CY0 + 0.35, CROOF - 0.3, plaster, 0.08)
    l0.box(cx - 0.5, CY0 - 0.5, GF, cx + 0.5, CY0 + 0.5, GF + 0.3, plaster, 0.05)
# Porte côté rue : une ouverture dans le mur
# Portes vitrées coulissantes, ouvertes, dans un cadre de laiton
for (a, b) in ((DOOR[0], DOOR[0] + 0.75), (DOOR[1] - 0.75, DOOR[1])):
    l0.box(a, CY1 - 0.22, GF, b, CY1 - 0.12, DOOR[2] - 0.15, glass)
for x in DOOR[:2]:
    l0.box(x - 0.08, CY1 - 0.4, GF, x + 0.08, CY1 + 0.05, DOOR[2], brass)
l0.box(DOOR[0] - 0.08, CY1 - 0.4, DOOR[2] - 0.15, DOOR[1] + 0.08, CY1 + 0.05, DOOR[2], brass)
# Grandes marquises côté mer
for i in range(8):
    x0 = CX0 + 0.8 + i * 4.15
    l0.box(x0, CY0 - 1.8, GF + 3.4, x0 + 3.6, CY0, GF + 3.55, navy if i % 2 else canvas, 0.05)
# Cuisine (ouest, au fond) et restaurant Horizon (ouest, côté mer)
tall(-3.2, CY0, GF, -3.0, -1.0, CROOF - 0.3, cream)
tall(-3.2, 1.5, GF, -3.0, CY1, CROOF - 0.3, cream)
tall(CX0, 4.0, GF, -9.0, 4.2, CROOF - 0.3, cream)
tall(-7.0, 4.0, GF, -3.2, 4.2, CROOF - 0.3, cream)
# Le passe
l0.box(-9.0, 4.0, GF, -7.0, 4.4, GF + 1.1, steel, 0.03)
# Fourneaux, plans de travail, chambre froide, plonge
l0.box(-16.6, 13.6, GF, -4.0, 15.6, GF + 1.0, steel, 0.04)
for i in range(6):
    x = -15.6 + i * 2.0
    for dx in (-0.4, 0.4):
        l0.cyl(x + dx, 14.3, GF + 1.0, GF + 1.05, 0.28, rubber, 10)
    l0.cyl(x, 14.4, GF + 1.05, GF + 1.5, 0.3, steel, 10)
l0.box(-16.6, 15.4, GF + 1.6, -4.0, 15.7, GF + 2.3, steel)
l0.box(-14.0, 8.4, GF, -6.0, 10.0, GF + 1.0, steel, 0.04)
l0.box(-14.0, 8.4, GF + 1.0, -6.0, 10.0, GF + 1.05, wood)
l0.box(-16.6, 5.0, GF, -14.4, 8.0, GF + 2.6, steel, 0.06)
l0.box(-5.8, 5.0, GF, -3.4, 7.0, GF + 1.0, steel, 0.04)
l0.box(-5.6, 5.2, GF + 1.0, -3.6, 6.8, GF + 1.05, water)
for i, (sx, sy, look) in enumerate([(-14.0, 12.8, 1), (-10.0, 12.8, 1), (-6.0, 12.8, 1), (-10.0, 7.6, 1), (-4.6, 7.6, -1)]):
    spots[f"station-{i + 1}"] = (sx, sy, GF, "level-0", "station")
    rest[f"station-{i + 1}"] = (sx, sy, GF, yaw_to(0, look))
# Restaurant Horizon : 12 tables nappées, des allées assez larges pour les
# serveurs entre les rangs, buffet du petit-déjeuner
resto = [(x, y) for y in (-5.9, -2.3, 1.3) for x in (-14.8, -11.4, -8.0, -4.6)]
for i, (tx, ty) in enumerate(resto):
    table_set(l0, tx, ty, GF, 4, linen, navy_soft, 0.5)
    spots[f"resto-{i + 1}"] = (tx, ty - 1.15, GF, "level-0", "resto")
    rest[f"resto-{i + 1}"] = (tx + 0.85, ty, GF + 0.45, yaw_to(-1, 0))
l0.box(-16.6, -7.4, GF, -16.0, -4.6, GF + 1.0, wood, 0.04)
# Grand hall : réception, fontaine intérieure, salons, lustre, bar
# La réception à droite de l'entrée, la conciergerie à gauche, l'allée entre
# les deux ; lampes de bureau, panneau de laiton sur le linteau de la porte.
for (a, b) in ((1.0, 5.4), (8.6, 13.0)):
    l0.box(a, 12.0, GF, b, 13.2, GF + 1.15, navy, 0.1)
    l0.box(a - 0.1, 11.9, GF + 1.15, b + 0.1, 13.3, GF + 1.25, brass)
    for lx in (a + 0.7, b - 0.7):
        l0.cyl(lx, 12.85, GF + 1.25, GF + 1.3, 0.13, brass, 10)
        l0.cyl(lx, 12.85, GF + 1.3, GF + 1.62, 0.025, brass, 6)
        l0.cyl(lx, 12.85, GF + 1.58, GF + 1.8, 0.2, linen, 12, 0.13)
tall(0.5, 15.1, GF, DOOR[0], 15.7, GF + 5.2, wood_dark, 0.05)
tall(DOOR[1], 15.1, GF, 13.5, 15.7, GF + 5.2, wood_dark, 0.05)
tall(DOOR[0], 15.1, DOOR[2], DOOR[1], 15.7, GF + 5.2, wood_dark, 0.05)
l0.box(DOOR[0] + 0.2, 15.0, DOOR[2] + 0.25, DOOR[1] - 0.2, 15.1, GF + 4.9, brass, 0.05)
# Tapis d'allée bleu nuit bordé de laiton : de la porte à la fontaine, de la
# fontaine aux portes côté mer
for (y0, y1) in ((IFY + 3.8, CY1 - 0.3), (CY0 + 0.6, IFY - 3.8)):
    l0.box(5.9, y0, GF, 8.1, y1, GF + 0.02, carpet)
    for x in (5.9, 8.0):
        l0.box(x, y0, GF + 0.02, x + 0.1, y1, GF + 0.03, brass)
# Chariot à bagages du voiturier : plateau, arceau de laiton, valises
TRX, TRY = 4.2, 10.9
l0.box(TRX - 0.55, TRY - 0.35, GF + 0.12, TRX + 0.55, TRY + 0.35, GF + 0.2, carpet, 0.03)
for dx in (-0.48, 0.48):
    for dy in (-0.28, 0.28):
        l0.cyl(TRX + dx, TRY + dy, GF, GF + 0.12, 0.06, rubber, 8)
    l0.box(TRX + dx - 0.03, TRY - 0.03, GF + 0.2, TRX + dx + 0.03, TRY + 0.03, GF + 1.75, brass)
l0.box(TRX - 0.51, TRY - 0.04, GF + 1.72, TRX + 0.51, TRY + 0.04, GF + 1.8, brass)
l0.box(TRX - 0.45, TRY - 0.3, GF + 0.2, TRX + 0.1, TRY + 0.25, GF + 0.9, terracotta, 0.06)
l0.box(TRX + 0.15, TRY - 0.28, GF + 0.2, TRX + 0.45, TRY + 0.28, GF + 0.75, navy_soft, 0.05)
l0.box(TRX - 0.4, TRY - 0.25, GF + 0.9, TRX + 0.05, TRY + 0.2, GF + 1.2, car_cream, 0.05)
# Totem d'accueil près de la porte
l0.box(DOOR[0] - 0.45, 14.4, GF, DOOR[0] - 0.05, 14.65, GF + 0.08, brass)
l0.box(DOOR[0] - 0.4, 14.45, GF + 0.08, DOOR[0] - 0.1, 14.6, GF + 1.5, navy, 0.03)
l0.box(DOOR[0] - 0.36, 14.43, GF + 1.0, DOOR[0] - 0.14, 14.44, GF + 1.4, brass)
l0.cyl(IFX, IFY, GF, GF + 0.6, 3.0, marble, 20)
l0.cyl(IFX, IFY, GF + 0.35, GF + 0.62, 2.7, water, 20)
l0.cyl(IFX, IFY, GF + 0.6, GF + 1.7, 0.4, marble, 10)
l0.cyl(IFX, IFY, GF + 1.7, GF + 1.95, 1.3, marble, 14)
l0.cyl(IFX, IFY, GF + 1.85, GF + 2.0, 1.1, water, 14)
l0.ball(IFX, IFY, GF + 2.3, 0.3, brass)
for i in range(6):
    a = i * math.pi / 3
    l0.box(IFX + math.cos(a) * 3.3 - 0.4, IFY + math.sin(a) * 3.3 - 0.4, GF, IFX + math.cos(a) * 3.3 + 0.4, IFY + math.sin(a) * 3.3 + 0.4, GF + 0.6, terracotta, 0.1)
    l0.ball(IFX + math.cos(a) * 3.3, IFY + math.sin(a) * 3.3, GF + 1.0, 0.5, leaf, 8)
hi.cyl(IFX, IFY, CROOF - 1.5, CROOF - 1.35, 2.2, brass, 20)
hi.cyl(IFX, IFY, CROOF - 1.35, CROOF - 0.3, 0.05, brass, 6)
for i in range(12):
    a = i * math.pi / 6
    hi.ball(IFX + math.cos(a) * 2.2, IFY + math.sin(a) * 2.2, CROOF - 1.6, 0.16, bulb, 8)
salons = [(-0.5, -5.0), (3.2, -5.0), (10.8, -5.0), (-0.5, 9.0), (3.2, 9.0), (12.5, 8.6)]
for i, (sx, sy) in enumerate(salons):
    l0.box(sx - 1.3, sy - 0.45, GF, sx - 0.35, sy + 0.45, GF + 0.6, navy_soft if i % 2 else terracotta, 0.12)
    l0.box(sx + 0.35, sy - 0.45, GF, sx + 1.3, sy + 0.45, GF + 0.6, navy_soft if i % 2 else terracotta, 0.12)
    l0.cyl(sx, sy, GF, GF + 0.45, 0.34, brass, 12)
    l0.box(sx - 1.4, sy - 1.5, GF, sx + 1.4, sy + 1.5, GF + 0.02, carpet)
    spots[f"salon-{i + 1}"] = (sx, sy - 1.1, GF, "level-0", "salon")
    rest[f"salon-{i + 1}"] = (sx - 0.8, sy, GF + 0.6, yaw_to(1, 0))
# Bar du hall
l0.box(13.0, -6.6, GF, 14.0, 1.5, GF + 1.15, wood, 0.06)
l0.box(12.9, -6.7, GF + 1.15, 14.1, 1.6, GF + 1.25, brass)
l0.box(16.0, -6.6, GF, 16.6, 1.5, GF + 2.6, wood_dark)
for i in range(5):
    l0.cyl(12.3, -5.8 + i * 1.6, GF, GF + 0.85, 0.24, brass, 10)

# Ascenseurs vitrés : un par aile (coupés étage par étage avec la maquette)
# et celui du pavillon, qui monte au toit-terrasse.
for side, (lx0, lx1) in LIFTS.items():
    l0.box(lx0, LIFT_Y[0], G, lx1, LIFT_Y[1], GF, stone)
    glass_lift(l0, lx0, lx1, G, F1 - 0.25)
tall(14.0, 13.0, GF, 14.12, 15.7, CROOF + 2.6, lift_glass)
tall(15.6, 12.8, GF, 16.7, 12.92, CROOF + 2.6, lift_glass)
for (px, py) in [(14.06, 12.86), (15.6, 12.86), (16.7, 12.86), (14.06, 15.7)]:
    tall(px - 0.09, py - 0.09, GF, px + 0.09, py + 0.09, CROOF + 2.6, brass)
hi.box(13.8, 12.6, CROOF + 2.6, 16.9, 16.0, CROOF + 2.9, brass, 0.06)
# Le pavillon côté rue : fenêtres hautes et travée centrale en avancée
for wx in [x for x in (-15.0, -12.4, -9.8, -7.2, -4.6, -2.0, 0.6, 13.4) if not 2.0 < x < 12.0]:
    l0.box(wx - 0.6, CY1, GF + 0.9, wx + 0.6, CY1 + 0.06, GF + 3.1, slate)
    l0.box(wx - 0.7, CY1, GF + 0.8, wx + 0.7, CY1 + 0.14, GF + 0.9, brass)
    hi.box(wx - 0.6, CY1, F1 + 0.5, wx + 0.6, CY1 + 0.06, CROOF - 1.0, slate)
    hi.box(wx - 0.7, CY1, F1 + 0.4, wx + 0.7, CY1 + 0.14, F1 + 0.5, brass)
BAY = (4.5, 9.5, 17.4)
tall(BAY[0], CY1, G, BAY[0] + 0.9, BAY[2], CROOF + 0.15, plaster, 0.06)
tall(BAY[1] - 0.9, CY1, G, BAY[1], BAY[2], CROOF + 0.15, plaster, 0.06)
tall(BAY[0] + 0.9, CY1, GF + 3.9, BAY[1] - 0.9, BAY[2], CROOF + 0.15, plaster)
hi.box(BAY[0] + 1.1, BAY[2], CROOF - 3.0, BAY[1] - 1.1, BAY[2] + 0.06, CROOF - 0.8, slate)
hi.box(BAY[0] - 0.1, CY1, CROOF - 0.15, BAY[1] + 0.1, BAY[2] + 0.1, CROOF + 0.15, brass)

# Aile ouest, rez : le spa
SX0, SX1 = WINGS["w"]
l0.box(SX0, WY0, G, SX1, WY1, GF, tile, 0.05)
l0.box(SX0, WY1 - 0.2, GF, SX1, WY1, F1, plaster)
l0.box(SX0, WY0, GF, SX0 + 0.2, WY1, F1, plaster)
l0.box(SX0, WY0 - 0.05, GF, SX1, WY0 + 0.05, F1 - 0.3, glass)
for i in range(10):
    cx = SX0 + i * ROOM_W
    l0.box(cx - 0.25, WY0 - 0.25, GF, cx + 0.25, WY0 + 0.25, F1, plaster, 0.06)
wing_corners(l0, SX0, SX1, G, F1 - 0.25)
l0.box(-53, 0.5, GF - 0.1, -41, 7.0, GF + 0.05, water)
for (a, b, c, d) in [(-53.3, 0.2, -40.7, 0.5), (-53.3, 7.0, -40.7, 7.3), (-53.3, 0.5, -53, 7.0), (-41, 0.5, -40.7, 7.0)]:
    l0.box(a, b, GF, c, d, GF + 0.18, marble)


def spa_lounger(grp, x, y0, y1, z):
    """Un lit de repos tourné vers la mer (-Y), le dossier côté +Y."""
    grp.box(x - 0.38, y0, z, x + 0.38, y1, z + 0.32, linen, 0.05)
    grp.box(x - 0.38, y1 - 0.35, z + 0.32, x + 0.38, y1, z + 0.58, linen, 0.05)
    grp.box(x - 0.39, y0 + 0.1, z + 0.32, x + 0.39, y0 + 0.45, z + 0.35, navy_soft)


def towel_stacks(grp, x0, y0, x1, y1, z, shelves=3):
    """Une étagère de noyer et ses piles de serviettes roulées."""
    top = z + 0.05 + shelves * 0.5
    for (a, b) in ((y0, y0 + 0.05), (y1 - 0.05, y1)):
        grp.box(x0, a, z, x1, b, top, walnut)
    n = max(1, int((y1 - y0 - 0.1) / 0.4))
    for k in range(shelves + 1):
        zz = z + k * 0.5
        grp.box(x0, y0, zz, x1, y1, zz + 0.05, walnut)
        if k == shelves:
            break
        for j in range(n):
            cy = y0 + 0.05 + (j + 0.5) * (y1 - y0 - 0.1) / n
            for h in range(2):
                grp.box(x0 + 0.04, cy - 0.16, zz + 0.05 + h * 0.15, x1 - 0.04, cy + 0.16, zz + 0.19 + h * 0.15, canvas if (j + h) % 2 else linen, 0.05)


# Le bassin intérieur et ses lits de repos face à la mer, bancs, plantes,
# serviettes
for i in range(6):
    lx = -52 + i * 2.2
    spa_lounger(l0, lx, -1.6, -0.2, GF)
    spots[f"lit-{i + 1}"] = (lx, 0.0, GF, "level-0", "lit")
    rest[f"lit-{i + 1}"] = (lx, -1.55, GF + 0.32, 0.0)
spots["bassin"] = (-47.0, 7.8, GF, "level-0", "bassin")
rest["bassin"] = (-47.0, 7.6, GF, 0.0)
for bx in (-51.5, -42.5):
    bench(l0, bx, 9.6, GF)
for (px, py) in [(-56.0, 9.4), (-39.8, 9.4), (-56.0, -1.2)]:
    planter(l0, px, py, GF)
towel_stacks(l0, -56.75, 1.0, -56.2, 3.4, GF)
# Sauna (bois à lattes, porte vitrée) et hammam (pierre, porte bleu nuit, coupole)
SAUNA, HAMMAM = (-38.5, -34.5), (-34.0, -30.0)
l0.box(SAUNA[0], 6.0, GF, SAUNA[1], 10.2, GF + 2.8, wood, 0.08)
for k in range(1, 6):
    l0.box(SAUNA[0], 5.96, GF + k * 0.46, SAUNA[1], 6.0, GF + k * 0.46 + 0.05, wood_dark)
DX = (SAUNA[0] + SAUNA[1]) / 2
l0.box(DX - 0.55, 5.9, GF, DX + 0.55, 5.98, GF + 2.15, brass)
l0.box(DX - 0.45, 5.88, GF + 0.05, DX + 0.45, 5.92, GF + 2.05, glass)
l0.box(DX + 0.28, 5.8, GF + 0.9, DX + 0.34, 5.88, GF + 1.3, wood_dark)
l0.box(DX - 0.35, 5.93, GF + 2.3, DX + 0.35, 5.97, GF + 2.6, brass)
l0.box(HAMMAM[0], 6.0, GF, HAMMAM[1], 10.2, GF + 2.8, stone, 0.08)
HX = (HAMMAM[0] + HAMMAM[1]) / 2
for k, (w, z0, z1) in enumerate([(0.55, 0.0, 1.6), (0.45, 1.6, 1.85), (0.3, 1.85, 2.0)]):
    l0.box(HX - w, 5.9, GF + z0, HX + w, 5.98, GF + z1, navy)
    l0.box(HX - w - 0.08, 5.92, GF + z0, HX + w + 0.08, 5.99, GF + z1 + 0.06, brass)
l0.cyl(HX, 8.1, GF + 2.8, GF + 3.0, 1.5, marble, 20)
l0.ball(HX, 8.1, GF + 3.0, 1.3, marble, 16)
for a in range(6):
    ang = a * math.pi / 3
    l0.ball(HX + math.cos(ang) * 0.75, 8.1 + math.sin(ang) * 0.75, GF + 4.08, 0.09, glass, 6)
# Trois cabines de soin : table de massage, tabouret, serviettes, plante ;
# une porte sur le couloir (le nœud n-spa-cab-<n> devant)
CABINS = [-38.5 + i * 4.4 for i in range(3)]
for i, x0 in enumerate(CABINS):
    l0.box(x0, -1.6, GF, x0 + 0.15, 3.2, GF + 2.6, cream)
    l0.box(x0 + 0.15, 3.05, GF, x0 + 1.5, 3.2, GF + 2.6, cream)
    l0.box(x0 + 2.7, 3.05, GF, x0 + 4.4, 3.2, GF + 2.6, cream)
    for (lx, ly) in [(x0 + 1.15, 0.6), (x0 + 3.05, 0.6), (x0 + 1.15, 1.2), (x0 + 3.05, 1.2)]:
        l0.cyl(lx, ly, GF, GF + 0.62, 0.05, walnut, 6)
    l0.box(x0 + 1.0, 0.5, GF + 0.62, x0 + 3.2, 1.3, GF + 0.8, linen, 0.06)
    l0.box(x0 + 1.05, 0.6, GF + 0.8, x0 + 1.45, 1.2, GF + 0.88, canvas, 0.04)
    l0.cyl(x0 + 0.6, 2.2, GF, GF + 0.5, 0.2, walnut, 10)
    towel_stacks(l0, x0 + 3.85, -1.3, x0 + 4.3, 0.3, GF, 2)
    l0.cyl(x0 + 4.07, -0.5, GF + 1.05, GF + 1.15, 0.06, bulb, 8)
    l0.cyl(x0 + 3.9, 2.5, GF, GF + 0.45, 0.22, terracotta, 8, 0.28)
    l0.ball(x0 + 3.9, 2.5, GF + 0.75, 0.38, leaf, 8)
    spots[f"lit-{7 + i}"] = (x0 + 2.1, 2.2, GF, "level-0", "lit")
    rest[f"lit-{7 + i}"] = (x0 + 3.1, 0.9, GF + 0.8, yaw_to(1, 0))
l0.box(CABINS[-1] + 4.4, -1.6, GF, CABINS[-1] + 4.55, 3.2, GF + 2.6, cream)
# Coin repos près de l'ascenseur : deux lits face à la mer, table à tisanes
for i, lx in enumerate((-24.0, -22.4)):
    spa_lounger(l0, lx, -1.6, -0.2, GF)
    spots[f"lit-{10 + i}"] = (lx, 0.0, GF, "level-0", "lit")
    rest[f"lit-{10 + i}"] = (lx, -1.55, GF + 0.32, 0.0)
l0.cyl(-23.2, -1.0, GF, GF + 0.5, 0.05, brass, 6)
l0.cyl(-23.2, -1.0, GF + 0.5, GF + 0.54, 0.26, marble, 14)
l0.cyl(-23.2, -1.0, GF + 0.54, GF + 0.7, 0.07, canvas, 8)
# Accueil du spa : comptoir de bois, plateau de laiton, orchidée
l0.box(-28.0, 7.4, GF, -23.0, 8.4, GF + 1.1, wood, 0.06)
l0.box(-28.05, 7.35, GF + 1.1, -22.95, 8.45, GF + 1.16, brass)
l0.cyl(-23.6, 7.9, GF + 1.16, GF + 1.36, 0.1, linen, 8)
l0.ball(-23.6, 7.9, GF + 1.55, 0.22, lavender, 8)
planter(l0, -21.8, 9.4, GF, 0.7, False)
# Aile est, rez : salle de sport, boutique, lingerie
EX0, EX1 = WINGS["e"]
l0.box(EX0, WY0, G, EX1, WY1, GF, stone, 0.05)
l0.box(EX0, WY1 - 0.2, GF, EX1, WY1, F1, plaster)
l0.box(EX1 - 0.2, WY0, GF, EX1, WY1, F1, plaster)
l0.box(EX0, WY0 - 0.05, GF, EX1, WY0 + 0.05, F1 - 0.3, glass)
for i in range(10):
    cx = EX0 + i * ROOM_W
    l0.box(cx - 0.25, WY0 - 0.25, GF, cx + 0.25, WY0 + 0.25, F1, plaster, 0.06)
wing_corners(l0, EX0, EX1, G, F1 - 0.25)
# Parquet de chêne, tapis de caoutchouc sous les machines, miroir au mur du fond
GYM = (EX0, EX0 + 16)
l0.box(GYM[0], WY0, GF, GYM[1], WY1, GF + 0.02, oak)
l0.box(GYM[0] + 0.6, WY0 + 0.3, GF + 0.02, GYM[0] + 13.2, 1.0, GF + 0.04, rubber)
l0.box(GYM[0] + 0.6, 5.0, GF + 0.02, GYM[0] + 13.2, 7.8, GF + 0.04, rubber)
l0.box(GYM[0] + 0.3, WY1 - 0.24, GF + 0.3, GYM[1] - 0.3, WY1 - 0.2, GF + 2.7, mirror)
l0.box(GYM[0] + 0.25, WY1 - 0.27, GF + 2.7, GYM[1] - 0.25, WY1 - 0.2, GF + 2.78, brass)
# Six tapis de course : le premier rang face à la mer, le second face au miroir
for i in range(6):
    gx = GYM[0] + 2.0 + (i % 3) * 4.5
    gy, f = (-0.4, -1) if i < 3 else (6.4, 1)
    l0.box(gx - 0.5, gy - 0.95, GF, gx + 0.5, gy + 0.95, GF + 0.16, navy, 0.05)
    l0.box(gx - 0.38, gy - 0.85, GF + 0.16, gx + 0.38, gy + 0.85, GF + 0.2, slate)
    for sx in (-1, 1):
        l0.box(gx + sx * 0.44 - 0.04, gy - 0.85, GF + 0.16, gx + sx * 0.44 + 0.04, gy + 0.85, GF + 0.24, steel)
        l0.rod((gx + sx * 0.4, gy + f * 0.8, GF + 0.16), (gx + sx * 0.4, gy + f * 0.62, GF + 1.25), 0.06, steel)
        l0.rod((gx + sx * 0.4, gy + f * 0.64, GF + 1.05), (gx + sx * 0.4, gy + f * 0.2, GF + 1.05), 0.05, steel)
    l0.box(gx - 0.45, gy + f * 0.5, GF + 1.2, gx + 0.45, gy + f * 0.85, GF + 1.42, navy_soft, 0.04)
    l0.box(gx - 0.3, gy + f * 0.49, GF + 1.3, gx + 0.3, gy + f * 0.51, GF + 1.4, slate)
    spots[f"gym-{i + 1}"] = (gx, gy - f * 1.3, GF, "level-0", "gym")
    rest[f"gym-{i + 1}"] = (gx, gy - f * 0.3, GF + 0.2, yaw_to(0, f))
# Râtelier d'haltères devant le miroir
l0.box(GYM[0] + 0.8, 9.35, GF, GYM[0] + 9.2, 10.0, GF + 0.08, steel)
for z in (0.5, 0.95):
    l0.box(GYM[0] + 0.8, 9.35, GF + z - 0.04, GYM[0] + 9.2, 10.0, GF + z, steel)
    for k in range(9):
        hx = GYM[0] + 1.2 + k * 0.95
        for hy in (9.45, 9.9):
            l0.box(hx - 0.09, hy - 0.07, GF + z, hx + 0.09, hy + 0.07, GF + z + 0.16, rubber, 0.02)
        l0.rod((hx, 9.45, GF + z + 0.08), (hx, 9.9, GF + z + 0.08), 0.035, steel)
for x in (GYM[0] + 0.85, GYM[0] + 9.15):
    l0.box(x - 0.05, 9.35, GF, x + 0.05, 10.0, GF + 1.0, steel)
# Cage à squat, barre chargée, banc de musculation
CAGE = (GYM[0] + 13.4, GYM[0] + 15.4, 6.2, 8.4)
for cx in CAGE[:2]:
    for cy in CAGE[2:]:
        l0.box(cx - 0.05, cy - 0.05, GF, cx + 0.05, cy + 0.05, GF + 2.3, steel)
for cy in CAGE[2:]:
    l0.box(CAGE[0], cy - 0.05, GF + 2.25, CAGE[1], cy + 0.05, GF + 2.33, steel)
l0.box(CAGE[0] - 0.05, CAGE[2], GF, CAGE[1] + 0.05, CAGE[3], GF + 0.03, rubber)
l0.rod((CAGE[0] - 0.5, 8.4, GF + 1.4), (CAGE[1] + 0.5, 8.4, GF + 1.4), 0.04, steel)
for px in (CAGE[0] - 0.35, CAGE[1] + 0.35):
    l0.box(px - 0.05, 8.17, GF + 1.17, px + 0.05, 8.63, GF + 1.63, rubber, 0.03)
l0.box(CAGE[0] + 0.65, 6.6, GF, CAGE[0] + 1.35, 6.8, GF + 0.4, steel)
l0.box(CAGE[0] + 0.6, 6.4, GF + 0.4, CAGE[0] + 1.4, 8.0, GF + 0.52, navy, 0.05)
# Tapis de yoga, ballon, plante
for k in range(4):
    mx = GYM[0] + 12.9 + k * 0.8
    l0.box(mx - 0.3, -1.6, GF + 0.02, mx + 0.3, 0.2, GF + 0.05, navy_soft if k % 2 else terracotta)
l0.ball(GYM[0] + 15.3, 1.3, GF + 0.33, 0.33, court, 12)
planter(l0, GYM[0] + 15.4, 4.4, GF, 0.7)
# Cloisons de la boutique, avec leur porte sur le couloir (y 2,6 à 5,4)
for wx in (EX0 + 16, EX0 + 25.6):
    l0.box(wx, WY0, GF, wx + 0.2, 2.6, F1, plaster)
    l0.box(wx, 5.4, GF, wx + 0.2, WY1, F1, plaster)
for i in range(3):
    l0.box(EX0 + 17.5 + i * 2.6, 8.6, GF, EX0 + 19.5 + i * 2.6, 10.2, GF + 2.2, wood, 0.05)
l0.box(EX0 + 18.0, 1.0, GF, EX0 + 24.0, 2.4, GF + 0.9, wood, 0.06)
for i in range(4):
    l0.box(EX0 + 27.0 + i * 2.2, 8.6, GF, EX0 + 28.6 + i * 2.2, 10.2, GF + 1.3, steel, 0.05)
    l0.cyl(EX0 + 27.8 + i * 2.2, 8.5, GF + 0.4, GF + 0.95, 0.45, glass, 12)
l0.box(EX0 + 27.0, 0.0, GF, EX0 + 34.5, 1.2, GF + 2.4, wood_dark, 0.04)
l0.finish()
hi.finish()


# ── Étages des ailes : 36 chambres par étage ────────────────────────────
rooms = []
for f in range(1, FLOORS + 1):
    z = F1 + (f - 1) * FLOOR_H
    lv = levels[f"level-{f}"]
    m = Group(f"level-{f}-mesh", lv)
    for side, (x0w, x1w) in WINGS.items():
        m.box(x0w, WY0 - 1.1, z - 0.25, x1w, WY1, z + 0.2, plaster, 0.14)
        m.box(x0w, CORR0, z + 0.2, x1w, CORR1, z + 0.24, carpet)
        m.box(x0w, WY1 - 0.2, z + 0.2, x1w, WY1, z + FLOOR_H - 0.25, plaster)
        outer = x0w if side == "w" else x1w - 0.2
        m.box(outer, WY0, z + 0.2, outer + 0.2, WY1, z + FLOOR_H - 0.25, plaster)
        m.box(x0w, WY0 - 1.1, z + 0.2, x1w, WY0 - 1.0, z + 1.1, glass)
        m.box(x0w, WY0 - 1.15, z + 1.1, x1w, WY0 - 0.95, z + 1.18, brass)
        m.box(x0w + 0.2, WY0 - 0.04, z + 0.2, x1w - 0.2, WY0 + 0.04, z + FLOOR_H - 0.3, glass)
        wing_corners(m, x0w, x1w, z - 0.25, z + FLOOR_H - 0.25)
        for k in range(1, ROOMS_PER_SIDE):
            fx = x0w + k * ROOM_W
            m.box(fx - 0.09, WY0 - 1.1, z + 0.2, fx + 0.09, WY0 - 0.04, z + FLOOR_H - 0.25, plaster)
        base = 0 if side == "w" else 2 * ROOMS_PER_SIDE
        for k in range(ROOMS_PER_SIDE):
            rx0 = x0w + k * ROOM_W
            dx = rx0 + 3.0
            for back in (False, True):
                n = f"{f}{base + k + 1 + (ROOMS_PER_SIDE if back else 0):02d}"
                ya, yb = (CORR1, WY1) if back else (WY0, CORR0)
                rooms.append((n, rx0, ya, yb, z, lv))
                if k > 0:
                    m.box(rx0 - 0.08, ya, z + 0.2, rx0 + 0.08, yb, z + FLOOR_H - 0.25, plaster)
                wall_y = (CORR1, CORR1 + 0.15) if back else (CORR0 - 0.15, CORR0)
                m.box(rx0, wall_y[0], z + 0.2, rx0 + 2.6, wall_y[1], z + FLOOR_H - 0.25, plaster)
                m.box(rx0 + 3.4, wall_y[0], z + 0.2, rx0 + ROOM_W, wall_y[1], z + FLOOR_H - 0.25, plaster)
                head = (WY1 - 0.5, WY1 - 0.2) if back else (CORR0 - 0.45, CORR0 - 0.15)
                bed = (head[0] - 2.0, head[0])
                m.box(rx0 + 0.5, bed[0], z + 0.24, rx0 + 2.3, bed[1], z + 0.62, linen, 0.06)
                m.box(rx0 + 0.5, bed[0], z + 0.62, rx0 + 2.3, bed[0] + 0.7, z + 0.68, navy_soft if (k + f) % 2 else terracotta)
                m.box(rx0 + 0.4, head[0], z + 0.24, rx0 + 2.4, head[1], z + 1.3, wood)
                m.box(rx0 + 0.5, bed[1] - 0.55, z + 0.62, rx0 + 2.3, bed[1] - 0.15, z + 0.8, linen)
                m.box(rx0 + 2.5, head[0] - 0.5, z + 0.24, rx0 + 2.9, head[0], z + 0.7, wood_dark)
                m.cyl(rx0 + 2.7, head[0] - 0.25, z + 0.7, z + 0.96, 0.05, brass, 6)
                m.cyl(rx0 + 2.7, head[0] - 0.25, z + 0.92, z + 1.12, 0.15, linen, 8, 0.1)
                if not back:
                    m.box(rx0 + 2.6, WY0 + 0.3, z + 0.24, rx0 + 3.4, WY0 + 1.1, z + 0.7, navy_soft)
                    m.box(rx0 + 0.6, WY0 - 0.95, z + 0.2, rx0 + 1.2, WY0 - 0.15, z + 0.42, canvas)
                    m.box(rx0 + 1.5, WY0 - 0.95, z + 0.2, rx0 + 2.1, WY0 - 0.15, z + 0.42, canvas)
                    m.cyl(rx0 + 3.3, WY0 - 0.55, z + 0.2, z + 0.62, 0.24, terracotta, 8, 0.3)
                    m.ball(rx0 + 3.3, WY0 - 0.55, z + 0.85, 0.34, leaf, 6)
                door_y = CORR1 + 0.35 if back else CORR0 - 0.35
                spots[f"door-{n}"] = (dx, door_y, z + 0.24, f"level-{f}", "door")
        # Office des étages, près de l'ascenseur
        ox = x1w - 1.4 if side == "w" else x0w + 0.6
        m.box(ox, CORR1 + 0.05, z + 0.24, ox + 0.8, CORR1 + 0.6, z + 1.0, navy, 0.04)
    # Paliers des ascenseurs
    for side, (lx0, lx1) in LIFTS.items():
        m.box(lx0, LIFT_Y[0], z - 0.25, lx1, LIFT_Y[1], z + 0.2, stone)
        glass_lift(m, lx0, lx1, z - 0.25, z + FLOOR_H - 0.25)
    m.finish()

for n, rx0, ya, yb, z, lv in rooms:
    t = Group(f"room-{n}", lv)
    t.box(rx0 + 0.1, ya + 0.1, z + 0.2, rx0 + ROOM_W - 0.1, yb - 0.1, z + 0.235, room_floor)
    t.finish()


# ── Toits : ailes et toit-terrasse du pavillon ──────────────────────────
r = Group("level-roof-mesh", levels["level-roof"])
# Ailes : corniche saillante sur un liseré de laiton, acrotère, attique en
# gradins d'ardoise ; têtes des ascenseurs vitrés avec leur cabine.
for side, (x0w, x1w) in WINGS.items():
    ya, yb = WY0 - 1.3, WY1 + 0.2
    r.box(x0w - 0.35, ya - 0.15, WROOF - 0.42, x1w + 0.35, yb + 0.15, WROOF - 0.25, brass)
    r.box(x0w - 0.45, ya - 0.25, WROOF - 0.25, x1w + 0.45, yb + 0.25, WROOF + 0.15, plaster, 0.1)
    for (a, b, c, d) in [(x0w - 0.3, ya - 0.1, x1w + 0.3, ya + 0.3), (x0w - 0.3, yb - 0.3, x1w + 0.3, yb + 0.1),
                         (x0w - 0.3, ya - 0.1, x0w + 0.1, yb + 0.1), (x1w - 0.1, ya - 0.1, x1w + 0.3, yb + 0.1)]:
        r.box(a, b, WROOF + 0.15, c, d, WROOF + 0.8, plaster, 0.04)
        r.box(a - 0.03, b - 0.03, WROOF + 0.8, c + 0.03, d + 0.03, WROOF + 0.88, brass)
    r.box(x0w + 0.9, ya + 1.0, WROOF + 0.15, x1w - 0.9, yb - 1.0, WROOF + 0.85, zinc, 0.12)
    r.box(x0w + 1.7, ya + 1.8, WROOF + 0.85, x1w - 1.7, yb - 1.8, WROOF + 1.45, zinc, 0.12)
    r.box(x0w + 1.6, ya + 1.7, WROOF + 0.82, x1w - 1.6, yb - 1.7, WROOF + 0.88, brass)
    for i in range(3):
        px = x0w + 7 + i * 10.0
        r.box(px, 4.0, WROOF + 1.45, px + 2.4, 6.4, WROOF + 2.1, steel, 0.08)
for side, (lx0, lx1) in LIFTS.items():
    glass_lift(r, lx0, lx1, WROOF - 0.25, WROOF + 2.6)
    r.box(lx0 + 0.5, LIFT_Y[0] + 0.4, WROOF + 0.2, lx1 - 0.5, LIFT_Y[1] - 0.4, WROOF + 2.3, cream, 0.05)
    r.box(lx0 + 0.45, LIFT_Y[0] + 0.35, WROOF + 2.3, lx1 - 0.45, LIFT_Y[1] - 0.35, WROOF + 2.4, brass)
    r.box(lx0 - 0.15, LIFT_Y[0] - 0.3, WROOF + 2.6, lx1 + 0.15, LIFT_Y[1] + 0.3, WROOF + 2.9, brass, 0.06)
    r.box(lx0, LIFT_Y[0] - 0.15, WROOF + 2.9, lx1, LIFT_Y[1] + 0.15, WROOF + 3.0, slate)
# Toit-terrasse : le bar du soir
r.box(CX0 - 0.2, CY0 - 0.2, CROOF - 0.25, CX1 + 0.2, CY1 + 0.2, CROOF + 0.15, plaster, 0.1)
r.box(CX0 + 0.6, CY0 + 0.4, CROOF + 0.15, CX1 - 0.6, CY1 - 0.4, CROOF + 0.25, walnut)
for i in range(int(CY1 - CY0 - 0.8)):
    if i % 2:
        r.box(CX0 + 0.6, CY0 + 0.4 + i, CROOF + 0.25, CX1 - 0.6, CY0 + 0.9 + i, CROOF + 0.256, walnut_light)
for (a, b, c, d) in [(CX0, CY0 - 0.1, CX1, CY0 + 0.1), (CX0, CY1 - 0.1, CX1, CY1 + 0.1), (CX0 - 0.1, CY0, CX0 + 0.1, CY1), (CX1 - 0.1, CY0, CX1 + 0.1, CY1)]:
    r.box(a, b, CROOF + 0.15, c, d, CROOF + 1.1, glass)
r.box(CX0, CY0 - 0.15, CROOF + 1.1, CX1, CY0 + 0.15, CROOF + 1.18, brass)
r.box(4.0, 10.0, CROOF + 0.25, 12.0, 11.2, CROOF + 1.3, navy, 0.08)
r.box(3.9, 9.9, CROOF + 1.3, 12.1, 11.3, CROOF + 1.38, brass)
for (px, py) in [(3.0, 9.4), (12.4, 9.4), (3.0, 12.3), (12.4, 12.3)]:
    r.box(px - 0.14, py - 0.14, CROOF + 0.25, px + 0.14, py + 0.14, CROOF + 3.0, walnut)
r.box(2.8, 9.2, CROOF + 2.85, 12.6, 9.6, CROOF + 3.0, walnut)
r.box(2.8, 12.1, CROOF + 2.85, 12.6, 12.5, CROOF + 3.0, walnut)
for i in range(10):
    r.box(2.9 + i, 9.0, CROOF + 3.0, 3.1 + i, 12.4, CROOF + 3.12, walnut)
# La tour du belvédère, au-dessus de l'entrée : coupole d'ardoise et lanterne
TX, TY = (BAY[0] + BAY[1]) / 2, (12.4 + BAY[2]) / 2
r.box(BAY[0], 12.4, CROOF - 0.25, BAY[1], BAY[2], CROOF + 5.6, plaster, 0.08)
r.box(BAY[0] - 0.08, 12.32, CROOF + 0.9, BAY[1] + 0.08, BAY[2] + 0.08, CROOF + 1.05, brass)
for k in (-1, 1):
    for (wa, wb) in ((-1.2, -0.25), (0.25, 1.2)):
        r.box(TX + wa, TY + k * 2.5 - 0.04, CROOF + 1.6, TX + wb, TY + k * 2.5 + 0.04, CROOF + 4.7, slate)
        r.box(TX + k * 2.5 - 0.04, TY + wa, CROOF + 1.6, TX + k * 2.5 + 0.04, TY + wb, CROOF + 4.7, slate)
r.box(BAY[0] - 0.05, 12.35, CROOF + 5.4, BAY[1] + 0.05, BAY[2] + 0.05, CROOF + 5.6, brass)
r.box(BAY[0] - 0.25, 12.15, CROOF + 5.6, BAY[1] + 0.25, BAY[2] + 0.25, CROOF + 5.85, plaster, 0.06)
r.cyl(TX, TY, CROOF + 5.85, CROOF + 6.7, 2.0, plaster, 24)
r.cyl(TX, TY, CROOF + 6.6, CROOF + 6.75, 2.08, brass, 24)
r.ball(TX, TY, CROOF + 6.7, 2.0, slate, 20)
r.cyl(TX, TY, CROOF + 8.55, CROOF + 9.25, 0.42, plaster, 10)
r.cyl(TX, TY, CROOF + 9.25, CROOF + 9.4, 0.55, brass, 12)
r.ball(TX, TY, CROOF + 9.65, 0.24, brass, 10)
r.cyl(TX, TY, CROOF + 9.8, CROOF + 10.5, 0.05, brass, 6, 0.01)
rooftop_tables = [(x, y) for y in (-5.0, -1.0, 3.0) for x in (-13.0, -8.5, -4.0, 0.5)]
for i, (tx, ty) in enumerate(rooftop_tables):
    table_set(r, tx, ty, CROOF + 0.25, 2, marble, navy)
    if i % 2 == 0:
        parasol(r, tx, ty, CROOF + 0.25, canvas, 2.6, 1.3)
    spots[f"table-{i + 1}"] = (tx, ty - 0.95, CROOF + 0.25, "level-roof", "table")
    rest[f"table-{i + 1}"] = (tx + 0.9, ty, CROOF + 0.7, yaw_to(-1, 0))
# Guirlandes au-dessus des tables, entre les rangs : mâts, fil en chaînette,
# ampoules suspendues
STRING_TOP, STRING_SAG, STRING_STEP = CROOF + 3.35, 0.35, 8
for sy in (-3.0, 1.0):
    poles = (-15.8, -6.9, 2.0)
    for px in poles:
        r.cyl(px, sy, CROOF + 0.25, STRING_TOP + 0.05, 0.06, navy, 8)
        r.ball(px, sy, STRING_TOP + 0.1, 0.09, brass, 8)
    for a, b in zip(poles, poles[1:]):
        pts = [(a + (b - a) * k / STRING_STEP, sy, STRING_TOP - STRING_SAG * 4 * (k / STRING_STEP) * (1 - k / STRING_STEP)) for k in range(STRING_STEP + 1)]
        for p0, p1 in zip(pts, pts[1:]):
            r.rod(p0, p1, 0.025, navy)
        for (bx, by, bz) in pts[1:-1]:
            r.box(bx - 0.01, by - 0.01, bz - 0.12, bx + 0.01, by + 0.01, bz, navy)
            r.ball(bx, by, bz - 0.18, 0.08, bulb, 6)
for px in (-15.6, -10.75, -6.25, -1.75, 2.75):
    planter(r, px, -7.0, CROOF + 0.25)
for (px, py) in [(-15.6, 14.9), (-15.6, 9.0), (15.6, -7.0), (15.6, 2.5)]:
    planter(r, px, py, CROOF + 0.25)
# Côté rue du toit-terrasse : lits de jour bleu nuit entre des oliviers en bac,
# jardinière de lavande le long du garde-corps
for i, dx in enumerate((-14.2, -10.4, -6.6, -2.8)):
    r.box(dx - 1.0, 12.4, CROOF + 0.25, dx + 1.0, 14.6, CROOF + 0.5, walnut, 0.05)
    r.box(dx - 0.92, 12.5, CROOF + 0.5, dx + 0.92, 14.5, CROOF + 0.66, navy, 0.08)
    r.box(dx - 0.92, 14.1, CROOF + 0.66, dx + 0.92, 14.5, CROOF + 0.95, canvas, 0.08)
    parasol(r, dx + 1.9, 13.4, CROOF + 0.25, canvas, 2.6, 1.2)
r.box(CX0 + 0.7, 15.0, CROOF + 0.25, 1.6, 15.5, CROOF + 0.7, walnut, 0.04)
r.box(CX0 + 0.8, 15.05, CROOF + 0.7, 1.5, 15.45, CROOF + 1.05, lavender, 0.15)
# Salons du toit-terrasse : canapés bleu nuit, tables basses de marbre
for sx in (7.0, 12.6):
    for sy, back in ((-5.6, -1), (-1.6, 1)):
        r.box(sx - 2.0, sy - 0.5, CROOF + 0.25, sx + 2.0, sy + 0.5, CROOF + 0.55, canvas, 0.06)
        r.box(sx - 1.9, sy - 0.42, CROOF + 0.55, sx + 1.9, sy + 0.42, CROOF + 0.72, navy, 0.08)
        r.box(sx - 2.0, sy + back * 0.5 - 0.15, CROOF + 0.25, sx + 2.0, sy + back * 0.5 + 0.15, CROOF + 1.05, navy, 0.08)
    r.box(sx - 1.0, -4.0, CROOF + 0.25, sx + 1.0, -3.2, CROOF + 0.6, marble, 0.05)
    parasol(r, sx + 2.6, -3.6, CROOF + 0.25, canvas, 2.8, 1.6)
r.finish()

# Enseignes
for name, x, y, z, size in [("sign", 0.0, CY0 - 0.35, CROOF + 1.25, 2.1), ("sign-rue", 7.0, 21.12, CANOPY + 0.42, 0.78)]:
    curve = bpy.data.curves.new(name, type="FONT")
    curve.body = "LE GRAND LARGE"
    curve.size = size
    curve.extrude = 0.08
    curve.align_x = "CENTER"
    txt = bpy.data.objects.new(name + "-text", curve)
    coll.objects.link(txt)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(txt.evaluated_get(depsgraph))
    bpy.data.objects.remove(txt, do_unlink=True)
    me.materials.append(brass)
    sign = bpy.data.objects.new(name, me)
    coll.objects.link(sign)
    sign.location = (x, y, z)
    sign.rotation_euler = (math.pi / 2, 0, 0 if name == "sign" else math.pi)
    sign.parent = levels["level-roof" if name == "sign" else "level-0"]


# ── Navigation ──────────────────────────────────────────────────────────
nodes = {}
links = {}


def node(name, x, y, z, level="level-0", spot=""):
    nodes[name] = (x, y, z, level, spot)
    links.setdefault(name, set())


def link(a, b):
    links[a].add(b)
    links[b].add(a)


def chain(*names):
    for a, b in zip(names, names[1:]):
        link(a, b)


def attach(spot_name, candidates):
    x, y, z, level, kind = spots[spot_name]
    node(spot_name, x, y, z, level, kind)
    best = min(candidates, key=lambda c: (nodes[c][0] - x) ** 2 + (nodes[c][1] - y) ** 2 + 4 * (nodes[c][2] - z) ** 2)
    link(spot_name, best)


# Rue, cour d'honneur, entrée
node("n-gate", -8.0, 45.0, G, spot="spawn")
node("n-drive-1", -8.0, 36.0, G)
for a in range(8):
    ang = a * math.pi / 4
    node(f"n-court-{a}", FX + math.cos(ang) * 6.6, FY + math.sin(ang) * 6.6, G)
for a in range(8):
    link(f"n-court-{a}", f"n-court-{(a + 1) % 8}")
link("n-gate", "n-drive-1")
link("n-drive-1", "n-court-4")
node("n-porch", 7.0, 18.5, G)
link("n-porch", "n-court-6")
node("n-entrance", 7.0, 15.2, GF)
link("n-porch", "n-entrance")
node("n-parking", 31.0, 30.0, G)
link("n-parking", "n-court-0")
# Grand hall
node("n-hall", 7.0, 9.6, GF)
node("accueil", 10.8, 11.1, GF, spot="accueil")
rest["accueil"] = (10.8, 11.1, GF, math.pi)
node("n-desk-side", 13.4, 13.9, GF)
node("hub-reception", 10.8, 14.1, GF, spot="hub")
rest["hub-reception"] = (10.8, 14.1, GF, 0.0)
node("n-hall-w", -1.6, 6.5, GF)
node("n-hall-e", 13.0, 6.5, GF)
node("n-hall-s", 7.0, -2.0, GF)
node("n-hall-sw", -1.6, -2.0, GF)
node("n-hall-se", 11.2, -2.6, GF)
node("n-bar-end", 14.8, 2.6, GF)
node("hub-lobby", 15.0, -2.4, GF, spot="hub")
rest["hub-lobby"] = (15.0, -2.4, GF, yaw_to(-1, 0))
node("n-doors", 7.0, -7.4, GF)
chain("n-entrance", "n-hall", "accueil")
chain("n-hall-e", "n-desk-side", "hub-reception")
chain("n-hall", "n-hall-w", "n-hall-sw", "n-hall-s", "n-hall-se", "n-hall-e", "n-hall")
chain("n-hall-s", "n-doors")
chain("n-hall-e", "n-bar-end", "hub-lobby")
# Ascenseur du pavillon (toit-terrasse)
node("n-lift-c-0", 15.3, 14.3, GF)
link("n-lift-c-0", "n-hall-e")
# Restaurant et cuisine
node("n-resto-door", -3.1, 0.25, GF)
link("n-resto-door", "n-hall-sw")
node("n-resto", -10.0, -1.0, GF)
node("n-resto-n", -10.0, 2.4, GF)
node("n-resto-s", -10.0, -7.2, GF)
chain("n-resto-door", "n-resto", "n-resto-n")
link("n-resto", "n-resto-s")
node("hub-restaurant", -8.0, 3.2, GF, spot="hub")
link("hub-restaurant", "n-resto-n")
node("hub-room-service", -8.0, 4.9, GF, spot="hub")
link("hub-room-service", "hub-restaurant")
node("n-kitchen", -10.0, 11.0, GF)
link("n-kitchen", "hub-room-service")
node("hub-cuisine", -12.0, 11.0, GF, spot="hub")
link("hub-cuisine", "n-kitchen")
node("n-resto-w", -15.5, 3.4, GF)
link("n-resto-n", "n-resto-w")
for i in range(1, 13):
    attach(f"resto-{i}", ["n-resto", "n-resto-n", "n-resto-s"])
for i in range(1, 6):
    attach(f"station-{i}", ["n-kitchen", "hub-cuisine"])
for i in range(1, 7):
    attach(f"salon-{i}", ["n-hall", "n-hall-w", "n-hall-e", "n-hall-s", "n-hall-sw", "n-hall-se"])
# Couloirs du rez vers les ailes
for side, (lx0, lx1) in LIFTS.items():
    sign_x = -1 if side == "w" else 1
    inner = CX0 if side == "w" else CX1
    node(f"n-link-{side}", inner + sign_x * 0.4, 3.5 if side == "w" else 4.5, GF)
    if side == "e":
        link("n-link-e", "n-hall-e")
    node(f"n-lift-{side}-0", (lx0 + lx1) / 2, 4.5, GF)
    link(f"n-link-{side}", f"n-lift-{side}-0")
link("n-resto-w", "n-link-w")
# Spa (aile ouest)
node("n-spa", -26.0, 4.5, GF)
link("n-spa", "n-lift-w-0")
node("hub-spa", -25.5, 6.8, GF, spot="hub")
link("hub-spa", "n-spa")
node("n-spa-pool", -40.0, 4.0, GF)
node("n-spa-w", -55.0, 4.0, GF)
chain("n-spa", "n-spa-pool", "n-spa-w")
node("n-spa-lits", -46.0, 0.0, GF)
link("n-spa-lits", "n-spa-pool")
attach("bassin", ["n-spa-pool", "n-spa-w"])
for i in range(1, 7):
    attach(f"lit-{i}", ["n-spa-lits", "n-spa-pool", "n-spa-w"])
# Le couloir des cabines de soin, le coin repos
prev = "n-spa-pool"
for i, x0 in enumerate(CABINS):
    node(f"n-spa-cab-{i + 1}", x0 + 2.1, 4.4, GF)
    link(prev, f"n-spa-cab-{i + 1}")
    attach(f"lit-{7 + i}", [f"n-spa-cab-{i + 1}"])
    prev = f"n-spa-cab-{i + 1}"
link(prev, "n-spa")
node("n-spa-repos", -23.2, 2.0, GF)
link("n-spa-repos", "n-spa")
for i in (10, 11):
    attach(f"lit-{i}", ["n-spa-repos"])
# Salle de sport, boutique, lingerie (aile est)
node("n-east", 25.0, 4.0, GF)
link("n-east", "n-lift-e-0")
node("n-gym", 28.0, 3.0, GF)
link("n-gym", "n-east")
node("n-boutique", 42.0, 3.6, GF)
link("n-boutique", "n-east")
node("hub-lingerie", 52.0, 4.6, GF, spot="hub")
link("hub-lingerie", "n-boutique")
for i in range(1, 7):
    attach(f"gym-{i}", ["n-gym"])
# La terrasse, la piscine, la plage
node("n-terrace", 7.0, -10.0, G)
link("n-terrace", "n-doors")
pool_cols = [-12.5, -5.0, 2.5, 10.0, 20.6]
for i, x in enumerate(pool_cols):
    node(f"n-pn-{i}", x, -13.1, G)
    node(f"n-ps-{i}", x, -30.9, G)
    if i:
        link(f"n-pn-{i - 1}", f"n-pn-{i}")
        link(f"n-ps-{i - 1}", f"n-ps-{i}")
link("n-pn-0", "n-ps-0")
link("n-pn-4", "n-ps-4")
link("n-terrace", "n-pn-3")
node("n-terrace-w", -18.0, -11.0, G)
node("n-terrace-e", 24.0, -11.0, G)
chain("n-terrace-w", "n-terrace", "n-terrace-e")
link("n-terrace-w", "n-pn-0")
link("n-terrace-e", "n-pn-4")
node("hub-piscine", 27.0, -18.6, G, spot="hub")
link("hub-piscine", "n-terrace-e")
for i in range(1, 9):
    attach(f"nage-{i}", [f"n-ps-{c}" for c in range(5)] + [f"n-pn-{c}" for c in range(5)])
for i in range(1, 31):
    x, y = spots[f"transat-{i}"][:2]
    attach(f"transat-{i}", [f"n-ps-{c}" for c in range(5)] if y < -22 else [f"n-pn-{c}" for c in range(5)])
for i in range(1, 7):
    attach(f"terrasse-{i}", ["n-terrace-w"])
node("n-tennis", -46.0, -9.8, G)
chain("n-terrace-w", "n-tennis")
node("n-tennis-s", -36.5, -30.5, G)
node("n-tennis-e", -36.1, -10.2, G)
chain("n-tennis", "n-tennis-e", "n-tennis-s")
link("n-terrace-w", "n-tennis-e")
attach("tennis-1", ["n-tennis-s"])
attach("tennis-2", ["n-tennis"])
for i in range(12, 16):
    attach(f"lit-{i}", ["n-tennis"])
beach_x = [-48.0, -36.0, -24.0, -12.0, 0.0, 12.0, 24.0, 36.0, 48.0]
for i, x in enumerate(beach_x):
    node(f"n-beach-{i}", x, -36.5, 0.45)
    if i:
        link(f"n-beach-{i - 1}", f"n-beach-{i}")
link("n-ps-0", "n-beach-3")
link("n-ps-2", "n-beach-4")
link("n-ps-4", "n-beach-6")
link("n-tennis-s", "n-beach-1")
node("hub-plage", 48.6, -36.0, 0.45, spot="hub")
link("hub-plage", "n-beach-8")
for i in range(1, 13):
    attach(f"cabane-{i}", [f"n-beach-{c}" for c in range(9)])
node("n-ponton", -30.0, -46.5, 0.75)
link("n-ponton", "n-beach-2")
attach("ponton-2", ["n-ponton"])
node("ponton-1", *spots["ponton-1"][:3], level="level-0", spot="ponton")
link("ponton-1", "ponton-2")
for i in range(1, 7):
    attach(f"fontaine-{i}", [f"n-court-{a}" for a in range(8)])

# Les étages
for f in range(1, FLOORS + 1):
    z = F1 + (f - 1) * FLOOR_H + 0.24
    lv = f"level-{f}"
    for side, (x0w, x1w) in WINGS.items():
        lx0, lx1 = LIFTS[side]
        node(f"n-lift-{side}-{f}", (lx0 + lx1) / 2, 4.5, z, lv)
        link(f"n-lift-{side}-{f - 1}", f"n-lift-{side}-{f}")
        base = 0 if side == "w" else 2 * ROOMS_PER_SIDE
        order = range(ROOMS_PER_SIDE - 1, -1, -1) if side == "w" else range(ROOMS_PER_SIDE)
        prev = f"n-lift-{side}-{f}"
        if side == "w":
            node(f"hub-{f}", x1w - 0.4, 4.25, z, lv, "hub")
            link(prev, f"hub-{f}")
            prev = f"hub-{f}"
        for k in order:
            cx = x0w + k * ROOM_W + 3.0
            nm = f"n-corr-{side}-{f}-{k + 1}"
            node(nm, cx, 4.25, z, lv)
            link(prev, nm)
            prev = nm
            for num in (base + k + 1, base + k + 1 + ROOMS_PER_SIDE):
                dn = f"door-{f}{num:02d}"
                x, y, dz, dl, kind = spots[dn]
                node(dn, x, y, dz, dl, kind)
                link(dn, nm)

# Le toit-terrasse
zr = CROOF + 0.25
node("n-lift-c-r", 15.3, 14.3, zr, "level-roof")
link("n-lift-c-0", "n-lift-c-r")
node("n-roof-e", 13.0, 6.0, zr, "level-roof")
node("n-roof-c", -2.0, 6.0, zr, "level-roof")
node("n-roof-w", -13.0, 6.0, zr, "level-roof")
chain("n-lift-c-r", "n-roof-e", "n-roof-c", "n-roof-w")
node("n-roof-bar", 13.0, 11.9, zr, "level-roof")
node("hub-rooftop", 8.0, 11.9, zr, "level-roof", "hub")
rest["hub-rooftop"] = (8.0, 11.9, zr, 0.0)
chain("n-roof-e", "n-roof-bar", "hub-rooftop")
for i in range(1, 13):
    attach(f"table-{i}", ["n-roof-e", "n-roof-c", "n-roof-w"])

patrols = {
    "hub-piscine": ["n-pn-1", "n-pn-3", "n-ps-2", "n-ps-4", "n-terrace-e"],
    "hub-plage": ["n-beach-5", "n-beach-6", "n-beach-7", "n-beach-8"],
    "hub-restaurant": ["n-resto", "n-resto-s", "n-resto-n", "n-terrace-w"],
    "hub-cuisine": [f"station-{i}" for i in range(1, 6)],
    "hub-lobby": ["n-hall-se", "n-hall-s", "n-bar-end"],
    "hub-rooftop": ["n-roof-c", "n-roof-w", "n-roof-e"],
    "hub-spa": ["n-spa-pool", "n-spa-lits", "n-spa-cab-2", "n-spa"],
    "hub-reception": ["n-porch", "n-hall"],
    **{f"hub-{f}": [f"n-corr-w-{f}-{k}" for k in (2, 5, 8)] for f in range(1, FLOORS + 1)},
}
for name, (x, y, z, level, kind) in nodes.items():
    extras = {"links": ",".join(sorted(links[name])), "level": level}
    if kind:
        extras["spot"] = kind
    if name in patrols:
        extras["patrol"] = ",".join(patrols[name])
    empty(name, (x, y, z), nav_root, **extras)
rest_root = empty("rest")
for name, (x, y, z, yaw) in rest.items():
    empty(f"rest-{name}", (x, y, z), rest_root, yaw=yaw)

# Points de vue des boutons « Aller à » : la cible de la caméra, sa distance
# (`dist`, en mètres) et l'étage à montrer (`level`).
poi_root = empty("poi")
for name, x, y, z, dist, level in [
    ("hall", 6.0, 3.0, GF, 34.0, "level-0"),
    ("restaurant", -10.0, -2.5, GF, 28.0, "level-0"),
    ("cuisine", -10.0, 10.0, GF, 24.0, "level-0"),
    ("spa", -39.0, 4.25, GF, 34.0, "level-0"),
    ("sport", 29.0, 4.0, GF, 24.0, "level-0"),
    ("piscine", 2.0, -21.0, G, 52.0, "level-roof"),
    ("plage", 0.0, -42.0, 0.45, 72.0, "level-roof"),
    ("rooftop", 0.0, 4.0, CROOF + 0.25, 42.0, "level-roof"),
    ("chambres", -39.0, 4.25, F1 + FLOOR_H + 0.24, 50.0, "level-2"),
    ("cour", 7.0, 28.0, G, 52.0, "level-roof"),
]:
    empty(f"poi-{name}", (x, y, z), poi_root, dist=dist, level=level)

print("objects", len(bpy.data.objects), "rooms", len(rooms), "nodes", len(nodes))

"""
Les figurines du Grand Large : un jeu de pièces articulées, en blocs de jouet
comme l'hôtel. Chaque pièce a son origine sur son articulation (hanche, genou,
épaule, coude, cou) pour que Three.js les fasse marcher, s'asseoir, s'allonger,
nager, porter un plateau.

Les matériaux portent un rôle, pas une couleur : top, bottom, skin, shoe,
hair, eye, shine, trim, accent. Le moteur les recolore figurine par figurine
(tenues de l'équipe, maillots, peignoirs, tenues d'été) ; eye (les yeux, le
sourire, la poêle) et shine (le reflet des yeux) gardent la même couleur pour
tous.

Exporte frontend/public/hotels/demo/figures.glb (ou le chemin de la variable
d'environnement FIGURES_GLB). Face à -Y (Blender), donc face à +Z dans
Three.js. À lancer dans Blender (`blender -b -P build_figures.py`).
"""

import math
import os
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

OUT = os.environ.get("FIGURES_GLB") or str(Path(__file__).resolve().parents[2] / "frontend/public/hotels/demo/figures.glb")

for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob, do_unlink=True)
for block in (bpy.data.meshes, bpy.data.materials, bpy.data.curves):
    for item in list(block):
        block.remove(item)
coll = bpy.context.scene.collection

SMOOTH_ANGLE = math.radians(50)
ROLES = {"top": "#2c3560", "bottom": "#f4efe6", "skin": "#e9c3a0", "shoe": "#3b3f4a", "hair": "#5a3a22", "eye": "#15151c", "shine": "#ffffff", "trim": "#fbf8f2", "accent": "#c9a05a"}
MATS = {}
for name, hex_ in ROLES.items():
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    h = hex_.lstrip("#")
    lin = []
    for i in (0, 2, 4):
        c = int(h[i : i + 2], 16) / 255
        lin.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    b.inputs["Base Color"].default_value = (*lin, 1)
    b.inputs["Roughness"].default_value = 0.2 if name == "eye" else 0.5
    MATS[name] = m


class Part:
    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.mats = []

    def _set(self, verts, role, bevel, segments=2):
        m = MATS[role]
        if m not in self.mats:
            self.mats.append(m)
        idx = self.mats.index(m)
        for f in {f for v in verts for f in v.link_faces}:
            f.material_index = idx
        if bevel:
            edges = list({e for v in verts for e in v.link_edges})
            bmesh.ops.bevel(self.bm, geom=list(verts) + edges, offset=bevel, segments=segments, profile=0.5, affect="EDGES", material=idx, clamp_overlap=True)

    def box(self, x0, y0, z0, x1, y1, z1, role, bevel=0.0, segments=2):
        verts = bmesh.ops.create_cube(self.bm, size=1.0)["verts"]
        c = Vector(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
        for v in verts:
            v.co = Vector((v.co.x * (x1 - x0), v.co.y * (y1 - y0), v.co.z * (z1 - z0))) + c
        self._set(verts, role, min(bevel, (x1 - x0) * 0.3, (y1 - y0) * 0.3, (z1 - z0) * 0.3) if bevel else 0, segments)

    def cyl(self, x, y, z0, z1, r, role, seg=16, r2=None):
        verts = bmesh.ops.create_cone(self.bm, cap_ends=True, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=z1 - z0)["verts"]
        for v in verts:
            v.co += Vector((x, y, (z0 + z1) / 2))
        self._set(verts, role, 0)

    def ball(self, x, y, z, r, role, seg=12):
        verts = bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=seg // 2 + 1, radius=r)["verts"]
        for v in verts:
            v.co += Vector((x, y, z))
        self._set(verts, role, 0)

    def finish(self):
        me = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.mats:
            me.materials.append(m)
        # Arêtes biseautées lissées, faces planes : un jouet moulé, pas des facettes.
        for p in me.polygons:
            p.use_smooth = True
        me.use_auto_smooth = True
        me.auto_smooth_angle = SMOOTH_ANGLE
        ob = bpy.data.objects.new(self.name, me)
        coll.objects.link(ob)
        return ob


# Cuisse (origine : la hanche) et jambe (origine : le genou), chaussure vers l'avant.
# Le haut de la jambe rentre dans la cuisse pour que le genou plié reste fermé.
p = Part("fig-thigh")
p.box(-0.085, -0.1, -0.22, 0.085, 0.1, 0.0, "bottom", 0.035)
p.finish()

p = Part("fig-shin")
p.box(-0.08, -0.094, -0.16, 0.08, 0.094, 0.03, "bottom", 0.035)
p.box(-0.09, -0.165, -0.23, 0.09, 0.1, -0.13, "shoe", 0.04)
p.finish()

# Bassin (origine : le sol des hanches)
p = Part("fig-hips")
p.box(-0.21, -0.125, -0.05, 0.21, 0.125, 0.13, "bottom", 0.05)
p.finish()

# Buste (origine : la taille), ceinture
p = Part("fig-torso")
p.box(-0.23, -0.135, 0.0, 0.23, 0.135, 0.41, "top", 0.07)
p.box(-0.232, -0.137, 0.0, 0.232, 0.137, 0.05, "accent", 0.02)
p.finish()

# Bras (origine : l'épaule) et avant-bras (origine : le coude) avec la main
p = Part("fig-upper-arm")
p.box(-0.065, -0.075, -0.17, 0.065, 0.075, 0.02, "top", 0.04)
p.finish()

p = Part("fig-forearm")
p.box(-0.06, -0.07, -0.16, 0.06, 0.07, 0.025, "top", 0.035)
p.ball(0.0, 0.0, -0.2, 0.068, "skin", 12)
p.finish()

# Tête (origine : le cou) : visage arrondi, oreilles, nez, yeux avec leur
# reflet, sourire en arc. Le dessus est nu : coiffure ou chapeau s'y posent,
# jamais les deux.
p = Part("fig-head")
p.cyl(0, 0, -0.03, 0.05, 0.075, "skin", 12)
p.box(-0.19, -0.18, 0.03, 0.19, 0.18, 0.39, "skin", 0.13, 3)
for ex in (-0.19, 0.19):
    p.ball(ex, 0.01, 0.2, 0.05, "skin", 10)
p.ball(0.0, -0.182, 0.172, 0.034, "skin", 12)
for ex in (-0.082, 0.082):
    p.ball(ex, -0.163, 0.24, 0.048, "eye", 14)
    p.ball(ex + 0.016, -0.204, 0.257, 0.015, "shine", 8)
# Le sourire suit la courbe du menton (le biseau de la tête sous z 0,16).
for i in range(21):
    t = i / 10 - 1
    z = 0.098 + 0.024 * t * t
    face = -0.05 - (0.13**2 - max(0.0, 0.16 - z) ** 2) ** 0.5
    p.ball(t * 0.058, face + 0.007, z, 0.014, "eye", 10)
p.finish()

# Cheveux, chapeaux
p = Part("fig-hair-short")
p.box(-0.21, -0.2, 0.29, 0.21, 0.2, 0.45, "hair", 0.1, 3)
p.box(-0.21, 0.03, 0.12, 0.21, 0.205, 0.33, "hair", 0.07, 3)
for sx in (-1, 1):
    p.box(sx * 0.2 - 0.02, -0.08, 0.24, sx * 0.2 + 0.02, 0.1, 0.33, "hair", 0.015)
p.finish()

p = Part("fig-hair-long")
p.box(-0.215, -0.2, 0.29, 0.215, 0.205, 0.45, "hair", 0.1, 3)
p.box(-0.225, 0.0, -0.12, 0.225, 0.22, 0.33, "hair", 0.08, 3)
for sx in (-1, 1):
    p.box(sx * 0.205 - 0.03, -0.12, -0.02, sx * 0.205 + 0.03, 0.05, 0.33, "hair", 0.025)
p.finish()

p = Part("fig-hair-bun")
p.box(-0.21, -0.2, 0.29, 0.21, 0.2, 0.44, "hair", 0.1, 3)
p.box(-0.21, 0.03, 0.15, 0.21, 0.205, 0.33, "hair", 0.07, 3)
p.ball(0.0, 0.12, 0.49, 0.12, "hair", 14)
p.finish()

p = Part("fig-hat-sun")
p.cyl(0, 0, 0.3, 0.325, 0.38, "trim", 24)
p.cyl(0, 0, 0.29, 0.52, 0.225, "trim", 20, 0.205)
p.cyl(0, 0, 0.325, 0.38, 0.228, "accent", 20)
p.finish()

p = Part("fig-hat-toque")
p.cyl(0, 0, 0.29, 0.43, 0.222, "trim", 18)
p.cyl(0, 0, 0.43, 0.7, 0.24, "trim", 18, 0.27)
p.ball(0, 0, 0.7, 0.2, "trim", 14)
p.finish()

p = Part("fig-hat-cap")
p.cyl(0, 0, 0.29, 0.42, 0.222, "accent", 18)
p.ball(0, 0, 0.42, 0.21, "accent", 14)
p.box(-0.14, -0.36, 0.3, 0.14, -0.15, 0.33, "trim", 0.02)
p.finish()

# Tablier (sur le buste), jupe ou peignoir (sous la taille)
p = Part("fig-apron")
p.box(-0.19, -0.155, -0.28, 0.19, -0.135, 0.3, "trim", 0.01)
p.finish()

p = Part("fig-skirt")
p.cyl(0, 0, -0.3, 0.08, 0.27, "bottom", 16, 0.215)
p.finish()

# Accessoires
p = Part("fig-tray")
p.cyl(0, 0, 0.0, 0.025, 0.2, "trim", 18)
p.cyl(0.06, 0.03, 0.025, 0.16, 0.035, "accent", 10)
p.cyl(-0.07, -0.02, 0.025, 0.12, 0.04, "accent", 10)
p.finish()

p = Part("fig-bag")
p.box(-0.13, -0.07, 0.06, 0.13, 0.07, 0.5, "accent", 0.04)
p.box(-0.02, -0.02, 0.5, 0.02, 0.02, 0.82, "shoe", 0)
p.box(-0.08, -0.03, 0.8, 0.08, 0.03, 0.84, "shoe", 0)
for x in (-0.1, 0.1):
    p.cyl(x, 0.0, 0.0, 0.07, 0.035, "shoe", 8)
p.finish()

p = Part("fig-cart")
p.box(-0.3, -0.42, 0.06, 0.3, 0.42, 0.1, "trim", 0.02)
p.box(-0.3, -0.42, 0.62, 0.3, 0.42, 0.66, "trim", 0.02)
for x in (-0.28, 0.28):
    for y in (-0.4, 0.4):
        p.box(x - 0.02, y - 0.02, 0.06, x + 0.02, y + 0.02, 0.66, "trim", 0)
        p.cyl(x, y, 0.0, 0.06, 0.04, "shoe", 8)
for i, z in enumerate((0.12, 0.68)):
    p.box(-0.24, -0.36, z, 0.24, -0.04, z + 0.14, "top", 0.03)
    p.box(-0.24, 0.04, z, 0.24, 0.36, z + 0.1, "bottom", 0.03)
p.box(-0.26, 0.42, 0.1, 0.26, 0.5, 0.62, "accent", 0.03)
p.finish()

p = Part("fig-towel")
p.box(-0.08, -0.15, -0.25, 0.08, 0.15, 0.05, "accent", 0.03)
p.finish()

p = Part("fig-racket")
p.box(-0.02, -0.02, -0.18, 0.02, 0.02, 0.0, "shoe", 0)
p.box(-0.1, -0.015, -0.42, 0.1, 0.015, -0.18, "accent", 0.04)
p.finish()

# Poêle du chef, comme la raquette : origine dans la main, manche le long de
# l'avant-bras (vers -Z), le creux vers l'avant du bras (-Y), donc vers le
# haut quand l'avant-bras est tenu à l'horizontale.
p = Part("fig-pan")
p.box(-0.022, -0.018, -0.21, 0.022, 0.018, -0.02, "eye", 0.008)
verts = bmesh.ops.create_cone(p.bm, cap_ends=True, segments=20, radius1=0.16, radius2=0.16, depth=0.07)["verts"]
bmesh.ops.rotate(p.bm, verts=verts, cent=Vector(), matrix=Matrix.Rotation(math.pi / 2, 3, "X"))
bmesh.ops.translate(p.bm, verts=verts, vec=Vector((0, 0.005, -0.36)))
p._set(verts, "eye", 0)
p.bm.normal_update()
mouth = [f for f in {f for v in verts for f in v.link_faces} if f.normal.y < -0.9]
bmesh.ops.inset_region(p.bm, faces=mouth, thickness=0.018)
bmesh.ops.translate(p.bm, verts=list({v for f in mouth for v in f.verts}), vec=Vector((0, 0.05, 0)))
p.finish()

bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_apply=True, export_yup=True, export_cameras=False, export_lights=False)
print("figures", len(bpy.data.objects))

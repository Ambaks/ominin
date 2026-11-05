"""
Exporte la maquette construite par build_grand_large.py et rend son image fixe.

À lancer dans Blender, juste après la construction :
    blender -b -P build_grand_large.py -P export.py
Avec STILL_PREVIEW=<fichier.png>, rend seulement un aperçu à mi-taille, sans
rien exporter. L'image passe en WebP par cwebp (dans le PATH, ou CWEBP=<chemin>
quand Blender est lancé depuis le Dock).

Écrit dans frontend/public/hotels/demo/ :
- grand-large.glb, compressé en Draco (extras gardés : nav, rest, poi, level-*) ;
- draco/, le décodeur de three copié depuis node_modules (rien n'est téléchargé) ;
- grand-large.webp, l'image fixe affichée pendant le chargement du plan 3D et
  sans WebGL : même direction, même champ et même lumière que la vue Three.js,
  fond transparent, cadrée au plus près de la maquette.

La caméra et la lumière viennent de frontend/lib/hotels-demo-camera.json, le
fichier que lit aussi plan-sim.ts ; seuls TONE_GAIN (l'exposition) et
SUN_ANGLE (le flou des ombres) sont propres à Blender.
"""

import json
import math
import os
import shutil
import subprocess
from pathlib import Path

import bpy
from mathutils import Vector

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "frontend/public/hotels/demo"
DRACO_SRC = REPO / "frontend/node_modules/three/examples/jsm/libs/draco/gltf"
DRACO_FILES = ("draco_decoder.js", "draco_decoder.wasm", "draco_wasm_wrapper.js")

VIEW = json.loads((REPO / "frontend/lib/hotels-demo-camera.json").read_text())
STILL_WIDTH = 1800
STILL_MARGIN = 0.03
WEBP_QUALITY = ("-q", "82", "-alpha_q", "90")
# Le flou des ombres de la vue (filtrage PCF) rendu par la taille apparente du soleil.
SUN_ANGLE = math.radians(3)


def z_up(v):
    """Une direction Three.js (Y vers le haut) dans le repère de Blender (Z vers le haut)."""
    x, y, z = v
    return Vector((x, -z, y)).normalized()


def linear(hex_):
    h = hex_.lstrip("#")
    return [(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4) for c in (int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))]


VIEW_DIR = z_up(VIEW["direction"])
FOV = math.radians(VIEW["fov"])
SUN = VIEW["sun"]
SUN_DIR = z_up(SUN["offset"])
HEMI = VIEW["hemisphere"]
ENV = VIEW["environment"]

# Three.js divise l'éclairage diffus par π, Blender non ; TONE_GAIN rattrape
# l'exposition et la courbe ACES de la vue (Blender rend en « Standard »),
# réglé à l'œil sur ses captures (sable, mer, pelouse).
TONE_GAIN = 2.75
SUN_STRENGTH = SUN["intensity"] / math.pi * TONE_GAIN * VIEW["exposure"]
SKY_STRENGTH = HEMI["intensity"] / math.pi * TONE_GAIN * VIEW["exposure"]
# L'environnement (RoomEnvironment de la vue) : une lumière blanche, égale de partout.
ENV_STRENGTH = ENV["intensity"] / math.pi * TONE_GAIN * VIEW["exposure"]
PREVIEW = os.environ.get("STILL_PREVIEW")

scene = bpy.context.scene

# ── GLB ─────────────────────────────────────────────────────────────────
OUT.mkdir(parents=True, exist_ok=True)
if not PREVIEW:
    bpy.ops.export_scene.gltf(
        filepath=str(OUT / "grand-large.glb"),
        export_format="GLB",
        export_extras=True,
        export_apply=True,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=10,
        export_draco_position_quantization=14,
        export_draco_normal_quantization=8,
        export_draco_color_quantization=8,
        export_draco_texcoord_quantization=10,
    )
    (OUT / "draco").mkdir(exist_ok=True)
    for name in DRACO_FILES:
        shutil.copyfile(DRACO_SRC / name, OUT / "draco" / name)

# ── Lumière : le soleil et le ciel de la vue Three.js ───────────────────
for ob in [o for o in bpy.data.objects if o.type in {"LIGHT", "CAMERA"}]:
    bpy.data.objects.remove(ob, do_unlink=True)
sun_data = bpy.data.lights.new("sun", "SUN")
sun_data.energy = SUN_STRENGTH
sun_data.angle = SUN_ANGLE
sun_data.color = linear(SUN["color"])
sun_data.shadow_cascade_max_distance = 600
sun_data.shadow_cascade_count = 4
sun_data.shadow_buffer_bias = 0.05
sun = bpy.data.objects.new("sun", sun_data)
scene.collection.objects.link(sun)
sun.rotation_euler = SUN_DIR.to_track_quat("Z", "Y").to_euler()

world = scene.world or bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
nodes, links = world.node_tree.nodes, world.node_tree.links
nodes.clear()
out = nodes.new("ShaderNodeOutputWorld")
bg = nodes.new("ShaderNodeBackground")
env = nodes.new("ShaderNodeBackground")
add = nodes.new("ShaderNodeAddShader")
grad = nodes.new("ShaderNodeValToRGB")
sep = nodes.new("ShaderNodeSeparateXYZ")
coord = nodes.new("ShaderNodeTexCoord")
# Le dégradé de la HemisphereLight de la vue, du sol au ciel, plus l'environnement.
grad.color_ramp.elements[0].position = 0.35
grad.color_ramp.elements[0].color = (*linear(HEMI["ground"]), 1)
grad.color_ramp.elements[1].position = 0.65
grad.color_ramp.elements[1].color = (*linear(HEMI["sky"]), 1)
links.new(coord.outputs["Generated"], sep.inputs[0])
links.new(sep.outputs["Z"], grad.inputs["Fac"])
links.new(grad.outputs["Color"], bg.inputs["Color"])
links.new(bg.outputs["Background"], add.inputs[0])
links.new(env.outputs["Background"], add.inputs[1])
links.new(add.outputs["Shader"], out.inputs["Surface"])
bg.inputs["Strength"].default_value = SKY_STRENGTH
env.inputs["Color"].default_value = (1, 1, 1, 1)
env.inputs["Strength"].default_value = ENV_STRENGTH

ee = scene.eevee
ee.use_gtao = True
ee.gtao_distance = 1.2
ee.gtao_factor = 0.8
ee.use_soft_shadows = True
ee.shadow_cascade_size = "4096"
ee.use_shadow_high_bitdepth = True
ee.taa_render_samples = 64
scene.render.film_transparent = True
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "None"
scene.view_settings.exposure = 0.0

# ── Caméra : le cadrage de départ de la vue, recadré au plus près ───────
# La vue recule juste assez pour que la boîte de la maquette tienne dans son
# écran (frame3 de plan-sim.ts) ; on la reproduit pour un écran du format de
# l'image, puis on recadre sur la maquette : même perspective, sans les marges.
lo = Vector((math.inf,) * 3)
hi = Vector((-math.inf,) * 3)
for ob in scene.objects:
    if ob.type != "MESH":
        continue
    for c in ob.bound_box:
        w = ob.matrix_world @ Vector(c)
        lo = Vector(map(min, lo, w))
        hi = Vector(map(max, hi, w))
corners = [Vector((x, y, z)) for x in (lo.x, hi.x) for y in (lo.y, hi.y) for z in (lo.z, hi.z)]
rot = (-VIEW_DIR).to_track_quat("-Z", "Y")
inv = rot.inverted()
RIGHT = (-VIEW_DIR).cross(Vector((0, 0, 1))).normalized()
UP = RIGHT.cross(-VIEW_DIR)
TAN_Y = math.tan(FOV / 2)


def fit(aspect):
    target = (lo + hi) / 2
    tan_x = TAN_Y * aspect
    for step in range(3):
        offsets = [p - target for p in corners]
        d = max(max(abs(c.dot(RIGHT)) / tan_x, abs(c.dot(UP)) / TAN_Y) + c.dot(VIEW_DIR) for c in offsets)
        if step == 2:
            return target + VIEW_DIR * d
        xs = [c.dot(RIGHT) / ((d - c.dot(VIEW_DIR)) * tan_x) for c in offsets]
        ys = [c.dot(UP) / ((d - c.dot(VIEW_DIR)) * TAN_Y) for c in offsets]
        target = target + RIGHT * ((min(xs) + max(xs)) / 2 * d * tan_x) + UP * ((min(ys) + max(ys)) / 2 * d * TAN_Y)


def crop(eye):
    pts = [inv @ (p - eye) for p in corners]
    us = [p.x / -p.z for p in pts]
    vs = [p.y / -p.z for p in pts]
    return min(us), max(us), min(vs), max(vs)


aspect = 1.0
for _ in range(8):
    eye = fit(aspect)
    u0, u1, v0, v1 = crop(eye)
    aspect = (u1 - u0) / (v1 - v0)
pad_u, pad_v = (u1 - u0) * STILL_MARGIN, (v1 - v0) * STILL_MARGIN
u0, u1, v0, v1 = u0 - pad_u, u1 + pad_u, v0 - pad_v, v1 + pad_v
width, height = u1 - u0, v1 - v0
far = (eye - (lo + hi) / 2).length

cam_data = bpy.data.cameras.new("still")
cam_data.sensor_fit = "VERTICAL"
cam_data.angle_y = 2 * math.atan(height / 2)
cam_data.clip_start = far * 0.3
cam_data.clip_end = far * 2.5
big = max(width, height)
cam_data.shift_x = (u0 + u1) / 2 / big
cam_data.shift_y = (v0 + v1) / 2 / big
cam = bpy.data.objects.new("still", cam_data)
scene.collection.objects.link(cam)
cam.location = eye
cam.rotation_euler = rot.to_euler()
scene.camera = cam

scene.render.resolution_x = STILL_WIDTH
scene.render.resolution_y = round(STILL_WIDTH * height / width)
scene.render.resolution_percentage = 50 if PREVIEW else 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
png = Path(PREVIEW or Path(bpy.app.tempdir) / "grand-large.png")
scene.render.filepath = str(png)
bpy.ops.render.render(write_still=True)
if not PREVIEW:
    subprocess.run([os.environ.get("CWEBP") or shutil.which("cwebp") or "cwebp", "-quiet", *WEBP_QUALITY, str(png), "-o", str(OUT / "grand-large.webp")], check=True)
print("glb", (OUT / "grand-large.glb").stat().st_size, "still", scene.render.resolution_x, scene.render.resolution_y)

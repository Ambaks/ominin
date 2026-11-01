"""Fonds de page « liquid glass » : flou, réfraction et reflets calculés ici, car le PDF de Chromium ne garde pas backdrop-filter.
Lit <dossier>/rects.json (écrit par measure.cjs), écrit <dossier>/bg/pN.jpg et <dossier>/bg.css."""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import distance_transform_edt, gaussian_filter, map_coordinates

PX_MM = 1800 / 216
CSS_PX_MM = 96 / 25.4
# Ombre sous les appareils, en mm : décalage vers le bas, écart type du flou.
SHADOW_DROP, SHADOW_BLUR, SHADOW_ALPHA, SHADOW_COLOR = 7, 8, 0.42, (10, 4, 6)
CHEVRONS = [
    [(256, 107), (396, 247), (396, 281), (256, 141), (116, 281), (116, 247)],
    [(256, 170), (396, 310), (396, 344), (256, 204), (116, 344), (116, 310)],
    [(256, 233), (396, 373), (396, 407), (256, 267), (116, 407), (116, 373)],
]
STOPS = np.array([[255, 211, 107], [240, 128, 63], [214, 69, 106]], float)
THEMES = {
    "dark": {"top": (11, 6, 10), "bottom": (22, 11, 15), "tint": (14, 9, 11), "alpha": 0.54, "shadow": 0.5, "sheen": 0.1, "body": 0.6, "spec": 0.34, "glow": 0.42},
    "paper": {"top": (244, 241, 246), "bottom": (230, 225, 233), "tint": (255, 255, 255), "alpha": 0.6, "shadow": 0.18, "sheen": 0.14, "body": 0.92, "spec": 0.4, "glow": 0.3},
}


def chevron_mask(size, cx, cy, width):
    w, h = size
    unit = width * PX_MM / 280
    x0, y0 = cx * PX_MM - 256 * unit, cy * PX_MM - 257 * unit
    canvas = Image.new("L", (w * 2, h * 2), 0)
    draw = ImageDraw.Draw(canvas)
    for shape in CHEVRONS:
        draw.polygon([((x0 + x * unit) * 2, (y0 + y * unit) * 2) for x, y in shape], fill=255)
    return np.asarray(canvas.resize((w, h), Image.LANCZOS), float) / 255


def background(size, theme, chevron, clear):
    w, h = size
    t = THEMES[theme]
    fade = np.linspace(0, 1, h)[:, None, None]
    img = np.array(t["top"], float) * (1 - fade) + np.array(t["bottom"], float) * fade
    img = np.repeat(img, w, axis=1)
    if chevron is None:
        return img
    cx, cy, width = chevron
    mask = chevron_mask(size, cx, cy, width)
    rows = np.arange(h) / PX_MM
    keep = np.clip((rows - clear[0]) / 22, 0, 1) * np.clip((clear[1] - rows) / 14, 0, 1)
    keep = (keep * keep * (3 - 2 * keep))[:, None]

    yy, xx = np.mgrid[0:h, 0:w]
    along = np.clip(((xx - cx * PX_MM) + (yy - cy * PX_MM)) / (width * PX_MM * 1.5) + 0.5, 0, 1) * 2
    low = np.minimum(along.astype(int), 1)
    frac = (along - low)[..., None]
    color = STOPS[low] * (1 - frac) + STOPS[low + 1] * frac

    glow = (gaussian_filter(mask, 70) * keep)[..., None] * t["glow"]
    img = img * (1 - glow) + color * glow

    # Le verre fondu : un relief tiré du masque, éclairé depuis le haut à gauche.
    gy, gx = np.gradient(gaussian_filter(mask, 15))
    light = -(gx * 0.6 + gy * 0.8) * 34
    molten = color * t["body"] * (1 + np.clip(light, -0.42, 0)[..., None]) + 255 * np.clip(light, 0, t["spec"])[..., None]
    alpha = (mask * keep)[..., None]
    return np.clip(img * (1 - alpha) + molten * alpha, 0, 255)


def rounded(w, h, radius):
    canvas = Image.new("L", (w * 2, h * 2), 0)
    ImageDraw.Draw(canvas).rounded_rectangle((0, 0, w * 2 - 1, h * 2 - 1), radius * 2, fill=255)
    return np.asarray(canvas.resize((w, h), Image.LANCZOS), float) / 255


def add_panel(img, rect, theme, scale):
    t = THEMES[theme]
    height, width = img.shape[:2]
    x, y = round(rect["x"] * scale), round(rect["y"] * scale)
    w, h = round(rect["w"] * scale), round(rect["h"] * scale)
    pad = 110
    x0, y0, x1, y1 = max(x - pad, 0), max(y - pad, 0), min(x + w + pad, width), min(y + h + pad, height)
    crop = img[y0:y1, x0:x1].copy()
    mask = np.zeros(crop.shape[:2])
    mask[y - y0 : y - y0 + h, x - x0 : x - x0 + w] = rounded(w, h, round(rect["radius"] * scale))

    shadow = gaussian_filter(np.roll(mask, 20, axis=0), 28)[..., None] * t["shadow"]
    crop = crop * (1 - shadow * (1 - mask[..., None]))

    frosted = gaussian_filter(img[y0:y1, x0:x1], (22, 22, 0))
    depth = gaussian_filter(distance_transform_edt(mask > 0.5), 2)
    dy, dx = np.gradient(depth)
    band = 3.2 * PX_MM
    bend = np.clip(1 - depth / band, 0, 1) ** 2 * band * 1.5
    rows, cols = np.mgrid[0 : crop.shape[0], 0 : crop.shape[1]]
    lens = np.stack(
        [map_coordinates(frosted[..., c], [rows + dy * bend, cols + dx * bend], order=1, mode="nearest") for c in range(3)],
        axis=-1,
    )

    solid = rect["solid"]
    alpha = 0.92 if solid else t["alpha"]
    tint = (250, 247, 244) if solid else t["tint"]
    glass = lens * (1 - alpha) + np.array(tint, float) * alpha
    ramp = 1 - ((cols - (x - x0)) / max(w, 1) + (rows - (y - y0)) / max(h, 1)) / 2
    glass += 255 * (0 if solid else t["sheen"]) * np.clip(ramp, 0, 1)[..., None] ** 2

    rim = np.clip(1 - depth / 2.6, 0, 1)
    facing = dx * 0.6 + dy * 0.8
    glass += 255 * (rim * (0.16 + 0.62 * np.clip(facing, 0, 1) + 0.22 * np.clip(-facing, 0, 1)))[..., None]

    m = mask[..., None]
    img[y0:y1, x0:x1] = np.clip(crop * (1 - m) + glass * m, 0, 255)


def add_device_shadow(img, rect, scale):
    """L'ombre des téléphones et tablettes : dans le PDF, CoreGraphics (iPhone, Aperçu) dessine un box-shadow flou en rectangle gris."""
    h, w = img.shape[:2]
    x, y = round(rect["x"] * scale), round(rect["y"] * scale + SHADOW_DROP * PX_MM)
    rw, rh = round(rect["w"] * scale), round(rect["h"] * scale)
    x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + rw, w), min(y + rh, h)
    if x1 <= x0 or y1 <= y0:
        return
    mask = np.zeros((h, w))
    shape = rounded(rw, rh, round(rect["radius"] * scale))
    mask[y0:y1, x0:x1] = shape[y0 - y : y1 - y, x0 - x : x1 - x]
    shadow = gaussian_filter(mask, SHADOW_BLUR * PX_MM)[..., None] * SHADOW_ALPHA
    img[:] = img * (1 - shadow) + np.array(SHADOW_COLOR, float) * shadow


def main(folder):
    out = folder / "bg"
    out.mkdir(exist_ok=True)
    rng = np.random.default_rng(7)
    css = []
    for n, page in enumerate(json.loads((folder / "rects.json").read_text()), start=1):
        size = (round(page["width"] / CSS_PX_MM * PX_MM), round(page["height"] / CSS_PX_MM * PX_MM))
        scale = size[0] / page["width"]
        img = background(size, page["theme"], page["chevron"], page["clear"])
        for rect in page["panels"]:
            add_panel(img, rect, page["theme"], scale)
        for rect in page["devices"]:
            add_device_shadow(img, rect, scale)
        img = np.clip(img + rng.normal(0, 1.1, img.shape[:2])[..., None], 0, 255)
        Image.fromarray(img.astype("uint8")).save(out / f"p{n}.jpg", quality=92, subsampling=0)
        css.append(f".page:nth-of-type({n}) {{ background-image: url(bg/p{n}.jpg); }}")
    (folder / "bg.css").write_text("\n".join(css) + "\n")


main(Path(sys.argv[1]))

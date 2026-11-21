# Máscaras de "foil" (hot-stamping dorado) para el reflejo que sigue el dedo en la tirada.
# Toma las cartas remasterizadas de public/cartas y guarda public/cartas/foil/<carta>.png:
# blanco con transparencia, opaco solo donde la carta es dorada o amarilla (marco, oros, copas, estrellas).
# Uso: python3 scripts/generar-foil.py
import os, sys
import numpy as np
from PIL import Image, ImageFilter

base = os.path.join(os.path.dirname(__file__), "..", "public", "cartas")
out = os.path.join(base, "foil")
os.makedirs(out, exist_ok=True)
W, H = 200, 351

def hsv(a):
    mx, mn = a.max(-1), a.min(-1)
    d = mx - mn + 1e-6
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    h = np.where(mx == r, (g - b) / d % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return h, d / (mx + 1e-6), mx

n = 0
for f in sorted(os.listdir(base)):
    if not f.endswith(".webp"):
        continue
    a = np.asarray(Image.open(os.path.join(base, f)).convert("RGB").resize((W, H), Image.LANCZOS)).astype(np.float32) / 255
    h, s, v = hsv(a)
    oro = np.clip((s - 0.32) / 0.25, 0, 1) * np.clip((v - 0.55) / 0.25, 0, 1) * ((h > 30) & (h < 62))
    m = Image.fromarray((oro * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.2))
    rgba = Image.new("RGBA", (W, H), (255, 255, 255, 0))
    rgba.putalpha(m)
    rgba.save(os.path.join(out, f.replace(".webp", ".png")), optimize=True)
    n += 1
print(n, "máscaras")

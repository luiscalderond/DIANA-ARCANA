# Remasterización "Arcana" del Rider-Waite 1909 (dominio público): cielos de atardecer cósmico en lugar del amarillo plano,
# gradación índigo/dorado, color por palo, viñeta de profundidad y marco dorado con micro-detalles (constelaciones y fases lunares).
# Uso: python3 remaster.py <carpeta_origen> <carpeta_destino> [archivos...]
import sys, os, math
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

SRC, DST = sys.argv[1], sys.argv[2]
os.makedirs(DST, exist_ok=True)
archivos = sys.argv[3:] or sorted(f[:-5] for f in os.listdir(SRC) if f.endswith(".webp"))

TINTE = {"m": (150, 90, 210), "w": (230, 120, 50), "c": (40, 170, 190), "s": (90, 130, 230), "p": (60, 160, 100)}
ESC = 2

def rgb2hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1); d = mx - mn + 1e-6
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = np.where(mx > 0, d / (mx + 1e-6), 0)
    return h, s, mx

def procesar(nombre):
    im = Image.open(f"{SRC}/{nombre}.webp").convert("RGBA")
    alpha = im.getchannel("A")
    im = im.convert("RGB").resize((im.width * ESC, im.height * ESC), Image.LANCZOS)
    alpha = alpha.resize(im.size, Image.LANCZOS)
    a = np.asarray(im).astype(np.float32) / 255
    H, W = a.shape[:2]
    h, s, v = rgb2hsv(a)
    lum = (0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2])[..., None]
    yy = np.linspace(0, 1, H)[:, None, None] * np.ones((1, W, 1))

    # 1) Cielos: solo las zonas grandes de amarillo o celeste que nacen arriba (no los símbolos) se vuelven cielo de atardecer cósmico.
    amar = (h > 32) & (h < 64) & (s > 0.30) & (v > 0.55)
    cele = (h > 180) & (h < 225) & (s > 0.15) & (v > 0.62)
    def cielos(mask):
        small = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).resize((W // ESC, H // ESC), Image.NEAREST)) > 127
        hh, ww = small.shape; lab = np.zeros(small.shape, np.int32); res = np.zeros(small.shape, bool); n = 0
        from collections import deque
        for y0 in range(hh):
            for x0 in range(ww):
                if small[y0, x0] and not lab[y0, x0]:
                    n += 1; q = deque([(y0, x0)]); lab[y0, x0] = n; pts = []
                    while q:
                        y, x = q.popleft(); pts.append((y, x))
                        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                            yy2, xx2 = y + dy, x + dx
                            if 0 <= yy2 < hh and 0 <= xx2 < ww and small[yy2, xx2] and not lab[yy2, xx2]:
                                lab[yy2, xx2] = n; q.append((yy2, xx2))
                    ys = [p_[0] for p_ in pts]; xs = [p_[1] for p_ in pts]
                    if not (min(xs) < 0.08 * ww or max(xs) > 0.92 * ww): continue  # el cielo toca un borde; un sol o una estrella no
                    if (len(pts) > 0.05 * hh * ww and min(ys) < 0.35 * hh) or (len(pts) > 0.025 * hh * ww and min(ys) < 0.6 * hh and mask is amar):
                        for y, x in pts: res[y, x] = True
        big = Image.fromarray((res * 255).astype(np.uint8)).resize((W, H), Image.NEAREST)
        big = big.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.6))
        return (np.asarray(big).astype(np.float32) / 255)[..., None] * mask[..., None].astype(np.float32)
    mA, mC = cielos(amar), cielos(cele)
    t = np.clip(yy * 1.25, 0, 1)
    def grad(t, c0, c1, c2):
        c0, c1, c2 = map(np.array, (c0, c1, c2))
        return np.where(t < 0.55, c0 + (c1 - c0) * (t / 0.55), c1 + (c2 - c1) * ((t - 0.55) / 0.45))
    tex = 0.75 + 0.5 * (lum - 0.75)
    cieloA = grad(t, [0.10, 0.08, 0.30], [0.42, 0.20, 0.55], [0.98, 0.70, 0.36]) * tex
    cieloC = grad(t, [0.08, 0.12, 0.32], [0.20, 0.32, 0.62], [0.45, 0.80, 0.82]) * (0.8 + 0.4 * (lum - 0.8))
    a = a * (1 - mA * 0.88) + cieloA * (mA * 0.88)
    a = a * (1 - mC * 0.80) + cieloC * (mC * 0.80)
    # Símbolos dorados (estrellas, oros, copas, coronas): dorado metálico más intenso.
    mS = amar[..., None].astype(np.float32) * (1 - np.clip(mA * 3, 0, 1))
    oroM = np.array([1.0, 0.78, 0.28]) * (0.55 + 0.6 * lum)
    a = a * (1 - mS * 0.55) + oroM * (mS * 0.55)

    # 2) Gradación de asombro: sombras hacia índigo, luces hacia dorado cálido.
    lum = (0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2])[..., None]
    sombra, luz = np.array([0.12, 0.08, 0.28]), np.array([1.0, 0.86, 0.62])
    mapa = sombra + (luz - sombra) * lum
    a = a * 0.68 + mapa * 0.32
    # 3) Color por palo (anclaje sutil) y viveza.
    tin = np.array(TINTE[nombre[0]]) / 255
    a = a * 0.9 + tin * lum * 0.10
    gris = a.mean(-1, keepdims=True); a = gris + (a - gris) * 1.18
    a = np.clip((a - 0.5) * 1.08 + 0.5, 0, 1)
    # 4) Viñeta: profundidad y foco en el centro.
    xx = np.linspace(-1, 1, W)[None, :, None]; y2 = np.linspace(-1, 1, H)[:, None, None]
    vin = 1 - 0.32 * np.clip((xx ** 2 * 0.9 + y2 ** 2 * 0.7) - 0.25, 0, 1)
    a = a * vin
    # 5) Brillo dorado suave en las luces (sensación de luz volumétrica).
    out = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    glow = out.filter(ImageFilter.GaussianBlur(10))
    ga = np.asarray(glow).astype(np.float32) / 255
    bl = np.clip((ga.mean(-1, keepdims=True) - 0.6) * 2.5, 0, 1) * np.array([1.0, 0.82, 0.5])
    a = 1 - (1 - a) * (1 - bl * 0.22)
    out = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))

    # 6) Marco dorado con micro-detalles: fases lunares arriba, constelación abajo, estrellas en esquinas.
    d = ImageDraw.Draw(out)
    oro, oro2 = (226, 189, 112), (255, 236, 184)
    d.rectangle([6, 6, W - 7, H - 7], outline=oro, width=3)
    d.rectangle([13, 13, W - 14, H - 14], outline=(170, 130, 60), width=1)
    def estrella(cx, cy, r, col):
        pts = []
        for i in range(8):
            ang = i * math.pi / 4 - math.pi / 2; rr = r if i % 2 == 0 else r * 0.38
            pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
        d.polygon(pts, fill=col)
    for cx, cy in [(10, 10), (W - 11, 10), (10, H - 11), (W - 11, H - 11)]:
        estrella(cx, cy, 9, oro2)
    # fases lunares (borde superior)
    for i, f in enumerate([0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25, 0]):
        cx, cy, r = W / 2 + (i - 4) * 16, 3.5, 2.6
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(60, 40, 90), outline=oro)
        if f: d.ellipse([cx - r * f, cy - r, cx + r * f, cy + r], fill=oro2)
    # constelación (borde inferior)
    pts = [(W / 2 - 60, H - 3), (W / 2 - 30, H - 5), (W / 2, H - 2.5), (W / 2 + 28, H - 5), (W / 2 + 58, H - 3)]
    d.line(pts, fill=oro, width=1)
    for p in pts: d.ellipse([p[0] - 1.8, p[1] - 1.8, p[0] + 1.8, p[1] + 1.8], fill=oro2)
    # 7) Título en español: banda índigo con letras doradas sobre el título original en inglés (mayores y figuras).
    num = int(nombre[1:])
    if nombre[0] == "m" or num >= 11 or num == 1:
        from PIL import ImageFont
        import json
        nom = json.load(open(os.path.join(os.path.dirname(__file__), "nombres-rider-waite.json")))[nombre].upper()
        x0, y0, x1, y1 = 15 * ESC, 486 * ESC, 285 * ESC, 518 * ESC
        banda = Image.new("RGB", (x1 - x0, y1 - y0))
        bd = ImageDraw.Draw(banda)
        for i in range(y1 - y0):
            k = i / (y1 - y0)
            bd.line([(0, i), (x1 - x0, i)], fill=(int(46 - 18 * k), int(24 - 8 * k), int(78 - 30 * k)))
        out.paste(banda, (x0, y0))
        d.line([(x0, y0), (x1, y0)], fill=oro, width=2); d.line([(x0, y1), (x1, y1)], fill=oro, width=2)
        tam = 30
        while True:
            fnt = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", tam)
            bb = d.textbbox((0, 0), nom, font=fnt)
            if bb[2] - bb[0] < (x1 - x0) - 70 or tam <= 16: break
            tam -= 1
        tw, th = bb[2] - bb[0], bb[3] - bb[1]
        tx, ty = (x0 + x1 - tw) / 2, (y0 + y1) / 2 - th / 2 - bb[1]
        d.text((tx + 1, ty + 2), nom, font=fnt, fill=(20, 10, 30))
        d.text((tx, ty), nom, font=fnt, fill=(246, 223, 160))
        estrella(x0 + 22, (y0 + y1) / 2, 8, oro); estrella(x1 - 22, (y0 + y1) / 2, 8, oro)
    out.putalpha(alpha)
    out.save(f"{DST}/{nombre}.webp", "WEBP", quality=86, method=6)

for n in archivos:
    procesar(n)
print(len(archivos), "cartas")

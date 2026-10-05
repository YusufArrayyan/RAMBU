"""Turn the original logo (white background) into transparent web assets."""
from collections import deque
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).parent
OUT = ROOT.parent / "frontend" / "public"
OUT.mkdir(parents=True, exist_ok=True)

src = Image.open(ROOT / "logo-rambu-original.png").convert("RGBA")
w, h = src.size
px = src.load()

# Flood-fill the outer white background only, so white details inside the mark survive.
bg = bytearray(w * h)
q = deque([(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)])
while q:
    x, y = q.popleft()
    i = y * w + x
    if bg[i]:
        continue
    r, g, b, _ = px[x, y]
    if min(r, g, b) < 248:
        continue
    bg[i] = 1
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= nx < w and 0 <= ny < h and not bg[ny * w + nx]:
            q.append((nx, ny))

def near_bg(x, y, rad=2):
    for dy in range(-rad, rad + 1):
        for dx in range(-rad, rad + 1):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and bg[ny * w + nx]:
                return True
    return False

for y in range(h):
    for x in range(w):
        if bg[y * w + x]:
            px[x, y] = (255, 255, 255, 0)
        elif near_bg(x, y):
            # Un-composite anti-aliased edge pixels from white.
            r, g, b, _ = px[x, y]
            a = min(1.0, (255 - min(r, g, b)) / 240)
            if a <= 0.02:
                px[x, y] = (255, 255, 255, 0)
                continue
            un = lambda c: max(0, min(255, round((c - 255 * (1 - a)) / a)))
            px[x, y] = (un(r), un(g), un(b), round(a * 255))

mark = src.crop(src.getbbox())
mw, mh = mark.size
side = max(mw, mh)
square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
square.paste(mark, ((side - mw) // 2, (side - mh) // 2))
square.resize((512, 512), Image.LANCZOS).save(OUT / "logo-mark.png", optimize=True)
square.resize((128, 128), Image.LANCZOS).save(OUT / "logo-mark-128.png", optimize=True)

def icon(size, pad_ratio, bg_color, name):
    canvas = Image.new("RGBA", (size, size), bg_color)
    inner = round(size * (1 - 2 * pad_ratio))
    canvas.alpha_composite(square.resize((inner, inner), Image.LANCZOS), ((size - inner) // 2,) * 2)
    canvas.save(OUT / name, optimize=True)
    return canvas

icon(32, 0.04, (0, 0, 0, 0), "favicon-32.png")
icon(180, 0.14, (255, 255, 255, 255), "apple-touch-icon.png")
icon(192, 0.14, (255, 255, 255, 255), "icon-192.png")
icon(512, 0.14, (255, 255, 255, 255), "icon-512.png")
icon(512, 0.22, (255, 255, 255, 255), "icon-maskable-512.png")
ico = icon(64, 0.04, (0, 0, 0, 0), "_tmp.png")
ico.save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
(OUT / "_tmp.png").unlink()
print("ok", mark.size)

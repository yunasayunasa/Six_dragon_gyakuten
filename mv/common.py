"""Assets and composition helpers shared by the scenes."""
import math
import os

import cairo
import numpy as np
from PIL import Image, ImageFilter

import dragon as D
import wilnas as Wl
from gfx import (INK, TAU, WHITE, alpha, back_out, clamp, ease_out, hash01, hexagon, hexagon_path,
                 mix, rect, src)
from timeline import BEAT, H, W

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_cache = {}
_buffers = []


def pil_to_surface(im):
    im = im.convert("RGBA")
    arr = np.asarray(im).astype(np.uint16)
    a = arr[..., 3]
    rgb = arr[..., :3] * a[..., None] // 255
    bgra = np.dstack([rgb[..., 2], rgb[..., 1], rgb[..., 0], a]).astype(np.uint8)
    h, w = a.shape
    stride = cairo.ImageSurface.format_stride_for_width(cairo.FORMAT_ARGB32, w)
    buf = np.zeros((h, stride), np.uint8)
    buf[:, : w * 4] = bgra.reshape(h, w * 4)
    data = bytearray(buf.tobytes())
    surf = cairo.ImageSurface.create_for_data(data, cairo.FORMAT_ARGB32, w, h, stride)
    _buffers.append(data)  # keep the pixel buffer alive with the surface
    return surf


def sticker(im, border=10, color=(251, 247, 239, 255)):
    im = im.convert("RGBA")
    pad = border + 2
    canvas = Image.new("RGBA", (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0))
    canvas.paste(im, (pad, pad), im)
    a = canvas.split()[3].point(lambda v: 255 if v > 40 else 0)
    grown = a.filter(ImageFilter.MaxFilter(border * 2 + 1))
    base = Image.new("RGBA", canvas.size, color)
    base.putalpha(grown)
    base.alpha_composite(canvas)
    return base


def sprite_frames():
    if "frames" not in _cache:
        sheet = Image.open(os.path.join(REPO, "assets/character/walk.png"))
        fw, fh = sheet.width // 5, sheet.height // 5
        frames = []
        for i in range(25):
            c, r = i % 5, i // 5
            fr = sheet.crop((c * fw, r * fh, (c + 1) * fw, (r + 1) * fh)).resize((fw * 2, fh * 2), Image.LANCZOS)
            frames.append(pil_to_surface(fr))
        _cache["frames"] = frames
    return _cache["frames"]


PROP_NAMES = ["tree", "bush", "rock", "sign", "lamp", "flowers", "tree_small", "grass", "item", "vine"]


def props():
    if "props" not in _cache:
        out = {}
        for n in PROP_NAMES:
            im = Image.open(os.path.join(REPO, f"assets/props/{n}.png"))
            im.thumbnail((420, 420), Image.LANCZOS)
            out[n] = pil_to_surface(sticker(im, 9))
        _cache["props"] = out
    return _cache["props"]


def grain_tiles():
    if "grain" not in _cache:
        rng = np.random.default_rng(3)
        tiles = []
        for _ in range(4):
            n = rng.integers(0, 256, (H // 2, W // 2), dtype=np.uint8)
            a = np.full_like(n, 10)
            im = Image.fromarray(np.dstack([n, n, n, a]), "RGBA")
            tiles.append(pil_to_surface(im))
        _cache["grain"] = tiles
    return _cache["grain"]


def draw_image(ctx, surf, x, y, scale=1.0, anchor=(0.5, 1.0), rot=0.0, a=1.0, flip=False):
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.scale(scale * (-1 if flip else 1), scale)
    ctx.translate(-surf.get_width() * anchor[0], -surf.get_height() * anchor[1])
    ctx.set_source_surface(surf, 0, 0)
    ctx.get_source().set_filter(cairo.FILTER_GOOD)
    if a >= 1:
        ctx.paint()
    else:
        ctx.paint_with_alpha(a)
    ctx.restore()


# ------------------------------------------------------------------ composition
def fill(ctx, c):
    rect(ctx, -200, -200, W + 400, H + 400, c)


def shake(ctx, t, amount, seed=0, freq=30):
    if amount <= 0:
        return
    k = math.floor(t * freq)
    dx = (hash01(seed, k) - 0.5) * 2 * amount
    dy = (hash01(seed + 9, k) - 0.5) * 2 * amount
    ctx.translate(dx, dy)


def impact_shake(t, hits, amp=26, decay=0.25):
    """Total shake amount from a list of hit times."""
    s = 0.0
    for h in hits:
        if t >= h:
            s += amp * math.exp(-(t - h) / decay * 3)
    return s


def flash(ctx, t, t0, dur=0.18, c=WHITE, peak=1.0):
    if t0 <= t < t0 + dur:
        a = peak * (1 - (t - t0) / dur) ** 1.5
        fill(ctx, alpha(c, a))


def panel(ctx, cx, cy, w, h, rot, inner, appear=1.0, border=WHITE, bw=14, shadow=INK, sh=(16, 18), bg=None):
    """Collage panel: hard shadow, white border, clipped inner drawing in (0,0,w,h)."""
    if appear <= 0.001:
        return
    s = back_out(appear)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rot)
    ctx.scale(s, s)
    if shadow is not None:
        rect(ctx, -w / 2 - bw + sh[0], -h / 2 - bw + sh[1], w + bw * 2, h + bw * 2, shadow)
    rect(ctx, -w / 2 - bw, -h / 2 - bw, w + bw * 2, h + bw * 2, border)
    ctx.rectangle(-w / 2, -h / 2, w, h)
    ctx.clip()
    ctx.translate(-w / 2, -h / 2)
    if bg is not None:
        rect(ctx, 0, 0, w, h, bg)
    inner(ctx, w, h)
    ctx.restore()


def hex_pops(ctx, t, times, seed, c=WHITE, life=0.7, rmax=70, lw=6, area=(0, 0, W, H)):
    """Hexagon outlines that pop at given times (used for plucks/accents)."""
    for i, t0 in enumerate(times):
        u = (t - t0) / life
        if 0 <= u < 1:
            x = area[0] + hash01(seed, i) * (area[2] - area[0])
            y = area[1] + hash01(seed + 1, i) * (area[3] - area[1])
            r = rmax * (0.4 + 0.6 * hash01(seed + 2, i)) * ease_out(u * 1.6)
            hexagon_path(ctx, x, y, r, hash01(seed + 3, i) * TAU + u)
            src(ctx, alpha(c, 1 - u))
            ctx.set_line_width(lw * (1 - u * 0.6))
            ctx.stroke()


def hex_confetti(ctx, t, n, seed, colors, area=(0, -100, W, H + 100), fall=180, size=(10, 26)):
    for i in range(n):
        x0 = area[0] + hash01(seed, i) * (area[2] - area[0])
        span = area[3] - area[1]
        y = area[1] + (hash01(seed + 1, i) * span + t * fall * (0.6 + hash01(seed + 2, i))) % span
        x = x0 + math.sin(t * 2 + i) * 30
        r = size[0] + (size[1] - size[0]) * hash01(seed + 3, i)
        hexagon(ctx, x, y, r, colors[i % len(colors)], rot=t * (1 + hash01(seed + 4, i)) * 2)


def rider(ctx, pts, idx, pose, t, scale, W_body, outline=WHITE, ow=5, pal=None, flip=False):
    """Sit Wilnas on the dragon's back at spine index idx."""
    p = pts[idx]
    q = pts[idx + 2]
    ang = math.atan2(p[1] - q[1], p[0] - q[0])
    nx, ny = -math.sin(ang), math.cos(ang)
    back = -W_body * 0.42
    ctx.save()
    ctx.translate(p[0] + nx * back, p[1] + ny * back)
    ctx.rotate(ang * 0.6)
    Wl.draw_character(ctx, pose, t, 0, Wl.HIP_H * scale, scale, facing=-1 if flip else 1,
                      outline=outline, outline_w=ow, pal=pal)
    ctx.restore()


def cloud(ctx, x, y, s, c=WHITE, ink=INK, lw=5):
    """Flat Japanese-style cloud: lumps on a flat base with a curl."""
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    ctx.new_path()
    ctx.move_to(-160, 0)
    ctx.arc(-110, -10, 52, math.pi * 0.95, math.pi * 1.85)
    ctx.arc(-30, -40, 66, math.pi * 1.1, math.pi * 1.95)
    ctx.arc(60, -20, 56, math.pi * 1.2, math.pi * 2.0)
    ctx.arc(130, -2, 36, math.pi * 1.3, math.pi * 2.3)
    ctx.line_to(160, 0)
    ctx.close_path()
    src(ctx, c)
    ctx.fill_preserve()
    src(ctx, ink)
    ctx.set_line_width(lw / s)
    ctx.stroke()
    ctx.new_path()
    ctx.arc(-30, -30, 26, math.pi * 1.0, math.pi * 1.9)
    ctx.stroke()
    ctx.restore()


def marquee(ctx, y, h, band, txt_c, s, font, t, speed, size=None, direction=-1):
    from gfx import text_extent, text
    rect(ctx, -10, y, W + 20, h, band)
    size = size or h * 0.62
    ext = text_extent(ctx, s, font, size)
    wdt = ext.x_advance
    off = (t * speed) % wdt
    x = -off if direction < 0 else off - wdt
    while x < W:
        text(ctx, s, font, size, x, y + h / 2, txt_c, align="left")
        x += wdt


def walk_phase(t, segments):
    """Integrate cadence. segments: list of (t_start, cycles_per_second)."""
    ph = 0.0
    for i, (ts, rate) in enumerate(segments):
        te = segments[i + 1][0] if i + 1 < len(segments) else 1e9
        if t <= ts:
            break
        ph += (min(t, te) - ts) * rate
    return ph % 1.0

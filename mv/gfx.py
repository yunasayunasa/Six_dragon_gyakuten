"""Small cairo toolkit: colours, easing, shapes, patterns and typography."""
import math

import cairo

TAU = math.tau

# ------------------------------------------------------------------ palette
def hexc(h, a=1.0):
    h = h.lstrip("#")
    return (int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255, a)


INK = hexc("1a1014")
WHITE = hexc("fbf7ef")
PAPER = hexc("f3ead8")
AI = hexc("2438ff")        # electric ultramarine (key colour)
AI_DEEP = hexc("1422b8")
SHU = hexc("ff3b2f")       # vermilion
SHU_DEEP = hexc("c4161f")
MINT = hexc("19e3c0")
GOLD = hexc("ffb627")
VIOLET = hexc("8f5bff")
PINKISH = hexc("ff7aa8")

DRAGON_COLORS = [hexc("ff3b2f"), hexc("ff8a1f"), hexc("ffd23a"),
                 hexc("19e3a0"), hexc("2f8bff"), hexc("9b5cff")]
KANJI_NUM = ["壱", "弐", "参", "肆", "伍", "陸"]


def mix(c1, c2, t):
    return tuple(a + (b - a) * t for a, b in zip(c1, c2))


def alpha(c, a):
    return (c[0], c[1], c[2], c[3] * a)


def src(ctx, c):
    ctx.set_source_rgba(*c)


# ------------------------------------------------------------------ easing
def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def lerp(a, b, t):
    return a + (b - a) * t


def prog(t, t0, t1):
    if t1 <= t0:
        return 1.0 if t >= t1 else 0.0
    return clamp((t - t0) / (t1 - t0))


def ease_out(x, p=3):
    x = clamp(x)
    return 1 - (1 - x) ** p


def ease_in(x, p=3):
    x = clamp(x)
    return x ** p


def ease_io(x, p=3):
    x = clamp(x)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2 if p == 3 else (1 - math.cos(math.pi * x)) / 2


def back_out(x, s=1.9):
    x = clamp(x)
    x -= 1
    return x * x * ((s + 1) * x + s) + 1


def elastic_out(x):
    x = clamp(x)
    if x in (0.0, 1.0):
        return x
    return 2 ** (-10 * x) * math.sin((x * 10 - 0.75) * TAU / 3) + 1


def on_twos(t, fps=30, step=2):
    """Quantise time so motion updates on 2s (anime cadence)."""
    return math.floor(t * fps / step) * step / fps


def hash01(*args):
    h = 0
    for a in args:
        h = (h * 1000003) ^ int(a * 1000 + 7919)
        h &= 0xFFFFFFFF
    h ^= h >> 13
    h = (h * 0x5bd1e995) & 0xFFFFFFFF
    h ^= h >> 15
    return (h & 0xFFFFFF) / 0xFFFFFF


# ------------------------------------------------------------------ shapes
def rect(ctx, x, y, w, h, c):
    ctx.rectangle(x, y, w, h)
    src(ctx, c)
    ctx.fill()


def circle(ctx, x, y, r, c=None):
    ctx.new_sub_path()
    ctx.arc(x, y, max(r, 0.0), 0, TAU)
    if c is not None:
        src(ctx, c)
        ctx.fill()


def poly(ctx, pts, c=None, close=True):
    ctx.move_to(*pts[0])
    for p in pts[1:]:
        ctx.line_to(*p)
    if close:
        ctx.close_path()
    if c is not None:
        src(ctx, c)
        ctx.fill()


def hexagon_path(ctx, x, y, r, rot=0.0):
    for i in range(6):
        a = rot + i * TAU / 6
        (ctx.move_to if i == 0 else ctx.line_to)(x + r * math.cos(a), y + r * math.sin(a))
    ctx.close_path()


def hexagon(ctx, x, y, r, c, rot=0.0, stroke=None, lw=0):
    hexagon_path(ctx, x, y, r, rot)
    if stroke is not None:
        src(ctx, c)
        ctx.fill_preserve()
        src(ctx, stroke)
        ctx.set_line_width(lw)
        ctx.stroke()
    else:
        src(ctx, c)
        ctx.fill()


def round_rect(ctx, x, y, w, h, r):
    r = min(r, w / 2, h / 2)
    ctx.new_sub_path()
    ctx.arc(x + w - r, y + r, r, -TAU / 4, 0)
    ctx.arc(x + w - r, y + h - r, r, 0, TAU / 4)
    ctx.arc(x + r, y + h - r, r, TAU / 4, TAU / 2)
    ctx.arc(x + r, y + r, r, TAU / 2, 3 * TAU / 4)
    ctx.close_path()


def star_burst(ctx, x, y, r_out, r_in, n, c, rot=0.0, jitter=0.0, seed=0):
    for i in range(n * 2):
        a = rot + i * TAU / (n * 2)
        r = r_out if i % 2 == 0 else r_in
        if jitter and i % 2 == 0:
            r *= 1 - jitter + 2 * jitter * hash01(seed, i)
        (ctx.move_to if i == 0 else ctx.line_to)(x + r * math.cos(a), y + r * math.sin(a))
    ctx.close_path()
    src(ctx, c)
    ctx.fill()


def rays(ctx, x, y, n, c, rot=0.0, width=0.5, length=4000):
    """Radial sunburst wedges."""
    for i in range(n):
        a0 = rot + i * TAU / n
        a1 = a0 + TAU / n * width
        ctx.move_to(x, y)
        ctx.line_to(x + length * math.cos(a0), y + length * math.sin(a0))
        ctx.line_to(x + length * math.cos(a1), y + length * math.sin(a1))
        ctx.close_path()
    src(ctx, c)
    ctx.fill()


def speed_lines_radial(ctx, x, y, t, c, n=70, r0=380, r1=2400, seed=1, thick=10):
    """Manga focus lines converging on (x, y); re-randomised on twos."""
    tq = math.floor(t * 15)
    for i in range(n):
        a = TAU * (i + hash01(seed, i, tq)) / n
        rr = r0 * (0.75 + 0.6 * hash01(seed + 3, i, tq))
        w = thick * (0.3 + hash01(seed + 7, i, tq))
        ca, sa = math.cos(a), math.sin(a)
        px, py = -sa, ca
        ctx.move_to(x + ca * rr, y + sa * rr)
        ctx.line_to(x + ca * r1 + px * w, y + sa * r1 + py * w)
        ctx.line_to(x + ca * r1 - px * w, y + sa * r1 - py * w)
        ctx.close_path()
    src(ctx, c)
    ctx.fill()


def speed_lines_h(ctx, t, c, y0, y1, n=26, seed=2, speed=5200, w=1920, direction=-1, thick=(3, 14)):
    """Horizontal motion streaks moving across the frame."""
    for i in range(n):
        yy = lerp(y0, y1, hash01(seed, i))
        ln = 220 + 900 * hash01(seed + 1, i)
        off = (t * speed * (0.6 + 0.8 * hash01(seed + 2, i)) + hash01(seed + 3, i) * (w + ln * 2)) % (w + ln * 2)
        xx = (w + ln - off) if direction < 0 else (off - ln)
        th = lerp(thick[0], thick[1], hash01(seed + 4, i))
        ctx.move_to(xx, yy - th / 2)
        ctx.line_to(xx + ln, yy)
        ctx.line_to(xx, yy + th / 2)
        ctx.close_path()
    src(ctx, c)
    ctx.fill()


def halftone(ctx, x0, y0, x1, y1, step, c, size_fn):
    """Dot screen; size_fn(x, y) -> radius."""
    src(ctx, c)
    row = 0
    y = y0
    while y < y1 + step:
        x = x0 + (step / 2 if row % 2 else 0)
        while x < x1 + step:
            r = size_fn(x, y)
            if r > 0.4:
                ctx.new_sub_path()
                ctx.arc(x, y, r, 0, TAU)
            x += step
        y += step * 0.866
        row += 1
    ctx.fill()


def kikko(ctx, x0, y0, x1, y1, r, c, lw, offset=(0, 0)):
    """Tortoise-shell hexagon lattice (six-sided motif)."""
    dx = r * 1.5
    dy = r * math.sqrt(3)
    ox, oy = offset[0] % (dx * 2), offset[1] % dy
    col = -2
    x = x0 - dx * 2 + ox
    while x < x1 + dx * 2:
        yoff = dy / 2 if col % 2 else 0
        y = y0 - dy * 2 + oy + yoff
        while y < y1 + dy * 2:
            hexagon_path(ctx, x, y, r * 0.92, 0)
            y += dy
        x += dx
        col += 1
    src(ctx, c)
    ctx.set_line_width(lw)
    ctx.stroke()


def seigaiha(ctx, x0, y0, x1, y1, r, fg, bg, lw, offset=(0, 0), rings=4):
    """Japanese blue-ocean-wave pattern built from overlapping concentric circles."""
    ox, oy = offset
    rowh = r * 0.5
    y = y0 - r + (oy % rowh)
    row = 0
    while y < y1 + r * 2:
        shift = r if row % 2 else 0
        x = x0 - 2 * r + ((ox + shift) % (2 * r))
        while x < x1 + 2 * r:
            ctx.new_path()
            ctx.arc(x, y, r, 0, TAU)
            src(ctx, bg)
            ctx.fill()
            for k in range(rings):
                ctx.new_sub_path()
                ctx.arc(x, y, r * (1 - k / rings) - lw * 0.5, 0, TAU)
            src(ctx, fg)
            ctx.set_line_width(lw)
            ctx.stroke()
            x += 2 * r
        y += rowh
        row += 1


def stripes(ctx, x0, y0, x1, y1, width, gap, c, angle, offset=0.0):
    ctx.save()
    ctx.rectangle(x0, y0, x1 - x0, y1 - y0)
    ctx.clip()
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    ctx.translate(cx, cy)
    ctx.rotate(angle)
    span = math.hypot(x1 - x0, y1 - y0)
    p = width + gap
    x = -span - (offset % p)
    while x < span:
        ctx.rectangle(x, -span, width, span * 2)
        x += p
    src(ctx, c)
    ctx.fill()
    ctx.restore()


# ------------------------------------------------------------------ text
FONT_LATIN = "Inter Display Black"
FONT_JP = "Dela Gothic One"
FONT_POP = "Mochiy Pop One"
FONT_JP_SANS = "Zen Kaku Gothic New Black"


def text_extent(ctx, s, font, size):
    ctx.select_font_face(font, cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
    ctx.set_font_size(size)
    return ctx.text_extents(s)


def text_path(ctx, s, font, size, x, y, align="center", valign="middle", tracking=0.0):
    """Adds the glyph outlines of s to the current path. Returns (w, h)."""
    ctx.select_font_face(font, cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
    ctx.set_font_size(size)
    fe = ctx.font_extents()
    if tracking:
        widths = [ctx.text_extents(ch).x_advance for ch in s]
        total = sum(widths) + tracking * size * (len(s) - 1)
    else:
        total = ctx.text_extents(s).x_advance
    if align == "center":
        x -= total / 2
    elif align == "right":
        x -= total
    asc = fe[0] * 0.78
    if valign == "middle":
        y += asc / 2
    elif valign == "top":
        y += asc
    if tracking:
        cx = x
        for ch, wdt in zip(s, widths):
            ctx.move_to(cx, y)
            ctx.text_path(ch)
            cx += wdt + tracking * size
    else:
        ctx.move_to(x, y)
        ctx.text_path(s)
    return total, asc


def text(ctx, s, font, size, x, y, fill, align="center", valign="middle", stroke=None, lw=0.0,
         tracking=0.0, stroke_under=True):
    text_path(ctx, s, font, size, x, y, align, valign, tracking)
    if stroke is not None and stroke_under:
        src(ctx, stroke)
        ctx.set_line_width(lw)
        ctx.set_line_join(cairo.LINE_JOIN_ROUND)
        ctx.stroke_preserve()
    if fill is not None:
        src(ctx, fill)
        ctx.fill_preserve()
    if stroke is not None and not stroke_under:
        src(ctx, stroke)
        ctx.set_line_width(lw)
        ctx.stroke_preserve()
    ctx.new_path()


def text_vertical(ctx, s, font, size, x, y, fill, gap=1.0, stroke=None, lw=0.0):
    for i, ch in enumerate(s):
        text(ctx, ch, font, size, x, y + i * size * gap, fill, stroke=stroke, lw=lw)


# ------------------------------------------------------------------ layering helpers
def outlined_group(ctx, draw_fn, outline_c, width, steps=12):
    """Draw something, then give its whole silhouette an outer outline (sticker look)."""
    ctx.push_group()
    draw_fn()
    pat = ctx.pop_group()
    if width > 0:
        ctx.push_group()
        for i in range(steps):
            a = i * TAU / steps
            ctx.save()
            ctx.translate(math.cos(a) * width, math.sin(a) * width)
            src(ctx, outline_c)
            ctx.mask(pat)
            ctx.restore()
        src(ctx, outline_c)
        ctx.mask(pat)
        ctx.pop_group_to_source()
        ctx.paint()
    ctx.set_source(pat)
    ctx.paint()


def drop_shadow_group(ctx, draw_fn, dx, dy, c):
    ctx.push_group()
    draw_fn()
    pat = ctx.pop_group()
    ctx.save()
    ctx.translate(dx, dy)
    src(ctx, c)
    ctx.mask(pat)
    ctx.restore()
    ctx.set_source(pat)
    ctx.paint()


def sscale(ctx, sx, sy=None):
    """ctx.scale that never produces a singular matrix (animated scales start at 0)."""
    sy = sx if sy is None else sy
    sx = sx if abs(sx) > 1e-3 else (1e-3 if sx >= 0 else -1e-3)
    sy = sy if abs(sy) > 1e-3 else (1e-3 if sy >= 0 else -1e-3)
    ctx.scale(sx, sy)

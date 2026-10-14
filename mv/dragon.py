"""Flat 'paper-cut' eastern dragon whose body follows its own flight path."""
import math

import cairo

from gfx import INK, TAU, hexc, mix, src

CREAM = hexc("fff1c9")


def spine(traj, t, n=56, seg=22.0, window=4.0, samples=500):
    """Points along the path the head travelled, resampled at equal arc length."""
    pts = [traj(t - window * i / samples) for i in range(samples)]
    acc = [0.0]
    for i in range(1, samples):
        acc.append(acc[-1] + math.dist(pts[i], pts[i - 1]))
    out = []
    j = 0
    for k in range(n):
        s = k * seg
        while j < samples - 2 and acc[j + 1] < s:
            j += 1
        span = acc[j + 1] - acc[j]
        u = 0.0 if span <= 1e-9 else min(1.0, max(0.0, (s - acc[j]) / span))
        out.append((pts[j][0] + (pts[j + 1][0] - pts[j][0]) * u,
                    pts[j][1] + (pts[j + 1][1] - pts[j][1]) * u))
    return out


def normals(pts):
    ns = []
    for i in range(len(pts)):
        a = pts[max(0, i - 1)]
        b = pts[min(len(pts) - 1, i + 1)]
        dx, dy = a[0] - b[0], a[1] - b[1]   # towards the head
        ln = math.hypot(dx, dy) or 1.0
        ns.append((-dy / ln, dx / ln, dx / ln, dy / ln))
    return ns


def width_profile(u):
    if u < 0.08:
        return 0.72 + 0.28 * u / 0.08
    if u < 0.45:
        return 1.0
    return max(0.12, 1.0 - (u - 0.45) / 0.55 * 0.88)


def draw_dragon(ctx, pts, color, t, W=64.0, mane=None, belly=CREAM, lw=5.0, flip=False,
                mouth=0.5, label=None, ink=INK):
    n = len(pts)
    ns = normals(pts)
    sgn = -1.0 if flip else 1.0
    dark = mix(color, ink, 0.38)
    mane = mane or mix(color, hexc("ffffff"), 0.55)

    def off(i, k):
        nx, ny = ns[i][0] * sgn, ns[i][1] * sgn
        w = W * width_profile(i / (n - 1)) / 2
        return pts[i][0] + nx * w * k, pts[i][1] + ny * w * k

    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)

    # dorsal fins on the back edge (k = -1 side)
    for i in range(3, n - 4, 3):
        bx, by = off(i, -0.9)
        nx, ny = ns[i][0] * sgn, ns[i][1] * sgn
        tx, ty = ns[i][2], ns[i][3]
        h = W * width_profile(i / (n - 1)) * 0.55
        flutter = math.sin(t * 9 - i * 0.5) * 0.25
        ctx.move_to(bx + tx * h * 0.35, by + ty * h * 0.35)
        ctx.line_to(bx - nx * h - tx * h * (0.5 + flutter), by - ny * h - ty * h * (0.5 + flutter))
        ctx.line_to(bx - tx * h * 0.45, by - ty * h * 0.45)
        ctx.close_path()
    src(ctx, mane)
    ctx.fill_preserve()
    src(ctx, ink)
    ctx.set_line_width(lw * 0.8)
    ctx.stroke()

    # tail tuft
    tx_, ty_ = pts[-1]
    a = math.atan2(pts[-1][1] - pts[-4][1], pts[-1][0] - pts[-4][0])
    ctx.save()
    ctx.translate(tx_, ty_)
    ctx.rotate(a)
    for k in range(3):
        sp = (k - 1) * 0.5 + math.sin(t * 8 + k) * 0.15
        ctx.move_to(-4, 0)
        ctx.curve_to(W * 0.6, W * 0.5 * sp - W * 0.2, W * 1.0, W * sp, W * 1.4, W * sp * 1.2)
        ctx.curve_to(W * 0.8, W * sp * 0.6 + W * 0.15, W * 0.4, W * 0.15, -4, 0)
        ctx.close_path()
    ctx.restore()
    src(ctx, mane)
    ctx.fill_preserve()
    src(ctx, ink)
    ctx.set_line_width(lw * 0.8)
    ctx.stroke()

    # body ribbon
    left = [off(i, -1) for i in range(n)]
    right = [off(i, 1) for i in range(n)]
    ctx.move_to(*left[0])
    for p in left[1:]:
        ctx.line_to(*p)
    for p in reversed(right):
        ctx.line_to(*p)
    ctx.close_path()
    body_path = ctx.copy_path()
    src(ctx, color)
    ctx.fill()

    # belly plates
    ctx.save()
    ctx.append_path(body_path)
    ctx.clip()
    bl = [off(i, 0.15) for i in range(n)]
    ctx.move_to(*bl[0])
    for p in bl[1:]:
        ctx.line_to(*p)
    for p in reversed(right):
        ctx.line_to(*p)
    ctx.close_path()
    src(ctx, belly)
    ctx.fill()
    src(ctx, mix(belly, ink, 0.35))
    ctx.set_line_width(lw * 0.5)
    for i in range(2, n - 2, 2):
        ctx.move_to(*off(i, 0.15))
        ctx.line_to(*off(i, 1.0))
    ctx.stroke()
    # scale arcs on the back half
    src(ctx, dark)
    ctx.set_line_width(lw * 0.55)
    for i in range(2, n - 3, 2):
        for k in (-0.55, -0.1):
            px, py = off(i + (1 if k > -0.3 else 0), k)
            r = W * width_profile(i / (n - 1)) * 0.17
            if r < 2:
                continue
            ang = math.atan2(ns[i][3], ns[i][2])
            ctx.new_sub_path()
            ctx.arc(px, py, r, ang + math.pi / 2, ang + 3 * math.pi / 2)
    ctx.stroke()
    ctx.restore()
    ctx.append_path(body_path)
    src(ctx, ink)
    ctx.set_line_width(lw)
    ctx.stroke()

    draw_dragon_head(ctx, pts, ns, color, dark, mane, belly, t, W, lw, sgn, mouth, ink)

    if label:
        from gfx import FONT_JP, text, WHITE
        i = int(n * 0.3)
        text(ctx, label, FONT_JP, W * 1.1, pts[i][0], pts[i][1], WHITE, stroke=ink, lw=lw * 2.2)


def draw_dragon_head(ctx, pts, ns, color, dark, mane, belly, t, W, lw, sgn, mouth, ink):
    hx, hy = pts[0]
    dx, dy = ns[0][2], ns[0][3]
    ang = math.atan2(dy, dx)
    ctx.save()
    ctx.translate(hx, hy)
    ctx.rotate(ang)
    hs = W / 64.0 * 1.45
    ctx.scale(hs, hs * sgn)
    # local frame: +x forward (snout), +y = belly side

    def ink_fill(c, w=lw):
        src(ctx, c)
        ctx.fill_preserve()
        src(ctx, ink)
        ctx.set_line_width(w / hs)
        ctx.stroke()

    # mane flames flowing back
    for k in range(5):
        y0 = -26 + k * 12
        wv = math.sin(t * 10 + k * 1.3) * 10
        ctx.move_to(-6, y0 - 8)
        ctx.curve_to(-40, y0 - 20 + wv, -70, y0 - 6 + wv, -96 - k * 6, y0 + wv * 1.4 - 4)
        ctx.curve_to(-60, y0 + 8 + wv, -30, y0 + 10, -6, y0 + 8)
        ctx.close_path()
    ink_fill(mane)
    # horns
    for k, (bx, s) in enumerate(((-4, 1.0), (10, 0.8))):
        ctx.move_to(bx, -30)
        ctx.curve_to(bx - 20 * s, -60 * s, bx - 50 * s, -74 * s, bx - 84 * s, -70 * s)
        ctx.curve_to(bx - 60 * s, -64 * s, bx - 40 * s, -56 * s, bx - 26 * s, -52 * s)
        ctx.curve_to(bx - 38 * s, -78 * s, bx - 44 * s, -90 * s, bx - 40 * s, -104 * s)
        ctx.curve_to(bx - 22 * s, -84 * s, bx - 12 * s, -60 * s, bx + 10, -30)
        ctx.close_path()
        ink_fill(belly if k == 0 else mix(belly, ink, 0.15))
    # lower jaw
    op = 10 + 22 * mouth
    ctx.move_to(-4, 10)
    ctx.curve_to(30, 14, 60, 8 + op, 92, 6 + op)
    ctx.curve_to(96, 14 + op, 80, 26 + op, 50, 26 + op * 0.6)
    ctx.curve_to(20, 30, -2, 26, -10, 18)
    ctx.close_path()
    ink_fill(color)
    # teeth on the jaw
    for x in range(30, 88, 12):
        ctx.move_to(x, 8 + op * (x / 92))
        ctx.line_to(x + 5, 1 + op * (x / 92))
        ctx.line_to(x + 10, 8 + op * (x / 92))
        ctx.close_path()
    ink_fill(hexc("ffffff"), lw * 0.6)
    # skull + snout
    ctx.move_to(-14, -30)
    ctx.curve_to(10, -46, 50, -40, 70, -22)
    ctx.curve_to(90, -24, 112, -18, 116, -4)
    ctx.curve_to(118, 6, 106, 10, 92, 6)
    ctx.curve_to(60, 10, 30, 10, -4, 12)
    ctx.curve_to(-20, 4, -22, -18, -14, -30)
    ctx.close_path()
    ink_fill(color)
    # snout ridge / brow plate
    ctx.move_to(20, -36)
    ctx.curve_to(40, -46, 62, -36, 72, -24)
    ctx.curve_to(56, -28, 40, -28, 20, -26)
    ctx.close_path()
    ink_fill(dark, lw * 0.6)
    # upper fangs
    for x in (78, 94):
        ctx.move_to(x, 5)
        ctx.line_to(x + 4, 18)
        ctx.line_to(x + 9, 5)
        ctx.close_path()
    ink_fill(hexc("ffffff"), lw * 0.6)
    # eye
    ctx.new_path()
    ctx.save()
    ctx.translate(36, -18)
    ctx.scale(1.3, 1.0)
    ctx.arc(0, 0, 9, 0, TAU)
    ctx.restore()
    ink_fill(hexc("ffd23a"), lw * 0.8)
    ctx.new_path()
    ctx.save()
    ctx.translate(38, -18)
    ctx.scale(0.35, 1.0)
    ctx.arc(0, 0, 8, 0, TAU)
    ctx.restore()
    src(ctx, ink)
    ctx.fill()
    ctx.move_to(20, -30)
    ctx.line_to(54, -26)
    ctx.set_line_width(lw * 1.1 / hs)
    ctx.stroke()
    # nostril
    ctx.new_path()
    ctx.arc(104, -10, 3.5, 0, TAU)
    src(ctx, ink)
    ctx.fill()
    # whiskers
    for k, yy in enumerate((-4, 4)):
        ctx.move_to(100, yy)
        w1 = math.sin(t * 6 + k) * 20
        w2 = math.sin(t * 6 + k + 1.5) * 26
        ctx.curve_to(70, yy - 30 + w1, 10, yy + 40 + w2, -60, yy - 10 + w1)
        ctx.set_line_width(lw * 1.1 / hs)
        src(ctx, ink)
        ctx.stroke_preserve()
        ctx.set_line_width(lw * 0.45 / hs)
        src(ctx, mane)
        ctx.stroke()
    ctx.restore()


def wave_traj(x0, x1, y, amp, period, speed, phase=0.0, t0=0.0):
    """Horizontal flight with a sine wobble; head at x0 + speed*(t - t0)."""
    def f(tt):
        x = x0 + speed * (tt - t0)
        return x, y + amp * math.sin((x - x0) / period * TAU + phase)
    return f


def circle_traj(cx, cy, r, w, phase=0.0, ry=None):
    ry = ry or r
    def f(tt):
        a = phase + w * tt
        return cx + r * math.cos(a), cy + ry * math.sin(a)
    return f

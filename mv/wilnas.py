"""Wilnas (ウィルナス) rebuilt as a flat, outlined 2D puppet for cairo.

The character faces +x. Ground is y = 0, units are "character units"
(full height including hair ornament is roughly 500).
"""
import math
from dataclasses import dataclass, field, replace

import cairo

from gfx import TAU, hexc, mix, src

D2R = math.pi / 180

BASE_PAL = {
    "ink": hexc("1a1014"),
    "hair": hexc("ef2b2d"), "hair_d": hexc("a3121e"), "hair_l": hexc("ff7a63"),
    "skin": hexc("f8cfae"), "skin_d": hexc("e09a7c"),
    "red": hexc("d11f2c"), "red_d": hexc("861020"),
    "black": hexc("2c2228"), "black_d": hexc("171015"),
    "gold": hexc("f2b33d"), "gold_d": hexc("b57a1c"),
    "rope": hexc("fbf7ef"), "rope_d": hexc("c9c0b4"),
    "violet": hexc("9a63e8"), "violet_d": hexc("5f3aa6"),
    "pants": hexc("3d2a2c"), "pants_d": hexc("24171a"),
    "wrap": hexc("6b4a3a"), "wrap_d": hexc("44302a"),
    "iris": hexc("e3262f"), "iris_d": hexc("7a0b12"),
    "eye_w": hexc("ffffff"),
    "metal": hexc("c9ccd6"),
}


def silhouette_pal(c, ink=None):
    return {k: (ink if (k == "ink" and ink is not None) else c) for k in BASE_PAL}


def tinted_pal(target, amount):
    return {k: mix(v, target, amount) if k != "ink" else v for k, v in BASE_PAL.items()}


@dataclass
class Pose:
    x: float = 0.0
    y: float = 0.0           # extra lift (negative = up)
    rot: float = 0.0         # whole-body rotation (deg) around hip
    lean: float = 4.0        # torso lean, + forward
    head: float = 0.0        # head tilt, + forward/down
    sh_n: float = -8.0       # near shoulder (0 = arm down, + forward)
    el_n: float = 20.0
    sh_f: float = 8.0
    el_f: float = 20.0
    hip_n: float = 4.0       # thigh angle (0 = straight down, + forward)
    kn_n: float = 6.0        # knee bend (+ = shin swings back)
    an_n: float = 0.0
    hip_f: float = -4.0
    kn_f: float = 6.0
    an_f: float = 0.0
    eye: float = 1.0         # eye openness
    look: tuple = (0.0, 0.0)  # pupil offset
    mouth: str = "smirk"     # smirk | grin | shout | line
    fist_n: bool = True
    wind: float = 0.4        # how much hair/cloth trails backwards
    ground: bool = True      # auto-plant the lowest foot on y=0


def lerp_pose(a, b, t):
    out = {}
    for f in a.__dataclass_fields__:
        va, vb = getattr(a, f), getattr(b, f)
        if isinstance(va, (int, float)) and not isinstance(va, bool):
            out[f] = va + (vb - va) * t
        elif isinstance(va, tuple):
            out[f] = tuple(x + (y - x) * t for x, y in zip(va, vb))
        else:
            out[f] = va if t < 0.5 else vb
    return Pose(**out)


# ------------------------------------------------------------------ preset poses
STAND = Pose()
HERO = Pose(lean=-2, head=-6, sh_n=-20, el_n=95, sh_f=-35, el_f=40, hip_n=14, kn_n=4,
            hip_f=-16, kn_f=8, mouth="grin", wind=0.8)
FIST_UP = Pose(lean=-8, head=-12, sh_n=112, el_n=0, sh_f=-30, el_f=50, hip_n=18, kn_n=6,
               hip_f=-20, kn_f=4, mouth="shout", wind=1.0)
CROUCH = Pose(lean=26, head=8, sh_n=-40, el_n=80, sh_f=-60, el_f=70, hip_n=62, kn_n=112,
              an_n=10, hip_f=-24, kn_f=66, an_f=10, eye=0.85, mouth="line", wind=0.5)
JUMP_UP = Pose(lean=-6, head=-12, sh_n=150, el_n=20, sh_f=-60, el_f=30, hip_n=40, kn_n=60,
               hip_f=-25, kn_f=20, an_f=-20, mouth="grin", wind=1.0, ground=False)
TUCK = Pose(lean=30, head=6, sh_n=40, el_n=110, sh_f=30, el_f=110, hip_n=95, kn_n=140,
            hip_f=80, kn_f=140, mouth="grin", wind=1.0, ground=False)
PUNCH_WIND = Pose(lean=-6, head=0, sh_n=-60, el_n=120, sh_f=60, el_f=40, hip_n=30, kn_n=40,
                  hip_f=-30, kn_f=10, mouth="line", wind=0.5)
PUNCH = Pose(lean=14, head=4, sh_n=90, el_n=0, sh_f=-50, el_f=80, hip_n=40, kn_n=30,
             hip_f=-38, kn_f=4, mouth="shout", wind=1.0)
KICK = Pose(lean=-18, head=-4, sh_n=40, el_n=70, sh_f=-70, el_f=50, hip_n=105, kn_n=0, an_n=-30,
            hip_f=-10, kn_f=10, mouth="shout", wind=1.0)
RIDE = Pose(lean=18, head=-4, sh_n=20, el_n=60, sh_f=-30, el_f=50, hip_n=70, kn_n=95,
            hip_f=40, kn_f=110, an_f=10, mouth="grin", wind=1.0, ground=False)
LOOK_BACK = Pose(lean=-2, head=-10, sh_n=-10, el_n=30, sh_f=10, el_f=30, look=(-6, -1),
                 mouth="smirk")


def walk_pose(phase, run=False, base=None):
    """Procedural walk/run cycle. phase in [0, 1)."""
    p = phase * TAU
    if run:
        A, kb, kmax, arm, el, lean = 46, 18, 105, 55, 95, 16
    else:
        A, kb, kmax, arm, el, lean = 24, 6, 48, 30, 28, 5
    th_n = A * math.sin(p)
    th_f = A * math.sin(p + math.pi)

    def knee(q):
        return kb + kmax * max(0.0, math.cos(q - 0.35)) ** 2

    pose = replace(base or STAND,
                   hip_n=th_n, kn_n=knee(p), an_n=-6 * math.cos(p),
                   hip_f=th_f, kn_f=knee(p + math.pi), an_f=-6 * math.cos(p + math.pi),
                   sh_n=-arm * math.sin(p) + (10 if run else -4), el_n=el + 8 * math.sin(p),
                   sh_f=arm * math.sin(p) + (10 if run else -4), el_f=el - 8 * math.sin(p),
                   lean=lean + 2 * math.sin(2 * p), head=-2 * math.sin(2 * p),
                   wind=0.9 if run else 0.5)
    if run:
        pose.y = -18 * abs(math.sin(p))
        pose.mouth = "grin"
    return pose


# ------------------------------------------------------------------ geometry helpers
HIP_H = 140.0
THIGH, SHIN, FOOT_H = 62.0, 64.0, 16.0
UPPER, FORE = 50.0, 44.0


def dirv(deg):
    a = deg * D2R
    return math.sin(a), math.cos(a)


def leg_points(hx, hy, hip, kn, an):
    dx, dy = dirv(hip)
    kx, ky = hx + dx * THIGH, hy + dy * THIGH
    sdeg = hip - kn
    sx, sy = dirv(sdeg)
    ax, ay = kx + sx * SHIN, ky + sy * SHIN
    return (kx, ky), (ax, ay), sdeg


def capsule(ctx, x0, y0, x1, y1, w0, w1):
    a = math.atan2(y1 - y0, x1 - x0)
    nx, ny = -math.sin(a), math.cos(a)
    ctx.move_to(x0 + nx * w0 / 2, y0 + ny * w0 / 2)
    ctx.line_to(x1 + nx * w1 / 2, y1 + ny * w1 / 2)
    ctx.arc_negative(x1, y1, w1 / 2, a + math.pi / 2, a - math.pi / 2)
    ctx.line_to(x0 - nx * w0 / 2, y0 - ny * w0 / 2)
    ctx.arc_negative(x0, y0, w0 / 2, a - math.pi / 2, a + math.pi / 2)
    ctx.close_path()


class Painter:
    """Fills a path with flat colour + cel shadow rim, then inks it."""

    def __init__(self, ctx, pal, lw=4.2, shade=(5.0, -5.0)):
        self.ctx, self.pal, self.lw, self.shade = ctx, pal, lw, shade

    def part(self, path_fn, base, dark=None, line=True, lw=None):
        ctx = self.ctx
        ctx.new_path()
        path_fn()
        if dark is not None and self.shade:
            ctx.save()
            ctx.clip_preserve()
            src(ctx, self.pal[dark])
            ctx.fill()
            # shift toward the light (screen space) and refill with the base tone
            dx, dy = ctx.device_to_user_distance(*self._device_shade())
            ctx.translate(dx, dy)
            path_fn()
            src(ctx, self.pal[base])
            ctx.fill()
            ctx.restore()
            ctx.new_path()
            path_fn()
        else:
            src(ctx, self.pal[base])
            ctx.fill_preserve()
        if line:
            src(ctx, self.pal["ink"])
            ctx.set_line_width(lw or self.lw)
            ctx.set_line_join(cairo.LINE_JOIN_ROUND)
            ctx.stroke()
        else:
            ctx.new_path()

    def _device_shade(self):
        # shade offset expressed in device pixels relative to current scale
        m = self.ctx.get_matrix()
        s = math.sqrt(abs(m.xx * m.yy - m.xy * m.yx))
        return self.shade[0] * s, self.shade[1] * s

    def line(self, pts, lw=None, c="ink", close=False):
        ctx = self.ctx
        ctx.new_path()
        ctx.move_to(*pts[0])
        for p in pts[1:]:
            ctx.line_to(*p)
        if close:
            ctx.close_path()
        src(ctx, self.pal[c])
        ctx.set_line_width(lw or self.lw)
        ctx.set_line_cap(cairo.LINE_CAP_ROUND)
        ctx.set_line_join(cairo.LINE_JOIN_ROUND)
        ctx.stroke()

    def curve(self, p0, c1, c2, p1, lw=None, c="ink"):
        ctx = self.ctx
        ctx.new_path()
        ctx.move_to(*p0)
        ctx.curve_to(*c1, *c2, *p1)
        src(ctx, self.pal[c])
        ctx.set_line_width(lw or self.lw)
        ctx.set_line_cap(cairo.LINE_CAP_ROUND)
        ctx.stroke()


def wave_strip(ctx, root, length, width0, width1, base_angle, t, amp, freq, phase, segs=10):
    """A fluttering ribbon/tail polygon starting at root."""
    left, right = [], []
    x, y = root
    ang = base_angle
    pts = [(x, y)]
    for i in range(1, segs + 1):
        u = i / segs
        a = (base_angle + amp * u * math.sin(t * freq - u * 4.0 + phase)) * D2R
        x += math.cos(a) * length / segs
        y += math.sin(a) * length / segs
        pts.append((x, y))
    for i, (px, py) in enumerate(pts):
        u = i / segs
        if i < segs:
            nx_, ny_ = pts[i + 1][0] - px, pts[i + 1][1] - py
        else:
            nx_, ny_ = px - pts[i - 1][0], py - pts[i - 1][1]
        ln = math.hypot(nx_, ny_) or 1
        nx, ny = -ny_ / ln, nx_ / ln
        w = (width0 + (width1 - width0) * u) / 2
        left.append((px + nx * w, py + ny * w))
        right.append((px - nx * w, py - ny * w))
    ctx.move_to(*left[0])
    for p in left[1:]:
        ctx.line_to(*p)
    for p in reversed(right):
        ctx.line_to(*p)
    ctx.close_path()


# ------------------------------------------------------------------ head
def draw_head(pt, pose, t):
    """Head in head-local coords: cranium centre at (0,0), facing +x."""
    ctx, pal = pt.ctx, pt.pal
    wind = pose.wind
    wob = lambda ph, amp=1.0: math.sin(t * 7.0 + ph) * amp * (0.4 + wind)

    # back hair mass (spikes trailing back / up)
    def back_hair():
        ctx.move_to(40, -40)
        ctx.curve_to(36, -76, 0, -90, -20, -84)
        prev = (-20, -84)
        anchors = [(-40, -80), (-62, -66), (-74, -40), (-78, -6), (-70, 26), (-48, 46), (-20, 52)]
        order = [(10, -132), (-40, -116), (-96, -100), (-150, -64), (-138, -6), (-112, 42), (-70, 64)]
        for (ax, ay), (sx, sy) in zip(anchors, order):
            sx += wob(sx * 0.02, 6) - wind * 10
            sy += wob(sy * 0.03, 4)
            ctx.line_to(sx, sy)
            ctx.line_to(ax, ay)
        ctx.line_to(-4, 40)
        ctx.close_path()

    pt.part(back_hair, "hair", "hair_d")

    # purple feather tucked behind (back-left)
    def feather_v():
        a = -150 + wob(1.0, 6)
        wave_strip(ctx, (-46, -62), 78, 22, 2, a, t, 10 * (0.3 + wind), 6, 0.5, 8)

    pt.part(feather_v, "violet", "violet_d")

    # neck
    def neck():
        ctx.move_to(-16, 40)
        ctx.line_to(22, 40)
        ctx.line_to(22, 82)
        ctx.line_to(-16, 82)
        ctx.close_path()

    pt.part(neck, "skin", "skin_d")

    # far-side hair lock framing the face (behind ear line, in front of cheek edge)
    def side_lock():
        ctx.move_to(40, -50)
        ctx.curve_to(72, -40, 84, -10, 80 + wob(2, 3), 22)
        ctx.curve_to(72, 4, 64, -6, 54, -14)
        ctx.close_path()

    pt.part(side_lock, "hair", "hair_d")

    # face
    def face():
        ctx.move_to(-34, -40)
        ctx.curve_to(0, -62, 46, -56, 56, -18)
        ctx.curve_to(60, -4, 56, 6, 58, 16)
        ctx.curve_to(60, 30, 56, 44, 40, 62)
        ctx.curve_to(32, 70, 18, 70, 6, 62)
        ctx.curve_to(-14, 50, -32, 34, -40, 10)
        ctx.close_path()

    pt.part(face, "skin", "skin_d")

    # ear (pointed)
    def ear():
        tipx, tipy = -84 + wob(3.0, 1.5), -30
        ctx.move_to(-22, -6)
        ctx.curve_to(-40, -16, -64, -26, tipx, tipy)
        ctx.curve_to(-66, -6, -50, 22, -30, 30)
        ctx.curve_to(-20, 28, -16, 14, -22, -6)
        ctx.close_path()

    pt.part(ear, "skin", "skin_d")
    pt.curve((-34, 0), (-46, -6), (-58, -14), (-70, -24), lw=2.4, c="skin_d")

    # eye
    draw_eye(pt, pose)

    # brow (determined)
    def brow():
        ctx.move_to(12, -22)
        ctx.curve_to(24, -30, 38, -28, 50, -18)
        ctx.line_to(48, -14)
        ctx.curve_to(36, -22, 24, -22, 14, -16)
        ctx.close_path()

    pt.part(brow, "hair_d", None, line=False)

    # kabuki-ish red marking under the eye corner
    def mark():
        ctx.move_to(8, 18)
        ctx.line_to(28, 26)
        ctx.line_to(12, 24)
        ctx.close_path()

    pt.part(mark, "red", None, line=False)

    # nose + mouth
    pt.line([(58, 18), (54, 26)], lw=2.4, c="skin_d")
    draw_mouth(pt, pose)

    # front bangs
    def bangs():
        ctx.move_to(-30, -50)
        ctx.curve_to(-6, -96, 52, -96, 70, -46)
        ctx.line_to(60, -8 + wob(4, 2))     # long bang tip
        ctx.line_to(46, -34)
        ctx.line_to(36, -6 + wob(5, 2))
        ctx.line_to(26, -34)
        ctx.line_to(12, -14 + wob(6, 2))
        ctx.line_to(6, -38)
        ctx.line_to(-10, -24)
        ctx.line_to(-14, -44)
        ctx.close_path()

    pt.part(bangs, "hair", "hair_d")

    def hair_hl():
        ctx.move_to(-6, -70)
        ctx.curve_to(10, -82, 30, -82, 44, -70)
        ctx.curve_to(30, -74, 12, -72, -6, -70)
        ctx.close_path()

    pt.part(hair_hl, "hair_l", None, line=False)

    # top spike sweeping forward (signature silhouette)
    def top_spike():
        ctx.move_to(-10, -78)
        ctx.curve_to(20, -128, 70, -118, 96 + wob(7, 4), -86)
        ctx.curve_to(70, -92, 46, -84, 30, -70)
        ctx.close_path()

    pt.part(top_spike, "hair", "hair_d")

    # twisted white rope headband
    draw_rope(pt, pose, t)


def draw_eye(pt, pose):
    ctx, pal = pt.ctx, pt.pal
    o = max(0.0, min(1.0, pose.eye))
    cx, cy = 30, 6
    if o < 0.12:
        pt.curve((14, 4), (22, 10), (36, 10), (46, 2), lw=4.5)
        return
    h = 26 * o
    top = cy - h * 0.55
    bot = cy + h * 0.45

    def white():
        ctx.move_to(14, cy - 2)
        ctx.curve_to(18, top - 2, 40, top - 4, 46, cy - 4)
        ctx.curve_to(44, bot, 30, bot + 2, 18, bot - 2)
        ctx.close_path()

    ctx.save()
    ctx.new_path()
    white()
    src(ctx, pal["eye_w"])
    ctx.fill_preserve()
    ctx.clip()
    lx, ly = pose.look
    ix, iy = cx + 4 + lx, cy + 2 + ly
    ctx.new_path()
    ctx.save()
    ctx.translate(ix, iy)
    ctx.scale(0.78, 1.0)
    ctx.arc(0, 0, 13, 0, TAU)
    ctx.restore()
    src(ctx, pal["iris"])
    ctx.fill()
    ctx.new_path()
    ctx.save()
    ctx.translate(ix, iy - 3)
    ctx.scale(0.78, 1.0)
    ctx.arc(0, 0, 9, math.pi, TAU)
    ctx.restore()
    src(ctx, pal["iris_d"])
    ctx.fill()
    ctx.new_path()
    ctx.save()
    ctx.translate(ix + 1, iy + 1)
    ctx.scale(0.7, 1.0)
    ctx.arc(0, 0, 5.5, 0, TAU)
    ctx.restore()
    src(ctx, pal["ink"])
    ctx.fill()
    for (hx, hy, r) in ((ix - 4, iy - 6, 3.6), (ix + 4, iy + 6, 1.8)):
        ctx.new_path()
        ctx.arc(hx, hy, r, 0, TAU)
        src(ctx, pal["eye_w"])
        ctx.fill()
    ctx.restore()
    # upper lash line with flick at the outer corner
    ctx.new_path()
    ctx.move_to(4, cy - 8 * o)
    ctx.curve_to(14, top - 2, 34, top - 6, 48, cy - 4)
    ctx.curve_to(36, top + 1, 18, top + 3, 4, cy - 8 * o)
    ctx.close_path()
    src(ctx, pal["ink"])
    ctx.fill()
    pt.curve((20, bot - 1), (28, bot + 2), (36, bot + 1), (42, bot - 3), lw=2.2)


def draw_mouth(pt, pose):
    ctx = pt.ctx
    if pose.mouth == "shout":
        def m():
            ctx.move_to(32, 40)
            ctx.curve_to(40, 36, 52, 38, 54, 42)
            ctx.curve_to(52, 58, 40, 60, 34, 52)
            ctx.close_path()

        pt.part(m, "red_d", None, lw=3)
        ctx.new_path()
        ctx.move_to(36, 41)
        ctx.line_to(52, 41)
        ctx.line_to(51, 45)
        ctx.line_to(37, 45)
        ctx.close_path()
        src(ctx, pt.pal["eye_w"])
        ctx.fill()
    elif pose.mouth == "grin":
        def m():
            ctx.move_to(32, 42)
            ctx.curve_to(40, 44, 50, 42, 55, 37)
            ctx.curve_to(52, 50, 40, 52, 32, 42)
            ctx.close_path()

        pt.part(m, "eye_w", None, lw=2.6)
    elif pose.mouth == "line":
        pt.line([(36, 46), (52, 44)], lw=3)
    else:
        pt.curve((34, 46), (40, 48), (48, 46), (54, 40), lw=3)


def draw_rope(pt, pose, t):
    ctx = pt.ctx
    # rope runs from behind the head (top-back) to the brow at the front
    p0, c1, c2, p3 = (-58, -58), (-30, -86), (20, -84), (58, -46)

    def bez(u):
        a = (1 - u) ** 3
        b = 3 * (1 - u) ** 2 * u
        c = 3 * (1 - u) * u * u
        d = u ** 3
        return (a * p0[0] + b * c1[0] + c * c2[0] + d * p3[0],
                a * p0[1] + b * c1[1] + c * c2[1] + d * p3[1])

    # red tie cord and fluttering tails at the back end
    def tails():
        for k, (ln, ph) in enumerate(((70, 0.0), (56, 1.7))):
            wave_strip(ctx, (-60, -56), ln, 9, 4, 175 - 18 * k - 10 * pose.wind, t, 22 * (0.3 + pose.wind), 8, ph, 8)

    pt.part(tails, "red", "red_d", lw=3.2)
    # feathers / paper plume at the top
    for k, (ang, ln) in enumerate(((-120, 64), (-95, 74), (-70, 56))):
        def plume(ang=ang, ln=ln, k=k):
            wave_strip(ctx, (-30, -78), ln, 20, 2, ang + math.sin(t * 6 + k) * 5 * (0.4 + pose.wind), t, 6, 5, k, 8)

        pt.part(plume, "rope", "rope_d", lw=3.4)
    # twisted rope: alternating lobes along the curve
    n = 13
    for i in range(n):
        u0, u1 = i / n, (i + 1.15) / n
        a, b = bez(u0), bez(min(u1, 1))
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        ang = math.atan2(b[1] - a[1], b[0] - a[0])
        r = 11.5 - 3.0 * abs(u0 - 0.45)

        def lobe(mx=mx, my=my, ang=ang, r=r):
            ctx.save()
            ctx.translate(mx, my)
            ctx.rotate(ang + 0.55)
            ctx.scale(1.0, 0.62)
            ctx.arc(0, 0, r, 0, TAU)
            ctx.restore()

        pt.part(lobe, "rope", "rope_d", lw=3.0)
    # small red knot at the back
    def knot():
        ctx.arc(-58, -56, 9, 0, TAU)

    pt.part(knot, "red", "red_d", lw=3.0)


# ------------------------------------------------------------------ body parts
def draw_arm(pt, sx, sy, sh, el, far, t, fist_scale=1.35):
    ctx = pt.ctx
    dx, dy = dirv(sh)
    ex, ey = sx + dx * UPPER, sy + dy * UPPER
    fdeg = sh + el
    fx_, fy_ = dirv(fdeg)
    hx, hy = ex + fx_ * FORE, ey + fy_ * FORE

    pt.part(lambda: capsule(ctx, sx, sy, ex, ey, 36, 32), "black", "black_d")
    # forearm: bracer
    pt.part(lambda: capsule(ctx, ex, ey, hx, hy, 32, 38), "black", "black_d")
    # gold band + red cord on the bracer
    bx, by = ex + fx_ * FORE * 0.62, ey + fy_ * FORE * 0.62
    nx, ny = -fy_, fx_
    pt.line([(bx + nx * 18, by + ny * 18), (bx - nx * 18, by - ny * 18)], lw=7, c="gold")
    cx, cy = ex + fx_ * FORE * 0.82, ey + fy_ * FORE * 0.82
    pt.line([(cx + nx * 19, cy + ny * 19), (cx - nx * 19, cy - ny * 19)], lw=6, c="red")
    if not far:
        tail = [(cx - nx * 12, cy - ny * 12),
                (cx - nx * 22 - fx_ * 10 + math.sin(t * 9) * 3, cy - ny * 22 - fy_ * 10)]
        pt.line(tail, lw=4, c="red")
    # fist
    def fist():
        ctx.save()
        ctx.translate(hx + fx_ * 9, hy + fy_ * 9)
        ctx.rotate(-fdeg * D2R)
        ctx.scale(fist_scale, fist_scale)
        round_fist(ctx)
        ctx.restore()

    pt.part(fist, "skin", "skin_d", lw=3.6)
    return (hx, hy)


def round_fist(ctx):
    ctx.move_to(-13, -8)
    ctx.curve_to(-15, 10, -10, 20, 2, 20)
    ctx.curve_to(16, 20, 17, 6, 15, -6)
    ctx.curve_to(12, -14, -10, -14, -13, -8)
    ctx.close_path()


def draw_sode(pt, sx, sy, sh, lean):
    """Shoulder armour plate hanging over the upper arm."""
    ctx = pt.ctx
    ang = max(-45.0, min(40.0, sh * 0.55 + lean * 0.3))

    def plate():
        ctx.save()
        ctx.translate(sx, sy)
        ctx.rotate(-ang * D2R)
        ctx.move_to(-30, -12)
        ctx.line_to(32, -10)
        ctx.line_to(38, 52)
        ctx.curve_to(12, 60, -12, 60, -32, 52)
        ctx.close_path()
        ctx.restore()

    pt.part(plate, "red", "red_d")
    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate(-ang * D2R)
    for yy in (8, 26):
        pt.line([(-29, yy), (34, yy + 1)], lw=3.6, c="black")
    pt.line([(-31, 49), (37, 49)], lw=6, c="gold")
    ctx.restore()


def draw_leg(pt, hx, hy, hip, kn, an, far):
    ctx = pt.ctx
    (kx, ky), (ax, ay), sdeg = leg_points(hx, hy, hip, kn, an)
    # baggy trousers on the thigh
    pt.part(lambda: capsule(ctx, hx, hy, kx, ky, 50, 38), "pants", "pants_d")
    # shin with leg wraps
    pt.part(lambda: capsule(ctx, kx, ky, ax, ay, 32, 26), "wrap", "wrap_d")
    sx, sy = dirv(sdeg)
    nx, ny = -sy, sx
    for u in (0.3, 0.55, 0.8):
        bx, by = kx + sx * SHIN * u, ky + sy * SHIN * u
        pt.line([(bx + nx * 15, by + ny * 15 - 3), (bx - nx * 15, by - ny * 15 + 3)], lw=3.6,
                c="red" if u == 0.55 else "wrap_d")
    # sandal + foot, rotated with shin + ankle
    def foot():
        ctx.save()
        ctx.translate(ax, ay)
        ctx.rotate((-(sdeg) + an) * D2R)
        ctx.move_to(-12, -6)
        ctx.curve_to(4, -12, 26, -8, 34, 2)
        ctx.curve_to(36, 8, 30, 12, 24, 12)
        ctx.line_to(-12, 12)
        ctx.curve_to(-16, 8, -16, 0, -12, -6)
        ctx.close_path()
        ctx.restore()

    pt.part(foot, "skin", "skin_d", lw=3.6)

    def sole():
        ctx.save()
        ctx.translate(ax, ay)
        ctx.rotate((-(sdeg) + an) * D2R)
        ctx.rectangle(-15, 10, 52, 7)
        ctx.restore()

    pt.part(sole, "black", None, lw=3.2)
    ctx.save()
    ctx.translate(ax, ay)
    ctx.rotate((-(sdeg) + an) * D2R)
    pt.line([(-6, -4), (8, 10)], lw=4.5, c="black")
    pt.line([(14, -6), (18, 10)], lw=4.5, c="black")
    ctx.restore()


def draw_torso(pt, pose, t):
    ctx = pt.ctx

    def body():
        ctx.move_to(-40, -2)
        ctx.curve_to(-48, -40, -50, -82, -38, -106)
        ctx.curve_to(-24, -122, 6, -126, 22, -122)
        ctx.curve_to(44, -110, 56, -88, 50, -60)
        ctx.curve_to(46, -36, 44, -16, 42, -2)
        ctx.close_path()

    pt.part(body, "black", "black_d")

    def chest_skin():
        ctx.move_to(6, -124)
        ctx.line_to(36, -114)
        ctx.curve_to(42, -98, 38, -80, 30, -64)
        ctx.close_path()

    pt.part(chest_skin, "skin", "skin_d", lw=3)

    def plate():
        ctx.move_to(-38, -28)
        ctx.line_to(44, -26)
        ctx.curve_to(50, -48, 50, -64, 38, -74)
        ctx.line_to(28, -64)
        ctx.curve_to(10, -82, -16, -92, -40, -86)
        ctx.close_path()

    pt.part(plate, "red", "red_d")
    pt.curve((-40, -84), (-16, -90), (10, -80), (28, -62), lw=5, c="gold")
    pt.line([(-36, -54), (46, -50)], lw=3.4, c="black")
    # gold collar cord
    pt.curve((-8, -122), (8, -112), (24, -110), (37, -116), lw=6, c="gold")


def draw_belt_and_skirt_back(pt, pose, t):
    ctx = pt.ctx
    a = pose.hip_f * 0.35

    def back_panel():
        ctx.save()
        ctx.translate(-20, -6)
        ctx.rotate(-a * D2R)
        ctx.move_to(-24, 0)
        ctx.line_to(22, 0)
        ctx.line_to(18, 60)
        ctx.line_to(-34, 58)
        ctx.close_path()
        ctx.restore()

    pt.part(back_panel, "black", "black_d")


def draw_skirt_front(pt, pose, t):
    ctx = pt.ctx
    a = pose.hip_n * 0.45

    def front_panel():
        ctx.save()
        ctx.translate(18, -6)
        ctx.rotate(-a * D2R)
        ctx.move_to(-24, 0)
        ctx.line_to(28, 0)
        ctx.line_to(36, 54)
        ctx.line_to(-18, 56)
        ctx.close_path()
        ctx.restore()

    pt.part(front_panel, "red", "red_d")
    ctx.save()
    ctx.translate(18, -6)
    ctx.rotate(-a * D2R)
    pt.line([(-17, 50), (34, 48)], lw=6, c="gold")
    pt.line([(-20, 24), (31, 24)], lw=3.4, c="black")
    ctx.restore()

    def belt():
        ctx.move_to(-44, -28)
        ctx.line_to(46, -26)
        ctx.line_to(45, -6)
        ctx.line_to(-43, -8)
        ctx.close_path()

    pt.part(belt, "pants", "pants_d")
    for bx in (14, 32):
        def buckle(bx=bx):
            ctx.rectangle(bx - 7, -24, 14, 14)

        pt.part(buckle, "metal", None, lw=2.6)


def draw_sash(pt, pose, t):
    ctx = pt.ctx
    w = pose.wind

    def tails():
        for k, (ln, ph, ang) in enumerate(((84, 0.0, 150), (66, 1.3, 128))):
            wave_strip(ctx, (-44, -16), ln, 24, 12, ang + 25 * (1 - w) - 10 * k, t, 18 * (0.3 + w), 7, ph, 10)

    pt.part(tails, "violet", "violet_d")


def draw_sash_knot(pt, pose, t):
    ctx = pt.ctx

    def loops():
        ctx.save()
        ctx.translate(-46, -18)
        for ang in (-35, 35):
            ctx.save()
            ctx.rotate((180 + ang + math.sin(t * 5 + ang) * 4) * D2R)
            ctx.move_to(0, 0)
            ctx.curve_to(16, -16, 34, -10, 30, 0)
            ctx.curve_to(34, 10, 16, 16, 0, 0)
            ctx.restore()
        ctx.restore()

    pt.part(loops, "violet", "violet_d", lw=3.4)

    def k():
        ctx.arc(-46, -18, 8, 0, TAU)

    pt.part(k, "violet_d", None, lw=3)


# ------------------------------------------------------------------ assembly
def solve_ground(pose):
    """Hip height so that the lower foot sits on y=0."""
    lows = []
    for hip, kn in ((pose.hip_n, pose.kn_n), (pose.hip_f, pose.kn_f)):
        (kx, ky), (ax, ay), _ = leg_points(0, 0, hip, kn, 0)
        lows.append(ay + FOOT_H)
    return -max(lows)


def draw_character(ctx, pose, t, x, y, scale, facing=1, pal=None, outline=None, outline_w=0,
                   lw=5.0, shade=True):
    """Draw Wilnas with feet at (x, y) in the current user space."""
    pal = pal or BASE_PAL

    def render():
        ctx.save()
        ctx.translate(x, y)
        ctx.scale(scale * facing, scale)
        pt = Painter(ctx, pal, lw=lw, shade=(5.0 * facing, -5.0) if shade else None)
        hip_y = solve_ground(pose) if pose.ground else -HIP_H
        ctx.translate(pose.x, hip_y + pose.y)
        ctx.rotate(-pose.rot * D2R * 1)
        ctx.translate(0, 0)
        # far side (darker by palette shading of darks)
        far_pal = {k: (mix(v, hexc("140a10"), 0.28) if k != "ink" else v) for k, v in pal.items()}
        pt_far = Painter(ctx, far_pal, lw=lw, shade=pt.shade)

        lean = pose.lean
        # torso frame transform (rotate around hip)
        def torso_xf():
            ctx.rotate(lean * D2R)

        # far arm
        ctx.save()
        torso_xf()
        draw_arm(pt_far, -14, -100, pose.sh_f - lean, pose.el_f, True, t)
        ctx.restore()
        # sash tails behind
        draw_sash(pt, pose, t)
        # far leg
        draw_leg(pt_far, -12, 0, pose.hip_f, pose.kn_f, pose.an_f, True)
        draw_belt_and_skirt_back(pt, pose, t)
        # torso
        ctx.save()
        torso_xf()
        draw_torso(pt, pose, t)
        ctx.restore()
        # near leg
        draw_leg(pt, 12, 0, pose.hip_n, pose.kn_n, pose.an_n, False)
        draw_skirt_front(pt, pose, t)
        draw_sash_knot(pt, pose, t)
        # head
        ctx.save()
        torso_xf()
        ctx.translate(8, -120)
        ctx.rotate(pose.head * D2R)
        ctx.translate(-4, -74)
        draw_head(pt, pose, t)
        ctx.restore()
        # near arm + shoulder plate
        ctx.save()
        torso_xf()
        draw_arm(pt, 14, -98, pose.sh_n - lean, pose.el_n, False, t)
        draw_sode(pt, 12, -106, pose.sh_n - lean, 0)
        ctx.restore()
        ctx.restore()

    if outline is not None and outline_w > 0:
        from gfx import outlined_group
        outlined_group(ctx, render, outline, outline_w)
    else:
        render()


def draw_head_closeup(ctx, pose, t, x, y, scale, facing=1, pal=None, lw=4.2):
    """Just the head, cranium centre at (x, y)."""
    pal = pal or BASE_PAL
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(scale * facing, scale)
    pt = Painter(ctx, pal, lw=lw, shade=(5.0 * facing, -5.0))
    draw_head(pt, pose, t)
    ctx.restore()

"""Intro and verse: bars 0-15 (0.0 - 25.6 s)."""
import math
from dataclasses import replace

import cairo

import common as C
import dragon as D
import wilnas as Wl
from gfx import *
from timeline import BAR, BEAT, H, W

CX, CY = W / 2, H / 2


# --------------------------------------------------------------- S1 eye close-up (bars 0-1)
def s_eye(ctx, t, lt):
    C.fill(ctx, AI)
    ctx.save()
    ctx.translate(CX, CY)
    ctx.rotate(lt * 0.03)
    ctx.translate(-CX, -CY)
    kikko(ctx, -300, -300, W + 300, H + 300, 90, alpha(WHITE, 0.10), 3, offset=(lt * 20, lt * 12))
    ctx.restore()
    # plucked notes -> hexagon pops
    C.hex_pops(ctx, t, [k * BEAT / 2 for k in range(8)], 11, alpha(WHITE, 0.9), rmax=80,
               area=(120, 120, W - 120, H - 120))
    opening = prog(lt, 1.6, 1.82)
    eye = 0.06 + 0.94 * back_out(opening, 1.2) if lt >= 1.6 else 0.06
    pose = Wl.Pose(eye=min(1.0, eye), look=(lerp(-2, 3, prog(lt, 1.9, 2.6)), 0), wind=0.9, mouth="line")
    s = lerp(6.6, 8.4, ease_io(lt / 3.2))
    ex, ey = 960 - 70, 560
    tq = on_twos(t)
    ctx.save()
    ctx.translate(ex, ey)
    ctx.rotate(lerp(-0.08, 0.0, ease_out(lt / 3.2)))
    Wl.draw_head_closeup(ctx, pose, tq, -30 * s, -6 * s, s, lw=4.2)
    ctx.restore()
    if lt >= 1.6:
        u = prog(lt, 1.6, 2.4)
        # sparkle on the iris
        star_burst(ctx, ex + 2 * s, ey - 4 * s, 120 * (1 - u) + 30, 10, 4, alpha(WHITE, 1 - u * 0.6), rot=u)
        speed_lines_radial(ctx, ex, ey, t, alpha(WHITE, 0.55 * (1 - u)), n=40, r0=700, thick=6)
    # vertical name, a letter per half beat in bar 1
    name = "ウィルナス"
    for i, ch in enumerate(name):
        u = prog(lt, 1.6 + i * BEAT / 2, 1.6 + i * BEAT / 2 + 0.16)
        if u > 0:
            text(ctx, ch, FONT_JP, 84 * back_out(u), 1760, 210 + i * 96, WHITE, stroke=INK, lw=10)
    u = ease_out(prog(lt, 0.2, 1.4))
    rect(ctx, 80, 980, 520 * u, 6, WHITE)
    text(ctx, "WILNAS / SIX DRAGON", FONT_LATIN, 30, 80, 950, alpha(WHITE, u), align="left", tracking=0.12)


# --------------------------------------------------------------- S2 rope & plumes (bar 2)
def s_rope(ctx, t, lt):
    C.fill(ctx, MINT)
    stripes(ctx, 0, 0, W, H, 26, 60, alpha(WHITE, 0.25), 0.5, offset=lt * 120)
    off = lt * 500
    text_path(ctx, "SIX DRAGON SIX DRAGON", FONT_LATIN, 420, 1400 - off, 560, align="center")
    src(ctx, INK)
    ctx.set_line_width(8)
    ctx.stroke()
    s = lerp(4.4, 5.0, lt / 1.6)
    fx, fy = lerp(-50, 40, ease_io(lt / 1.6)), lerp(-70, -40, lt / 1.6)
    pose = Wl.Pose(wind=1.2, mouth="smirk")
    tq = on_twos(t)

    def head():
        Wl.draw_head_closeup(ctx, pose, tq, 960 - fx * s, 540 - fy * s, s, lw=4.2)

    outlined_group(ctx, head, WHITE, 12, steps=10)
    for k, word in enumerate(("白", "縄")):
        u = prog(lt, k * BEAT * 2, k * BEAT * 2 + 0.15)
        if u > 0:
            text(ctx, word, FONT_JP, 150 * back_out(u), 170, 260 + k * 190, WHITE, stroke=INK, lw=14)


# --------------------------------------------------------------- S3 pull back + kanji hits (bar 3)
KANJI_HITS = [("六", SHU, WHITE), ("龍", INK, SHU), ("逆", WHITE, INK), ("転", AI, WHITE)]


def s_pullback(ctx, t, lt):
    hit_t = [2 * BEAT + k * BEAT / 2 for k in range(4)]
    if lt < hit_t[0]:
        C.fill(ctx, AI)
        u = ease_in(lt / hit_t[0], 2)
        speed_lines_radial(ctx, CX, CY, t, alpha(WHITE, 0.8), n=60, r0=lerp(500, 260, u), thick=12)
        s = lerp(6.0, 2.0, ease_out(lt / hit_t[0]))
        pose = Wl.Pose(wind=1.0, mouth="grin", look=(3, 0))
        ctx.save()
        ctx.translate(CX, CY)
        ctx.rotate(lerp(0.25, 0.0, ease_out(lt / hit_t[0])))

        def head():
            Wl.draw_head_closeup(ctx, pose, on_twos(t), 60 * s, 40 * s, s, lw=4.6)

        outlined_group(ctx, head, WHITE, 10, steps=10)
        ctx.restore()
        return
    k = min(3, int((lt - hit_t[0]) / (BEAT / 2)))
    u = (lt - hit_t[k]) / (BEAT / 2)
    ch, bgc, fg = KANJI_HITS[k]
    C.fill(ctx, bgc)
    ctx.save()
    ctx.translate(CX, CY)
    ctx.rotate((-1) ** k * 0.06)
    sc = lerp(1.25, 1.0, ease_out(u * 2))
    sscale(ctx, sc, sc)
    hexagon_path(ctx, 0, 0, 470, TAU / 12)
    src(ctx, alpha(fg, 0.25))
    ctx.set_line_width(18)
    ctx.stroke()
    text(ctx, ch, FONT_JP, 760, 0, 20, fg)
    ctx.restore()
    C.flash(ctx, lt, hit_t[k], 0.08, WHITE, 0.8)


# --------------------------------------------------------------- S4 hero + name (bar 4)
def s_hero(ctx, t, lt):
    C.fill(ctx, AI)
    rays(ctx, CX, 640, 18, alpha(AI_DEEP, 1.0), rot=lt * 0.25)
    halftone(ctx, 0, 700, W, H, 30, alpha(AI_DEEP, 1), lambda x, y: (y - 700) / 380 * 12)
    letters = "WILNAS"
    for i, ch in enumerate(letters):
        t0 = i * BEAT / 2
        u = prog(lt, t0, t0 + 0.14)
        if u <= 0:
            continue
        x = 330 + i * 252
        sc = lerp(2.6, 1.0, ease_out(u))
        ctx.save()
        ctx.translate(x, 300)
        sscale(ctx, sc, sc)
        text(ctx, ch, FONT_LATIN, 300, 12, 14, INK)
        text(ctx, ch, FONT_LATIN, 300, 0, 0, WHITE, stroke=INK, lw=10)
        ctx.restore()
    u = back_out(prog(lt, 3 * BEAT, 3 * BEAT + 0.2))
    if u > 0:
        ctx.save()
        ctx.translate(CX, 520)
        sscale(ctx, u, u)
        rect(ctx, -250, -46, 500, 92, GOLD)
        text(ctx, "ウィルナス", FONT_JP, 64, 0, 2, INK)
        ctx.restore()
    speed_lines_h(ctx, t, alpha(WHITE, 0.35), 560, 1080, n=16, seed=4, speed=3000)
    pose = replace(Wl.HERO, wind=1.0)
    bob = math.sin(lt / BEAT * math.pi) ** 2 * 6
    zoom = lerp(1.0, 1.08, lt / BAR)
    ctx.save()
    ctx.translate(CX, H)
    sscale(ctx, zoom, zoom)
    Wl.draw_character(ctx, pose, on_twos(t), 0, -40 + bob, 1.45, outline=WHITE, outline_w=8)
    ctx.restore()
    C.flash(ctx, lt, 0.0, 0.25)


# --------------------------------------------------------------- S5 collage (bar 5)
def _inner_eye(ctx, w, h, t):
    halftone(ctx, 0, 0, w, h, 26, alpha(SHU_DEEP, 1), lambda x, y: 7)
    Wl.draw_head_closeup(ctx, Wl.Pose(look=(2, 1), wind=1.0, mouth="grin"), t, w * 0.42, h * 0.62, 2.6)


def _inner_fist(ctx, w, h, t, lt):
    speed_lines_radial(ctx, w * 0.62, h * 0.45, t, alpha(WHITE, 0.8), n=40, r0=140, r1=1200, thick=8)
    pose = Wl.lerp_pose(Wl.PUNCH_WIND, Wl.PUNCH, ease_out(prog(lt, 0.15, 0.3)))
    Wl.draw_character(ctx, pose, t, w * 0.3, h * 1.7, 2.3)


def _inner_feet(ctx, w, h, t):
    stripes(ctx, 0, 0, w, h, 18, 30, alpha(WHITE, 0.4), -0.6, offset=t * 200)
    rect(ctx, 0, h * 0.82, w, h * 0.2, INK)
    ph = (t * 1.25) % 1.0
    Wl.draw_character(ctx, Wl.walk_pose(ph), t, w * 0.45, h * 0.84, 2.6)


def s_collage(ctx, t, lt):
    C.fill(ctx, WHITE)
    halftone(ctx, 0, 0, W, H, 34, AI, lambda x, y: 2 + 9 * (x / W))
    tq = on_twos(t)
    jit = 0.0
    if lt > 3 * BEAT:
        jit = 6 * math.exp(-(lt - 3 * BEAT) * 6)
    ctx.save()
    C.shake(ctx, t, jit, 5)
    C.panel(ctx, 420, 470, 520, 600, -0.10, lambda c, w, h: _inner_eye(c, w, h, tq),
            appear=prog(lt, 0, 0.18), bg=SHU)
    C.panel(ctx, 980, 560, 560, 680, 0.06, lambda c, w, h: _inner_fist(c, w, h, tq, lt - BEAT),
            appear=prog(lt, BEAT, BEAT + 0.18), bg=AI)
    C.panel(ctx, 1520, 480, 500, 560, -0.05, lambda c, w, h: _inner_feet(c, w, h, tq),
            appear=prog(lt, 2 * BEAT, 2 * BEAT + 0.18), bg=GOLD)
    ctx.restore()
    u = prog(lt, 3 * BEAT, 3 * BEAT + 0.14)
    if u > 0:
        ctx.save()
        ctx.translate(CX, 900)
        ctx.rotate(-0.05)
        sc = lerp(2.2, 1.0, ease_out(u))
        sscale(ctx, sc, sc)
        text(ctx, "READY?", FONT_LATIN, 230, 14, 14, SHU)
        text(ctx, "READY?", FONT_LATIN, 230, 0, 0, INK, stroke=WHITE, lw=14)
        ctx.restore()


# --------------------------------------------------------------- S6 punch (bar 6)
def s_punch(ctx, t, lt):
    hit = 2 * BEAT
    after = lt >= hit
    C.fill(ctx, SHU if (after and lt < hit + 0.07) else AI)
    kikko(ctx, 0, 0, W, H, 70, alpha(WHITE, 0.12), 3, offset=(-lt * 60, 0))
    fist_x, fist_y = 1220, 560
    if not after:
        u = ease_out(prog(lt, 0, 0.3))
        pose = Wl.lerp_pose(Wl.STAND, Wl.PUNCH_WIND, u)
        speed_lines_radial(ctx, fist_x, fist_y, t, alpha(WHITE, 0.5 * u), n=50, r0=450)
    else:
        u = ease_out(prog(lt, hit, hit + 0.07))
        pose = Wl.lerp_pose(Wl.PUNCH_WIND, Wl.PUNCH, u)
        speed_lines_radial(ctx, fist_x, fist_y, t, alpha(WHITE, 0.9), n=80, r0=220, thick=14)
    ctx.save()
    C.shake(ctx, t, C.impact_shake(lt, [hit], 30), 6)
    Wl.draw_character(ctx, pose, on_twos(t) if not after else t, 760, 960, 1.65, outline=WHITE, outline_w=8)
    if after:
        k = prog(lt, hit, hit + 0.3)
        star_burst(ctx, fist_x, fist_y, 260 * ease_out(k) + 60, 90, 9, alpha(WHITE, 1 - k * 0.5), rot=k)
        star_burst(ctx, fist_x, fist_y, 150 * ease_out(k) + 30, 50, 9, alpha(GOLD, 1 - k * 0.5), rot=-k)
        su = back_out(prog(lt, hit, hit + 0.16))
        ctx.save()
        ctx.translate(1520, 330)
        ctx.rotate(0.12)
        sscale(ctx, su, su)
        text(ctx, "ドンッ", FONT_JP, 230, 12, 12, INK)
        text(ctx, "ドンッ", FONT_JP, 230, 0, 0, GOLD, stroke=INK, lw=14)
        ctx.restore()
    ctx.restore()


# --------------------------------------------------------------- S7 pose flashes (bar 7)
FLASH_SET = [
    (GOLD, lambda: Wl.walk_pose(0.1, run=True), "1"),
    (MINT, lambda: Wl.JUMP_UP, "2"),
    (SHU, lambda: Wl.KICK, "3"),
]


def s_flashes(ctx, t, lt):
    k = int(lt / BEAT)
    if k < 3:
        bgc, pf, label = FLASH_SET[k]
        u = (lt - k * BEAT) / BEAT
        C.fill(ctx, bgc)
        stripes(ctx, 0, 0, W, H, 40, 40, alpha(WHITE, 0.25), 0.8 + k * 0.4, offset=u * 160)
        text(ctx, label, FONT_LATIN, 900, CX + (k - 1) * 380, 560, alpha(INK, 0.9))
        pose = pf()
        Wl.draw_character(ctx, pose, t, CX - (k - 1) * 380 + lerp(-30, 30, u), 920 - (90 if k == 1 else 0),
                          1.35, outline=WHITE, outline_w=8)
        C.flash(ctx, lt, k * BEAT, 0.07)
        return
    sub = min(3, int((lt - 3 * BEAT) / (BEAT / 4)))
    C.fill(ctx, [AI, SHU, AI, SHU][sub])
    speed_lines_radial(ctx, CX, CY, t, alpha(WHITE, 0.7), n=60, r0=300)
    sc = lerp(0.8, 1.4, (lt - 3 * BEAT) / BEAT)
    ctx.save()
    ctx.translate(CX, CY)
    sscale(ctx, sc, sc)
    text(ctx, "GO!", FONT_LATIN, 520, 16, 16, INK)
    text(ctx, "GO!", FONT_LATIN, 520, 0, 0, WHITE, stroke=INK, lw=16)
    ctx.restore()


# --------------------------------------------------------------- S8 side-scrolling run (bars 8-11)
STICKERS = [("tree", 0, 1.0), ("bush", 520, 0.8), ("sign", 980, 0.75), ("rock", 1500, 0.7),
            ("tree_small", 1900, 0.95), ("lamp", 2450, 0.62), ("flowers", 2900, 0.7), ("tree", 3400, 1.05),
            ("bush", 3950, 0.85), ("rock", 4400, 0.8)]
VERSE_WORDS = [("まだ", 0), ("終わって", 1), ("ない！", 2), ("NOT OVER YET", 3)]


def scroll_x(lt):
    walk_v, run_v, tr = 380.0, 1150.0, 2 * BAR
    if lt < tr:
        return walk_v * lt
    return walk_v * tr + run_v * (lt - tr) + (walk_v - run_v) * 0  # instant gear change


def s_verse_run(ctx, t, lt):
    sx = scroll_x(lt)
    C.fill(ctx, AI)
    # sun + rings
    circle(ctx, 1460, 330, 230, WHITE)
    for k in range(3):
        ctx.new_path()
        ctx.arc(1460, 330, 280 + k * 46 + (lt * 30) % 46, 0, TAU)
        src(ctx, alpha(WHITE, 0.35 - k * 0.1))
        ctx.set_line_width(5)
        ctx.stroke()
    # far mountains
    off = -(sx * 0.12) % 900
    for i in range(-1, 4):
        bx = off + i * 900
        poly(ctx, [(bx - 100, 860), (bx + 300, 520), (bx + 520, 700), (bx + 700, 560), (bx + 1000, 860)], AI_DEEP)
    # clouds
    for i in range(5):
        cx = (300 + i * 520 - sx * 0.25) % (W + 600) - 300
        C.cloud(ctx, cx, 220 + (i % 3) * 120, 0.8 + 0.3 * (i % 2), WHITE)
    # words in the sky
    for word, b in VERSE_WORDS:
        t0 = b * BAR
        u_in = prog(lt, t0, t0 + 0.15)
        u_out = prog(lt, t0 + BAR - 0.15, t0 + BAR)
        if u_in <= 0 or u_out >= 1:
            continue
        x = 1420
        y = 330 - 300 * ease_in(u_out)
        sc = lerp(1.8, 1.0, ease_out(u_in))
        size = 190 if b < 3 else 120
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(-0.06)
        sscale(ctx, sc, sc)
        text(ctx, word, FONT_JP if b < 3 else FONT_LATIN, size, 12, 12, INK)
        text(ctx, word, FONT_JP if b < 3 else FONT_LATIN, size, 0, 0, SHU, stroke=INK, lw=12)
        ctx.restore()
    # paper-cut props from the repo (mid layer)
    props = C.props()
    loop = 4900
    for name, x0, s in STICKERS:
        x = (x0 + 1200 - sx * 0.7) % loop - 500
        if -500 < x < W + 500:
            C.draw_image(ctx, props[name], x, 868, s)
    # ground band
    rect(ctx, -10, 860, W + 20, 240, MINT)
    stripes(ctx, 0, 880, W, H, 30, 70, alpha(AI, 0.25), -0.7, offset=sx)
    rect(ctx, -10, 856, W + 20, 8, INK)
    # character
    run = lt >= 2 * BAR
    ph = C.walk_phase(lt, [(0.0, 1.25), (2 * BAR, 2.5)])
    blend = ease_out(prog(lt, 2 * BAR, 2 * BAR + 0.3))
    pose = Wl.lerp_pose(Wl.walk_pose(ph), Wl.walk_pose(ph, run=True), blend)
    tq = on_twos(t)
    Wl.draw_character(ctx, pose, tq, 640, 872, 1.32, outline=WHITE, outline_w=7)
    if run:
        speed_lines_h(ctx, t, alpha(WHITE, 0.55), 120, 840, n=22, seed=8, speed=4200)
    # foreground grass
    for i in range(4):
        x = (i * 640 - sx * 1.5) % (W + 800) - 400
        C.draw_image(ctx, props["grass"], x, H + 40, 1.0)
    C.hex_pops(ctx, lt, [k * BEAT for k in range(16)], 21, GOLD, rmax=50, area=(100, 80, W - 100, 520))


# --------------------------------------------------------------- S9a triptych (bars 12-13)
def _strip_feet(ctx, w, h, t, ph):
    stripes(ctx, 0, 0, w, h, 20, 50, alpha(WHITE, 0.3), 0.3, offset=t * 900)
    rect(ctx, 0, h * 0.78, w, h * 0.3, INK)
    Wl.draw_character(ctx, Wl.walk_pose(ph, run=True), t, w * 0.42, h * 0.8, 3.0)


def _strip_full(ctx, w, h, t, ph):
    speed_lines_h(ctx, t, alpha(WHITE, 0.5), 0, h, n=20, seed=12, speed=4000, w=w)
    rect(ctx, 0, h * 0.86, w, h * 0.2, MINT)
    rect(ctx, 0, h * 0.86 - 4, w, 8, INK)
    Wl.draw_character(ctx, Wl.walk_pose(ph, run=True), t, w * 0.5, h * 0.87, 1.05, outline=WHITE, outline_w=5)


def _strip_face(ctx, w, h, t, ph):
    halftone(ctx, 0, 0, w, h, 28, alpha(SHU, 0.5), lambda x, y: 4 + 6 * y / h)
    pose = Wl.Pose(wind=1.4, mouth="grin", look=(3, 0), head=-2 * math.sin(ph * TAU))
    Wl.draw_head_closeup(ctx, pose, t, w * 0.40, h * 0.5 + 6 * math.sin(ph * TAU * 2), 3.1)


def s_triptych(ctx, t, lt):
    C.fill(ctx, INK)
    ph = C.walk_phase(lt, [(0.0, 2.5)])
    tq = on_twos(t)
    fns = [(_strip_feet, SHU), (_strip_full, AI), (_strip_face, GOLD)]
    if lt >= BAR:  # second bar: contents rotate every beat
        k = int((lt - BAR) / BEAT)
        fns = fns[k % 3:] + fns[:k % 3]
    sw = W / 3
    for i, (fn, bgc) in enumerate(fns):
        t0 = i * BEAT * 0.5
        u = ease_out(prog(lt, t0, t0 + 0.25), 4)
        dy = (1 - u) * H * (1 if i % 2 else -1)
        ctx.save()
        ctx.translate(i * sw, dy)
        ctx.rectangle(0, 0, sw - 10, H)
        ctx.clip()
        rect(ctx, 0, 0, sw, H, bgc)
        fn(ctx, sw - 10, H, tq, ph)
        ctx.restore()
    if lt >= BAR:
        u = ease_out(prog(lt, BAR, BAR + 0.2))
        ctx.save()
        ctx.translate(0, 900)
        ctx.rotate(-0.03)
        C.marquee(ctx, -60, 120 * u, INK, WHITE, "KEEP RUNNING  /  走れ  /  ", FONT_JP, t, 420)
        ctx.restore()


# --------------------------------------------------------------- S9b planet run (bars 14-15)
JUMPS = [2 * BEAT, BAR]   # local times of the jump peaks


def s_planet(ctx, t, lt):
    C.fill(ctx, AI_DEEP)
    for i in range(70):
        x = hash01(31, i) * W
        y = hash01(32, i) * 800
        tw = 0.5 + 0.5 * math.sin(t * 6 + i)
        hexagon(ctx, (x - lt * 40) % W, y, 3 + 5 * hash01(33, i) * tw, alpha(WHITE, 0.4 + 0.6 * tw))
    zoom = 1.0
    if lt > BAR + 3 * BEAT:
        zoom = lerp(1.0, 2.4, ease_in(prog(lt, BAR + 3 * BEAT, 2 * BAR)))
    ctx.save()
    ctx.translate(CX, 760)
    sscale(ctx, zoom, zoom)
    ctx.translate(-CX, -760)
    pcx, pcy, pr = CX, 1980, 1240
    w_ang = 0.32  # rad / s
    ang = lt * w_ang
    circle(ctx, pcx, pcy, pr + 18, INK)
    circle(ctx, pcx, pcy, pr, MINT)
    ctx.save()
    ctx.new_path()
    ctx.arc(pcx, pcy, pr, 0, TAU)
    ctx.clip()
    ctx.translate(pcx, pcy)
    ctx.rotate(-ang)
    kikko(ctx, -pr, -pr, pr, pr, 70, alpha(AI, 0.35), 6)
    ctx.restore()
    # obstacles: hex blocks that reach the top exactly at the jump peaks
    for k, jt in enumerate(JUMPS):
        a = -math.pi / 2 + (jt - lt) * w_ang
        bx, by = pcx + math.cos(a) * pr, pcy + math.sin(a) * pr
        ctx.save()
        ctx.translate(bx, by)
        ctx.rotate(a + math.pi / 2)
        hexagon(ctx, 0, -100, 110, [SHU, GOLD][k], rot=TAU / 12, stroke=INK, lw=9)
        text(ctx, ["逆", "転"][k], FONT_JP, 110, 0, -100, WHITE, stroke=INK, lw=8)
        ctx.restore()
    # jumping
    lift = 0.0
    pose = Wl.walk_pose(C.walk_phase(lt, [(0.0, 2.5)]), run=True)
    for jt in JUMPS:
        u = (lt - (jt - 0.3)) / 0.6
        if 0 <= u <= 1:
            lift = 210 * math.sin(u * math.pi)
            pose = Wl.lerp_pose(Wl.JUMP_UP, Wl.TUCK, math.sin(u * math.pi))
            pose.rot = -u * 360 if jt == JUMPS[1] else 0
    Wl.draw_character(ctx, pose, on_twos(t), CX - 40, pcy - pr - lift, 1.3, outline=WHITE, outline_w=7)
    ctx.restore()
    C.hex_pops(ctx, lt, [jt - 0.3 for jt in JUMPS], 41, GOLD, rmax=160, area=(CX - 300, 500, CX + 300, 700))
    if lt > 2 * BAR - 0.1:
        C.fill(ctx, alpha(WHITE, prog(lt, 2 * BAR - 0.1, 2 * BAR)))

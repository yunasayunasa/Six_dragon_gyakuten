"""The flip, the key-change chorus, the strut and the logo: bars 32-55 (51.2 - 91.6 s)."""
import math
from dataclasses import replace

import cairo

import common as C
import dragon as D
import wilnas as Wl
from gfx import *
from timeline import BAR, BEAT, DURATION, H, W

CX, CY = W / 2, H / 2


def hex_centers(r, x0, y0, x1, y1):
    dx, dy = r * 1.5, r * math.sqrt(3)
    out = []
    col = 0
    x = x0
    while x < x1 + dx:
        y = y0 + (dy / 2 if col % 2 else 0)
        while y < y1 + dy:
            out.append((x, y))
            y += dy
        x += dx
        col += 1
    return out


HEXES = hex_centers(80, -1200, -1200, 1200, 1200)
HEX_ORDER = sorted(range(len(HEXES)), key=lambda i: hash01(77, i))


# --------------------------------------------------------------- S13 build 2: the flip (bars 32-35)
def s_build2(ctx, t, lt):
    if lt >= 3 * BAR:
        _eye_push(ctx, t, lt - 3 * BAR)
        return
    if lt < 2 * BAR:
        ang = 12 * ease_io(lt / (2 * BAR))
    else:
        ang = lerp(12, 180, ease_io(prog(lt - 2 * BAR, 0, 2 * BEAT)))
    flipped = ang > 96
    bgc = MINT if flipped else AI
    lights = [AI, VIOLET, WHITE] if flipped else [GOLD, MINT, SHU]
    C.fill(ctx, bgc)
    ctx.save()
    ctx.translate(CX, CY)
    ctx.rotate(math.radians(ang))
    # hex grid lighting up with the 16th-note arps
    lit = int(lt / (BEAT / 4)) * 3
    for n, i in enumerate(HEX_ORDER[:lit]):
        x, y = HEXES[i]
        age = lt - (n // 3) * BEAT / 4
        s = back_out(clamp(age / 0.15))
        hexagon(ctx, x, y, 72 * s, alpha(lights[i % 3], 0.85), rot=0)
    kikko(ctx, -1300, -1300, 1300, 1300, 80, alpha(INK, 0.25), 3)
    # ground and walker
    rect(ctx, -1400, 320, 2800, 30, INK)
    ph = C.walk_phase(lt, [(0.0, 1.25)])
    Wl.draw_character(ctx, Wl.walk_pose(ph), on_twos(t), -60, 322, 1.1, outline=WHITE, outline_w=6)
    text(ctx, "上", FONT_JP, 200, 700, -330, WHITE, stroke=INK, lw=12)
    text(ctx, "下", FONT_JP, 200, -700, 180, WHITE, stroke=INK, lw=12)
    ctx.restore()
    if flipped:
        u = back_out(prog(lt, 2 * BAR + 2 * BEAT, 2 * BAR + 2 * BEAT + 0.2))
        ctx.save()
        ctx.translate(CX, 170)
        sscale(ctx, u, u)
        text(ctx, "逆さま!?", FONT_JP, 160, 10, 10, INK)
        text(ctx, "逆さま!?", FONT_JP, 160, 0, 0, SHU, stroke=INK, lw=12)
        ctx.restore()
    if 2 * BAR <= lt < 2 * BAR + 2 * BEAT:
        speed_lines_radial(ctx, CX, CY, t, alpha(WHITE, 0.6), n=50, r0=500)


def _eye_push(ctx, t, lt):
    C.fill(ctx, AI)
    u = lt / BAR
    s = 3.0 * math.exp(math.log(24 / 3.0) * ease_in(u, 2))
    pose = Wl.Pose(look=(0, 0), wind=1.4, mouth="line")
    ix, iy = 34, 8      # iris centre in head coords
    for k in range(5):
        rr = (lt * 600 + k * 260) % 1300
        ctx.new_path()
        ctx.arc(CX, CY, rr, 0, TAU)
        src(ctx, alpha(WHITE, 0.4 * (1 - rr / 1300)))
        ctx.set_line_width(8)
        ctx.stroke()
    Wl.draw_head_closeup(ctx, pose, on_twos(t), CX - ix * s, CY - iy * s, s)
    hexagon_path(ctx, CX, CY, 6 * s, lt * 3)
    src(ctx, alpha(GOLD, 0.9))
    ctx.set_line_width(max(2, 0.8 * s))
    ctx.stroke()
    if lt >= 3 * BEAT:
        r = 1300 * ease_in(prog(lt, 3 * BEAT, 3 * BEAT + 0.25), 2)
        circle(ctx, CX, CY, r, WHITE)


# --------------------------------------------------------------- S14 chorus 2 (bars 36-47)
def s_chorus2(ctx, t, lt):
    if lt < 2 * BAR:
        _kaleido(ctx, t, lt)
    elif lt < 4 * BAR:
        _combo(ctx, t, lt - 2 * BAR)
    elif lt < 8 * BAR:
        _ascend(ctx, t, lt - 4 * BAR)
    else:
        _climax(ctx, t, lt - 8 * BAR)


def spiral_traj(k, cx=CX, cy=CY, w=1.0, grow=320.0, r0=120.0):
    def f(tt):
        a = k * TAU / 6 + w * tt
        r = max(0.0, r0 + grow * tt)
        return cx + r * math.cos(a), cy + r * math.sin(a) * 0.8
    return f


def _kaleido(ctx, t, lt):
    C.fill(ctx, INK)
    rays(ctx, CX, CY, 12, hexc("241a22"), rot=lt * 0.3)
    for k in range(6):
        pts = D.spine(spiral_traj(k), lt + 0.5, n=42, seg=24, window=3.0)
        lab = KANJI_NUM[k] if lt >= k * BEAT else None
        D.draw_dragon(ctx, pts, DRAGON_COLORS[k], t, W=78, mane=WHITE, label=lab, flip=True)
    pulse = 1 + 0.08 * math.exp(-((lt % BEAT) / BEAT) * 5)
    hexagon(ctx, CX, CY - 40, 300 * pulse, alpha(GOLD, 0.0), rot=TAU / 12, stroke=GOLD, lw=14)
    hexagon(ctx, CX, CY - 40, 250 * pulse, alpha(SHU, 0.9), rot=TAU / 12)
    Wl.draw_character(ctx, Wl.FIST_UP, on_twos(t), CX - 30, CY + 230, 1.05, outline=WHITE, outline_w=7)
    C.flash(ctx, lt, 0.0, 0.3)


COMBO = [
    (SHU, Wl.PUNCH, 1, "ドン", (1350, 280)),
    (AI, Wl.KICK, 1, "バン", (560, 260)),
    (GOLD, Wl.PUNCH, -1, "ズバッ", (1380, 300)),
    (MINT, Wl.JUMP_UP, 1, "ドドド", (520, 240)),
    (VIOLET, replace(Wl.TUCK, rot=-200), 1, "ガッ", (1400, 260)),
    (WHITE, Wl.KICK, -1, "シュッ", (520, 300)),
    (SHU, Wl.PUNCH, 1, "ドン", (1350, 280)),
    (AI, Wl.FIST_UP, 1, "逆転!!", (CX, 200)),
]


def _combo(ctx, t, lt):
    k = min(7, int(lt / BEAT))
    u = lt - k * BEAT
    bgc, pose, facing, word, wpos = COMBO[k]
    impact = u < 2 / 30
    C.fill(ctx, INK if impact else bgc)
    if not impact:
        stripes(ctx, 0, 0, W, H, 50, 50, alpha(WHITE, 0.18), 0.4 + k, offset=u * 300)
    speed_lines_radial(ctx, CX + 200 * facing, CY - 60, t, alpha(WHITE if not impact else WHITE, 0.75), n=70, r0=360)
    zoom = lerp(1.0, 1.07, u / BEAT)
    ctx.save()
    ctx.translate(CX, CY)
    sscale(ctx, zoom, zoom)
    ctx.translate(-CX, -CY)
    C.shake(ctx, t, C.impact_shake(u, [0.0], 24), 60 + k)
    pal = Wl.silhouette_pal(WHITE, ink=WHITE) if impact else None
    y = 980 if pose.ground else 860
    Wl.draw_character(ctx, pose, t, CX - 140 * facing, y, 1.4, facing=facing, pal=pal,
                      outline=None if impact else WHITE, outline_w=8, shade=not impact)
    if not impact:
        star_burst(ctx, CX + 250 * facing, CY - 40, 150 * ease_out(u / 0.25) + 40, 50, 8,
                   alpha(WHITE, max(0, 1 - u / 0.3)), rot=u)
    ctx.restore()
    s = back_out(prog(u, 0, 0.12))
    ctx.save()
    ctx.translate(*wpos)
    ctx.rotate(0.12 * (-1) ** k)
    sscale(ctx, s, s)
    size = 190 if k < 7 else 220
    text(ctx, word, FONT_JP, size, 12, 12, INK)
    text(ctx, word, FONT_JP, size, 0, 0, GOLD if bgc is not GOLD else SHU, stroke=INK, lw=13)
    ctx.restore()


def _ascend(ctx, t, lt):
    C.fill(ctx, AI_DEEP)
    ctx.save()
    ctx.translate(CX, CY)
    ctx.rotate(-0.5)
    ctx.translate(-CX, -CY)
    kikko(ctx, -800, -800, W + 800, H + 800, 110, alpha(AI, 1.0), 10, offset=(-lt * 1400, 0))
    v = 1000.0
    head_t = lt + 3.0
    camx = v * head_t - 1500
    # five dragons in formation (smaller, behind)
    for k in range(1, 6):
        lane = [-330, 330, -560, 560, 800][k - 1]
        tr = D.wave_traj(0, 0, 560 + lane, 70, 1200 + 90 * k, v * (0.97 + 0.012 * k), phase=k)
        pts = D.spine(tr, head_t - 0.25 * k, n=46, seg=20)
        ctx.save()
        ctx.translate(-camx, 0)
        D.draw_dragon(ctx, pts, DRAGON_COLORS[k], t, W=60, mane=WHITE, label=KANJI_NUM[k])
        ctx.restore()
    speed_lines_h(ctx, t, alpha(WHITE, 0.55), -300, H + 300, n=30, seed=71, speed=6500)
    traj = D.wave_traj(0, 0, 560, 120, 1500, v)
    pts = D.spine(traj, head_t, n=62, seg=26)
    ctx.save()
    ctx.translate(-camx, 0)
    D.draw_dragon(ctx, pts, DRAGON_COLORS[0], t, W=112, mane=GOLD, mouth=0.8, label=KANJI_NUM[0])
    bar = int(lt / BAR)
    pose = [Wl.RIDE, replace(Wl.RIDE, mouth="shout", sh_n=110, el_n=0), Wl.RIDE,
            replace(Wl.FIST_UP, ground=False, hip_n=70, kn_n=95, hip_f=40, kn_f=110)][min(bar, 3)]
    C.rider(ctx, pts, 17, pose, on_twos(t), 1.0, 112)
    ctx.restore()
    ctx.restore()
    # vertical marquee on the left edge
    ctx.save()
    ctx.translate(0, H)
    ctx.rotate(-math.pi / 2)
    C.marquee(ctx, 20, 90, SHU, WHITE, "壱 弐 参 肆 伍 陸  SIX DRAGONS  ", FONT_JP, t, 500)
    ctx.restore()
    # hex stickers whooshing past on the last two bars
    if lt > 2 * BAR:
        for i in range(8):
            t0 = 2 * BAR + i * BEAT
            u = prog(lt, t0, t0 + 0.9)
            if 0 < u < 1:
                x = lerp(W + 200, -300, u)
                y = 180 + hash01(91, i) * 700
                hexagon(ctx, x, y, 90, DRAGON_COLORS[i % 6], rot=u * 3, stroke=INK, lw=7)
                text(ctx, KANJI_NUM[i % 6], FONT_JP, 90, x, y, WHITE)


def _climax(ctx, t, lt):
    final = 3 * BAR
    C.fill(ctx, SHU if lt < final else (WHITE if lt < final + 0.08 else GOLD))
    rot = lt * (0.5 + lt * 0.08)
    ctx.save()
    ctx.translate(CX, CY)
    rays(ctx, 0, 0, 16, alpha(GOLD if lt < final else WHITE, 0.7), rot=rot)
    ctx.restore()
    # converging ring of dragons
    if lt < final:
        rad = lerp(950, 380, ease_out(prog(lt, 0, 2 * BAR)))
    else:
        rad = lerp(380, 1500, ease_out(prog(lt, final, final + 1.2)))
    for k in range(6):
        tr = D.circle_traj(CX, CY, rad, 2.6, phase=k * TAU / 6, ry=rad * 0.72)
        pts = D.spine(tr, lt, n=34, seg=24)
        D.draw_dragon(ctx, pts, DRAGON_COLORS[k], t, W=72, mane=WHITE, flip=True)
    # big side kanji pulsing
    if lt < final:
        for i, ch in enumerate("逆転"):
            pulse = 1 + 0.1 * math.exp(-((lt % BEAT) / BEAT) * 6)
            text(ctx, ch, FONT_JP, 330 * pulse, 260 if i == 0 else W - 260, CY, alpha(WHITE, 0.95), stroke=INK, lw=16)
    # Wilnas: leap -> spin -> final punch
    if lt < 2 * BAR:
        u = prog(lt, 0, 2 * BAR)
        y = lerp(1500, CY + 180, ease_out(u))
        pose = Wl.lerp_pose(Wl.JUMP_UP, replace(Wl.TUCK, rot=-u * 900), ease_io(prog(u, 0.3, 0.6)))
        if u > 0.6:
            pose = replace(Wl.TUCK, rot=-u * 900)
    elif lt < final:
        y = CY + 180
        pose = replace(Wl.TUCK, rot=-(lt - 2 * BAR) * 400 - 1440)
        g = prog(lt, 2 * BAR, final)
        hexagon(ctx, CX, CY, 140 + 200 * g, alpha(GOLD, 0.9), rot=TAU / 12 + lt, stroke=WHITE, lw=10)
    else:
        y = CY + 260
        pose = Wl.PUNCH
    ctx.save()
    C.shake(ctx, t, C.impact_shake(lt, [final], 40, 0.4), 81)
    if lt >= final:
        k = prog(lt, final, final + 0.6)
        star_burst(ctx, CX + 240, CY - 30, 600 * ease_out(k) + 80, 160, 12, alpha(WHITE, 1 - k * 0.6), rot=k)
        speed_lines_radial(ctx, CX + 240, CY - 30, t, alpha(INK, 0.6), n=80, r0=380)
    Wl.draw_character(ctx, pose, t, CX - 60, y, 1.3, outline=WHITE, outline_w=8)
    if lt >= final:
        s = back_out(prog(lt, final, final + 0.18))
        ctx.save()
        ctx.translate(CX + 120, 190)
        ctx.rotate(-0.08)
        sscale(ctx, s, s)
        text(ctx, "逆転ッ!!", FONT_JP, 250, 14, 14, INK)
        text(ctx, "逆転ッ!!", FONT_JP, 250, 0, 0, WHITE, stroke=INK, lw=16)
        ctx.restore()
    ctx.restore()
    C.flash(ctx, lt, final, 0.2)
    # tom fill -> white out into the post-chorus
    if lt > final + 2.5 * BEAT:
        C.fill(ctx, alpha(WHITE, ease_in(prog(lt, final + 2.5 * BEAT, 4 * BAR), 2)))


# --------------------------------------------------------------- S15 post-chorus strut (bars 48-51)
def s_post(ctx, t, lt):
    walk_from = 2 * BEAT
    stop_at = 3 * BAR
    v = 420.0
    sx = v * clamp(lt - walk_from, 0, stop_at - walk_from)
    C.fill(ctx, PAPER)
    circle(ctx, 1380, 380, 260, SHU)
    # six small dragons in formation across the sky
    for k in range(6):
        tr = D.wave_traj(-900, 0, 170 + k * 55, 40, 900, 330, phase=k * 0.7)
        pts = D.spine(tr, lt + 1.5 + k * 0.35, n=30, seg=16)
        D.draw_dragon(ctx, pts, DRAGON_COLORS[k], t, W=34, mane=WHITE, lw=3.4)
    props = C.props()
    for i, (name, x0, s) in enumerate([("tree", 0, 0.9), ("lamp", 600, 0.6), ("bush", 1100, 0.8),
                                      ("sign", 1700, 0.7), ("tree_small", 2300, 0.9), ("rock", 2800, 0.7)]):
        x = (x0 + 900 - sx * 0.7) % 3300 - 400
        C.draw_image(ctx, props[name], x, 870, s)
    rect(ctx, -10, 860, W + 20, 240, AI)
    ctx.save()
    ctx.rectangle(0, 868, W, 220)
    ctx.clip()
    seigaiha(ctx, 0, 868, W, H + 60, 70, alpha(WHITE, 0.9), AI, 5, offset=(-sx, 0), rings=4)
    ctx.restore()
    rect(ctx, -10, 856, W + 20, 10, INK)
    # character: land -> walk -> look back -> hero + wink
    if lt < walk_from:
        u = prog(lt, 0, walk_from)
        pose = Wl.lerp_pose(Wl.CROUCH, Wl.STAND, ease_out(u))
    elif lt < stop_at:
        pose = Wl.walk_pose(C.walk_phase(lt, [(walk_from, 1.25)]))
        pose.mouth = "grin"
    elif lt < stop_at + 2 * BEAT:
        pose = Wl.lerp_pose(Wl.STAND, Wl.LOOK_BACK, ease_out(prog(lt, stop_at, stop_at + 0.25)))
    else:
        pose = Wl.lerp_pose(Wl.LOOK_BACK, Wl.HERO, ease_out(prog(lt, stop_at + 2 * BEAT, stop_at + 2 * BEAT + 0.2)))
        if lt > stop_at + 3 * BEAT:
            pose.eye = 0.08
            pose.mouth = "grin"
    zoom = 1.0 + 0.35 * ease_io(prog(lt, stop_at, 4 * BAR))
    ctx.save()
    ctx.translate(820, 872)
    sscale(ctx, zoom, zoom)
    Wl.draw_character(ctx, pose, on_twos(t), 0, 0, 1.2, outline=WHITE, outline_w=6)
    ctx.restore()
    if lt < 0.6:
        C.hex_pops(ctx, lt, [0.0, 0.05, 0.1, 0.15], 101, WHITE, rmax=110, area=(620, 780, 1020, 880))
    C.hex_confetti(ctx, lt, 30, 103, DRAGON_COLORS, fall=160)
    C.marquee(ctx, 980, 80, INK, WHITE, "SIX DRAGON GYAKUTEN  /  ウィルナス  /  ", FONT_JP, t, 260)
    if lt < 0.35:
        C.fill(ctx, alpha(WHITE, 1 - lt / 0.35))


# --------------------------------------------------------------- S16 logo (bars 52-55 + tail)
def s_outro(ctx, t, lt):
    hit = 2 * BAR
    C.fill(ctx, AI)
    rays(ctx, CX, 470, 18, alpha(AI_DEEP, 1), rot=lt * 0.08)
    kikko(ctx, 0, 0, W, H, 70, alpha(WHITE, 0.07), 3)
    ctx.save()
    C.shake(ctx, t, C.impact_shake(lt, [hit], 30, 0.3), 111)
    # dragon circling behind the emblem
    tr = D.circle_traj(CX, 470, 420, 1.4, phase=-1.0, ry=300)
    if lt > 0.2:
        pts = D.spine(tr, lt, n=52, seg=22)
        D.draw_dragon(ctx, pts, DRAGON_COLORS[0], t, W=80, mane=GOLD, flip=True)
    # hexagon emblem drawn on
    u = ease_io(prog(lt, 0, 1.0))
    r = 290
    hexagon(ctx, CX, 470, r, alpha(INK, 0.92 * u), rot=TAU / 12)
    per = 6 * r
    ctx.set_dash([per * u, per])
    hexagon_path(ctx, CX, 470, r, TAU / 12 - math.pi / 2)
    src(ctx, WHITE)
    ctx.set_line_width(16)
    ctx.stroke()
    ctx.set_dash([])
    for k in range(6):
        a = TAU / 12 - math.pi / 2 + k * TAU / 6
        su = back_out(prog(lt, 0.2 + k * BEAT / 2, 0.35 + k * BEAT / 2))
        if su > 0:
            hexagon(ctx, CX + r * math.cos(a), 470 + r * math.sin(a), 42 * su, DRAGON_COLORS[k], rot=TAU / 12,
                    stroke=INK, lw=6)
    su = back_out(prog(lt, 0.6, 0.85))
    if su > 0:
        ctx.save()
        ctx.translate(CX, 470)
        sscale(ctx, su, su)
        text(ctx, "六", FONT_JP, 330, 0, 10, WHITE)
        ctx.restore()
    # wordmark
    su = prog(lt, BAR / 2, BAR / 2 + 0.14)
    if su > 0:
        ctx.save()
        ctx.translate(CX, 840)
        sc = lerp(1.8, 1.0, ease_out(su))
        sscale(ctx, sc, sc)
        text(ctx, "SIX DRAGON", FONT_LATIN, 160, 10, 10, INK, tracking=0.04)
        text(ctx, "SIX DRAGON", FONT_LATIN, 160, 0, 0, WHITE, tracking=0.04)
        ctx.restore()
    su = back_out(prog(lt, BAR, BAR + 0.2))
    if su > 0:
        ctx.save()
        ctx.translate(CX, 975)
        sscale(ctx, su, su)
        rect(ctx, -250, -46, 500, 92, WHITE)
        text(ctx, "GYAKUTEN", FONT_LATIN, 74, 0, 2, AI, tracking=0.2)
        ctx.restore()
    for k in range(4):
        h0 = BAR + 2 * BEAT + k * BEAT / 2
        uu = prog(lt, h0, h0 + 0.6)
        if 0 < uu < 1:
            hexagon_path(ctx, CX, 470, r + 40 + 500 * ease_out(uu), TAU / 12)
            src(ctx, alpha(WHITE, 1 - uu))
            ctx.set_line_width(10)
            ctx.stroke()
    # the hit: hanko stamp + Wilnas
    if lt >= hit:
        su = prog(lt, hit, hit + 0.12)
        ctx.save()
        ctx.translate(1390, 640)
        ctx.rotate(-0.14)
        sc = lerp(2.4, 1.0, ease_in(su, 2))
        sscale(ctx, sc, sc)
        round_rect(ctx, -120, -120, 240, 240, 26)
        src(ctx, SHU)
        ctx.fill()
        round_rect(ctx, -104, -104, 208, 208, 18)
        src(ctx, WHITE)
        ctx.set_line_width(7)
        ctx.stroke()
        text(ctx, "逆", FONT_JP, 92, 0, -46, WHITE)
        text(ctx, "転", FONT_JP, 92, 0, 50, WHITE)
        ctx.restore()
        wu = ease_out(prog(lt, hit, hit + 0.4))
        Wl.draw_character(ctx, Wl.HERO, on_twos(t), lerp(-200, 250, wu), 1010, 1.0, outline=WHITE, outline_w=7)
    ctx.restore()
    if lt >= hit:
        C.hex_confetti(ctx, lt - hit, 36, 113, DRAGON_COLORS, fall=150)
    C.flash(ctx, lt, hit, 0.25)
    end = DURATION - (52 * BAR)
    if lt > end - 1.3:
        C.fill(ctx, alpha(INK, ease_in(prog(lt, end - 1.3, end - 0.1), 2)))

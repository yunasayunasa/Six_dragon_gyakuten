"""Pre-chorus, first chorus and the paper breakdown: bars 16-31 (25.6 - 51.2 s)."""
import math
from dataclasses import replace

import cairo

import common as C
import dragon as D
import wilnas as Wl
from gfx import *
from timeline import BAR, BEAT, H, W

CX, CY = W / 2, H / 2


def big_number(ctx, s, lt, color, x=CX, y=CY, size=820):
    u = prog(lt, 0, 0.16)
    sc = lerp(1.6, 1.0, ease_out(u))
    ctx.save()
    ctx.translate(x, y)
    sscale(ctx, sc, sc)
    text_path(ctx, s, FONT_LATIN, size, 0, 0)
    src(ctx, color)
    ctx.set_line_width(14)
    ctx.stroke()
    ctx.restore()


def dragon_eye(ctx, x, y, r, open_, t, iris=GOLD):
    """Huge almond eye with a slit pupil (the dragon watching)."""
    h = r * 0.55 * open_
    ctx.save()
    ctx.new_path()
    ctx.move_to(x - r, y)
    ctx.curve_to(x - r * 0.4, y - h * 1.6, x + r * 0.4, y - h * 1.6, x + r, y)
    ctx.curve_to(x + r * 0.4, y + h * 1.6, x - r * 0.4, y + h * 1.6, x - r, y)
    ctx.close_path()
    eye_path = ctx.copy_path()
    src(ctx, iris)
    ctx.fill_preserve()
    ctx.clip()
    for k in range(4):
        circle(ctx, x, y, r * (0.75 - k * 0.12), mix(iris, SHU, 0.25 * (k % 2)))
    ctx.save()
    ctx.translate(x + math.sin(t * 2) * r * 0.05, y)
    sscale(ctx, 0.18, 1.0)
    circle(ctx, 0, 0, r * 0.6, INK)
    ctx.restore()
    circle(ctx, x - r * 0.22, y - r * 0.18, r * 0.07, WHITE)
    ctx.restore()
    ctx.append_path(eye_path)
    src(ctx, INK)
    ctx.set_line_width(r * 0.05)
    ctx.stroke()


# --------------------------------------------------------------- S10 pre-chorus (bars 16-19)
def s_pre(ctx, t, lt):
    bar = int(lt / BAR)
    bl = lt - bar * BAR
    tq = on_twos(t)
    if bar == 0:
        C.fill(ctx, AI)
        big_number(ctx, "3", bl, alpha(WHITE, 0.8))
        for k in range(4):
            u = prog(bl, k * BEAT, k * BEAT + 0.9)
            if 0 < u < 1:
                ctx.new_path()
                ctx.arc(CX, 760, 120 + 900 * ease_out(u), 0, TAU)
                src(ctx, alpha(WHITE, 1 - u))
                ctx.set_line_width(14 * (1 - u) + 2)
                ctx.stroke()
        zoom = lerp(1.0, 1.15, bl / BAR)
        ctx.save()
        ctx.translate(CX, 980)
        sscale(ctx, zoom, zoom)
        C.shake(ctx, t, 3, 17)
        Wl.draw_character(ctx, replace(Wl.CROUCH, wind=1.4), tq, 0, -40, 1.45, outline=WHITE, outline_w=8)
        ctx.restore()
        return
    if bar == 1:
        C.fill(ctx, SHU)
        dragon_eye(ctx, CX, 440, 900, ease_out(prog(bl, 0.1, 0.9)), t)
        big_number(ctx, "2", bl, alpha(INK, 0.9), x=1600, y=300, size=520)
        ctx.save()
        ctx.translate(CX, 1000)
        C.shake(ctx, t, 4, 18)
        Wl.draw_character(ctx, replace(Wl.CROUCH, wind=1.5), tq, 0, -20, 1.5,
                          pal=Wl.silhouette_pal(INK), outline=WHITE, outline_w=8, shade=False)
        ctx.restore()
        return
    if bar == 2:
        k = int(bl / (BEAT / 2))
        u = (bl - k * BEAT / 2) / (BEAT / 2)
        bgc = [WHITE, INK, AI, SHU][k % 4]
        C.fill(ctx, bgc)
        sel = k % 4
        if sel == 0:
            Wl.draw_head_closeup(ctx, Wl.Pose(look=(3, 0), mouth="line", wind=1.2), tq, 760, 640, 6.0)
        elif sel == 1:
            dragon_eye(ctx, CX, CY, 760, 1.0, t)
        elif sel == 2:
            speed_lines_radial(ctx, CX, CY, t, alpha(WHITE, 0.8), n=50, r0=300)
            Wl.draw_character(ctx, Wl.PUNCH_WIND, tq, 900, 2000, 3.6, outline=WHITE, outline_w=10)
        else:
            Wl.draw_character(ctx, Wl.CROUCH, tq, 1000, 1500, 3.4, outline=WHITE, outline_w=10)
        text(ctx, "1", FONT_LATIN, 300, 1720, 900, WHITE if sel != 0 else INK, stroke=INK if sel != 1 else None, lw=10)
        return
    # bar 3: leap, then the stop
    if bl < 2 * BEAT:
        u = bl / (2 * BEAT)
        C.fill(ctx, AI)
        ctx.save()
        ctx.translate(CX, CY)
        ctx.rotate(math.pi / 2)
        ctx.translate(-CX, -CY)
        speed_lines_h(ctx, t, alpha(WHITE, 0.8), -400, W + 400, n=40, seed=19, speed=7000, direction=1)
        ctx.restore()
        pose = Wl.lerp_pose(Wl.CROUCH, Wl.JUMP_UP, ease_out(prog(u, 0.0, 0.3)))
        y = 1000 - 1300 * ease_in(prog(u, 0.25, 1.0), 2)
        Wl.draw_character(ctx, pose, t, CX, y, 1.5, outline=WHITE, outline_w=8)
        return
    C.fill(ctx, INK)
    u = prog(bl, 2 * BEAT, 4 * BEAT)
    w = 700 * ease_out(u) * (1 - ease_in(prog(bl, 3.6 * BEAT, 4 * BEAT), 2))
    rect(ctx, CX - w / 2, CY + 120, w, 4, WHITE)
    a = ease_out(prog(bl, 2 * BEAT, 2.6 * BEAT))
    text(ctx, "逆転", FONT_JP, 120, CX, CY - 10, alpha(WHITE, a), tracking=lerp(0.1, 0.8, u))


# --------------------------------------------------------------- S11 chorus 1 (bars 20-27)
def ride_world(ctx, t, lt, camx):
    """Parallax sky for the dragon ride (world x scrolls with camx)."""
    C.fill(ctx, AI)
    for i in range(7):
        x = (i * 420 - camx * 0.15) % (W + 500) - 250
        circle(ctx, x, 180 + (i % 3) * 60, 6 + (i % 2) * 4, alpha(WHITE, 0.6))
    for i in range(6):
        x = (i * 520 - camx * 0.35) % (W + 700) - 350
        C.cloud(ctx, x, 260 + (i % 3) * 230, 0.9 + 0.35 * (i % 2), mix(AI, WHITE, 0.82))
    for i in range(4):
        x = (i * 700 + 200 - camx * 0.9) % (W + 900) - 450
        C.cloud(ctx, x, 900 + (i % 2) * 90, 1.6, WHITE)


def s_chorus1(ctx, t, lt):
    tq = on_twos(t)
    if lt < BAR:
        _chorus_slam(ctx, t, lt)
    elif lt < 4 * BAR:
        _chorus_ride(ctx, t, lt - BAR)
    elif lt < 6 * BAR:
        _chorus_collage(ctx, t, lt - 4 * BAR)
    else:
        _chorus_loop(ctx, t, lt - 6 * BAR)


def _chorus_slam(ctx, t, lt):
    split = ease_in(prog(lt, 2 * BEAT, 3.2 * BEAT), 2)
    # sky with the dragon underneath the splitting title
    ride_world(ctx, t, lt, lt * 900)
    traj = D.wave_traj(-600, 0, 620, 110, 1100, 2100, t0=1.6 * BEAT)
    pts = D.spine(traj, lt, n=62, seg=26)
    D.draw_dragon(ctx, pts, DRAGON_COLORS[0], t, W=110, mane=GOLD, mouth=0.9)
    # Wilnas drops in and lands on the dragon at the bar end
    drop = prog(lt, 2.6 * BEAT, 4 * BEAT)
    if drop > 0:
        pose = Wl.lerp_pose(Wl.JUMP_UP, Wl.RIDE, ease_out(drop))
        y = lerp(-300, 470, ease_in(drop, 2))
        Wl.draw_character(ctx, pose, t, 1050, y + Wl.HIP_H * 1.0, 1.0, outline=WHITE, outline_w=6)
    # title halves
    for half in (0, 1):
        dy = (-1 if half == 0 else 1) * split * 700
        dx = (-1 if half == 0 else 1) * split * 300
        ctx.save()
        ctx.rectangle(-100, -100 if half == 0 else CY + 10, W + 200, CY + 110)
        ctx.clip()
        ctx.translate(dx, dy)
        rect(ctx, -400, -400, W + 800, H + 800, WHITE)
        u = prog(lt, 0, 0.3)
        sc = lerp(1.45, 1.0, elastic_out(u))
        ctx.translate(CX, CY)
        C.shake(ctx, t, C.impact_shake(lt, [0.0], 22), 31)
        sscale(ctx, sc, sc)
        text(ctx, "逆転", FONT_JP, 700, 22, 34, SHU)
        text(ctx, "逆転", FONT_JP, 700, 0, 10, INK)
        ctx.restore()
    if split > 0:
        rect(ctx, -10, CY - 6 - split * 700, W + 20, 12 * (1 - split), INK)
    C.flash(ctx, lt, 0.0, 0.2)


def _chorus_ride(ctx, t, lt):
    v = 900.0
    traj = D.wave_traj(0, 0, 600, 130, 1500, v)
    head_t = lt + 3.0
    camx = v * head_t - 1450
    ride_world(ctx, t, lt, camx)
    speed_lines_h(ctx, t, alpha(WHITE, 0.6), 100, 1000, n=24, seed=23, speed=5200)
    ctx.save()
    ctx.translate(-camx, 0)
    pts = D.spine(traj, head_t, n=64, seg=26)
    D.draw_dragon(ctx, pts, DRAGON_COLORS[0], t, W=112, mane=GOLD, mouth=0.6 + 0.3 * math.sin(t * 3))
    bar = int(lt / BAR)
    pose = [Wl.RIDE, replace(Wl.FIST_UP, ground=False, hip_n=70, kn_n=95, hip_f=40, kn_f=110),
            replace(Wl.RIDE, mouth="shout", sh_n=120, el_n=10)][min(bar, 2)]
    C.rider(ctx, pts, 17, pose, on_twos(t), 1.0, 112)
    ctx.restore()
    # marquees
    C.marquee(ctx, 30, 96, INK, WHITE, "TURN IT AROUND  /  逆転  /  ", FONT_JP, t, 380)
    C.marquee(ctx, H - 126, 96, SHU, INK, "SIX DRAGON GYAKUTEN  /  ", FONT_LATIN, t, 300, direction=1)


COLLAGE_SLOTS = [(420, 330, -0.08), (1480, 300, 0.07), (760, 760, 0.05), (1260, 700, -0.06),
                 (960, 420, -0.03), (330, 780, 0.09), (1620, 820, -0.1), (980, 600, 0.02)]


def _collage_inner(kind, t):
    def f(ctx, w, h):
        if kind == 0:
            stripes(ctx, 0, 0, w, h, 24, 30, alpha(WHITE, 0.3), 0.7, offset=t * 100)
            traj = D.wave_traj(0, 0, h * 0.55, 30, 600, 300)
            pts = D.spine(traj, 3.0 + t * 0.2, n=30, seg=26)
            ctx.save()
            ctx.translate(w * 0.62 - pts[0][0], 0)
            D.draw_dragon(ctx, pts, DRAGON_COLORS[0], t, W=150, mane=GOLD, mouth=0.9)
            ctx.restore()
        elif kind == 1:
            halftone(ctx, 0, 0, w, h, 24, alpha(WHITE, 0.6), lambda x, y: 3 + 5 * x / w)
            Wl.draw_head_closeup(ctx, Wl.Pose(mouth="grin", look=(3, -1), wind=1.2), t, w * 0.40, h * 0.6, 2.3)
        elif kind == 2:
            text(ctx, "SIX", FONT_LATIN, h * 0.42, w / 2, h * 0.3, INK)
            text(ctx, "DRAGONS", FONT_LATIN, h * 0.2, w / 2, h * 0.72, INK)
        else:
            speed_lines_radial(ctx, w / 2, h * 0.4, t, alpha(WHITE, 0.6), n=30, r0=100, r1=900, thick=6)
            Wl.draw_character(ctx, Wl.FIST_UP, t, w * 0.42, h * 0.96, 0.95, outline=WHITE, outline_w=5)
    return f


def _chorus_collage(ctx, t, lt):
    C.fill(ctx, GOLD)
    rays(ctx, CX, CY, 24, alpha(WHITE, 0.35), rot=lt * 0.2)
    tq = on_twos(t)
    bgs = [AI, SHU, WHITE, MINT]
    n = min(8, int(lt / BEAT) + 1)
    for i in range(n):
        x, y, r = COLLAGE_SLOTS[i]
        kind = i % 4
        C.panel(ctx, x, y, 520, 380, r, _collage_inner(kind, tq), appear=prog(lt, i * BEAT, i * BEAT + 0.16),
                bg=bgs[kind])
    k = int(lt / BEAT)
    word = ["壱", "弐", "参", "肆", "伍", "陸", "六", "龍"][min(k, 7)]
    u = prog(lt, k * BEAT, k * BEAT + 0.12)
    ctx.save()
    ctx.translate(1700, 160)
    sscale(ctx, back_out(u), back_out(u))
    circle(ctx, 0, 0, 110, SHU)
    text(ctx, word, FONT_JP, 130, 0, 6, WHITE)
    ctx.restore()


def _chorus_loop(ctx, t, lt):
    C.fill(ctx, AI_DEEP)
    rays(ctx, CX, CY, 12, alpha(AI, 1.0), rot=-lt * 0.6)
    ring_r = 420
    traj = D.circle_traj(CX, CY, ring_r, 3.2, phase=0.0, ry=330)
    pts = D.spine(traj, lt, n=60, seg=26)
    D.draw_dragon(ctx, pts, DRAGON_COLORS[0], t, W=96, mane=GOLD, flip=True)
    hits = [3 * BAR / 2 * 0 + BAR + 2.5 * BEAT + k * BEAT / 2 for k in range(6)]
    for i, h in enumerate(hits):
        u = prog(lt, h, h + 0.5)
        if 0 < u < 1:
            hexagon_path(ctx, CX, CY, 200 + 900 * ease_out(u), TAU / 12)
            src(ctx, alpha(DRAGON_COLORS[i], 1 - u))
            ctx.set_line_width(24 * (1 - u) + 4)
            ctx.stroke()
    kick = BAR + 2.5 * BEAT
    if lt < kick:
        pose = replace(Wl.TUCK, rot=-lt * 520)
    else:
        pose = Wl.KICK
    ctx.save()
    C.shake(ctx, t, C.impact_shake(lt, [kick], 26), 41)
    Wl.draw_character(ctx, pose, t, CX, CY + 140, 1.2, outline=WHITE, outline_w=7)
    ctx.restore()
    if lt >= kick:
        speed_lines_radial(ctx, CX + 200, CY, t, alpha(WHITE, 0.8), n=60, r0=320)
        u = back_out(prog(lt, kick, kick + 0.14))
        ctx.save()
        ctx.translate(1500, 260)
        ctx.rotate(-0.1)
        sscale(ctx, u, u)
        text(ctx, "バシッ", FONT_JP, 200, 10, 10, INK)
        text(ctx, "バシッ", FONT_JP, 200, 0, 0, GOLD, stroke=INK, lw=12)
        ctx.restore()
    C.flash(ctx, lt, kick, 0.12)


# --------------------------------------------------------------- S12 paper breakdown (bars 28-31)
FR_W, FR_H = 200, 300


def _film_frame(ctx, x, y, idx, s=1.0):
    frames = C.sprite_frames()
    ctx.save()
    ctx.translate(x, y)
    sscale(ctx, s, s)
    rect(ctx, -FR_W / 2, -FR_H / 2, FR_W, FR_H, PAPER)
    C.draw_image(ctx, frames[idx % 25], 0, FR_H / 2 - 18, 1.0)
    ctx.restore()


def s_break(ctx, t, lt):
    C.fill(ctx, PAPER)
    halftone(ctx, 0, 0, W, H, 30, alpha(hexc("e6d9bf"), 1), lambda x, y: 2 + 8 * (1 - y / H))
    strip_y = 690
    speed = 220.0
    sprite_idx_rate = 14.0
    arrange = ease_io(prog(lt, 2 * BAR, 2 * BAR + 1.2))
    # film strip band
    band_a = 1 - arrange
    if band_a > 0:
        rect(ctx, -10, strip_y - 190, W + 20, 380, alpha(INK, band_a))
        off = (min(lt, 2 * BAR) * speed) % 80
        for i in range(-1, 26):
            x = i * 80 - off
            for yy in (strip_y - 172, strip_y + 154):
                round_rect(ctx, x, yy, 40, 20, 5)
                src(ctx, alpha(PAPER, band_a))
                ctx.fill()
    # 9 visible frames on the strip, each later flies to a 5x5 sheet slot on the right
    step = 240
    ls = min(lt, 2 * BAR)
    off = (ls * speed) % step
    base_index = int(ls * speed // step)
    for j in range(-1, 9):
        slot_x = j * step - off + 120
        idx = (base_index + j + int(lt * sprite_idx_rate)) % 25
        gx = 1180 + ((base_index + j) % 5) * 128
        gy = 200 + ((base_index + j) % 25 // 5) * 150
        if arrange > 0:
            x = lerp(slot_x, gx, arrange)
            y = lerp(strip_y, gy, arrange)
            s = lerp(1.0, 0.55, arrange)
        else:
            x, y, s = slot_x, strip_y, 1.0
        _film_frame(ctx, x, y, idx, s)
    if arrange > 0.99:
        # complete the 5x5 sheet
        flip_t = 3 * BAR + 2 * BEAT
        for i in range(25):
            gx = 1180 + (i % 5) * 128
            gy = 200 + (i // 5) * 150
            fu = prog(lt, flip_t + i * 0.025, flip_t + i * 0.025 + 0.12)
            if fu <= 0:
                _film_frame(ctx, gx, gy, (i + int(lt * 14)) % 25, 0.55)
            else:
                hexagon(ctx, gx, gy, 62 * back_out(fu), DRAGON_COLORS[i % 6], rot=TAU / 12, stroke=INK, lw=5)
    # labels
    lab_a = 1 - arrange
    text(ctx, "ORIGINAL SPRITE  25 FRAMES", FONT_LATIN, 34, 80, strip_y + 230, alpha(INK, lab_a), align="left",
         tracking=0.08)
    u = ease_out(prog(lt, BAR, BAR + 0.3))
    if u > 0:
        text(ctx, "PAPER", FONT_LATIN, 150, 620, 150, alpha(INK, u))
        text(ctx, "→ MOTION", FONT_LATIN, 150, 620 + 40 * (1 - u), 300, alpha(SHU, u))
    # vector Wilnas walking along / then posing
    ph = (lt * 14 / 25) % 1.0
    if lt < 2 * BAR:
        pose = Wl.walk_pose(ph)
        x = 1450
        y = 480
        sc = 0.8
    else:
        u = prog(lt, 2 * BAR, 2 * BAR + 0.6)
        pose = Wl.lerp_pose(Wl.walk_pose(ph), Wl.LOOK_BACK if lt < 3 * BAR else Wl.HERO,
                            ease_out(u) if lt < 3 * BAR else ease_out(prog(lt, 3 * BAR, 3 * BAR + 0.3)))
        x = lerp(1450, 300, ease_io(u))
        y = lerp(480, 990, ease_io(u))
        sc = lerp(0.8, 1.3, ease_io(u))
    Wl.draw_character(ctx, pose, on_twos(t), x, y, sc, outline=WHITE, outline_w=6)
    if lt < 2 * BAR:
        text(ctx, "MOTION GRAPHICS", FONT_LATIN, 30, x, y + 40, INK, tracking=0.1)
    C.hex_confetti(ctx, lt, 18, 51, [alpha(c, 0.8) for c in DRAGON_COLORS], fall=90, size=(6, 14))

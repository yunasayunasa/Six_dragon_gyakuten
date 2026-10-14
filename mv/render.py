"""Render the MV.

  python3 mv/render.py sheet [out.png]          contact sheet of stills
  python3 mv/render.py still T [out.png]        one frame at time T
  python3 mv/render.py video [start end]        full (or partial) MP4 with audio
"""
import math
import os
import subprocess
import sys
import time
from multiprocessing import Pool

import cairo

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import common as C  # noqa: E402
import scenes1 as A  # noqa: E402
import scenes2 as B  # noqa: E402
import scenes3 as S  # noqa: E402
from timeline import BAR, DURATION, FPS, H, W  # noqa: E402

CUTS = [
    (0.0, A.s_eye), (2 * BAR, A.s_rope), (3 * BAR, A.s_pullback), (4 * BAR, A.s_hero),
    (5 * BAR, A.s_collage), (6 * BAR, A.s_punch), (7 * BAR, A.s_flashes), (8 * BAR, A.s_verse_run),
    (12 * BAR, A.s_triptych), (14 * BAR, A.s_planet), (16 * BAR, B.s_pre), (20 * BAR, B.s_chorus1),
    (28 * BAR, B.s_break), (32 * BAR, S.s_build2), (36 * BAR, S.s_chorus2), (48 * BAR, S.s_post),
    (52 * BAR, S.s_outro),
]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")


def scene_at(t):
    cur = CUTS[0]
    for c in CUTS:
        if t + 1e-9 >= c[0]:
            cur = c
    return cur


def render_surface(t):
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    ctx = cairo.Context(surf)
    ctx.set_antialias(cairo.ANTIALIAS_GOOD)
    start, fn = scene_at(t)
    ctx.save()
    fn(ctx, t, t - start)
    ctx.restore()
    # paper grain over everything (MV_GRAIN=0 for a cleaner, smaller share copy)
    if os.environ.get("MV_GRAIN", "1") == "0":
        surf.flush()
        return surf
    g = C.grain_tiles()[0]
    ctx.save()
    ctx.scale(2, 2)
    ctx.set_source_surface(g, 0, 0)
    ctx.get_source().set_filter(cairo.FILTER_FAST)
    ctx.paint()
    ctx.restore()
    surf.flush()
    return surf


def render_frame(i):
    surf = render_surface(i / FPS)
    return bytes(surf.get_data())


def still(t, path):
    render_surface(t).write_to_png(path)
    print("wrote", path)


def sheet(path, times=None, cols=6, thumb=480):
    times = times or [0.8, 2.4, 3.9, 5.2, 6.1, 7.2, 8.9, 10.6, 11.9, 13.5, 16.3, 18.6, 20.2, 21.8, 23.2, 25.0,
                      26.4, 28.0, 29.5, 30.8, 31.6, 32.4, 33.2, 35.5, 39.5, 42.4, 44.3, 46.0, 49.4, 50.9,
                      52.6, 55.2, 56.5, 58.6, 61.3, 62.9, 66.0, 69.5, 72.0, 74.8, 76.0, 78.3, 82.8, 84.4,
                      86.7, 89.0]
    rows = math.ceil(len(times) / cols)
    th = thumb * H // W
    out = cairo.ImageSurface(cairo.FORMAT_ARGB32, cols * thumb, rows * (th + 24))
    ctx = cairo.Context(out)
    ctx.set_source_rgb(0.1, 0.1, 0.1)
    ctx.paint()
    for i, t in enumerate(times):
        s = render_surface(t)
        x, y = (i % cols) * thumb, (i // cols) * (th + 24)
        ctx.save()
        ctx.translate(x, y)
        ctx.scale(thumb / W, thumb / W)
        ctx.set_source_surface(s, 0, 0)
        ctx.paint()
        ctx.restore()
        ctx.set_source_rgb(1, 1, 1)
        ctx.select_font_face("Inter")
        ctx.set_font_size(16)
        ctx.move_to(x + 6, y + th + 18)
        ctx.show_text(f"{t:.1f}s")
    out.write_to_png(path)
    print("wrote", path)


def video(start=0.0, end=DURATION, path=None, workers=4):
    path = path or os.path.join(OUT, "six_dragon_mv.mp4")
    wav = os.path.join(OUT, "soundtrack.wav")
    f0, f1 = int(round(start * FPS)), int(round(end * FPS))
    cmd = ["ffmpeg", "-y", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "bgra", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-ss", f"{start:.3f}", "-t", f"{(f1 - f0) / FPS:.3f}", "-i", wav,
           "-map", "0:v", "-map", "1:a",
           "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
           "-tune", "animation", "-movflags", "+faststart",
           "-c:a", "aac", "-b:a", "256k", "-shortest", path]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    t0 = time.time()
    with Pool(workers) as pool:
        for n, buf in enumerate(pool.imap(render_frame, range(f0, f1), chunksize=6)):
            proc.stdin.write(buf)
            if n % 150 == 0:
                el = time.time() - t0
                print(f"frame {f0 + n}/{f1}  {el:.0f}s elapsed", flush=True)
    proc.stdin.close()
    proc.wait()
    print("wrote", path, f"in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    mode = sys.argv[1] if len(sys.argv) > 1 else "sheet"
    if mode == "still":
        still(float(sys.argv[2]), sys.argv[3] if len(sys.argv) > 3 else os.path.join(OUT, "still.png"))
    elif mode == "sheet":
        sheet(sys.argv[2] if len(sys.argv) > 2 else os.path.join(OUT, "sheet.png"))
    elif mode == "times":
        sheet(sys.argv[2], [float(x) for x in sys.argv[3:]], cols=4, thumb=640)
    else:
        a = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0
        b = float(sys.argv[3]) if len(sys.argv) > 3 else DURATION
        p = sys.argv[4] if len(sys.argv) > 4 else None
        video(a, b, p)

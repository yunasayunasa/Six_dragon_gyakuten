"""Shared musical clock for the soundtrack and the picture."""

BPM = 150
FPS = 30
BEAT = 60.0 / BPM            # 0.4 s
BAR = BEAT * 4               # 1.6 s
BARS = 56
MUSIC_END = BARS * BAR       # 89.6 s
DURATION = 91.6              # ring-out tail for the last chord
W, H = 1920, 1080

# Section starts, in bars.
INTRO_A = 0
INTRO_B = 4
VERSE = 8
PRE = 16
CHORUS1 = 20
BREAK = 28
BUILD2 = 32
CHORUS2 = 36
POST = 48
OUTRO = 52


def bar(b):
    return b * BAR


def beat(n):
    return n * BEAT

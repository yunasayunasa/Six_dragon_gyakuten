"""Soundtrack for the Wilnas motion-graphics MV, synthesized from scratch.

150 BPM, D major -> E major (key change for the final chorus).
Run:  python3 mv/audio.py  ->  mv/out/soundtrack.wav
"""
import os
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, lfilter, sosfilt

from timeline import BAR, BEAT, DURATION

SR = 44100
N = int(DURATION * SR)
rng = np.random.default_rng(6)

NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5,
        "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}


def midi(name):
    return 12 * (int(name[-1]) + 1) + NOTE[name[:-1]]


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def t_of(bar, beat=0.0):
    return bar * BAR + beat * BEAT


# ---------------------------------------------------------------- buses
class Bus:
    def __init__(self):
        self.l = np.zeros(N)
        self.r = np.zeros(N)

    def add(self, sig, t, gain=1.0, pan=0.0):
        i = int(round(t * SR))
        if i >= N:
            return
        sig = sig[: N - i]
        gl = gain * np.cos((pan + 1) * np.pi / 4) * np.sqrt(2)
        gr = gain * np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)
        self.l[i:i + len(sig)] += sig * gl
        self.r[i:i + len(sig)] += sig * gr

    def stereo(self):
        return np.stack([self.l, self.r])


def lp(sig, fc, order=2):
    sos = butter(order, min(fc, SR * 0.45), "low", fs=SR, output="sos")
    return sosfilt(sos, sig)


def hp(sig, fc, order=2):
    sos = butter(order, fc, "high", fs=SR, output="sos")
    return sosfilt(sos, sig)


def bp(sig, lo, hi, order=2):
    sos = butter(order, [lo, min(hi, SR * 0.45)], "band", fs=SR, output="sos")
    return sosfilt(sos, sig)


def env_adsr(n, a, d, s, r, hold):
    """Linear-attack, exponential-ish decay envelope. Times in seconds."""
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), 0.0)
    dec = s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4))
    e = np.where(t >= a, dec, e)
    rel = np.where(t > hold, np.exp(-(t - hold) / max(r, 1e-4)), 1.0)
    return e * rel


def saw(freq, n, phase=0.0):
    """Band-limited (PolyBLEP) sawtooth."""
    f = np.full(n, freq) if np.isscalar(freq) else freq
    dt = f / SR
    ph = (phase + np.cumsum(dt)) % 1.0
    y = 2 * ph - 1
    lo = ph < dt
    x = np.where(lo, ph / dt, 0.0)
    y -= np.where(lo, x + x - x * x - 1, 0.0)
    hi = ph > 1 - dt
    x = np.where(hi, (ph - 1) / dt, 0.0)
    y -= np.where(hi, x * x + x + x + 1, 0.0)
    return y


def sine(freq, n, phase=0.0):
    f = np.full(n, freq) if np.isscalar(freq) else freq
    return np.sin(2 * np.pi * (phase + np.cumsum(f) / SR))


# ---------------------------------------------------------------- drums
def kick(big=False):
    n = int(0.55 * SR)
    t = np.arange(n) / SR
    f = 46 + 130 * np.exp(-t / 0.045)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.32 if big else 0.24))
    click = lp(rng.standard_normal(n), 3500) * np.exp(-t / 0.004) * 0.5
    return np.tanh((body + click) * 1.6) * 0.95


def snare():
    n = int(0.4 * SR)
    t = np.arange(n) / SR
    noise = bp(rng.standard_normal(n), 1200, 9000) * np.exp(-t / 0.13)
    tone = np.sin(2 * np.pi * 195 * t) * np.exp(-t / 0.06) + 0.5 * np.sin(2 * np.pi * 330 * t) * np.exp(-t / 0.04)
    return (noise * 0.75 + tone * 0.55) * 0.8


def clap():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    burst = np.zeros(n)
    for k, off in enumerate((0.0, 0.011, 0.023)):
        burst += np.where(t >= off, np.exp(-(t - off) / (0.012 if k < 2 else 0.11)), 0)
    return bp(rng.standard_normal(n), 900, 5000) * burst * 0.7


def hat(open_=False):
    n = int((0.32 if open_ else 0.07) * SR)
    t = np.arange(n) / SR
    s = hp(rng.standard_normal(n), 7500, 4) * np.exp(-t / (0.11 if open_ else 0.018))
    return s * (0.45 if open_ else 0.4)


def taiko(pitch=1.0):
    n = int(1.2 * SR)
    t = np.arange(n) / SR
    f = (62 + 70 * np.exp(-t / 0.03)) * pitch
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.42)
    skin = lp(rng.standard_normal(n), 900) * np.exp(-t / 0.05) * 0.9
    return np.tanh((body + skin) * 1.4) * 0.9


def crash():
    n = int(2.6 * SR)
    t = np.arange(n) / SR
    s = hp(rng.standard_normal(n), 4200, 2)
    ring = sum(np.sin(2 * np.pi * f * t + p) for f, p in ((5230, 0.1), (6770, 1.2), (8120, 2.0))) * 0.08
    return (s + ring) * np.exp(-t / 0.9) * 0.42


def tom(f0):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    f = f0 * (1 + 0.6 * np.exp(-t / 0.04))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.2) * 0.75


def reverse_cymbal(length):
    s = crash()[: int(length * SR)]
    return s[::-1] * 0.9


def riser(length):
    n = int(length * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    blocks = 24
    edges = np.linspace(0, n, blocks + 1).astype(int)
    for k in range(blocks):
        a, b = edges[k], edges[k + 1]
        fc = 400 * (30 ** (k / blocks))
        seg = bp(noise[max(0, a - 2000):b], fc * 0.7, fc * 1.6)
        out[a:b] = seg[-(b - a):]
    sweep = saw(220 * 4 ** (t / length), n) * 0.12 + saw(221.5 * 4 ** (t / length), n) * 0.12
    return (out * 0.6 + lp(sweep, 3000)) * (t / length) ** 2.2


def impact():
    n = int(3.0 * SR)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-t / 0.08)) / SR) * np.exp(-t / 0.9)
    air = lp(rng.standard_normal(n), 1800) * np.exp(-t / 0.4) * 0.35
    return np.tanh((boom + air) * 1.3) * 0.8


# ---------------------------------------------------------------- tonal
def supersaw(m, dur, bright=4000, voices=5, detune=0.18, att=0.03, rel=0.25):
    n = int((dur + rel * 3) * SR)
    sig = np.zeros(n)
    f = hz(m)
    for v in range(voices):
        cents = (v - (voices - 1) / 2) / ((voices - 1) / 2) * detune * 100 if voices > 1 else 0
        sig += saw(f * 2 ** (cents / 1200), n, rng.random())
    sig /= voices
    sig = lp(sig, bright)
    return sig * env_adsr(n, att, 0.6, 0.75, rel, dur)


def pluck_ks(m, dur, bright=0.996, tone=7000):
    """Karplus-Strong string: koto-like pluck."""
    f = hz(m)
    n = int((dur + 1.2) * SR)
    period = SR / f
    p = int(period)
    frac = period - p
    exc_len = max(p, 2)
    exc = np.zeros(n)
    burst = rng.uniform(-1, 1, exc_len)
    burst = lp(burst, tone)
    exc[:exc_len] = burst
    # y[n] = x[n] + g*((1-frac)*y[n-p] + frac*y[n-p-1]) averaged with its neighbour
    a = np.zeros(p + 3)
    a[0] = 1.0
    g = bright
    a[p] -= g * 0.5 * (1 - frac)
    a[p + 1] -= g * 0.5
    a[p + 2] -= g * 0.5 * frac
    y = lfilter([1.0], a, exc)
    t = np.arange(n) / SR
    y *= np.where(t > dur, np.exp(-(t - dur) / 0.25), 1.0)
    pk = np.max(np.abs(y)) + 1e-9
    return y / pk * 0.8


def lead_voice(m, dur, vib=True):
    n = int((dur + 0.4) * SR)
    t = np.arange(n) / SR
    f = hz(m) * (1 + (0.006 * np.sin(2 * np.pi * 5.6 * t) * np.clip((t - 0.18) / 0.2, 0, 1) if vib else 0))
    s = saw(f, n) * 0.55 + saw(f * 1.004, n) * 0.45
    sq = np.sign(sine(f * 0.5, n)) * 0.25
    s = s + sq
    cut = 1800 + 4200 * np.exp(-t / 0.18)
    # two-stage static approximation of a decaying filter envelope
    bright = lp(s, 6000)
    dark = lp(s, 1800)
    w = np.clip((cut - 1800) / 4200, 0, 1)
    s = bright * w + dark * (1 - w)
    return s * env_adsr(n, 0.008, 0.25, 0.7, 0.09, dur) * 0.5


def flute_voice(m, dur):
    n = int((dur + 0.3) * SR)
    t = np.arange(n) / SR
    f = hz(m) * (1 + 0.004 * np.sin(2 * np.pi * 5.0 * t))
    s = sine(f, n) + 0.25 * sine(2 * f, n) + 0.08 * sine(3 * f, n)
    breath = bp(rng.standard_normal(n), hz(m) * 1.5, hz(m) * 4) * 0.08
    return (s + breath) * env_adsr(n, 0.05, 0.3, 0.8, 0.12, dur) * 0.4


def bell(m, dur):
    n = int((dur + 1.2) * SR)
    t = np.arange(n) / SR
    f = hz(m)
    mod = np.sin(2 * np.pi * f * 3.5 * t) * 2.2 * np.exp(-t / 0.25)
    s = np.sin(2 * np.pi * f * t + mod)
    return s * np.exp(-t / 0.7) * 0.35


def bass_voice(m, dur):
    n = int((dur + 0.08) * SR)
    t = np.arange(n) / SR
    f = hz(m)
    s = saw(f, n) * 0.6 + sine(f, n) * 0.7 + sine(f / 2, n) * 0.25
    s = lp(s, 900 + 600 * 0, 2)
    return np.tanh(s * 1.4) * env_adsr(n, 0.004, 0.12, 0.8, 0.03, dur) * 0.55


def sub_voice(m, dur):
    n = int((dur + 0.5) * SR)
    return sine(hz(m), n) * env_adsr(n, 0.02, 0.8, 0.85, 0.3, dur) * 0.6


# ---------------------------------------------------------------- score
CH = {  # chord tones as note names (D major, transposed later where needed)
    "G": ["G3", "B3", "D4"], "A": ["A3", "C#4", "E4"], "F#m": ["F#3", "A3", "C#4"],
    "Bm": ["B3", "D4", "F#4"], "D": ["D4", "F#4", "A4"], "B7": ["B3", "D#4", "F#4", "A4"],
}
ROOT = {"G": "G2", "A": "A2", "F#m": "F#2", "Bm": "B2", "D": "D2", "B7": "B2"}

# (bar, chord, beats, transpose)
prog = []


def add_prog(start, chords, tr=0):
    b = start
    for c in chords:
        if isinstance(c, tuple):  # split bar
            for half in c:
                prog.append((b, half, 2, tr))
                b += 0.5
        else:
            prog.append((b, c, 4, tr))
            b += 1


add_prog(0, ["G", "A", "F#m", "Bm"])
add_prog(4, ["G", "A", "F#m", "Bm"])
add_prog(8, ["Bm", "G", "D", "A", "Bm", "G", "D", "A"])
add_prog(16, ["G", "A", ("F#m", "Bm"), ("G", "A")])
add_prog(20, ["G", "A", "F#m", "Bm", "G", "A", "D", "D"])
add_prog(28, ["G", "A", "F#m", "Bm"])
add_prog(32, ["G", "A", "Bm", "B7"])
add_prog(36, ["G", "A", "F#m", "Bm", "G", "A", "D", "D", "G", "A", "F#m", "Bm"], tr=2)
add_prog(48, ["G", "A", "D", "D"], tr=2)
add_prog(52, ["G", "A", "D", "D"], tr=2)


def parse_line(s):
    out = []
    pos = 0
    for tok in s.split():
        name, d = tok.split(":")
        d = int(d)
        if name != "r":
            out.append((pos, d, midi(name)))
        pos += d
    return out  # positions/durations in eighth notes


HOOK = [
    "D5:2 E5:1 D5:1 B4:2 A4:2", "A4:1 B4:1 D5:2 E5:3 F#5:1",
    "F#5:2 E5:1 D5:1 E5:2 A4:2", "B4:3 D5:1 F#5:2 E5:2",
    "D5:2 E5:1 D5:1 B4:2 D5:2", "E5:2 F#5:1 A5:3 F#5:1 E5:1",
    "F#5:3 E5:1 D5:4", "r:2 A4:1 B4:1 D5:1 E5:1 F#5:1 A5:1",
]
HOOK_END = "B4:2 D5:2 E5:2 F#5:2"
VERSE_RIFF = [
    "F#4:1 B4:1 D5:1 B4:1 F#4:1 B4:1 D5:1 E5:1", "D5:1 B4:1 G4:1 B4:1 D5:2 B4:2",
    "A4:1 D5:1 F#5:1 D5:1 A4:1 D5:1 E5:2", "E5:2 C#5:1 A4:1 E5:2 F#5:1 E5:1",
]
VERSE_MEL = ["r:2 F#5:2 E5:1 D5:1 B4:2", "r:2 D5:1 E5:1 D5:2 B4:2",
             "r:1 A4:1 D5:2 E5:2 F#5:2", "E5:4 r:4"]
PRE_MEL = ["B4:2 D5:2 E5:2 G5:2", "A4:2 C#5:2 E5:2 A5:2", "A5:2 F#5:2 F#5:2 D5:2", "D5:2 E5:2 F#5:2 A5:2"]
BREAK_MEL = ["D5:4 B4:4", "E5:4 A4:4", "F#5:4 E5:2 C#5:2", "D5:4 B4:4"]
BUILD_MEL = ["B4:2 D5:2 G5:2 D5:2", "C#5:2 E5:2 A5:2 E5:2", "D5:2 F#5:2 B5:2 F#5:2", "B4:2 D#5:2 F#5:2 A5:2"]


def place(line_bars, start_bar, voice, bus, gain=1.0, pan=0.0, tr=0, octave=0, legato=0.92):
    for i, line in enumerate(line_bars):
        for pos, d, m in parse_line(line):
            t = t_of(start_bar + i) + pos * BEAT / 2
            dur = d * BEAT / 2 * legato
            bus.add(voice(m + tr + 12 * octave, dur), t, gain, pan)


def main():
    drums = Bus()
    perc = Bus()
    bass = Bus()
    pad = Bus()
    lead = Bus()
    koto = Bus()
    fx = Bus()

    K, KB, S, C, HC, HO, T, CR = kick(), kick(True), snare(), clap(), hat(), hat(True), taiko(), crash()
    kick_times = []

    def k(t, big=False, g=1.0):
        drums.add(KB if big else K, t, g)
        kick_times.append(t)

    # ---- drums per section
    # Intro A: taiko pickup into bar 4
    for b in (3.5, 3.625, 3.75, 3.875):
        perc.add(taiko(1.0 + (b - 3.5)), t_of(0) + b * BAR, 0.55 + (b - 3.5) * 1.2, pan=-0.2 + (b - 3.5))
    fx.add(reverse_cymbal(1.6), t_of(4) - 1.6, 0.8)

    def groove(b0, b1, style):
        for b in range(b0, b1):
            for q in range(4):
                t = t_of(b, q)
                if style == "intro":
                    if q in (0, 2):
                        k(t)
                    if q in (1, 3):
                        drums.add(S, t, 0.8)
                    drums.add(HC, t + BEAT / 2, 0.6, 0.3)
                    drums.add(HC, t, 0.35, 0.3)
                elif style == "verse":
                    if q in (0, 2):
                        k(t)
                    if q == 1:
                        k(t + BEAT / 2, g=0.8)
                    if q in (1, 3):
                        drums.add(S, t, 0.72)
                    drums.add(HC, t, 0.35, 0.35)
                    drums.add(HC, t + BEAT / 2, 0.6, 0.35)
                elif style == "four":
                    k(t)
                    if q in (1, 3):
                        drums.add(S, t, 0.8)
                        drums.add(C, t, 0.6, -0.1)
                    drums.add(HO, t + BEAT / 2, 0.5, 0.3)
                    drums.add(HC, t + BEAT / 4, 0.25, -0.3)
                    drums.add(HC, t + 3 * BEAT / 4, 0.25, -0.3)
                elif style == "four_big":
                    k(t, big=q == 0)
                    if q in (1, 3):
                        drums.add(S, t, 0.85)
                        drums.add(C, t, 0.7, -0.1)
                    if q in (0, 2):
                        perc.add(T, t, 0.35, -0.35 if q == 0 else 0.35)
                    drums.add(HO, t + BEAT / 2, 0.5, 0.3)
                    for s16 in (1, 3):
                        drums.add(HC, t + s16 * BEAT / 4, 0.28, -0.3)
                elif style == "half":
                    if q == 0:
                        k(t)
                    if q == 2:
                        drums.add(S, t, 0.7)
                    for s16 in range(4):
                        drums.add(HC, t + s16 * BEAT / 4, 0.12 + 0.08 * (s16 == 2), 0.4)
                elif style == "kick4":
                    k(t)
                    drums.add(HC, t + BEAT / 2, 0.45, 0.3)

    def roll(t0, t1, step, g0=0.3, g1=0.9):
        t = t0
        while t < t1 - 1e-6:
            a = (t - t0) / (t1 - t0)
            drums.add(S, t, g0 + (g1 - g0) * a, 0.1 * np.sin(t * 9))
            t += step

    groove(4, 8, "intro")
    drums.add(CR, t_of(4), 0.9, -0.3)
    for i, f0 in enumerate((180, 150, 120, 95)):  # tom fill bar 7
        drums.add(tom(f0), t_of(7, 3 + i * 0.25), 0.7, -0.4 + i * 0.25)

    groove(8, 16, "verse")
    drums.add(CR, t_of(8), 0.75, 0.3)
    drums.add(CR, t_of(12), 0.6, -0.3)
    roll(t_of(15, 3), t_of(16), BEAT / 4, 0.4, 0.8)

    groove(16, 19, "kick4")
    roll(t_of(16), t_of(17), BEAT)
    roll(t_of(17), t_of(18), BEAT / 2, 0.35, 0.6)
    roll(t_of(18), t_of(19), BEAT / 4, 0.4, 0.8)
    k(t_of(19, 0))
    k(t_of(19, 1))
    roll(t_of(19, 0), t_of(19, 2), BEAT / 8, 0.5, 1.0)
    fx.add(riser(2 * BAR), t_of(18), 0.55)
    fx.add(reverse_cymbal(1.2), t_of(20) - 1.2, 0.9)

    for c0, c1, style in ((20, 28, "four"), (36, 48, "four_big"), (48, 52, "four")):
        groove(c0, c1, style)
        for b in range(c0, c1, 4):
            drums.add(CR, t_of(b), 0.85, -0.3 if b % 8 else 0.3)
    for b in (20, 36):
        fx.add(impact(), t_of(b), 0.75)
        perc.add(T, t_of(b), 0.8)
    # the final punch of chorus 2
    fx.add(impact(), t_of(47), 0.7)
    drums.add(CR, t_of(47), 0.8, 0.3)
    perc.add(T, t_of(47), 0.7)
    for i, f0 in enumerate((200, 170, 140, 110, 95, 80)):
        drums.add(tom(f0), t_of(27, 2.5 + i * 0.25), 0.65, -0.5 + i * 0.2)
        drums.add(tom(f0), t_of(47, 2.5 + i * 0.25), 0.7, 0.5 - i * 0.2)

    groove(28, 32, "half")
    groove(32, 34, "kick4")
    roll(t_of(34), t_of(35), BEAT / 2, 0.3, 0.6)
    roll(t_of(35), t_of(35, 3), BEAT / 4, 0.45, 0.95)
    k(t_of(34))
    k(t_of(34, 2))
    k(t_of(35))
    k(t_of(35, 2))
    fx.add(riser(2 * BAR - BEAT), t_of(34), 0.6)
    fx.add(reverse_cymbal(1.2), t_of(36) - 1.2, 0.9)
    # the "flip" at bar 34: downlifter swish
    fx.add(riser(0.8)[::-1] * 0.8, t_of(34), 0.5, 0.3)

    groove(52, 54, "half")
    for i in range(4):
        perc.add(taiko(1.25 - i * 0.07), t_of(53, 2 + i * 0.5), 0.55 + i * 0.1, -0.3 + i * 0.2)
    k(t_of(54), big=True)
    drums.add(CR, t_of(54), 1.0)
    perc.add(T, t_of(54), 0.9)
    fx.add(impact(), t_of(54), 0.8)

    # ---- bass
    def bass_line(b0, b1, pattern):
        for (pb, ch, beats, tr) in prog:
            if not (b0 <= pb < b1):
                continue
            root = midi(ROOT[ch]) + tr
            t0 = t_of(pb)
            n8 = int(beats * 2)
            for e in range(n8):
                t = t0 + e * BEAT / 2
                if pattern == "eighth":
                    m = root + (12 if e % 4 == 3 else 0)
                    bass.add(bass_voice(m, BEAT / 2 * 0.85), t, 0.9)
                elif pattern == "quarter" and e % 2 == 0:
                    bass.add(bass_voice(root, BEAT * 0.9), t, 0.9)
                elif pattern == "drive":
                    m = root + (12 if e % 2 == 1 else 0)
                    bass.add(bass_voice(m, BEAT / 2 * 0.8), t, 0.95 if e % 2 == 0 else 0.7)
            if pattern == "sub":
                bass.add(sub_voice(root, beats * BEAT * 0.95), t0, 0.55)

    bass_line(4, 8, "quarter")
    bass_line(8, 16, "eighth")
    bass_line(16, 19.5, "eighth")
    bass_line(20, 28, "drive")
    bass_line(28, 32, "sub")
    bass_line(32, 36, "eighth")
    bass_line(36, 52, "drive")
    bass_line(52, 54, "quarter")
    bass.add(sub_voice(midi("E2"), 2.5), t_of(54), 1.0)
    bass.add(bass_voice(midi("E1"), 1.5), t_of(54), 0.8)

    # ---- pads
    for (pb, ch, beats, tr) in prog:
        dur = beats * BEAT
        if 19.5 <= pb < 20:
            continue  # stop before the drop
        if pb < 4:
            bright, g = 1600 + pb * 500, 0.22
        elif pb < 8:
            bright, g = 3200, 0.2
        elif pb < 16:
            bright, g = 2400, 0.16
        elif pb < 20:
            bright, g = 2400 + (pb - 16) * 900, 0.2
        elif pb < 28:
            bright, g = 5200, 0.26
        elif pb < 32:
            bright, g = 1400, 0.22
        elif pb < 36:
            bright, g = 1800 + (pb - 32) * 1100, 0.22
        elif pb < 54:
            bright, g = 6000, 0.27
        else:
            bright, g = 4000, 0.3
        if pb >= 54:
            dur = 3.2
        for j, nm in enumerate(CH[ch]):
            m = midi(nm) + tr
            pad.add(supersaw(m, dur, bright), t_of(pb), g, pan=(j - 1) * 0.45)
        if pb >= 20 and not (28 <= pb < 32):
            pad.add(supersaw(midi(CH[ch][0]) + tr + 12, dur, bright, voices=3), t_of(pb), g * 0.6, 0.0)

    # ---- koto / pluck
    for (pb, ch, beats, tr) in prog:
        if pb >= 4:
            break
        notes = [midi(n) for n in CH[ch]] + [midi(CH[ch][0]) + 12]
        seq = notes + notes[::-1][1:3] + [notes[1] + 12]
        for e, m in enumerate(seq[:8]):
            koto.add(pluck_ks(m + 12, BEAT * 0.9), t_of(pb) + e * BEAT / 2, 0.55, pan=-0.5 + e * 0.14)
    place(HOOK[:4], 4, lambda m, d: pluck_ks(m, d), koto, 0.7, -0.15)
    place(HOOK[:4], 4, lambda m, d: bell(m, d), koto, 0.4, 0.3, octave=1)
    place(VERSE_RIFF * 2, 8, lambda m, d: pluck_ks(m, d), koto, 0.5, -0.25)
    place(BREAK_MEL, 28, lambda m, d: pluck_ks(m, d, bright=0.998), koto, 0.85, 0.0)
    place(BREAK_MEL, 28, lambda m, d: bell(m, d), koto, 0.25, 0.4, octave=1)
    place(HOOK[4:8], 48, lambda m, d: pluck_ks(m, d), koto, 0.6, 0.25, tr=2, octave=1)
    # rising arps in build 2
    for (pb, ch, beats, tr) in prog:
        if 32 <= pb < 36:
            notes = [midi(n) for n in CH[ch]]
            for e in range(16):
                m = notes[e % len(notes)] + 12 * (1 + e // 8)
                koto.add(bell(m, BEAT / 4), t_of(pb) + e * BEAT / 4, 0.25 + 0.15 * (pb - 32) / 4, pan=np.sin(e) * 0.5)

    # ---- lead
    place(VERSE_MEL, 12, flute_voice, lead, 0.75, 0.1)
    place(PRE_MEL, 16, flute_voice, lead, 0.8, 0.0)
    place(HOOK, 20, lead_voice, lead, 0.75, 0.0)
    place(HOOK, 20, lambda m, d: pluck_ks(m, d), koto, 0.3, 0.4, octave=1)
    place(BUILD_MEL, 32, lead_voice, lead, 0.45, 0.0, octave=0)
    place(HOOK + HOOK[:3] + [HOOK_END], 36, lead_voice, lead, 0.8, 0.0, tr=2)
    place(HOOK + HOOK[:3] + [HOOK_END], 36, lead_voice, lead, 0.35, 0.0, tr=2 - 12)
    place(HOOK + HOOK[:3] + [HOOK_END], 36, lambda m, d: bell(m, d), koto, 0.22, -0.3, tr=2, octave=1)
    place(HOOK[4:6], 52, lead_voice, lead, 0.75, 0.0, tr=2)
    lead.add(lead_voice(midi("D5") + 2, 2.6), t_of(54), 0.75)
    lead.add(lead_voice(midi("D4") + 2, 2.6), t_of(54), 0.35)

    # ---- sidechain (pads + bass duck under kicks)
    duck = np.ones(N)
    dlen = int(0.28 * SR)
    shape = 1 - 0.55 * np.exp(-np.arange(dlen) / (0.07 * SR))
    for t in kick_times:
        i = int(t * SR)
        j = min(N, i + dlen)
        duck[i:j] = np.minimum(duck[i:j], shape[: j - i])
    pad.l *= duck
    pad.r *= duck
    bass.l *= 0.5 + 0.5 * duck
    bass.r *= 0.5 + 0.5 * duck

    # ---- delay on lead / koto
    def delay(bus, time, fb, mix, pingpong=True):
        d = int(time * SR)
        l, r = bus.l.copy(), bus.r.copy()
        out_l, out_r = np.zeros(N), np.zeros(N)
        g = mix
        for i in range(1, 6):
            sh = d * i
            if sh >= N:
                break
            src_l, src_r = (r, l) if (pingpong and i % 2) else (l, r)
            out_l[sh:] += src_l[:-sh] * g
            out_r[sh:] += src_r[:-sh] * g
            g *= fb
        bus.l += lp(out_l, 3500)
        bus.r += lp(out_r, 3500)

    delay(lead, BEAT * 0.75, 0.45, 0.28)
    delay(koto, BEAT * 0.5, 0.4, 0.22)

    # ---- reverb (convolution with a synthetic hall)
    ir_n = int(2.4 * SR)
    ti = np.arange(ir_n) / SR
    irs = []
    for _ in range(2):
        ir = rng.standard_normal(ir_n) * np.exp(-ti / 0.55)
        ir = lp(ir, 5000)
        ir[: int(0.012 * SR)] = 0
        irs.append(ir / np.sqrt(np.sum(ir ** 2)))

    def verb(bus_list, sends):
        l = sum(b.l * s for b, s in zip(bus_list, sends))
        r = sum(b.r * s for b, s in zip(bus_list, sends))
        wl = fftconvolve(l, irs[0])[:N]
        wr = fftconvolve(r, irs[1])[:N]
        return hp(wl, 200), hp(wr, 200)

    rv_l, rv_r = verb([pad, lead, koto, perc, drums], [0.25, 0.35, 0.45, 0.5, 0.08])

    mix_l = (drums.l * 0.9 + perc.l * 0.85 + bass.l * 0.85 + pad.l * 0.8 + lead.l * 0.85 +
             koto.l * 0.8 + fx.l * 0.8 + rv_l * 0.55)
    mix_r = (drums.r * 0.9 + perc.r * 0.85 + bass.r * 0.85 + pad.r * 0.8 + lead.r * 0.85 +
             koto.r * 0.8 + fx.r * 0.8 + rv_r * 0.55)
    mix = np.stack([mix_l, mix_r])
    mix = hp(mix, 28)

    # gentle bus glue + soft clip, then normalise to -1 dBFS
    mix = mix / (np.percentile(np.abs(mix), 99.9) + 1e-9) * 0.8
    mix = np.tanh(mix * 1.15) / np.tanh(1.15)
    t = np.arange(N) / SR
    fade_in = np.clip(t / 0.02, 0, 1)
    fade_out = np.clip((DURATION - t) / 1.2, 0, 1)
    mix *= fade_in * fade_out
    mix *= 10 ** (-1 / 20) / np.max(np.abs(mix))

    os.makedirs(os.path.join(os.path.dirname(__file__), "out"), exist_ok=True)
    path = os.environ.get("MV_WAV") or os.path.join(os.path.dirname(__file__), "out", "soundtrack.wav")
    pcm = (mix.T * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print("wrote", path, f"{N / SR:.2f}s")

    # section loudness report
    for name, b0, b1 in (("introA", 0, 4), ("introB", 4, 8), ("verse", 8, 16), ("pre", 16, 20),
                         ("chorus1", 20, 28), ("break", 28, 32), ("build2", 32, 36),
                         ("chorus2", 36, 48), ("post", 48, 52), ("outro", 52, 57)):
        a, b = int(t_of(b0) * SR), min(N, int(t_of(b1) * SR))
        seg = mix[:, a:b]
        rms = np.sqrt(np.mean(seg ** 2))
        print(f"{name:8s} rms {20 * np.log10(rms + 1e-9):6.1f} dBFS  peak {20 * np.log10(np.max(np.abs(seg)) + 1e-9):5.1f}")


if __name__ == "__main__":
    main()

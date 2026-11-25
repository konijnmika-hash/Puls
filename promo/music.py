"""Synthesised soundtrack for the Puls promo (33 s). Writes music.wav next to this file."""
import numpy as np, wave, os

SR = 44100
DUR = 33.0
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(3)

BEAT = 0.65625          # 91.4 bpm, 8 bars from 6.0 s to 27.0 s
GRID0 = 6.0
BAR = BEAT * 4

def nf(m): return 440.0 * 2 ** ((m - 69) / 12)

def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N: return
    sig = sig[: N - i]
    L[i:i + len(sig)] += sig * gain * (1 - max(0, pan))
    R[i:i + len(sig)] += sig * gain * (1 + min(0, pan))

def env(n, a, d, sustain_len=0):
    a_n = max(1, int(a * SR)); e = np.ones(n)
    e[:a_n] = np.linspace(0, 1, a_n)
    return e * np.exp(-np.maximum(0, np.arange(n) - a_n) / (d * SR))

def onepole(x, cutoff):
    """vectorised-ish one-pole lowpass with (possibly time-varying) cutoff"""
    c = np.broadcast_to(np.asarray(cutoff, float), x.shape)
    a = np.exp(-2 * np.pi * c / SR)
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)):
        s = (1 - a[i]) * x[i] + a[i] * s; y[i] = s
    return y

def saw(f, n, detune=0.0):
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k in range(1, 14):
        if f * k > 9000: break
        out += np.sin(2 * np.pi * f * (1 + detune) * k * t + k) / k
    return out

# ---- pad -------------------------------------------------------------------
chords = {  # A minor: Am  F  C  G
    'Am': [57, 60, 64, 69], 'F': [53, 57, 60, 65], 'C': [55, 60, 64, 67], 'G': [55, 59, 62, 67]}
prog = ['Am', 'F', 'C', 'G']

def pad(chord, t0, length, gain, cutoff=1800):
    n = int(length * SR)
    sig = np.zeros(n)
    for m in chords[chord]:
        for dt in (-0.004, 0.0, 0.005):
            sig += saw(nf(m), n, dt)
    sig /= 12
    e = np.minimum(1, np.arange(n) / (0.6 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.5 * SR))
    sig = onepole(sig * e, cutoff)
    add(sig, t0, gain, -0.25); add(np.roll(sig, 300), t0, gain, 0.25)

pad('Am', 0.0, 3.4, 0.22, 900)
pad('F', 3.3, 2.8, 0.25, 1300)
for b in range(8):
    pad(prog[b % 4], GRID0 + b * BAR, BAR + 0.4, 0.17, 2000)
pad('F', 27.0, 3.0, 0.28, 2400)
pad('C', 29.9, 3.1, 0.26, 2000)

# ---- heartbeat intro ---------------------------------------------------------
def thump(f0=60, length=0.35):
    n = int(length * SR); t = np.arange(n) / SR
    f = f0 + 70 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)

for t0 in (0.35, 1.35, 2.25):
    add(thump(), t0, 0.9); add(thump(52), t0 + 0.2, 0.6)

# ---- risers & impacts -------------------------------------------------------
def riser(length, f_lo=300, f_hi=7000):
    n = int(length * SR)
    x = rng.standard_normal(n)
    k = np.linspace(0, 1, n) ** 2
    y = onepole(x, f_lo + (f_hi - f_lo) * k) * k * 0.5
    return y

def impact(length=2.2):
    n = int(length * SR); t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(45 + 80 * np.exp(-t * 18)) / SR) * np.exp(-t * 2.8)
    shimmer = onepole(rng.standard_normal(n), 6000) * np.exp(-t * 5) * 0.25
    return boom + shimmer

def whoosh(length=0.6):
    n = int(length * SR); k = np.linspace(0, 1, n)
    shape = np.sin(np.pi * k) ** 2
    return onepole(rng.standard_normal(n), 400 + 5000 * shape) * shape * 0.6

add(riser(1.0), 2.35, 0.5)
add(impact(), 3.3, 0.8)
add(riser(1.4), 4.6, 0.45)
add(impact(), 6.0, 0.75)
for t0 in (11.15, 15.25, 19.55, 23.95):
    add(whoosh(), t0, 0.55, 0.0)
add(riser(1.6), 25.4, 0.55)
add(impact(3.0), 27.05, 0.95)
add(impact(2.2), 28.25, 0.45)

# ---- drums from 6.0 to 27.0 -------------------------------------------------
def kick():
    n = int(0.4 * SR); t = np.arange(n) / SR
    f = 48 + 110 * np.exp(-t * 35)
    return np.tanh(1.6 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7))

def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR)
    x = rng.standard_normal(n); x = x - onepole(x, 7000)
    return x * np.exp(-np.arange(n) / ((0.06 if open_ else 0.012) * SR))

def clap():
    n = int(0.25 * SR); x = rng.standard_normal(n)
    x = onepole(x, 3500) - onepole(x, 900)
    e = np.exp(-np.arange(n) / (0.06 * SR))
    for d in (0.0, 0.011, 0.022):
        e[int(d * SR):int(d * SR) + 200] += 0.6
    return x * e

K, H, HO, C = kick(), hat(), hat(True), clap()
beats = int((27.0 - GRID0) / BEAT)
for i in range(beats):
    t0 = GRID0 + i * BEAT
    bar = i // 4
    full = bar >= 1                     # first bar: kick only, building in
    add(K, t0, 0.95)
    if full:
        add(H, t0 + BEAT / 2, 0.22, 0.3)
        add(H, t0 + BEAT / 4, 0.08, -0.3); add(H, t0 + 3 * BEAT / 4, 0.08, -0.3)
        if i % 4 in (1, 3): add(C, t0, 0.35)
        if i % 8 == 7: add(HO, t0 + BEAT / 2, 0.15, 0.2)

# ---- bass ---------------------------------------------------------------------
roots = {'Am': 45, 'F': 41, 'C': 48, 'G': 43}
def bassnote(m, length):
    n = int(length * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * nf(m) * t) + 0.35 * np.sin(2 * np.pi * nf(m) * 2 * t)
    return np.tanh(1.3 * x) * env(n, 0.005, 0.18)
for b in range(8):
    r = roots[prog[b % 4]]
    for e in range(8):
        if b == 0 and e % 2: continue
        add(bassnote(r if e % 4 != 3 else r + 12, BEAT / 2), GRID0 + b * BAR + e * BEAT / 2 + 0.02, 0.32)

# ---- pluck arpeggio (techy 16ths) -------------------------------------------------
def pluck(m, length=0.22):
    n = int(length * SR)
    x = saw(nf(m), n) * env(n, 0.002, 0.07)
    return onepole(x, 3800)

for b in range(8):
    notes = [n + 12 for n in chords[prog[b % 4]]]
    pattern = [0, 2, 1, 3, 2, 1, 3, 2]
    for s in range(16):
        if b < 2 and s % 2: continue
        m = notes[pattern[s % 8]] + (12 if s in (6, 14) else 0)
        add(pluck(m), GRID0 + b * BAR + s * BEAT / 4, 0.11, -0.4 if s % 2 else 0.4)
# outro arpeggio, softer
for s in range(20):
    ch = 'F' if s < 9 else 'C'
    m = chords[ch][s % 4] + 24
    add(pluck(m, 0.4), 27.0 + s * BEAT / 2, 0.09 * (1 - s / 22), -0.3 if s % 2 else 0.3)

# ---- UI sounds ------------------------------------------------------------------
def blip(f, length=0.12, g=1.0):
    n = int(length * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 30) * g

add(blip(1760, 0.18) + blip(2637, 0.18, 0.5), 13.1, 0.3)           # scanner beep
add(blip(1320) + blip(1980, g=.4), 14.6, 0.22)                     # added
for i, t0 in enumerate((16.3, 16.8, 17.3, 17.8)):                   # sets ticked
    add(blip(nf(76 + [0, 3, 7, 12][i])), t0, 0.22)
for t0 in (20.5, 21.1):                                             # water taps
    add(blip(900, 0.2) * np.linspace(1, .3, int(.2 * SR)), t0, 0.22)
for i, t0 in enumerate((21.6, 22.5)):                               # coach messages
    add(blip(nf(81 + i * 4), 0.15) + blip(nf(88 + i * 4), 0.15, .5), t0, 0.2)
for k in range(10):                                                 # confetti sparkle
    add(blip(nf(84 + (k * 5) % 14), 0.1, .6), 22.6 + k * 0.045, 0.12, (k % 3 - 1) * .5)
for i, t0 in enumerate((24.4, 24.8, 25.2)):                         # stat counters
    add(blip(nf(72 + i * 5), 0.14), t0, 0.2)

# ---- master ------------------------------------------------------------------------
fade = np.ones(N); fl = int(1.6 * SR); fade[-fl:] = np.linspace(1, 0, fl) ** 1.5
fade_in = int(0.05 * SR); fade[:fade_in] *= np.linspace(0, 1, fade_in)
out = np.stack([L, R], 1) * fade[:, None]
out = np.tanh(out * 1.15)
out /= np.max(np.abs(out)) * 1.05
pcm = (out * 32767).astype(np.int16)
path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'music.wav')
with wave.open(path, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('wrote', path)

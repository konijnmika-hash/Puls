"""08 · Gebouwd op wetenschap (23 s) — donkere, cinematische tech in D mineur, 100 bpm.
Analoge arpeggio's, glitch-percussie, strijkers en zware hits; eindigt verrassend in D majeur."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

V = '08-wetenschap'
s = Song(bpm=100, dur=23.0)
B = s.t

s.track('kick', -2.5)
s.track('snare', -7, rev=0.35, room=0.2)
s.track('glitch', -15, chain=[pb.Bitcrush(bit_depth=6)], room=0.15)
s.track('sub', -7, duck=0.4)
s.track('arp', -12, dly=0.22, rev=0.25, duck=0.35, hp=180)
s.track('drone', -14, rev=0.45, hp=60)
s.track('strings', -9, rev=0.45, hp=120)
s.track('taiko', -4, rev=0.35, room=0.3)
s.track('type', -16, room=0.2)
s.track('blip', -11, dly=0.15, rev=0.2)
s.track('fx', -8, rev=0.45)
s.track('piano', -9, rev=0.35)

VO = {'Dm': [57, 62, 65, 69], 'Bb': [58, 62, 65, 70], 'Gm': [55, 62, 67, 70], 'A': [57, 61, 64, 69], 'D': [54, 57, 62, 66, 69]}
ROOT = {'Dm': 38, 'Bb': 34, 'Gm': 31, 'A': 33, 'D': 38}
PROG = ['Dm', 'Bb', 'Gm', 'A']          # per 2 maten (8 tellen)

def taiko(t0, g=1.0):
    s.put('taiko', mix(tom(68), tom(52) * 0.7, impact(1.4, f=38) * 0.5), t0, g)

# ---------------- drone en strijkers
s.put('drone', pad([38, 45, 50], 19.0, cutoff=500, attack=1.5, release=1.0, detune=0.12), 0.0, 1.0)
for i in range(4):
    ch = PROG[i]
    s.put('strings', gm([(0, s.spb * 8 - 0.1, m, 58 + i * 8) for m in VO[ch]], 49, s.spb * 8 + 1.5), B(i * 8), 1.0)

# ---------------- terminal: typen en spinner (0 - 4,8 s)
typing = [0.2 + k * 0.05 for k in range(20)] + [1.0 + k * 0.05 for k in range(9)]
for k, t0 in enumerate(typing):
    s.put('type', rim(k) * 0.6, t0, 0.7, (k % 3 - 1) * 0.4)
for i in range(8):
    t0 = B(3 + i * 0.5)
    for k in range(5): s.put('type', rim(i * 5 + k) * 0.5, t0 + k * 0.03, 0.6, 0.3)
    s.put('blip', blip(hz(74 + [0, 3, 5, 7, 10, 12, 15, 17][i]), 0.08), t0, 0.5)
for bt in range(3, 8):
    s.put('sub', sub(26, s.spb * 0.6), B(bt), 0.7)

# ---------------- arpeggio: 16den door een opengaand resonant filter
def arp_cut(bt):
    return 500 + 4200 * min(1, max(0, (bt - 4) / 28)) ** 1.3
for st in range(4 * 4, 4 * 28):
    bt = st / 4
    ch = PROG[int(bt // 8) % 4]
    notes = [m + 12 for m in VO[ch]]
    m = notes[[0, 2, 1, 3, 2, 1, 3, 0][st % 8]] - (12 if st % 16 >= 12 else 0)
    n_ = ns(s.spb / 4 + 0.05)
    src = saw(hz(m), n_) * 0.6 + square(hz(m) * 1.003, n_, 0.2) * 0.4
    fc = arp_cut(bt) * (0.4 + 0.6 * np.exp(-secs(n_) / 0.05))
    sig = sweep(src, 'lp', fc, 2.2) * env_adsr(n_, 0.002, 0.08, 0.2, 0.03)
    s.put('arp', sig, B(bt), 0.9 if st % 4 == 0 else 0.6, -0.35 if st % 2 else 0.35)

# ---------------- secties: hits en datapiepjes
for bt in (8, 12, 16, 20, 24):
    taiko(B(bt), 0.9 if bt < 20 else 1.0)
    s.put('fx', crash(1.8, bt), B(bt), 0.12)
for i, bt in enumerate((8, 8.75, 9.5, 10.25)):           # formule 1
    s.put('blip', blip(hz(81 + i * 2), 0.1), B(bt), 0.6)
s.put('blip', mix(bell(86, 0.6), bell(93, 0.5) * 0.4), B(11), 0.8)
for i, bt in enumerate((12.5, 13.5)):                     # formule 2
    s.put('blip', blip(hz(81 + i * 3), 0.1), B(bt), 0.6)
s.put('blip', bell(86, 0.6), B(14), 0.8)
s.put('blip', mix(bell(81, 0.8), bell(88, 0.8) * 0.5), B(15), 0.7)
for i, bt in enumerate((16, 17.2, 18.4)):                 # staven
    s.put('blip', blip(hz(74 + i * 5), 0.14), B(bt), 0.7)
for i, bt in enumerate((20, 21, 22)):                     # donut
    s.put('blip', mix(bell(74 + [0, 3, 7][i], 0.5, 2.0, 1.2)), B(bt), 0.7)
s.put('blip', bell(84, 0.5), B(25), 0.7)
s.put('blip', bell(88, 0.5), B(26.5), 0.7)
for b0 in (4, 8, 12, 16):
    for k in range(3):
        s.put('glitch', hat(False, b0 + k, 1.5), B(b0 + 3.75) + k * 0.04, 0.6)

# ---------------- beat vanaf maat 5 (12 s): kick, snare, glitchy hats
for bar in range(5, 7):
    b0 = bar * 4
    for bt in (0, 1.75, 2.5):
        s.put('kick', kick('house', b0), B(b0 + bt), 1.0); s.kick_at(B(b0 + bt))
    for bt in (1, 3):
        s.put('snare', snare(180, b0 + bt, 0.2), B(b0 + bt), 0.9)
    r = rng(bar)
    for st in range(16):
        if r.random() < 0.7:
            s.put('glitch', hat(False, st, 1.3 + r.random()), B(b0 + st / 4), 0.4 + 0.4 * r.random(), r.uniform(-0.6, 0.6))
    for bt in range(4):
        s.put('sub', sub(ROOT[PROG[int((b0 + bt) // 8) % 4]], s.spb * 0.9), B(b0 + bt), 0.8)
for bt in range(8, 20):
    s.put('sub', sub(ROOT[PROG[int(bt // 8) % 4]], s.spb * 0.8), B(bt), 0.55)

# ---------------- "Geen gokwerk. Jouw getallen." (16,8 - 19,2 s)
s.put('fx', downlifter(1.0), B(28), 0.4)
for t0 in (16.8, 17.1, 18.0, 18.3):
    s.put('taiko', mix(kick('808'), tom(60) * 0.6), t0, 0.85)
s.put('strings', gm([(0, 2.3, m, 92) for m in [45, 57, 61, 64, 69]], 49, 3.5), B(28), 1.0)
s.put('fx', riser(2.2, 300, 11000), B(32) - 2.2, 0.6)
snare_roll(s, 30, 32, 'snare', 0.5)

# ---------------- CTA (19,2 s): D majeur
s.put('fx', impact(3.4, f=36), B(32), 1.0)
s.put('fx', crash(3.0, 5), B(32), 0.35)
s.put('strings', gm([(0, 3.6, m, 100) for m in VO['D'] + [50, 74]], 49, 4.5), B(32), 1.0)
ev = [(0, 3.4, m, 90) for m in [50, 54, 57, 62, 66, 69]] + [(0, 3.4, 38, 84)]
s.put('piano', gm(ev, 0, 4.5), B(32), 1.0)
s.put('drone', pad([50, 57, 62, 66], 3.6, cutoff=2600, attack=0.05, release=1.2), B(32), 1.4)
for bt in (32, 33, 34, 35):
    s.put('kick', kick('house', bt), B(bt), 0.9); s.kick_at(B(bt))
    s.put('sub', sub(38, s.spb * 0.9), B(bt), 0.8)
s.put('taiko', kick('808'), B(34), 0.8)                   # "gratis."
for i, m in enumerate([74, 78, 81, 86, 90]):
    s.put('blip', bell(m, 1.0), B(32) + 0.07 * i, 0.5)
s.put('fx', impact(2.4, f=42), B(36), 0.7)
s.put('blip', mix(bell(86, 1.2), bell(90, 1.2) * 0.6, bell(93, 1.2) * 0.4), B(36), 0.7)

finish(s, out_path(V), fade_out=1.1)

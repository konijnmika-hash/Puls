"""06 · Training op maat (23,5 s) — donkere, harde trap-beat in C mineur, 140 bpm (half-time).
808-bas, koor, buisklokken en koperstoten; elke squat valt op de maat."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

V = '06-training'
s = Song(bpm=140, dur=23.5)
B = s.t

s.track('kick', -2)
s.track('clap', -6, rev=0.25, room=0.2)
s.track('hats', -12, room=0.1)
s.track('b808', -4, duck=0.25)
s.track('choir', -11, rev=0.45, hp=150, duck=0.3)
s.track('bells', -12, rev=0.4, dly=0.15)
s.track('brass', -10, rev=0.35, hp=120)
s.track('lead', -15, dly=0.25, rev=0.3, duck=0.3)
s.track('fx', -7, rev=0.4)
s.track('hit', -5, rev=0.3)
s.track('ui', -9, rev=0.2)

VO = {'Cm': [55, 60, 63, 67], 'Ab': [56, 60, 63, 68], 'G': [55, 59, 62, 67], 'Fm': [56, 60, 65, 68]}
ROOT = {'Cm': 36, 'Ab': 32, 'G': 31, 'Fm': 29}
PROG = ['Cm', 'Cm', 'Ab', 'G']

# ---------------- intro (0 - 3,43 s)
s.put('choir', gm([(0, 3.3, m, 70) for m in VO['Cm']], 52, 4.5), 0.0, 1.0)
for b0 in (0, 4):
    s.put('hit', kick('808'), B(b0), 1.0)
    s.put('hit', impact(1.4, f=50), B(b0), 0.6)
    s.put('bells', gm([(0, 2.0, 60, 100), (0, 2.0, 48, 90)], 14, 3.0), B(b0), 1.0)
    s.put('brass', gm([(0, 0.5, m, 105) for m in [48, 55, 60, 63]], 61, 2.0), B(b0), 1.0)
# rollende hats -> drop
for k in range(18):
    bt = 4 + k * (1 / 3) if k < 9 else 7 + (k - 9) * (1 / 9)
    if bt < 7.9: s.put('hats', hat(False, k, 1.1), B(bt), 0.3 + 0.5 * k / 18)
s.put('fx', riser(1.6, 300, 11000), B(8) - 1.6, 0.6)
s.put('fx', rev_cymbal(0.8), B(8) - 0.8, 0.4)

# ---------------- drop en groove (3,43 - 18,9 s)
def bar_groove(bar):
    b0 = bar * 4
    ch = PROG[bar % 4]
    for bt in (0, 2.75) if bar % 2 == 0 else (0, 1.5, 2.75, 3.5):
        s.put('kick', kick('house', b0), B(b0 + bt), 1.0); s.kick_at(B(b0 + bt))
    s.put('clap', clap(b0), B(b0 + 2), 1.0); s.put('clap', snare(170, b0, 0.18), B(b0 + 2), 0.5)
    # 808 met glijders
    pat = [(0, 1.6, None), (2.75, 0.6, None), (3.5, 0.45, ROOT[ch] + 24)] if bar % 2 == 0 else [(0, 1.3, None), (1.5, 0.5, None), (2.75, 1.0, ROOT[ch] + 19)]
    for (bt, ln, glide) in pat:
        s.put('b808', b808(ROOT[ch] + 12, ln * s.spb * 2, glide_from=glide), B(b0 + bt), 1.0)
    # hats: 8sten met trap-rolletjes
    for e in range(8):
        if e == 7 and bar % 2:
            for k in range(3): s.put('hats', hat(False, k + b0), B(b0 + 3.5 + k / 6), 0.5)
        elif e == 5 and bar % 4 == 3:
            for k in range(4): s.put('hats', hat(False, k + b0), B(b0 + 2.5 + k / 8), 0.4 + 0.1 * k)
        else:
            s.put('hats', hat(False, e + b0), B(b0 + e / 2), 0.7 if e % 2 == 0 else 0.45, 0.2)
    # donkere bel-arp
    notes = [m + 12 for m in VO[ch]]
    for e in range(8):
        m = notes[[0, 2, 1, 3, 2, 0, 3, 1][e]]
        s.put('lead', bell(m, s.spb * 0.45, 3.0, 1.8), B(b0 + e / 2), 0.7, -0.4 if e % 2 else 0.4)
    s.put('choir', gm([(0, s.spb * 4, m, 64) for m in VO[ch]], 52, s.spb * 4 + 1.0), B(b0), 0.8)

s.put('fx', impact(2.5, f=36), B(8), 1.0)
s.put('fx', crash(2.5), B(8), 0.4)
s.put('brass', gm([(0, 0.9, m, 115) for m in [48, 55, 60, 63, 67]], 61, 2.0), B(8), 1.0)
for bar in range(2, 11):
    bar_groove(bar)
# accenten op de scènewissels
for bt in (16, 28, 36):
    s.put('fx', whoosh(0.5, bt), B(bt) - 0.3, 0.5)
    s.put('fx', crash(1.6, bt), B(bt), 0.25)
    s.put('brass', gm([(0, 0.5, m, 105) for m in [ROOT[PROG[(bt // 4) % 4]] + 12 + i for i in (0, 7, 12)]], 61, 1.5), B(bt), 0.8)
s.put('fx', whoosh(0.45, 7), B(30.5), 0.6)                  # kaart draait om
s.put('fx', riser(1.5, 300, 10000), B(44) - 1.5, 0.5)

# ---------------- CTA (18,9 - 23,5 s)
s.put('fx', impact(3.0, f=34), B(44), 1.0)
s.put('fx', crash(3.0, 3), B(44), 0.4)
s.put('brass', gm([(0, 1.4, m, 118) for m in [44, 51, 56, 60, 63]], 61, 2.5), B(44), 1.0)
s.put('choir', gm([(0, 3.5, m, 80) for m in VO['Ab']], 52, 4.5), B(44), 1.0)
for bar in (11, 12):
    bar_groove(bar)
s.put('hit', kick('808'), B(48), 0.8)
s.put('fx', impact(3.0, f=36), B(52), 1.0)
s.put('kick', kick('808'), B(52), 1.0)
s.put('brass', gm([(0, 1.0, m, 120) for m in [48, 55, 60, 63, 67]], 61, 2.0), B(52), 1.0)
s.put('bells', gm([(0, 1.0, 72, 100), (0, 1.0, 60, 90)], 14, 1.2), B(52), 1.0)

# interface
for i in range(6): ui(s, 'ui', 'tick', B(16 + i * 2), 0.4, m=[72, 75, 79, 82, 84, 87][i])
ui(s, 'ui', 'pop', B(30), 0.4, m=63)
for i in range(3): ui(s, 'ui', 'tick', B(37 + i), 0.45, m=[79, 84, 87][i])

finish(s, out_path(V), fade_out=1.0)

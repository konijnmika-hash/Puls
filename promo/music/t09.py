"""09 · Jouw plan op maat (23,5 s) — inspirerende, filmische opbouw in A mineur -> C majeur, 110 bpm.
Piano-ostinato en strijkers bouwen op tot een euforische drop als het plan klaar is."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

V = '09-jouw-plan'
s = Song(bpm=110, dur=23.5)
B = s.t

s.track('kick', -2)
s.track('clap', -7, rev=0.25, room=0.2)
s.track('hats', -14, room=0.1)
s.track('perc', -9, room=0.3, rev=0.2)
s.track('bass', -5.5, duck=0.65)
s.track('piano', -6, rev=0.3, duck=0.15, hp=90)
s.track('strings', -9, rev=0.45, hp=120, duck=0.2)
s.track('saw', -10, rev=0.3, duck=0.7, hp=200, dly=0.05)
s.track('pluck', -14, dly=0.3, rev=0.2, duck=0.4, hp=300)
s.track('bell', -12, rev=0.35, dly=0.2)
s.track('fx', -8, rev=0.4)
s.track('ui', -11, rev=0.2)

VO = {'Am': [57, 60, 64, 69], 'F': [57, 60, 65, 69], 'C': [55, 60, 64, 67], 'G': [55, 59, 62, 67], 'Fsus2': [55, 60, 65, 67],
      'Cadd9': [55, 60, 62, 64, 67]}
ROOT = {'Am': 33, 'F': 29, 'C': 36, 'G': 31, 'Fsus2': 29, 'Cadd9': 36}
INTRO = [(0, 'Am'), (4, 'F'), (8, 'C'), (12, 'G'), (16, 'Am'), (20, 'Fsus2'), (22, 'G')]
DROP = [(24, 'C'), (28, 'G'), (32, 'F'), (36, 'G'), (40, 'Cadd9')]

# ---------------- piano-ostinato (8sten) tijdens de vragen
for (b0, ch), nxt in zip(INTRO, INTRO[1:] + [(24, None)]):
    notes = VO[ch]
    seq = [notes[0], notes[2], notes[1], notes[3]]
    ev = []
    for e in range(int((nxt[0] - b0) * 2)):
        ev.append((e * s.spb / 2, s.spb / 2 * 0.9, seq[e % 4] + 12, 62 + 3 * (b0 // 4) + (8 if e % 4 == 0 else 0)))
    ev.append((0, (nxt[0] - b0) * s.spb, ROOT[ch] + 12, 70))
    s.put('piano', gm(ev, 0, (nxt[0] - b0) * s.spb + 1.5), B(b0), 1.0)
    if b0 >= 8:
        s.put('strings', gm([(0, (nxt[0] - b0) * s.spb, m, 50 + b0 * 2) for m in VO[ch]], 48, (nxt[0] - b0) * s.spb + 1.0), B(b0), 1.0)
    s.put('bass', sub(ROOT[ch] + 12, (nxt[0] - b0) * s.spb * 0.98), B(b0), 0.35 + 0.02 * b0)

# lichte percussie vanaf maat 2, toms vanaf maat 4
for bt in range(8, 24):
    if bt % 2 == 0: s.put('kick', kick('soft'), B(bt), 0.8)
    s.put('hats', shaker(bt), B(bt + 0.5), 0.8)
for k, bt in enumerate(np.arange(16, 24, 0.5)):
    s.put('perc', tom(96 if k % 2 else 72, k), B(bt), 0.35 + 0.5 * (bt - 16) / 8)
# overgangen tussen de vragen
for bt in (4, 8, 16, 20):
    s.put('fx', whoosh(0.5, bt), B(bt) - 0.3, 0.45)
s.put('fx', whoosh(1.6, 1) * 0.6, B(8.5), 0.4)       # schuifje vet
s.put('fx', whoosh(1.6, 2) * 0.6, B(12), 0.4)        # schuifje spieren
# laden: stijgend arpeggio + riser + roffel
for st in range(16):
    bt = 20 + st / 4
    ch = 'Fsus2' if bt < 22 else 'G'
    notes = [m + 12 for m in VO[ch]]
    s.put('pluck', pluck(notes[st % 4] + (12 if st >= 8 else 0), s.spb / 4, bright=1500 + 300 * st, seed=st), B(bt), 0.9)
s.put('fx', riser(2.2, 300, 12000), B(24) - 2.2, 0.6)
snare_roll(s, 21, 24, 'clap', 0.5)
s.put('fx', rev_cymbal(1.0), B(24) - 1.0, 0.4)

# ---------------- drop (13,1 s): euforisch
s.put('fx', impact(3.0, f=38), B(24), 1.0)
s.put('fx', crash(2.8), B(24), 0.45)
for i, (b0, ch) in enumerate(DROP[:-1]):
    for bt in range(4):
        s.put('kick', kick('house', b0 + bt), B(b0 + bt), 1.0); s.kick_at(B(b0 + bt))
        s.put('hats', hat(True, bt + b0, 1.1), B(b0 + bt + 0.5), 0.6, 0.2)
        if bt % 2: s.put('clap', clap(b0 + bt), B(b0 + bt), 0.9)
    for st in range(16):
        if st % 2: s.put('hats', hat(False, st + b0), B(b0 + st / 4), 0.35, -0.2)
    s.put('saw', pad(VO[ch] + [VO[ch][0] + 12], s.spb * 4, cutoff=4200, attack=0.01, release=0.2, seed=b0), B(b0), 1.0)
    for e in range(8):
        s.put('bass', bass_saw(ROOT[ch] + 12 + (12 if e % 2 else 0), s.spb / 2 * 0.85, cutoff=550), B(b0 + e / 2), 0.8)
        s.put('bass', sub(ROOT[ch] + 12, s.spb / 2 * 0.9), B(b0 + e / 2), 0.3)
    notes = [m + 12 for m in VO[ch]]
    for st in range(16):
        s.put('pluck', pluck(notes[[0, 2, 1, 3, 2, 1, 3, 2][st % 8]] + (12 if st in (6, 14) else 0), s.spb / 4, 4500, seed=st), B(b0 + st / 4), 0.8, -0.35 if st % 2 else 0.35)
    ev = [(0, s.spb * 3.8, m, 84) for m in VO[ch]] + [(0, s.spb * 3.8, ROOT[ch] + 24, 80)]
    s.put('piano', gm(ev, 0, s.spb * 4 + 1.5), B(b0), 0.9)
    s.put('strings', gm([(0, s.spb * 4, m, 88) for m in VO[ch] + [VO[ch][-1] + 12]], 48, s.spb * 4 + 1.0), B(b0), 1.0)
# zes tegels: belletjes op de halve tel
for i in range(6):
    s.put('bell', bell([76, 79, 83, 84, 88, 91][i], 0.6), B(25 + i * 0.5), 0.9, (i % 2 - 0.5) * 0.5)
# CTA (17,45 s)
s.put('fx', impact(2.8, f=40), B(32), 0.9)
s.put('fx', crash(2.4, 3), B(32), 0.35)
s.put('perc', kick('808'), B(34), 0.8)              # "gratis."
s.put('fx', riser(1.0, 500, 9000), B(40) - 1.0, 0.4)
# slotakkoord
s.put('fx', impact(3.0, f=36), B(40), 0.9)
s.put('saw', pad(VO['Cadd9'], 1.4, cutoff=3500, attack=0.01, release=1.0), B(40), 1.1)
ev = [(0, 1.6, m, 90) for m in VO['Cadd9'] + [72]] + [(0, 1.6, 36, 84), (0, 1.6, 24, 80)]
s.put('piano', gm(ev, 0, 3.0), B(40), 1.0)
s.put('strings', gm([(0, 1.6, m, 96) for m in VO['Cadd9'] + [48]], 48, 3.0), B(40), 1.0)
s.put('kick', kick('house'), B(40), 0.9)
for i, m in enumerate([79, 84, 88, 91, 96]):
    s.put('bell', bell(m, 1.0), B(40) + 0.06 * i, 0.5)

# interface
ui(s, 'ui', 'tick', B(5), 0.35, m=76); ui(s, 'ui', 'tick', B(6), 0.35, m=79)
ui(s, 'ui', 'chime', B(6.5), 0.5, m=84)
for i in range(4): ui(s, 'ui', 'tick', B(16.5 + i * .5), 0.35, m=[72, 76, 79, 84][i])
ui(s, 'ui', 'chime', B(18.5), 0.5, m=86)

finish(s, out_path(V), fade_out=1.2)

"""11 · Elke stap telt (27 s) — emotionele piano en strijkers in D majeur / B mineur, 96 bpm.
Begint stil met solo-piano, groeit met strijkers en drums naar een euforisch hoogtepunt."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

V = '11-voortgang'
s = Song(bpm=96, dur=27.0)
B = s.t

s.track('kick', -3)
s.track('clap', -9, rev=0.35, room=0.25)
s.track('hats', -17, room=0.15)
s.track('bass', -7, duck=0.3)
s.track('piano', -5, rev=0.35, hp=70)
s.track('strings', -8, rev=0.45, hp=110)
s.track('choir', -14, rev=0.5, hp=150)
s.track('pad', -17, rev=0.45, hp=200)
s.track('bell', -13, rev=0.4, dly=0.2)
s.track('fx', -9, rev=0.45)

VO = {'Bm': [59, 62, 66, 71], 'G': [59, 62, 67, 71], 'D': [57, 62, 66, 69], 'A': [57, 61, 64, 69], 'Dadd9': [57, 62, 64, 66, 69]}
ROOT = {'Bm': 35, 'G': 31, 'D': 38, 'A': 33, 'Dadd9': 38}
BARS = ['Bm', 'G', 'D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A']

r = rng(11)
for bar, ch in enumerate(BARS):
    b0 = bar * 4
    notes = VO[ch]
    # piano: arpeggio in 8sten (links grondtoon, rechts gebroken akkoord), luider naar het hoogtepunt
    vel = int(56 + min(bar, 6) * 6)
    seq = [notes[0], notes[1], notes[2], notes[3], notes[2] + 12, notes[3], notes[2], notes[1]]
    ev = [(e * s.spb / 2, s.spb * 0.9, seq[e] + (12 if bar >= 6 else 0), vel + int(r.integers(-6, 6)) + (10 if e == 0 else 0)) for e in range(8)]
    ev += [(0, s.spb * 3.8, ROOT[ch] + 12, vel + 4), (0, s.spb * 3.8, ROOT[ch] + 24, vel - 6)]
    s.put('piano', gm(ev, 0, s.spb * 4 + 2.0), B(b0), 1.0)
    if bar >= 2:
        sv = 48 + bar * 7
        s.put('strings', gm([(0, s.spb * 4 - 0.05, m, min(118, sv)) for m in notes + [ROOT[ch] + 12]], 48, s.spb * 4 + 1.2), B(b0), 1.0)
    if bar >= 6:
        s.put('choir', gm([(0, s.spb * 4, m, 80) for m in notes], 52, s.spb * 4 + 1.0), B(b0), 1.0)
        s.put('pad', pad(notes, s.spb * 4, cutoff=2600, attack=0.05, release=0.3, seed=bar), B(b0), 1.0)
    # ritme: pols vanaf maat 2, volle drums vanaf maat 4
    if 2 <= bar < 4:
        s.put('kick', kick('soft'), B(b0), 1.0); s.put('kick', kick('soft'), B(b0 + 2), 0.7)
    if bar >= 4:
        for bt in range(4):
            s.put('kick', kick('soft' if bar < 6 else 'house', b0 + bt), B(b0 + bt), 1.0 if bt % 2 == 0 else 0.8); s.kick_at(B(b0 + bt))
            s.put('hats', hat(False, b0 + bt), B(b0 + bt + 0.5), 0.8, 0.2)
            if bt % 2: s.put('clap', clap(b0 + bt), B(b0 + bt), 0.9)
        for e in range(8):
            s.put('bass', sub(ROOT[ch] + 12, s.spb / 2 * 0.9), B(b0 + e / 2), 0.55 if e % 2 else 0.75)
    elif bar >= 1:
        s.put('bass', sub(ROOT[ch] + 12, s.spb * 3.9), B(b0), 0.45)

# mijlpalen in de grafiek
for i, bt in enumerate((7, 10, 13)):
    s.put('bell', mix(bell([78, 81, 86][i], 0.9), bell([85, 88, 93][i], 0.8) * 0.4), B(bt), 0.9)
# statistieken
for i, bt in enumerate((17, 18.5, 20, 21.5)):
    s.put('bell', bell([74, 78, 81, 86][i], 0.6, 2.0, 1.2), B(bt), 0.7)
# overgangen en hoogtepunt
for bt in (4, 16):
    s.put('fx', whoosh(0.7, bt), B(bt) - 0.4, 0.4)
s.put('fx', riser(2.4, 300, 9000), B(24) - 2.4, 0.5)
snare_roll(s, 22, 24, 'clap', 0.4)
s.put('fx', impact(3.2, f=36), B(24), 0.9)
s.put('fx', crash(3.0), B(24), 0.4)
s.put('fx', riser(1.8, 300, 10000), B(28) - 1.8, 0.4)
s.put('fx', impact(3.0, f=40), B(28), 0.8)
s.put('fx', crash(2.6, 2), B(28), 0.35)
s.put('fx', impact(2.6, f=38), B(32), 0.8)
s.put('fx', crash(2.4, 3), B(32), 0.3)
s.put('fx', kick('808') * 0.7, B(35), 0.8)              # "gratis."
# slotakkoord, laten uitklinken
ev = [(j * 0.03, 2.2, m, 92) for j, m in enumerate([50, 57, 62, 64, 66, 69, 74])] + [(0, 2.2, 26, 86), (0, 2.2, 38, 84)]
s.put('piano', gm(ev, 0, 3.0), B(40), 1.0)
s.put('strings', gm([(0, 2.0, m, 110) for m in VO['Dadd9'] + [50, 74]], 48, 3.0), B(40), 1.0)
s.put('choir', gm([(0, 2.0, m, 84) for m in VO['D']], 52, 3.0), B(40), 1.0)
s.put('kick', kick('house'), B(40), 0.9)
s.put('fx', crash(2.0, 5), B(40), 0.3)
for i, m in enumerate([81, 86, 90, 93, 98]):
    s.put('bell', bell(m, 1.2), B(40) + 0.08 * i, 0.5)

finish(s, out_path(V), fade_out=1.5)

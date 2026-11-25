"""07 · Coach in je broekzak (20,5 s) — speelse minimal-pop in G majeur, 112 bpm.
Marimba-riff, vingerknippen, plukbas; elke melding krijgt een stijgend belletje."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

V = '07-coach'
s = Song(bpm=112, dur=20.5)
B = s.t

s.track('kick', -3)
s.track('snap', -9, room=0.35, rev=0.15)
s.track('clap', -8, rev=0.2, room=0.2)
s.track('shaker', -16)
s.track('bass', -6.5, duck=0.45)
s.track('mar', -8, dly=0.18, rev=0.2)
s.track('pad', -15, rev=0.4, duck=0.5, hp=200)
s.track('piano', -9, rev=0.3, hp=150)
s.track('chime', -9, rev=0.35, dly=0.2)
s.track('fx', -9, rev=0.4)
s.track('hit', -6, rev=0.3)

VO = {'G': [55, 59, 62, 67], 'D/F#': [54, 57, 62, 66], 'Em': [55, 59, 64, 67], 'C': [55, 60, 64, 67], 'Cadd9': [55, 60, 62, 64, 67]}
ROOT = {'G': 43, 'D/F#': 42, 'Em': 40, 'C': 36, 'Cadd9': 36}
PROG = ['G', 'D/F#', 'Em', 'C']
RIFF = [(0, 79), (0.5, 74), (1.0, 79), (1.5, 81), (2.0, 83), (2.75, 81), (3.25, 79)]
RIFF2 = [(0, 78), (0.5, 74), (1.0, 78), (1.5, 79), (2.0, 81), (2.75, 79), (3.25, 76)]

for bar in range(9):
    b0 = bar * 4
    ch = PROG[bar % 4]
    cta = bar >= 6
    if bar >= 1 and bar != 5:
        for bt in ((0, 2, 2.75) if bar % 2 else (0, 1.5, 2)):
            s.put('kick', kick('soft' if not cta else 'house', b0), B(b0 + bt), 1.1 if not cta else 0.95); s.kick_at(B(b0 + bt))
    for bt in (1, 3):
        s.put('snap', snap(b0 + bt), B(b0 + bt), 1.0, 0.15)
        if cta: s.put('clap', clap(b0 + bt), B(b0 + bt), 0.8)
    for e in range(8):
        s.put('shaker', shaker(e + b0), B(b0 + e / 2), 1.0 if e % 2 else 0.5, -0.3)
    if bar >= 1:
        for (bt, o) in ((0, 0), (0.75, 0), (1.5, 12), (2, 0), (2.75, 0), (3.5, 7)):
            s.put('bass', bass_saw(ROOT[ch] + o, s.spb * 0.35, cutoff=650, drive=1.4), B(b0 + bt), 0.85)
    riff = RIFF if bar % 2 == 0 else RIFF2
    if bar != 5:
        for (bt, m) in riff:
            s.put('mar', marimba(m - (0 if ch in ('G', 'Em') else 2 if ch == 'C' else 0)), B(b0 + bt), 0.9, -0.2 if bt % 1 else 0.2)
    s.put('pad', pad(VO[ch], s.spb * 4, cutoff=1800 if not cta else 3200, attack=0.15, release=0.3, seed=bar), B(b0), 0.8 if not cta else 1.2)

# meldingen: elke 3 tellen een belletje, steeds een stap hoger (polyritme tegen de 4/4)
CH = [79, 83, 86, 88, 91, 95]
for i, m in enumerate(CH):
    t0 = B(4 + i * 3)
    s.put('chime', mix(bell(m, 0.7, 3.0, 1.4), bell(m + 7, 0.6, 3.0, 1.0) * 0.4), t0, 1.0, (i % 2 - 0.5) * 0.4)
    s.put('fx', whoosh(0.3, i) * 0.5, t0 - 0.15, 0.5)
s.put('chime', bell(98, 0.8) * 0.5, B(19) + 0.12, 0.8)

# "Een coach / in je broekzak." (maat 5,5 - 6,5) met stop-tijd
s.put('fx', riser(1.0, 400, 9000), B(22) - 1.0, 0.45)
for bt, ch in ((22, 'C'), (24, 'D/F#')):
    s.put('hit', kick('808'), B(bt), 0.9)
    s.put('hit', stab([m + 12 for m in VO[ch]], 0.5, 6000), B(bt), 0.7)
    ev = [(0, 1.0, m, 90) for m in VO[ch]] + [(0, 1.0, ROOT[ch], 84)]
    s.put('piano', gm(ev, 0, 2.0), B(bt), 1.0)
s.put('fx', riser(1.0, 400, 10000), B(26) - 1.0, 0.45)

# CTA (13,9 s)
s.put('fx', impact(2.6, f=40), B(26), 0.9)
s.put('fx', crash(2.5), B(26), 0.35)
s.put('hit', stab([m + 12 for m in VO['Em']], 0.5, 6000), B(28), 0.7)       # "gratis."
ev = [(0, 3.0, m, 88) for m in VO['G']] + [(0, 3.0, 43, 80)]
s.put('piano', gm(ev, 0, 4.0), B(26), 1.0)
# slot
s.put('fx', impact(2.2, f=45), B(36), 0.7)
s.put('pad', pad(VO['Cadd9'], 1.0, cutoff=3000, attack=0.01, release=0.8), B(34), 1.0)
ev = [(0, 1.3, m, 86) for m in [55, 59, 62, 67, 71]] + [(0, 1.3, 31, 80)]
s.put('piano', gm(ev, 0, 2.5), B(36), 1.0)
s.put('kick', kick('house'), B(36), 0.9)
for i, m in enumerate([79, 83, 86, 91]):
    s.put('chime', bell(m, 0.8), B(36) + 0.06 * i, 0.55)
ui(s, 'chime', 'pop', B(30), 0.35, m=86)

finish(s, out_path(V), fade_out=1.0)

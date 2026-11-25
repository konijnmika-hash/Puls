"""10 · Manifest 16:9 (21 s) — stampende electro-pop-anthem in G mineur, 124 bpm.
Elk woord krijgt een inslag op de tel; drop op het logo, groots slot op de CTA."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

V = '10-manifest'
s = Song(bpm=124, dur=21.0)
B = s.t

s.track('kick', -1.5)
s.track('clap', -5.5, rev=0.25, room=0.25)
s.track('hats', -13, room=0.1)
s.track('tom', -8, room=0.3, rev=0.2)
s.track('bass', -5, duck=0.7)
s.track('stab', -8.5, rev=0.25, dly=0.08, duck=0.35, hp=200)
s.track('brass', -9, rev=0.3, hp=120)
s.track('pad', -15, rev=0.4, duck=0.6, hp=200)
s.track('lead', -12, dly=0.25, rev=0.25, duck=0.3)
s.track('fx', -7, rev=0.4)

VO = {'Gm': [55, 58, 62, 67], 'Eb': [55, 58, 63, 67], 'Bb': [53, 58, 62, 65], 'F': [53, 57, 60, 65]}
ROOT = {'Gm': 31, 'Eb': 27, 'Bb': 34, 'F': 29}
PROG = ['Gm', 'Eb', 'Bb', 'F']
ch_at = lambda bt: PROG[int(bt // 4) % 4]

def groove(b0, b1, hats16=True, clapping=True):
    for bt in np.arange(b0, b1, 1.0):
        s.put('kick', kick('house', int(bt)), B(bt), 1.0); s.kick_at(B(bt))
        if clapping and int(bt) % 2: s.put('clap', clap(int(bt)), B(bt), 1.0)
        s.put('hats', hat(True, int(bt), 1.1), B(bt + 0.5), 0.55, 0.2)
        if hats16:
            for q in (0.25, 0.75): s.put('hats', hat(False, int(bt * 4 + q * 4)), B(bt + q), 0.4, -0.2)
        ch = ch_at(bt)
        for q in (0, 0.5):
            s.put('bass', bass_saw(ROOT[ch] + 12 + (12 if q else 0), s.spb / 2 * 0.85, cutoff=700, drive=2.0), B(bt + q), 0.85)
            s.put('bass', sub(ROOT[ch] + 12, s.spb / 2 * 0.9), B(bt + q), 0.3)
        if int(bt) % 4 == 0:
            s.put('pad', pad(VO[ch], s.spb * 4, cutoff=2400, attack=0.02, release=0.2, seed=int(bt)), B(bt), 1.0)

def slam(bt, g=1.0):
    ch = ch_at(bt)
    s.put('stab', stab([m + 12 for m in VO[ch]] + [VO[ch][0] + 24], 0.45, 7000, seed=int(bt)), B(bt), g)
    s.put('brass', gm([(0, 0.4, m, 112) for m in [ROOT[ch] + 24, ROOT[ch] + 31, ROOT[ch] + 36]], 61, 1.2), B(bt), g)
    s.put('fx', impact(1.0, f=52), B(bt), 0.35 * g)

# ---------------- woorden (0 - 5,8 s): elke shot een inslag
groove(0, 12, hats16=False)
for bt in (0, 2, 4, 6, 8, 10):
    slam(bt)
    s.put('tom', tom(80, bt), B(bt), 0.6)
s.put('fx', whoosh(0.4, 1), B(2) - 0.2, 0.5)
s.put('fx', whoosh(0.4, 2), B(10) - 0.2, 0.5)
# ---------------- opsomming (5,8 - 9,7 s): melodische stoten per tel
groove(12, 20)
LIST = [74, 77, 79, 82, 79, 82, 86, 89]
for i, bt in enumerate(range(12, 20)):
    m = LIST[i]
    s.put('lead', mix(pluck(m, 0.3, 6000, seed=i), bell(m, 0.4, 2.0, 1.5) * 0.5), B(bt), 1.0, (i % 2 - 0.5) * 0.5)
    s.put('tom', tom(70 + i * 8, i), B(bt), 0.35)
s.put('fx', crash(1.6, 1), B(12), 0.25)
s.put('fx', crash(1.6, 2), B(16), 0.25)
# ---------------- ALLES. / IN EEN APP. (9,7 - 11,6 s): break met roffel
slam(20, 1.2); s.put('kick', kick('808'), B(20), 1.0)
slam(22, 1.0); s.put('kick', kick('808'), B(22), 0.9)
snare_roll(s, 22, 24, 'clap', 0.55)
s.put('fx', riser(1.9, 300, 12000), B(24) - 1.9, 0.6)
s.put('fx', rev_cymbal(0.8), B(24) - 0.8, 0.4)
# ---------------- drop op het logo (11,6 s)
s.put('fx', impact(3.0, f=36), B(24), 1.0)
s.put('fx', crash(2.6), B(24), 0.45)
groove(24, 40)
HOOK = [(0, 79), (0.5, 82), (1, 86), (1.75, 84), (2.5, 82), (3, 79), (3.5, 77)]
for b0 in (24, 28, 32, 36):
    for (bt, m) in HOOK:
        s.put('lead', supersaw(hz(m), ns(s.spb * 0.45), 5, 0.15)[:, 0] * env_adsr(ns(s.spb * 0.45), 0.003, 0.15, 0.6, 0.05) * 0.5, B(b0 + bt), 0.9)
s.put('brass', gm([(0, 1.2, m, 118) for m in [43, 50, 55, 58, 62]], 61, 2.0), B(24), 1.0)
# CTA (15,5 s)
s.put('fx', impact(2.6, f=38), B(32), 0.9)
s.put('fx', crash(2.4, 3), B(32), 0.4)
slam(32, 0.9)
slam(34, 0.7)
# slot
s.put('fx', impact(3.0, f=36), B(40), 1.0)
s.put('kick', kick('808'), B(40), 1.0)
s.put('stab', stab([67, 70, 74, 79, 82], 1.2, 7000), B(40), 1.0)
s.put('brass', gm([(0, 1.4, m, 122) for m in [43, 55, 62, 67, 70]], 61, 2.5), B(40), 1.0)
s.put('pad', pad([55, 58, 62, 67, 70], 1.3, cutoff=3200, attack=0.01, release=0.8), B(40), 1.2)

finish(s, out_path(V), fade_out=1.0)

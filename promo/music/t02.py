"""02 · Stop met gokken (21,5 s) — gespannen intro in C mineur, future-bass drop in Es majeur, 120 bpm."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

V = '02-stop-met-gokken'
s = Song(bpm=120, dur=21.5)
B = s.t   # beat -> s (0,5 s per tel)

s.track('kick', -1.5)
s.track('clap', -5, rev=0.2, room=0.2)
s.track('hats', -13, room=0.1)
s.track('tick', -15, room=0.2)
s.track('bass', -4.5, duck=0.7)
s.track('chords', -9, rev=0.3, duck=0.75, hp=160, dly=0.05)
s.track('dark', -13, rev=0.4, hp=120)
s.track('chop', -13, dly=0.3, rev=0.3)
s.track('piano', -8, rev=0.3, duck=0.3, hp=120)
s.track('fx', -7, rev=0.45)
s.track('hit', -7.5, room=0.3, rev=0.2)
s.track('ui', -10, rev=0.15)

VO = {'Cm': [55, 60, 63, 67], 'Ab': [56, 60, 63, 68], 'Fm': [56, 60, 65, 68], 'G': [55, 59, 62, 67],
      'Eb': [55, 58, 63, 67, 70], 'Bb': [53, 58, 62, 65, 70], 'Cm9': [55, 58, 62, 63, 67], 'Abmaj7': [55, 60, 63, 67, 68],
      'Bb6': [55, 58, 62, 65, 70], 'Ebadd9': [55, 58, 63, 65, 67, 70]}
ROOT = {'Cm': 36, 'Ab': 32, 'Fm': 29, 'G': 31, 'Eb': 39, 'Bb': 34, 'Cm9': 36, 'Abmaj7': 32, 'Bb6': 34, 'Ebadd9': 39}

# ---------------- intro (0-6 s): donker, tikkende klok, drie 'slams' met doorhalen
for bar, ch in enumerate(['Cm', 'Ab', 'Fm']):
    s.put('dark', pad(VO[ch], 2.0, cutoff=900 + bar * 250, attack=0.05, release=0.4, seed=bar), B(bar * 4), 1.0)
    s.put('bass', sub(ROOT[ch], 1.9), B(bar * 4), 0.4)
    for st in range(16):
        s.put('tick', rim(st) if st % 4 == 0 else hat(False, st, 1.3), B(bar * 4 + st / 4), 0.9 if st % 4 == 0 else 0.35, 0.3 if st % 2 else -0.3)
    for b0 in (0, 1):          # tekst-slams op tel 1 en 2
        t0 = B(bar * 4 + b0)
        s.put('hit', kick('808') * 0.8, t0, 0.8); s.put('hit', snare(150, bar + b0, 0.12), t0, 0.45)
    for j in (0, 0.24):        # doorhalen: rauwe swipe + 'fout'-zoem
        t0 = B(bar * 4 + 2) + j
        s.put('fx', whoosh(0.28, bar), t0 - 0.05, 0.8)
        buzz = filt(square(hz(43 + 12), ns(0.22)), 'lp', 1200) * env_exp(ns(0.22), 0.08)
        s.put('fx', buzz, t0, 0.35)
s.put('fx', riser(2.0, 250, 10000), B(8), 0.55)
snare_roll(s, 8, 11.5, 'clap', 0.5)
s.put('dark', pad(VO['G'], 1.75, cutoff=2200, attack=0.02, release=0.1), B(8), 1.0)
s.put('bass', sub(ROOT['G'], 1.7), B(8), 0.8)
s.put('fx', rev_cymbal(0.9), B(12) - 0.9, 0.45)

# ---------------- drop (6-16 s): future bass, I-V-vi-IV in Es
PROG = ['Ebadd9', 'Bb6', 'Cm9', 'Abmaj7', 'Ebadd9']
s.put('fx', impact(2.4, f=40), B(12), 1.0)
s.put('fx', crash(2.5), B(12), 0.45)
for bar, ch in enumerate(PROG):
    b0 = 12 + bar * 4
    for bt in (0, 1, 2, 3):
        t0 = B(b0 + bt)
        if bt in (0, 2) or (bar % 2 and bt == 3):
            s.put('kick', kick('house', bar * 4 + bt), t0, 1.0); s.kick_at(t0)
        if bt in (1, 3):
            s.put('clap', clap(bar * 4 + bt), t0, 0.95); s.put('clap', snare(210, bt), t0, 0.35)
    if bar % 2: s.put('kick', kick('house', 99), B(b0 + 2.75), 0.7); s.kick_at(B(b0 + 2.75))
    for e in range(8):
        s.put('hats', hat(e % 2 == 1 and e == 7, e + bar), B(b0 + e / 2 + 0.25 * (e % 2 == 0)), 0.8 if e % 2 else 0.4, 0.2)
    # future-bass akkoorden: 8ste-stoten met wobble
    for e in range(8):
        ln = s.spb / 2 * 0.92
        ch_sig = stab(VO[ch], ln, cutoff=6000, seed=bar * 8 + e)
        s.put('chords', ch_sig, B(b0 + e / 2), 1.0 if e % 2 == 0 else 0.7)
    s.put('chords', pad(VO[ch], s.spb * 4, cutoff=1800, attack=0.02, release=0.2, seed=bar) * 0.6, B(b0), 1.0)
    for e in range(4):
        m = ROOT[ch] + 12
        s.put('bass', b808(m, s.spb * 0.95, glide_from=(m + 12 if e == 0 and bar else None)), B(b0 + e), 0.9)
    # chop-melodie
    mel = {0: [79, 82, 79, 75], 1: [77, 74, 77, 82], 2: [75, 79, 82, 79], 3: [75, 72, 75, 79], 4: [79, 82, 84, 87]}[bar]
    for i, m in enumerate(mel):
        s.put('chop', mix(bell(m, 0.35, 2.0, 2.4), pluck(m, 0.3, 5000, seed=i) * 0.6), B(b0 + i * 1.0 + 0.5), 0.8, -0.3 if i % 2 else 0.3)
# schermwissels: kleine crash + whoosh
for b in (20, 24, 28):
    s.put('fx', whoosh(0.5, b), B(b) - 0.35, 0.5)
    s.put('fx', crash(1.5, b), B(b), 0.22)

# ---------------- CTA (16-21,5 s)
s.put('fx', riser(1.5, 400, 10000), B(32) - 1.5, 0.4)
s.put('fx', impact(3.0, f=36), B(32), 1.0)
s.put('fx', crash(3.0, 3), B(32), 0.45)
s.kick_at(B(32)); s.put('kick', kick('808'), B(32), 1.0)
for (bt, ch, ln) in ((32, 'Abmaj7', 2), (34, 'Bb6', 4), (40, 'Ebadd9', 3)):
    s.put('chords', pad(VO[ch], ln * s.spb, cutoff=3500, attack=0.01, release=1.2, seed=bt), B(bt), 1.0)
    ev = [(0, ln * s.spb, m, 82) for m in VO[ch]] + [(0, ln * s.spb, ROOT[ch] + 24, 78)]
    s.put('piano', gm(ev, 0, ln * s.spb + 2), B(bt), 1.0)
    s.put('bass', sub(ROOT[ch] + 12, ln * s.spb * 0.98), B(bt), 0.8)
s.put('hit', impact(2.0, f=50), B(34), 0.5)
s.put('kick', kick('house'), B(34), 0.9); s.kick_at(B(34))
for b in range(36, 40):
    s.put('kick', kick('house', b), B(b), 0.85); s.kick_at(B(b))
    s.put('hats', hat(False, b), B(b + 0.5), 0.7)
    if b % 2: s.put('clap', clap(b), B(b), 0.7)
for st in range(16):
    notes = [m + 12 for m in VO['Bb6']]
    s.put('chop', pluck(notes[[0, 2, 1, 3, 4][st % 5]], s.spb / 4, 4000, seed=st), B(36 + st / 4), 0.5, -0.3 if st % 2 else 0.3)
s.put('fx', impact(3.0, f=40), B(40), 0.8)
s.put('fx', crash(2.5, 5), B(40), 0.35)
for i, m in enumerate([75, 79, 82, 87, 91]):
    s.put('chop', bell(m, 1.2), B(40) + 0.07 * i, 0.6)

# ---------------- interface
ui(s, 'ui', 'tick', 9.0, 0.3, m=86)
ui(s, 'ui', 'beep', 10.9, 0.45, m=94)
ui(s, 'ui', 'pop', 11.6, 0.35, m=87)
for i, t0 in enumerate((12.25, 12.5, 12.75, 13.0)):
    ui(s, 'ui', 'tick', t0, 0.4, m=[75, 79, 82, 87][i])
for t0 in (14.15, 14.45):
    ui(s, 'ui', 'pop', t0, 0.35, m=70)
ui(s, 'ui', 'chime', 14.7, 0.5, m=82)
ui(s, 'ui', 'chime', 15.2, 0.5, m=87)

finish(s, out_path(V), fade_out=1.2)

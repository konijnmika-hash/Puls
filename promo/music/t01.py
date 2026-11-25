"""01 · Puls overzicht (33 s) — premium tech-pop, A mineur -> C majeur, 91,4 bpm vanaf 6,0 s."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

V = '01-promo'
W = warp_fn(V)
s = Song(bpm=91.43, dur=33.0, beat0=6.0)
B = s.t                      # beat -> seconde (beat 0 = 6,0 s; maat = 4 beats)

s.track('heart', -2, room=0.2)
s.track('kick', -1.5)
s.track('clap', -6, rev=0.18, room=0.25)
s.track('hats', -13, room=0.1)
s.track('bass', -5, duck=0.6)
s.track('pad', -11, rev=0.35, duck=0.55, hp=180)
s.track('arp', -14, dly=0.35, rev=0.2, duck=0.35, hp=250)
s.track('piano', -6, rev=0.3, duck=0.25, hp=120)
s.track('strings', -10, rev=0.4, hp=150)
s.track('bell', -15, dly=0.3, rev=0.35)
s.track('fx', -7, rev=0.4)
s.track('ui', -9, rev=0.15)

VO = {'Am': [57, 60, 64, 69], 'F': [57, 60, 65, 69], 'C': [55, 60, 64, 67], 'G': [55, 59, 62, 67],
      'Fadd9': [53, 57, 60, 64, 67], 'Gsus': [55, 60, 62, 67], 'Cadd9': [55, 60, 62, 64, 67]}
ROOT = {'Am': 33, 'F': 29, 'C': 36, 'G': 31, 'Fadd9': 29, 'Gsus': 31, 'Cadd9': 36}
PROG = ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G']

# ---------------- intro: hartslag + donkere pad (0 - 6 s)
for t0 in (0.35, 1.35, 2.25):
    s.put('heart', kick('soft'), t0, 1.0)
    s.put('heart', kick('soft') * 0.6, t0 + 0.2, 0.7)
s.put('pad', pad(VO['Am'], 3.2, cutoff=700, attack=1.2, release=0.8), 0.0, 1.2)
s.put('fx', rev_cymbal(1.4), 3.3 - 1.4, 0.5)
s.put('fx', riser(1.0, 400, 6000), 2.3, 0.35)

# logo-moment (3,3 s)
s.put('fx', impact(2.6, f=40), 3.3, 0.9)
s.put('fx', crash(2.5), 3.3, 0.35)
s.put('pad', pad(VO['F'], 2.7, cutoff=1500, attack=0.05, release=0.6), 3.3, 1.1)
s.put('strings', gm([(0, 2.6, m, 70) for m in [53, 57, 60, 65]], 48, 3.2), 3.3, 1.0)
for i, m in enumerate([69, 72, 76, 81, 84]):
    s.put('bell', bell(m, 0.6), 3.3 + 0.12 * i, 0.9)
# gefilterde arp die opengaat
arp_auto = lambda t: 600 + 3500 * min(1, max(0, (t - 3.3) / 2.7)) ** 2
for k in range(int((6.0 - 3.3) / (s.spb / 4))):
    t0 = 3.3 + k * s.spb / 4
    notes = [m + 12 for m in VO['F']]
    m = notes[[0, 2, 1, 3][k % 4]]
    s.put('arp', pluck(m, s.spb / 4, bright=arp_auto(t0), seed=k), t0, 0.5 + 0.5 * (t0 - 3.3) / 2.7)
s.put('fx', riser(1.6, 300, 9000), 6.0 - 1.6, 0.5)
snare_roll(s, -2.6, 0, 'clap', 0.45)

# ---------------- drop: maten 0-6 (6,0 - 24,4 s)
KICKS = {0: [0, 6, 8], 1: [0, 8, 11, 14]}
for bar in range(7):
    ch = PROG[bar]
    b0 = bar * 4
    for st in KICKS[bar % 2]:
        t0 = B(b0 + st / 4)
        s.put('kick', kick('house', bar), t0, 1.0); s.kick_at(t0)
    for st in (4, 12):
        s.put('clap', clap(bar * 2 + st), B(b0 + st / 4), 0.9)
        s.put('clap', snare(200, bar), B(b0 + st / 4), 0.35)
    for st in range(16):
        acc = 1.0 if st % 4 == 2 else 0.55 if st % 2 == 0 else 0.35
        if st == 14 and bar % 2: s.put('hats', hat(True, st), B(b0 + st / 4), 0.6)
        else: s.put('hats', hat(False, st + bar), B(b0 + st / 4), acc, 0.2)
    # bas: 8sten, octaafsprong op de laatste
    for e in range(8):
        m = ROOT[ch] + 12 + (12 if e in (3, 7) else 0)
        s.put('bass', bass_saw(m, s.spb / 2 * 0.9, cutoff=500), B(b0 + e / 2), 0.9)
        s.put('bass', sub(ROOT[ch], s.spb / 2 * 0.95), B(b0 + e / 2), 0.38)
    s.put('pad', pad(VO[ch], s.spb * 4, cutoff=2600, attack=0.02, release=0.3, seed=bar), B(b0), 1.0)
    # piano: akkoord + syncope
    pv = [(B(b0) - 6.0 * 0, 0, 0)]
    ev = []
    for (bt, ln, vel) in ((0, 1.4, 78), (1.5, 0.9, 62), (2.5, 1.4, 70)):
        for m in VO[ch]:
            ev.append((bt * s.spb, ln * s.spb, m, vel))
        ev.append((bt * s.spb, ln * s.spb, ROOT[ch] + 24, vel - 10))
    s.put('piano', gm(ev, 0, s.spb * 4 + 1.0), B(b0), 0.9)
    # arp 16den
    notes = [m + 12 for m in VO[ch]]
    for st in range(16):
        m = notes[[0, 2, 1, 3, 2, 1, 3, 2][st % 8] % len(notes)] + (12 if st in (6, 14) else 0)
        s.put('arp', pluck(m, s.spb / 4, bright=4200, seed=st + bar * 16), B(b0 + st / 4), 0.8,
              -0.35 if st % 2 else 0.35)

# melodie (bell) in maten 4-6
MEL = [(16, 0.5, 76), (16.5, 0.5, 79), (17, 1.5, 81), (18.5, 0.5, 79), (19, 1, 76),
       (20, 0.5, 77), (20.5, 0.5, 76), (21, 1.5, 72), (22.5, 0.5, 74), (23, 1, 76),
       (24, 0.5, 79), (24.5, 0.5, 76), (25, 1.5, 72), (26.5, 0.5, 74), (27, 1, 74)]
for (bt, ln, m) in MEL:
    s.put('bell', bell(m + 12, ln * s.spb, 3.5, 2.0), B(bt), 0.8)
s.put('strings', gm([(0, s.spb * 12, m, 60) for m in [57, 64, 69]], 48, s.spb * 12 + 1), B(16), 0.8)

# overgangen op de schermwissels (maat 2, 3½, 5, 7)
for b in (8, 14, 20):
    s.put('fx', whoosh(0.7), B(b) - 0.45, 0.6)
    s.put('fx', crash(2.0, b), B(b), 0.28)
s.put('fx', rev_cymbal(1.2), B(14) - 1.2, 0.35)

# ---------------- break (maat 7: 24,4 - 27,0): cijfers
s.put('pad', pad(VO['G'], s.spb * 4, cutoff=1200, attack=0.05, release=0.4), B(28), 1.0)
for st in range(16):
    notes = [m + 12 for m in VO['G']]
    s.put('arp', pluck(notes[[0, 2, 1, 3][st % 4]], s.spb / 4, bright=1500 + 220 * st, seed=st), B(28 + st / 4), 0.7)
s.put('fx', whoosh(0.7), B(28) - 0.45, 0.6)
s.put('fx', riser(2.6, 300, 10000), B(32) - 2.6, 0.6)
snare_roll(s, 29.5, 32, 'clap', 0.5)

# ---------------- CTA (27,0 - 33 s): F -> G ("gratis") -> C
s.put('fx', impact(3.0, f=38), B(32), 1.0)
s.put('fx', crash(3.0, 9), B(32), 0.45)
s.put('kick', kick('808'), B(32), 0.9); s.kick_at(B(32))
for (bt, ch, ln) in ((32, 'Fadd9', 2), (34, 'Gsus', 2), (36, 'Cadd9', 6)):
    s.put('pad', pad(VO[ch], ln * s.spb, cutoff=3200, attack=0.01, release=1.4, seed=bt), B(bt), 1.1)
    s.put('bass', sub(ROOT[ch] + 12, ln * s.spb), B(bt), 0.8)
    ev = [(0, ln * s.spb, m, 84) for m in VO[ch]] + [(0, ln * s.spb, ROOT[ch] + 12, 80)]
    s.put('piano', gm(ev, 0, ln * s.spb + 2), B(bt), 1.0)
    s.put('strings', gm([(0, ln * s.spb, m, 80) for m in VO[ch]], 48, ln * s.spb + 1.5), B(bt), 1.0)
s.put('fx', impact(2.2, f=48), B(34), 0.6)
s.put('kick', kick('house'), B(34), 0.9); s.kick_at(B(34))
for b in range(36, 40):
    s.put('kick', kick('house', b), B(b), 0.85); s.kick_at(B(b))
    s.put('hats', hat(False, b), B(b + 0.5), 0.7)
    if b % 2: s.put('clap', clap(b), B(b), 0.6)
for st in range(20):
    notes = [m + 12 for m in VO['Cadd9']]
    s.put('arp', pluck(notes[[0, 2, 1, 3, 4][st % 5]], s.spb / 4, bright=3500, seed=st), B(36 + st / 4), 0.8 * (1 - st / 24),
          -0.3 if st % 2 else 0.3)
for i, m in enumerate([72, 76, 79, 84, 88]):
    s.put('bell', bell(m, 1.0), B(36) + 0.09 * i, 0.7)

# ---------------- interface-geluidjes (scènetijden -> videotijd)
ui(s, 'ui', 'beep', W(13.1), 0.5, m=93)
ui(s, 'ui', 'pop', W(14.6), 0.4, m=88)
for i, t0 in enumerate((16.3, 16.8, 17.3, 17.8)):
    ui(s, 'ui', 'tick', W(t0), 0.45, m=[76, 79, 83, 88][i])
for t0 in (20.5, 21.1):
    ui(s, 'ui', 'pop', W(t0), 0.4, m=67)
ui(s, 'ui', 'chime', W(21.6), 0.6, m=81)
ui(s, 'ui', 'chime', W(22.5), 0.6, m=86)
for k in range(8):
    ui(s, 'ui', 'tick', W(22.6) + 0.05 * k, 0.15, (k % 3 - 1) * 0.6, m=[88, 91, 93, 96][k % 4])
for i, t0 in enumerate((24.4, 24.8, 25.2)):
    ui(s, 'ui', 'pop', W(t0), 0.35, m=[76, 79, 84][i])

finish(s, out_path(V), fade_out=0.9)

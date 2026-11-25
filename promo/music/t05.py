"""05 · 77 recepten (25 s) — warme lo-fi chillhop in D majeur, 92 bpm met swing.
Rhodes, contrabas, vibrafoon, boom-bap drums en vinylgekraak."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

V = '05-recepten'
s = Song(bpm=92, dur=25.0)
SW = 0.09                                   # swing op de achtste
def B(beat):
    frac = beat % 1
    if abs(frac - 0.5) < 1e-6: beat += SW
    elif abs(frac - 0.75) < 1e-6: beat += SW / 2
    return s.t(beat)

s.track('kick', -3)
s.track('snare', -8, room=0.35, rev=0.15)
s.track('hats', -16, room=0.15)
s.track('bass', -6, duck=0.2)
s.track('rhodes', -6, rev=0.25, duck=0.2, hp=120, lp=4200,
        chain=[pb.Chorus(rate_hz=0.6, depth=0.18, centre_delay_ms=8, feedback=0.0, mix=0.35)])
s.track('vibe', -10, rev=0.35, dly=0.15)
s.track('crackle', -24)
s.track('fx', -11, rev=0.35)
s.track('ui', -11, rev=0.2, room=0.2)

VO = {'Dmaj9': [54, 57, 61, 64], 'Bm9': [57, 61, 62, 66], 'Em9': [55, 59, 62, 66], 'A13': [55, 61, 66, 71]}
ROOT = {'Dmaj9': 38, 'Bm9': 35, 'Em9': 40, 'A13': 33}
PROG = ['Dmaj9', 'Bm9', 'Em9', 'A13']

def hum(v, r):
    return int(np.clip(v + r.integers(-8, 8), 30, 120))

r = rng(5)
for bar in range(9):
    b0 = bar * 4
    ch = PROG[bar % 4]
    # Rhodes: lang akkoord + swing-herhaling
    ev = []
    for (bt, ln, v) in ((0, 2.2, 84), (2.5, 1.3, 70)) if bar else ((0, 3.8, 76),):
        for j, m in enumerate(VO[ch]):
            ev.append(((B(b0 + bt) - B(b0)) + j * 0.012, ln * s.spb, m, hum(v, r)))
    s.put('rhodes', gm(ev, 4, s.spb * 4 + 2), B(b0), 1.0)
    if bar == 0:
        continue
    # drums (boom-bap)
    for bt in (0, 1.75, 2.5):
        if bar == 1 and bt != 0: pass
        s.put('kick', kick('soft'), B(b0 + bt), 1.0 if bt == 0 else 0.75); s.kick_at(B(b0 + bt))
    for bt in (1, 3):
        s.put('snare', snare(185, b0 + bt, 0.14), B(b0 + bt), 0.9)
    if bar % 2: s.put('snare', snare(200, b0, 0.05), B(b0 + 3.75), 0.25)
    for e in range(8):
        s.put('hats', hat(False, e + b0, 0.9), B(b0 + e / 2), [0.8, 0.45][e % 2] * (0.8 + 0.4 * r.random()), 0.25)
    # contrabas (GM 32)
    root = ROOT[ch]
    line = [(0, root + 12, 1.4), (1.5, root + 19, 0.5), (2.5, root + 12, 0.9), (3.5, root + 14 if bar % 2 else root + 11, 0.45)]
    ev = [((B(b0 + bt) - B(b0)), ln * s.spb, m, hum(92, r)) for (bt, m, ln) in line]
    s.put('bass', gm(ev, 32, s.spb * 4 + 1), B(b0), 1.0)

# vibrafoon-melodie (GM 11): intro en CTA
MEL_IN = [(0.5, 78), (1.0, 81), (1.5, 76), (2.5, 74), (3.0, 73)]
s.put('vibe', gm([(B(bt) - B(0), 0.6, m, 70) for (bt, m) in MEL_IN], 11, 4.0), B(0), 1.0)
MEL_CTA = [(28.5, 81), (29, 83), (29.5, 85), (30.5, 88), (32, 86), (32.5, 85), (33, 81), (34, 78), (36, 81)]
s.put('vibe', gm([(B(bt) - B(28), 0.7, m, 76) for (bt, m) in MEL_CTA], 11, 10.0), B(28), 1.0)

# vinylgekraak over alles
s.put('crackle', crackle(25.0, 34), 0.0, 1.0)

# overgangen
s.put('fx', whoosh(0.5), B(4) - 0.3, 0.4)
for i in range(5):                                  # kaarten vliegen binnen
    s.put('fx', whoosh(0.28, i), B(4 + i) - 0.12, 0.35, 0.5)
for b in (12, 20, 24):
    s.put('fx', whoosh(0.5, b), B(b) - 0.3, 0.4)
s.put('fx', riser(1.6, 300, 7000, pitch=False), B(28) - 1.6, 0.35)
s.put('fx', impact(2.2, f=45) * 0.6, B(28), 0.6)
s.put('fx', crash(2.5, 3), B(28), 0.15)

# slotakkoord
ev = [(j * 0.02, 1.6, m, 86) for j, m in enumerate([50, 54, 57, 61, 64, 69])] + [(0, 1.6, 38, 80)]
s.put('rhodes', gm(ev, 4, 3.0), B(36), 1.0)
s.put('vibe', gm([(0, 1.2, 81, 70), (0.08, 1.2, 85, 60), (0.16, 1.2, 88, 55)], 11, 3.0), B(36), 0.9)
s.put('kick', kick('soft'), B(36), 1.0)

# interface: vraagteken-tikjes, kaarten, porties, dagmenu, lijst
for k in range(2, 4): ui(s, 'ui', 'tick', B(k), 0.18, m=86)
for i in range(5): ui(s, 'ui', 'pop', B(4 + i) + 0.05, 0.25, m=[74, 78, 81, 85, 86][i])
for i, bt in enumerate((13, 14, 15, 16, 17)): ui(s, 'ui', 'tick', B(bt), 0.35, m=[74, 78, 81, 86, 81][i])
ui(s, 'ui', 'chime', B(18), 0.45, m=86)
for i in range(4): ui(s, 'ui', 'pop', B(20.5 + i * .5), 0.3, m=[78, 81, 85, 86][i])
ui(s, 'ui', 'chime', B(23), 0.45, m=90)
for i in range(8): ui(s, 'ui', 'tick', B(24.5 + i * .5), 0.3, m=[74, 76, 78, 81, 83, 85, 86, 90][i])
ui(s, 'ui', 'pop', B(32), 0.35, m=86)

finish(s, out_path(V), fade_out=1.2, master_lp=13000)

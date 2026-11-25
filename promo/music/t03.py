"""03 · Een dag met Puls (29,5 s) — zonnige deep house in G majeur, 120 bpm.
ochtend licht -> middag vol -> avond energiek (training) -> nacht zacht -> CTA-drop."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

V = '03-een-dag-met-puls'
s = Song(bpm=120, dur=29.5)
B = s.t

s.track('kick', -2)
s.track('clap', -7, rev=0.2, room=0.25)
s.track('hats', -14, room=0.1)
s.track('shaker', -17)
s.track('bass', -6, duck=0.55)
s.track('ep', -7.5, rev=0.25, dly=0.12, duck=0.35, hp=150)
s.track('epn', -8, rev=0.45, dly=0.2, lp=1800, hp=120)
s.track('pad', -15, rev=0.4, duck=0.5, hp=200)
s.track('mar', -11, dly=0.25, rev=0.2)
s.track('stab', -14, rev=0.2, duck=0.5, hp=300)
s.track('piano', -7, rev=0.35)
s.track('fx', -9, rev=0.4)
s.track('ui', -10, rev=0.2)

VO = {'Gmaj7': [55, 59, 62, 66], 'Em7': [55, 59, 62, 64], 'Cmaj7': [55, 59, 60, 64], 'D': [54, 57, 62, 64], 'G': [55, 59, 62, 67]}
ROOT = {'Gmaj7': 43, 'Em7': 40, 'Cmaj7': 36, 'D': 38, 'G': 43}
PROG = ['Gmaj7', 'Em7', 'Cmaj7', 'D', 'Gmaj7', 'Em7', 'Cmaj7', 'D', 'Gmaj7', 'Em7', 'Cmaj7', 'D', 'Gmaj7', 'Cmaj7', 'G']

def section(bar):
    if bar == 0: return 'intro'
    if bar <= 2: return 'ochtend'
    if bar <= 6: return 'middag'
    if bar <= 8: return 'avond'
    if bar <= 10: return 'nacht'
    if bar == 11: return 'break'
    return 'cta'

EP_RHY = [(0.5, .35), (1.5, .35), (1.75, .25), (2.5, .35), (3.25, .5)]
for bar, ch in enumerate(PROG):
    b0 = bar * 4; sec = section(bar)
    if bar == 14:
        break
    # drums
    if sec in ('ochtend', 'middag', 'avond', 'cta'):
        for bt in range(4):
            s.put('kick', kick('house', bar * 4 + bt) if sec != 'ochtend' else kick('soft'), B(b0 + bt), 1.0 if sec != 'ochtend' else 1.3)
            s.kick_at(B(b0 + bt))
            if sec != 'ochtend' or bar == 2:
                s.put('hats', hat(True, bt + bar, 1.1), B(b0 + bt + 0.5), 0.55, 0.15)
        if sec in ('middag', 'avond', 'cta'):
            for bt in (1, 3): s.put('clap', clap(bar * 2 + bt), B(b0 + bt), 0.9)
        if sec in ('avond', 'cta'):
            for st in range(16):
                if st % 2: s.put('hats', hat(False, st + bar), B(b0 + st / 4), 0.5 if st % 4 == 3 else 0.3, -0.2)
    for st in range(16):
        if sec not in ('intro', 'break'):
            s.put('shaker', shaker(st + bar * 16), B(b0 + st / 4), 1.0 if st % 2 else 0.55, 0.35)
    # EP-akkoorden (Rhodes) in house-ritme
    ev = []
    for (bt, ln) in (EP_RHY if sec not in ('intro', 'break', 'nacht') else [(0, 3.5)]):
        for m in VO[ch]:
            ev.append((bt * s.spb, ln * s.spb, m, 74 if bt % 1 else 82))
    tr = 'epn' if sec in ('nacht', 'intro') else 'ep'
    s.put(tr, gm(ev, 4, s.spb * 4 + 1.5), B(b0), 1.0)
    # pad
    s.put('pad', pad(VO[ch], s.spb * 4, cutoff=1600 if sec != 'nacht' else 900, attack=0.3 if sec in ('intro', 'nacht') else 0.05, release=0.4, seed=bar), B(b0), 1.0)
    # bas
    if sec in ('middag', 'avond', 'cta'):
        for (bt, oct_) in ((0, 0), (0.75, 12), (1.5, 0), (2.5, 0), (3.0, 12), (3.5, 0)):
            s.put('bass', bass_saw(ROOT[ch] + oct_, s.spb * 0.4, cutoff=420), B(b0 + bt), 0.9)
            s.put('bass', sub(ROOT[ch] - 12 + oct_, s.spb * 0.4), B(b0 + bt), 0.3)
    elif sec in ('ochtend', 'nacht'):
        s.put('bass', sub(ROOT[ch], s.spb * 3.6), B(b0), 0.5)
    # marimba-hook
    if sec in ('middag', 'cta') or (sec == 'avond'):
        hook = [(0, 74), (0.5, 79), (1.0, 81), (1.5, 79), (2.25, 83), (2.75, 81), (3.25, 79)]
        if bar % 2: hook = [(0, 76), (0.5, 79), (1.0, 83), (1.75, 81), (2.5, 79), (3.0, 76)]
        for (bt, m) in hook:
            s.put('mar', marimba(m), B(b0 + bt), 0.9, -0.25 if bt % 1 else 0.25)
    if sec == 'avond':
        for bt in (0.5, 1.5, 2.5, 3.5):
            s.put('stab', stab([m + 12 for m in VO[ch]], s.spb * 0.3, 5000, seed=bar), B(b0 + bt), 0.8)
    if sec == 'nacht':
        for i, m in enumerate([86, 83, 79, 74]):
            s.put('mar', bell(m, 0.8, 3.5, 1.0) * 0.6, B(b0 + i), 0.6, (i % 2 - 0.5) * 0.6)

# intro: vogeltjes + opzwellende ochtend
for i, (t0, f0) in enumerate([(0.3, 2600), (0.45, 3000), (1.1, 2800), (1.25, 3300), (1.4, 3100)]):
    n_ = ns(0.09); tt = secs(n_)
    chirp = np.sin(TAU * np.cumsum(f0 + 1800 * tt / 0.09) / SR) * np.sin(np.pi * tt / 0.09) ** 2
    s.put('fx', chirp * 0.25, t0, 1.0, (i % 2 - 0.5) * 0.8)
s.put('fx', riser(1.8, 300, 6000, pitch=False), 0.2, 0.25)
# overgangen per tijdstip
for b in (4, 12, 20, 28, 36):
    s.put('fx', whoosh(0.6, b), B(b) - 0.4, 0.45)
s.put('fx', crash(2.0, 1), B(12), 0.2)
s.put('fx', crash(2.0, 2), B(28), 0.25)
s.put('fx', downlifter(1.2), B(36), 0.35)
# nacht -> break -> drop
s.put('fx', riser(1.9, 300, 9000), B(48) - 1.9, 0.5)
snare_roll(s, 45, 48, 'clap', 0.45)
ev = [(0, s.spb * 3.6, m, 76) for m in [55, 59, 62, 66, 69]] + [(0, s.spb * 3.6, 38, 70)]
s.put('piano', gm(ev, 0, s.spb * 4 + 2), B(44), 1.0)
s.put('fx', impact(2.5, f=40), B(48), 0.9)
s.put('fx', crash(2.5, 7), B(48), 0.4)
s.put('fx', impact(2.0, f=50), B(49), 0.45)
# slot: G-akkoord laten uitklinken
s.put('pad', pad(VO['G'], 1.6, cutoff=2600, attack=0.01, release=1.0), B(56), 1.2)
ev = [(0, 1.4, m, 84) for m in [55, 59, 62, 67, 71]] + [(0, 1.4, 31, 80), (0, 1.4, 43, 78)]
s.put('piano', gm(ev, 0, 3.0), B(56), 1.0)
s.put('kick', kick('house'), B(56), 0.9)
s.put('fx', crash(1.5, 9), B(56), 0.3)
for i, m in enumerate([79, 83, 86, 91]):
    s.put('mar', bell(m, 0.9), B(56) + 0.06 * i, 0.5)

# interface
for i in range(4): ui(s, 'ui', 'pop', 3 + i * .25, 0.35, m=[79, 83, 86, 91][i])
ui(s, 'ui', 'pop', 8.0, 0.4, m=86)
ui(s, 'ui', 'chime', 10.1, 0.5, m=86)
for t0 in (11.5, 12.0): ui(s, 'ui', 'pop', t0, 0.35, m=67)
for i, t0 in enumerate((15.5, 16, 16.5, 17)): ui(s, 'ui', 'tick', t0, 0.4, m=[74, 79, 83, 86][i])
for i, t0 in enumerate((19, 19.5, 20, 20.5)): ui(s, 'ui', 'chime', t0, 0.45, m=[79, 83, 86, 91][i])
for k in range(10): ui(s, 'ui', 'tick', 21 + 0.045 * k, 0.15, (k % 3 - 1) * .6, m=[91, 95, 98, 103][k % 4])
ui(s, 'ui', 'pop', 25.5, 0.35, m=91)

finish(s, out_path(V), fade_out=1.0)

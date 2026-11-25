"""04 · Scan alles (18 s) — energieke electro house in E mineur, 128 bpm.
Elke scan valt op de tel; de scanpiepjes vormen samen een stijgende melodie."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

V = '04-scan-alles'
s = Song(bpm=128, dur=18.0)
B = s.t

s.track('kick', -1.5)
s.track('clap', -6, rev=0.18, room=0.2)
s.track('hats', -13, room=0.08)
s.track('bass', -5.5, duck=0.75)
s.track('stab', -11, rev=0.25, dly=0.12, duck=0.5, hp=250)
s.track('pad', -16, rev=0.35, duck=0.6, hp=200)
s.track('arp', -15, dly=0.3, rev=0.2, duck=0.4, hp=300)
s.track('beep', -10, dly=0.18, rev=0.15)
s.track('fx', -8, rev=0.4)
s.track('hit', -6, rev=0.3)

VO = {'Em': [52, 55, 59, 64], 'C': [52, 55, 60, 64], 'G': [55, 59, 62, 67], 'D': [54, 57, 62, 66],
      'Em7': [55, 59, 62, 64]}
ROOT = {'Em': 28, 'C': 24, 'G': 31, 'D': 26, 'Em7': 28}
PROG = ['Em', 'C', 'G', 'D']

def groove(b0, bars, full=True, bass=True):
    for bar in range(bars):
        bb = b0 + bar * 4
        ch = PROG[(bb // 4) % 4]
        for bt in range(4):
            s.put('kick', kick('house', bb + bt), B(bb + bt), 1.0); s.kick_at(B(bb + bt))
            if full and bt in (1, 3):
                s.put('clap', clap(bb + bt), B(bb + bt), 0.9); s.put('clap', snare(220, bt), B(bb + bt), 0.3)
            s.put('hats', hat(True, bt, 1.2), B(bb + bt + 0.5), 0.6, 0.15)
        if full:
            for st in range(16):
                if st % 2: s.put('hats', hat(False, st + bb), B(bb + st / 4), 0.45, -0.2)
        if bass:   # rollende bas: 16den, niet op de tel
            for st in range(16):
                if st % 4 == 0: continue
                m = ROOT[ch] + 12 + (12 if st % 4 == 2 and st > 8 else 0)
                s.put('bass', bass_saw(m, s.spb / 4 * 0.85, cutoff=600, drive=2.0), B(bb + st / 4), 0.85)
                s.put('bass', sub(ROOT[ch] + 12, s.spb / 4 * 0.85), B(bb + st / 4), 0.25)
        for bt in (0.5, 1.5, 2.5, 3.5):
            s.put('stab', stab([m + 12 for m in VO[ch]], s.spb * 0.28, 6000, seed=bb), B(bb + bt), 0.8)
        s.put('pad', pad(VO[ch], s.spb * 4, cutoff=2000, attack=0.02, release=0.2, seed=bb), B(bb), 1.0)

# ---------------- hook (0 - 1,9 s)
for b0 in (0, 2):
    s.put('hit', kick('808'), B(b0), 0.9)
    s.put('hit', stab([m + 12 for m in VO['Em']], 0.4, 7000), B(b0), 1.0)
    s.put('fx', impact(1.0, f=55), B(b0), 0.4)
s.put('fx', riser(0.94, 600, 11000, pitch=True), B(2), 0.5)
snare_roll(s, 2, 4, 'clap', 0.5)

# ---------------- scans (1,9 - 7,5 s)
s.put('fx', impact(2.0, f=45), B(4), 0.8)
s.put('fx', crash(2.0), B(4), 0.35)
groove(4, 3)
for i in range(6):
    a = 4 + i * 2
    s.put('fx', whoosh(0.32, i), B(a) - 0.12, 0.35, (i % 2 - 0.5) * 0.6)
    m = [88, 91, 93, 95, 98, 100][i]           # stijgend: E6 G6 A6 B6 D7 E7
    s.put('beep', mix(blip(hz(m), 0.16), blip(hz(m + 7), 0.16, 0.45)), B(a + 1), 1.0)
    s.put('beep', blip(hz(m + 12), 0.08, 0.3), B(a + 1.25), 0.6)

# ---------------- 6 producten / 6 seconden (7,5 - 9,4 s)
for b0 in (16, 18):
    s.put('kick', kick('808'), B(b0), 1.0); s.kick_at(B(b0))
    s.put('hit', stab([m + 12 for m in VO['C' if b0 == 16 else 'D']], 0.6, 7000), B(b0), 1.0)
    s.put('fx', impact(1.6, f=48), B(b0), 0.55)
    s.put('bass', sub(ROOT['C' if b0 == 16 else 'D'] + 12, s.spb * 1.8), B(b0), 0.7)
for st in range(16):
    s.put('hats', hat(False, st), B(16 + st / 4), 0.35 + 0.2 * (st % 2))
s.put('fx', rev_cymbal(0.9), B(20) - 0.9, 0.4)

# ---------------- miljoenen merkproducten (9,4 - 13,1 s): arp-opbouw
groove(20, 2, full=False)
for st in range(32):
    ch = PROG[(20 + st // 4 * 0) // 4 % 4] if st < 16 else PROG[(24 // 4) % 4]
    notes = [m + 24 for m in VO[PROG[((20 + st // 16 * 4) // 4) % 4]]]
    s.put('arp', pluck(notes[[0, 1, 2, 3, 2, 1][st % 6]], s.spb / 4, bright=1200 + 140 * st, seed=st), B(20 + st / 4), 0.8, -0.3 if st % 2 else 0.3)
s.put('fx', riser(1.9, 300, 11000), B(28) - 1.9, 0.55)
snare_roll(s, 24, 28, 'clap', 0.5)

# ---------------- CTA (13,1 - 18 s)
s.put('fx', impact(3.0, f=38), B(28), 1.0)
s.put('fx', crash(2.6, 4), B(28), 0.4)
groove(28, 2)
s.put('hit', stab([m + 12 for m in VO['G']], 0.6, 7000), B(30), 0.9)          # "gratis"
for i, m in enumerate([76, 79, 83, 88, 91]):
    s.put('beep', bell(m, 0.8), B(28) + 0.06 * i, 0.45)
# slot: Em-akkoord + inslag
s.put('fx', impact(2.5, f=40), B(36), 0.9)
s.put('kick', kick('808'), B(36), 0.9)
s.put('pad', pad([52, 55, 59, 64, 67], 1.0, cutoff=3000, attack=0.01, release=0.6), B(36), 1.3)
s.put('stab', stab([64, 67, 71, 76], 0.6, 7000), B(36), 1.0)
s.put('beep', mix(blip(hz(100), 0.25), blip(hz(107), 0.25, 0.5)), B(36), 0.8)

finish(s, out_path(V), fade_out=0.8)

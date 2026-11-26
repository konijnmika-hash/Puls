"""12 · Zo werkt Puls (voice-over, ±46 s) — muziekbed in de stijl van filmpje 02 (120 bpm),
onder de stem: gespannen intro in C mineur, future-bass-groove in Es majeur, muziek duikt weg als de stem praat.
Leest videos/12-uitleg/timeline.json (gemaakt door voice/build_vo.py)."""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

V = '12-uitleg'
TL = json.load(open(os.path.join(vdir(V), 'timeline.json')))
LN = TL['lines']
ws = lambda l, i: LN[l]['words'][i]['s']
we = lambda l, i: LN[l]['words'][i]['e']
LS = lambda l: LN[l]['start']

s = Song(bpm=TL['bpm'], dur=TL['dur'], beat0=TL['beat0'])
B = s.t
vo = read_wav(os.path.join(vdir(V), 'vo.wav'))[:s.n]
s.vo_env = voice_envelope(vo)
VD = 0.68                      # hoeveel de muziek wegduikt onder de stem

s.track('vo', 3.5, room=0.04, hp=85, eq=[('peak', 3200, 0.9, 2.5), ('lowshelf', 180, 0.7, -1.5)],
        chain=[pb.Compressor(threshold_db=-22, ratio=3.0, attack_ms=4, release_ms=110)])
s.track('kick', -5, vduck=0.45)
s.track('clap', -11, rev=0.2, room=0.2, vduck=0.85, eq=[('peak', 2500, 0.8, -4)])
s.track('hats', -18, room=0.1, vduck=0.85)
s.track('tick', -19, room=0.2, vduck=VD)
s.track('bass', -8.5, duck=0.6, vduck=0.35)
s.track('chords', -14, rev=0.3, duck=0.7, hp=180, eq=[('peak', 2600, 0.7, -5)], vduck=0.75)
s.track('dark', -16, rev=0.4, hp=120, eq=[('peak', 2600, 0.7, -3)], vduck=VD)
s.track('bell', -19, dly=0.25, rev=0.3, vduck=VD)
s.track('piano', -11, rev=0.3, hp=120, vduck=0.4)
s.track('fx', -11, rev=0.45, vduck=0.45, eq=[('peak', 3000, 0.7, -4)])
s.track('hit', -11, room=0.3, rev=0.2, vduck=0.25)
s.track('ui', -17, rev=0.2, vduck=0.45, eq=[('peak', 3000, 0.7, -5)])
s.put('vo', vo, 0.0, 1.0)

VO = {'Cm': [55, 60, 63, 67], 'Ab': [56, 60, 63, 68], 'Fm': [56, 60, 65, 68], 'G': [55, 59, 62, 67],
      'Ebadd9': [55, 58, 63, 65, 67, 70], 'Bb6': [55, 58, 62, 65, 70], 'Cm9': [55, 58, 62, 63, 67], 'Abmaj7': [55, 60, 63, 67, 68]}
ROOT = {'Cm': 36, 'Ab': 32, 'Fm': 29, 'G': 31, 'Ebadd9': 39, 'Bb6': 34, 'Cm9': 36, 'Abmaj7': 32}

# ---------------- intro (0 - 6,75 s): gespannen, de drie problemen
s.put('dark', pad(VO['Cm'], 0.75, cutoff=700, attack=0.3, release=0.2), 0.0, 0.8)
for bar, ch in enumerate(['Cm', 'Ab', 'Fm']):
    b0 = bar * 4
    ln = 4 if bar < 2 else 2
    s.put('dark', pad(VO[ch], ln * s.spb, cutoff=900 + bar * 250, attack=0.05, release=0.3, seed=bar), B(b0), 1.0)
    s.put('bass', sub(ROOT[ch], ln * s.spb * 0.95), B(b0), 0.35)
    for st in range(16 if bar < 2 else 8):
        s.put('tick', rim(st) if st % 4 == 0 else hat(False, st, 1.3), B(b0 + st / 4), 0.9 if st % 4 == 0 else 0.35, 0.3 if st % 2 else -0.3)
s.put('dark', pad(VO['G'], 2 * s.spb, cutoff=2200, attack=0.02, release=0.05), B(10), 1.0)
s.put('bass', sub(ROOT['G'], 2 * s.spb * 0.9), B(10), 0.45)
for a in (ws(0, 0), ws(0, 4), ws(0, 8)):                     # elk probleem: zachte inslag
    s.put('hit', kick('808') * 0.7, a, 1.0)
    s.put('hit', snare(150, int(a * 10), 0.12), a, 0.35)
for k, a in enumerate((we(0, 3), we(0, 6), we(0, 12))):       # doorhalen
    s.put('fx', whoosh(0.28, k), a, 0.6)
s.put('fx', riser(2.4, 250, 10000), B(12) - 2.4, 0.45)
snare_roll(s, 8, 11.5, 'clap', 0.4)
s.put('fx', rev_cymbal(0.9), B(12) - 0.9, 0.4)

# ---------------- groove (6,75 - 34,75 s)
PROG = ['Ebadd9', 'Bb6', 'Cm9', 'Abmaj7']
s.put('fx', impact(2.4, f=40), B(12), 1.0)
s.put('fx', crash(2.5), B(12) + 0.05, 0.18)
for bar in range(3, 17):                                     # tel 12 t/m 68
    b0 = bar * 4
    ch = PROG[(bar - 3) % 4]
    for bt in range(4):
        if bt in (0, 2) or (bar % 2 and bt == 3):
            s.put('kick', kick('house', b0 + bt), B(b0 + bt), 1.0); s.kick_at(B(b0 + bt))
        if bt in (1, 3):
            s.put('clap', clap(b0 + bt), B(b0 + bt), 0.9)
        s.put('bass', b808(ROOT[ch] + 12, s.spb * 0.95), B(b0 + bt), 0.85)
    for e in range(8):
        s.put('hats', hat(e == 7 and bar % 2 == 1, e + bar), B(b0 + e / 2 + (0.25 if e % 2 == 0 else 0)), 0.8 if e % 2 else 0.4, 0.2)
        s.put('chords', stab(VO[ch], s.spb / 2 * 0.9, cutoff=4000, seed=bar * 8 + e), B(b0 + e / 2), 1.0 if e % 2 == 0 else 0.7)
    s.put('chords', pad(VO[ch], s.spb * 4, cutoff=1600, attack=0.02, release=0.2, seed=bar) * 0.6, B(b0), 1.0)
# scènewissels op de zinnen: zachte whoosh + bel
for i, l in enumerate((2, 3, 4, 5)):
    s.put('fx', whoosh(0.45, l), LS(l) - 0.55, 0.5)
    s.put('bell', bell([79, 82, 84, 87][i], 0.6), LS(l) - 0.32, 0.5)

# ---------------- opbouw naar de CTA (34,75 - 36,75 s)
s.put('dark', pad(VO['Bb6'], 4 * s.spb, cutoff=900, attack=0.1, release=0.1), B(68), 1.0)
s.put('dark', np.zeros((10, 2)), B(68), 0)
s.put('fx', riser(2.0, 300, 11000), B(72) - 2.0, 0.6)
snare_roll(s, 68, 72, 'clap', 0.55)
s.put('fx', rev_cymbal(0.8), B(72) - 0.8, 0.4)

# ---------------- CTA (36,75 s - einde)
s.put('fx', impact(3.0, f=36), B(72), 1.0)
s.put('fx', crash(3.0, 3), B(72), 0.45)
for bar in range(18, 21):                                    # tel 72 t/m 84
    b0 = bar * 4
    ch = ['Abmaj7', 'Bb6', 'Bb6'][bar - 18]
    for bt in range(4):
        s.put('kick', kick('house', b0 + bt), B(b0 + bt), 0.95); s.kick_at(B(b0 + bt))
        if bt % 2: s.put('clap', clap(b0 + bt), B(b0 + bt), 0.8)
        s.put('hats', hat(True, b0 + bt), B(b0 + bt + 0.5), 0.55, 0.2)
        s.put('bass', b808(ROOT[ch] + 12, s.spb * 0.95), B(b0 + bt), 0.8)
    s.put('chords', pad(VO[ch], s.spb * 4, cutoff=3000, attack=0.02, release=0.3, seed=bar), B(b0), 1.0)
s.put('hit', stab([m + 12 for m in VO['Bb6']], 0.5, 6000), ws(6, 6), 1.2)        # "14"
s.put('hit', impact(1.6, f=50), ws(6, 6), 0.6)
s.put('hit', stab([m + 12 for m in VO['Ebadd9']], 0.6, 6000), ws(6, 8), 1.2)     # "gratis"
for i, m in enumerate([75, 79, 82, 87, 91]):
    s.put('bell', bell(m, 1.0), ws(6, 8) + 0.06 * i, 0.6)
# slotakkoord
s.put('fx', impact(3.0, f=40), B(84), 0.8)
s.put('chords', pad(VO['Ebadd9'], 2.6, cutoff=3500, attack=0.01, release=1.2), B(84), 1.2)
ev = [(0, 2.6, m, 84) for m in VO['Ebadd9']] + [(0, 2.6, 39, 80), (0, 2.6, 27, 76)]
s.put('piano', gm(ev, 0, 4.0), B(84), 1.0)
s.put('kick', kick('house'), B(84), 0.9)

# ---------------- interface-geluidjes op de woorden
ui(s, 'ui', 'beep', we(3, 5) + 0.04, 0.3, m=94)           # barcode gevonden
ui(s, 'ui', 'pop', ws(3, 8), 0.4, m=87)                   # "erin"
for i in range(4):
    ui(s, 'ui', 'tick', ws(4, 5) + i * .22, 0.35, m=[75, 79, 82, 87][i])
ui(s, 'ui', 'pop', we(5, 6) + 0.03, 0.25, m=70)           # water
ui(s, 'ui', 'chime', ws(5, 7) - 0.12, 0.25, m=82)         # melding eten
ui(s, 'ui', 'chime', ws(5, 9) - 0.12, 0.25, m=86)         # melding training
for k in range(8):
    ui(s, 'ui', 'tick', we(5, 17) + 0.05 + 0.05 * k, 0.15, (k % 3 - 1) * .6, m=[91, 94, 98, 103][k % 4])

finish(s, out_path(V), fade_out=1.5)

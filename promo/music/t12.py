"""12 · Probeer dit 14 dagen (15 s) — energieke pop-house in As majeur, 128 bpm, 8 maten.
Maat 1: hook met twee klappen en een loopje van 14 tonen (de 14 dagen die voltikken).
Maat 2-6: groove met een pluk-melodie; elke maat is één shot. Interface-geluidjes vallen op de tel.
Maat 7-8: slotkaart; klappen op "Eerste 14 dagen", "Premium" en de grootste op "gratis"."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

V = '12-probeer-14-dagen'
s = Song(bpm=128, dur=15.0)
B = s.t   # tel -> seconden (0,469 s per tel)

s.track('kick', -1.5)
s.track('clap', -6, rev=0.18, room=0.2)
s.track('hats', -13.5, room=0.08)
s.track('bass', -6, duck=0.75)
s.track('stab', -10.5, rev=0.25, dly=0.1, duck=0.5, hp=220)
s.track('pad', -15.5, rev=0.35, duck=0.6, hp=180)
s.track('lead', -9.5, dly=0.22, rev=0.2, duck=0.25, hp=300)
s.track('run', -8.5, rev=0.25, dly=0.12)
s.track('ui', -9.5, dly=0.15, rev=0.15)
s.track('piano', -8.5, rev=0.3, duck=0.3, hp=120)
s.track('fx', -8, rev=0.4)
s.track('hit', -6, rev=0.3)

VO = {'Db': [56, 61, 65, 68], 'Ab': [56, 60, 63, 68], 'Eb': [55, 58, 63, 67], 'Fm': [56, 60, 65, 68],
      'Abadd9': [56, 58, 60, 63, 68, 70]}
ROOT = {'Db': 37, 'Ab': 44, 'Eb': 39, 'Fm': 41, 'Abadd9': 44}
up = lambda ch, o=12: [m + o for m in VO[ch]]


def drums(b0, beats=4, kicks=True, claps=True, hats16=True):
    for bt in range(beats):
        t0 = B(b0 + bt)
        if kicks:
            s.put('kick', kick('house', b0 + bt), t0, 1.0); s.kick_at(t0)
        if claps and (b0 + bt) % 2 == 1:
            s.put('clap', clap(b0 + bt), t0, 0.92); s.put('clap', snare(215, bt), t0, 0.3)
        s.put('hats', hat(True, bt, 1.2), B(b0 + bt + 0.5), 0.6, 0.15)
    if hats16:
        for st in range(beats * 4):
            if st % 2: s.put('hats', hat(False, st + b0), B(b0 + st / 4), 0.42 + 0.1 * (st % 4 == 3), -0.2)


def harmony(b0, ch, beats=4, stabs=(0.75, 1.5, 2.75, 3.5)):
    for st in range(beats * 4):            # rollende bas: zestienden, niet op de tel
        if st % 4 == 0: continue
        m = ROOT[ch] + (12 if st % 8 == 6 else 0)
        s.put('bass', bass_saw(m, s.spb / 4 * 0.85, cutoff=620, drive=2.0), B(b0 + st / 4), 0.85)
        s.put('bass', sub(ROOT[ch], s.spb / 4 * 0.85), B(b0 + st / 4), 0.28)
    for bt in stabs:
        if bt < beats: s.put('stab', stab(up(ch), s.spb * 0.3, 6200, seed=int(b0 * 4 + bt * 4)), B(b0 + bt), 0.85)
    s.put('pad', pad(VO[ch], s.spb * beats, cutoff=2100, attack=0.02, release=0.2, seed=int(b0)), B(b0), 1.0)


def lead(b0, notes):
    """notes: [(tel in de maat, midi, lengte in tellen)] — pluk met een belletje erboven"""
    for i, (bt, m, ln) in enumerate(notes):
        sig = mix(pluck(m, s.spb * ln, 5200, 0.2, seed=i + int(b0)), bell(m + 12, s.spb * ln * 0.6, 2.0, 1.6) * 0.35)
        s.put('lead', sig, B(b0 + bt), 0.9, -0.25 if i % 2 else 0.25)


# ---------------- maat 1 · hook (0 - 1,9 s)
for b0, g in ((0, 0.85), (1, 1.0)):        # tel 1: "Probeer dit" · tel 2: "14 dagen."
    s.put('hit', kick('house', b0), B(b0), 1.0 * g); s.kick_at(B(b0))
    s.put('hit', stab(up('Fm'), 0.3, 7000, seed=b0), B(b0), g)
    s.put('fx', impact(0.7, f=52, seed=b0), B(b0), 0.42 * g)
    s.put('bass', sub(ROOT['Fm'], s.spb * 0.6), B(b0), 0.7)
s.put('clap', clap(1), B(1), 0.9); s.put('clap', snare(200, 1), B(1), 0.4)
# tel 3: de 14 dagen tikken vol, één toon per beeldje, omhoog door As-pentatonisch
RUN = [56, 58, 60, 63, 65, 68, 70, 72, 75, 77, 80, 82, 84, 87]
for i, m in enumerate(RUN):
    sig = mix(marimba(m, 0.16), pluck(m + 12, 0.09, 6000, seed=i) * 0.45)
    s.put('run', sig, B(2) + i * s.spb / 14, 0.55 + 0.035 * i, (i / 13 - 0.5) * 0.9)
s.put('hit', kick('house', 2), B(2), 0.8); s.kick_at(B(2))
# tel 4: het lime doek gaat omhoog
s.put('hit', stab(up('Eb', 24), 0.3, 8000, seed=9), B(3), 0.55)
s.put('fx', whoosh(0.7, 3), B(3) - 0.08, 0.75)
s.put('fx', riser(s.spb, 500, 11000, seed=2), B(3), 0.5)
snare_roll(s, 3, 4, 'clap', 0.5)
s.put('fx', rev_cymbal(0.9), B(4) - 0.9, 0.38)

# ---------------- maat 2-5 · vier shots (1,9 - 9,4 s): IV - I - V - vi
MEL = {
    'Db': [(0, 77, .5), (0.5, 80, .25), (1, 85, .5), (1.75, 84, .25), (2.5, 80, .5), (3, 77, .5), (3.5, 80, .5)],
    'Ab': [(0, 75, .5), (0.75, 80, .25), (1.5, 84, .5), (2, 82, .25), (2.5, 80, .5), (3.25, 75, .25), (3.5, 72, .5)],
    'Eb': [(0, 79, .5), (0.5, 82, .25), (1, 87, .5), (1.75, 84, .25), (2.5, 82, .5), (3, 79, .5), (3.5, 82, .5)],
    'Fm': [(0, 80, .5), (0.75, 84, .25), (1.5, 89, .5), (2, 87, .25), (2.5, 84, .5), (3, 80, .25), (3.5, 77, .5)],
}
s.put('fx', impact(2.2, f=44), B(4), 0.85)
for i, ch in enumerate(['Db', 'Ab', 'Eb', 'Fm']):
    b0 = 4 + i * 4
    drums(b0); harmony(b0, ch); lead(b0, MEL[ch])
    s.put('fx', crash(1.8, i), B(b0), 0.3 if i == 0 else 0.2)
    if i: s.put('fx', whoosh(0.34, i), B(b0) - 0.16, 0.42, (i % 2 - 0.5) * 0.6)     # het scherm schuift

# ---------------- maat 6 · laatste shot, opbouw naar de klap (9,4 - 11,25 s)
drums(20, 2); harmony(20, 'Db', 2, stabs=(0.75, 1.5))
harmony(22, 'Eb', 2, stabs=())
for bt in (22, 22.5, 23, 23.25, 23.5, 23.75): s.put('stab', stab(up('Eb'), s.spb * 0.2, 6800, seed=int(bt * 4)), B(bt), 0.8)
for st in range(16):                       # stijgend loopje in zestienden
    m = ([68, 72, 75, 77, 80, 84, 87, 89] if st < 8 else [75, 79, 82, 84, 87, 91, 94, 96])[st % 8]
    s.put('lead', pluck(m, s.spb / 4, 2600 + 260 * st, 0.12, seed=st), B(20 + st / 4), 0.5 + 0.03 * st, -0.3 if st % 2 else 0.3)
s.put('fx', whoosh(0.34, 5), B(20) - 0.16, 0.42)
s.put('fx', crash(1.8, 5), B(20), 0.2)
s.put('fx', riser(s.spb * 2, 300, 11500, seed=5), B(22), 0.6)
snare_roll(s, 22, 24, 'clap', 0.55)
s.put('fx', rev_cymbal(1.0, 2), B(24) - 1.0, 0.42)

# ---------------- maat 7-8 · slotkaart (11,25 - 15 s)
s.put('fx', impact(3.2, f=38), B(24), 1.0)                      # lime stroomt het beeld in
s.put('fx', crash(2.8, 7), B(24), 0.42)
s.put('kick', kick('808'), B(24), 1.0); s.kick_at(B(24))
s.put('pad', pad(VO['Abadd9'], s.spb * 6, cutoff=3000, attack=0.02, release=0.9, seed=24), B(24), 1.25)
s.put('piano', gm([(0, s.spb * 4, m, 84) for m in VO['Abadd9']] + [(0, s.spb * 4, 44, 80), (0, s.spb * 4, 32, 76)], 0, s.spb * 4 + 2.5), B(24), 1.0)
s.put('bass', sub(ROOT['Abadd9'] - 12, s.spb * 0.95), B(24), 0.8)
for bt, notes, g in ((25, [68, 72, 75, 80], 0.8), (26, [72, 75, 80, 84], 0.92)):     # "Eerste 14 dagen" · "Premium"
    s.put('kick', kick('house', bt), B(bt), 0.95); s.kick_at(B(bt))
    s.put('hit', stab(notes, s.spb * 0.5, 6800, seed=bt), B(bt), g)
    s.put('bass', sub(32, s.spb * 0.9), B(bt), 0.7)
    s.put('hats', hat(True, bt, 1.2), B(bt + 0.5), 0.6, 0.15)
s.put('clap', clap(26), B(26), 0.8)
s.put('fx', riser(s.spb * 0.9, 900, 12000, seed=7, pitch=False), B(26) + 0.03, 0.4)
# "gratis." — de grootste klap, met een akkoord dat openbreekt
s.put('kick', kick('808'), B(27), 1.0); s.kick_at(B(27))
s.put('clap', clap(27), B(27), 1.0); s.put('clap', snare(220, 27), B(27), 0.45)
s.put('fx', impact(2.6, f=46, seed=3), B(27), 0.9)
s.put('fx', crash(2.6, 9), B(27), 0.4)
s.put('hit', stab(up('Abadd9'), s.spb * 0.9, 7600, seed=27), B(27), 1.1)
s.put('piano', gm([(0, s.spb * 5, m, 96) for m in up('Abadd9')] + [(0, s.spb * 5, 44, 90), (0, s.spb * 5, 32, 84)], 0, s.spb * 5 + 2.5), B(27), 1.0)
s.put('bass', sub(32, s.spb * 0.95), B(27), 0.9)
for i, m in enumerate([80, 84, 87, 92, 96]):
    s.put('ui', bell(m, 0.9), B(27) + 0.05 * i, 0.5, (i / 4 - 0.5) * 0.8)
# knop "Download Puls": de groove komt nog één keer terug en eindigt op tel 3 van de laatste maat
drums(28, 2); harmony(28, 'Abadd9', 2, stabs=(0.75, 1.5))
lead(28, [(0, 80, .5), (0.5, 84, .25), (1, 87, .5), (1.5, 92, .5)])
ui(s, 'ui', 'pop', B(28), 0.5, m=80)
s.put('kick', kick('808'), B(30), 1.0); s.kick_at(B(30))
s.put('clap', clap(30), B(30), 0.9)
s.put('fx', impact(2.4, f=40, seed=5), B(30), 0.85)
s.put('hit', stab(up('Abadd9'), s.spb * 1.4, 7200, seed=30), B(30), 1.0)
s.put('pad', pad(up('Abadd9'), s.spb * 1.2, cutoff=3400, attack=0.01, release=0.7, seed=30), B(30), 1.2)
s.put('bass', sub(32, s.spb * 1.6), B(30), 0.9)
for i, m in enumerate([92, 87, 84, 80, 92]):
    s.put('ui', bell(m, 1.0), B(30) + 0.06 * i, 0.45, (0.5 - i / 4) * 0.8)

# ---------------- interface: wat er in de app gebeurt, gestemd in de toonsoort
for bt, m in ((4.5, 77), (5.5, 80), (6.5, 85)):          # dag 1: ontbijt, lunch, snack; de ring loopt mee
    ui(s, 'ui', 'pop', B(bt), 0.42, m=m)
ui(s, 'ui', 'beep', B(9), 0.6, m=92)                     # dag 2: barcode gevonden
ui(s, 'ui', 'tick', B(9) + 0.07, 0.4, m=96)
ui(s, 'ui', 'chime', B(11), 0.6, m=87)                   # ... en toegevoegd
ui(s, 'ui', 'pop', B(11), 0.45, m=75)
s.put('fx', whoosh(0.9, 12), B(12.5), 0.3)               # dag 5: door de recepten scrollen
for bt, m in ((17, 77), (18, 80), (19, 84)):             # dag 8: drie sets afvinken
    ui(s, 'ui', 'tick', B(bt), 0.5, m=m)
    ui(s, 'ui', 'pop', B(bt), 0.3, m=m - 12)
s.put('fx', whoosh(0.9, 20), B(20.5), 0.3)               # dag 14: naar de gewichtstrend scrollen

finish(s, out_path(V), fade_out=0.45)

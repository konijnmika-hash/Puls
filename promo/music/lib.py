"""Kleine muziekstudio in Python voor de Puls-promo's.

Synths (supersaw, pluck, FM, 808, Karplus-Strong), drums, effecten, echte instrumenten via
FluidSynth + General MIDI-soundfont, sporen met sends (galm/delay), sidechain en mastering
op -14 LUFS. Alles is zelf gemaakt en dus rechtenvrij.
"""
import os, subprocess, tempfile, wave
import numpy as np
from scipy import signal
import pedalboard as pb
import pyloudnorm as pyln
import mido

SR = 44100
SF2 = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
TAU = 2 * np.pi

# ---------------------------------------------------------------- noten & akkoorden
NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6,
        'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
QUAL = {'': [0, 4, 7], 'm': [0, 3, 7], '7': [0, 4, 7, 10], 'maj7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10],
        'sus2': [0, 2, 7], 'sus4': [0, 5, 7], 'add9': [0, 4, 7, 14], 'madd9': [0, 3, 7, 14],
        'm9': [0, 3, 7, 10, 14], 'maj9': [0, 4, 7, 11, 14], '6': [0, 4, 7, 9], 'm6': [0, 3, 7, 9],
        'dim': [0, 3, 6], '5': [0, 7], '9': [0, 4, 7, 10, 14], 'm11': [0, 3, 7, 10, 14, 17]}


def hz(m):
    return 440.0 * 2 ** ((np.asarray(m, float) - 69) / 12)


def nn(name):
    """'A3' -> 57"""
    i = 2 if len(name) > 2 and name[1] in '#b' else 1
    return NOTE[name[:i]] + 12 * (int(name[i:]) + 1)


def root_of(sym):
    return sym[:2] if len(sym) > 1 and sym[1] in '#b' else sym[:1]


def chord(sym, octave=4):
    r = root_of(sym)
    return [NOTE[r] + 12 * (octave + 1) + i for i in QUAL[sym[len(r):]]]


def voice(notes, lo=55, hi=76):
    """vouw akkoordtonen binnen [lo, hi] (dichte ligging, soepele stemvoering)"""
    out = []
    for m in notes:
        while m < lo: m += 12
        while m > hi: m -= 12
        out.append(m)
    return sorted(set(out))


# ---------------------------------------------------------------- basis
def rng(seed=0):
    return np.random.default_rng(seed)


def secs(n):
    return np.arange(n) / SR


def ns(dur):
    return max(1, int(round(dur * SR)))


def env_adsr(n, a=0.005, d=0.1, s=0.7, r=0.2, hold=None):
    """ADSR; hold = seconden ingedrukt (default: tot n - release)"""
    t = secs(n)
    if hold is None: hold = max(0.0, n / SR - r)
    e = np.where(t < a, t / max(a, 1e-6), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-6)))
    rel = t > hold
    if rel.any():
        v0 = e[min(n - 1, int(hold * SR))]
        e[rel] = v0 * np.exp(-(t[rel] - hold) / max(r / 4.0, 1e-6))
    return e


def env_exp(n, decay, attack=0.002):
    t = secs(n)
    return np.minimum(1, t / max(attack, 1e-6)) * np.exp(-t / decay)


def auto(points, n, t0=0.0):
    """lineaire automatisering: points = [(sec, waarde), ...]"""
    p = np.array(points, float)
    return np.interp(t0 + secs(n), p[:, 0], p[:, 1])


# ---------------------------------------------------------------- oscillatoren
def _phase(freq, n, ph0):
    f = np.broadcast_to(np.asarray(freq, float), (n,)).astype(float)
    ph = (ph0 + np.cumsum(f) / SR) % 1.0
    return ph, np.clip(f / SR, 1e-6, 0.5)


def _blep(ph, dt):
    y = np.zeros_like(ph)
    m = ph < dt
    x = ph[m] / dt[m]; y[m] = x + x - x * x - 1
    m = ph > 1 - dt
    x = (ph[m] - 1) / dt[m]; y[m] = x * x + x + x + 1
    return y


def saw(freq, n, ph0=0.0):
    ph, dt = _phase(freq, n, ph0)
    return 2 * ph - 1 - _blep(ph, dt)


def square(freq, n, ph0=0.0, pw=0.5):
    ph, dt = _phase(freq, n, ph0)
    a = 2 * ph - 1 - _blep(ph, dt)
    ph2 = (ph + 1 - pw) % 1.0
    b = 2 * ph2 - 1 - _blep(ph2, dt)
    return (a - b) * 0.5


def tri(freq, n, ph0=0.0):
    ph, _ = _phase(freq, n, ph0)
    return 2 * np.abs(2 * ph - 1) - 1


def sine(freq, n, ph0=0.0):
    ph, _ = _phase(freq, n, ph0)
    return np.sin(TAU * ph)


def pan_gains(p):
    a = (p + 1) * np.pi / 4
    return np.cos(a) * np.sqrt(2), np.sin(a) * np.sqrt(2)


def supersaw(freq, n, voices=7, detune=0.22, side=0.85, seed=0):
    """klassieke supersaw, stereo (n,2). detune in halve tonen (totale spreiding)"""
    r = rng(seed)
    out = np.zeros((n, 2))
    for o in np.linspace(-1, 1, voices):
        f = np.asarray(freq) * 2 ** (o * detune / 24)
        s = saw(f, n, r.random())
        gl, gr = pan_gains(o * side)
        g = 1.0 if abs(o) < 1e-9 else 0.75
        out[:, 0] += s * gl * g; out[:, 1] += s * gr * g
    return out / (voices * 0.55)


def fm(freq, n, ratio=1.0, index=2.0, idecay=0.3, ph0=0.0):
    t = secs(n)
    I = index * np.exp(-t / max(idecay, 1e-4))
    f = np.asarray(freq, float)
    mod = np.sin(TAU * f * ratio * t)
    return np.sin(TAU * f * t + I * mod + ph0)


def ks(freq, n, decay=0.996, bright=0.6, seed=0):
    """Karplus-Strong snaar"""
    N = max(2, int(round(SR / freq)))
    x = np.zeros(n)
    burst = rng(seed).uniform(-1, 1, N)
    burst = lp1(burst, 1500 + bright * 9000)
    x[:N] = burst
    a = np.zeros(N + 2); a[0] = 1; a[N] = -decay * 0.5; a[N + 1] = -decay * 0.5
    return signal.lfilter([1.0], a, x)


# ---------------------------------------------------------------- filters
def lp1(x, fc):
    a = np.exp(-TAU * fc / SR)
    return signal.lfilter([1 - a], [1, -a], x, axis=0)


def _rbj(kind, f0, q=0.707, gain_db=0.0):
    f0 = float(np.clip(f0, 10, SR * 0.45))
    w0 = TAU * f0 / SR
    cw, sw = np.cos(w0), np.sin(w0)
    al = sw / (2 * q)
    A = 10 ** (gain_db / 40)
    if kind == 'lp':
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]; a = [1 + al, -2 * cw, 1 - al]
    elif kind == 'hp':
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]; a = [1 + al, -2 * cw, 1 - al]
    elif kind == 'bp':
        b = [al, 0, -al]; a = [1 + al, -2 * cw, 1 - al]
    elif kind == 'peak':
        b = [1 + al * A, -2 * cw, 1 - al * A]; a = [1 + al / A, -2 * cw, 1 - al / A]
    elif kind == 'lowshelf':
        sa = 2 * np.sqrt(A) * al
        b = [A * ((A + 1) - (A - 1) * cw + sa), 2 * A * ((A - 1) - (A + 1) * cw), A * ((A + 1) - (A - 1) * cw - sa)]
        a = [(A + 1) + (A - 1) * cw + sa, -2 * ((A - 1) + (A + 1) * cw), (A + 1) + (A - 1) * cw - sa]
    elif kind == 'highshelf':
        sa = 2 * np.sqrt(A) * al
        b = [A * ((A + 1) + (A - 1) * cw + sa), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - sa)]
        a = [(A + 1) - (A - 1) * cw + sa, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - sa]
    else:
        raise ValueError(kind)
    b = np.array(b) / a[0]; a = np.array(a) / a[0]
    return b, a


def filt(x, kind, f0, q=0.707, gain_db=0.0):
    b, a = _rbj(kind, f0, q, gain_db)
    return signal.lfilter(b, a, x, axis=0)


def sweep(x, kind, fc, q=0.707, block=128):
    """filter met tijdsvariabele frequentie (fc = array per sample of scalar)"""
    n = len(x)
    fc = np.broadcast_to(np.asarray(fc, float), (n,))
    y = np.zeros_like(x)
    zi = None
    for i in range(0, n, block):
        b, a = _rbj(kind, fc[min(n - 1, i + block // 2)], q)
        seg = x[i:i + block]
        if zi is None:
            zi = np.zeros((2,) + seg.shape[1:])
        y[i:i + block], zi = signal.lfilter(b, a, seg, axis=0, zi=zi)
    return y


def sat(x, drive=1.5):
    return np.tanh(x * drive) / np.tanh(drive)


# ---------------------------------------------------------------- instrumenten
def pluck(m, dur, bright=5000, decay=0.18, kind='saw', seed=0, q=1.2):
    n = ns(dur + 0.05)
    f = hz(m)
    src = saw(f, n, rng(seed).random()) if kind == 'saw' else square(f, n, rng(seed).random(), 0.3)
    src = src + 0.5 * saw(f * 1.005, n, 0.3)
    fc = 220 + bright * np.exp(-secs(n) / (decay * 0.6))
    y = sweep(src, 'lp', fc, q)
    return y * env_adsr(n, 0.002, decay, 0.0, 0.05) * 0.6


def pad(notes, dur, cutoff=2400, attack=0.4, release=0.6, detune=0.22, seed=0, voices=7):
    n = ns(dur + release)
    out = np.zeros((n, 2))
    for i, m in enumerate(notes):
        out += supersaw(hz(m), n, voices=voices, detune=detune, seed=seed + i)
    out = filt(out, 'lp', cutoff, 0.6)
    e = env_adsr(n, attack, 1.0, 1.0, release, hold=dur)
    return out * e[:, None] / max(1, len(notes)) ** 0.6


def stab(notes, dur, cutoff=5000, seed=0):
    n = ns(dur + 0.08)
    out = np.zeros((n, 2))
    for i, m in enumerate(notes):
        out += supersaw(hz(m), n, voices=5, detune=0.18, seed=seed + i)
    fc = 500 + cutoff * np.exp(-secs(n) / 0.12)
    out = sweep(out, 'lp', fc, 0.9)
    return out * env_adsr(n, 0.002, 0.15, 0.35, 0.06, hold=dur)[:, None] / max(1, len(notes)) ** 0.6


def sub(m, dur, drive=1.2, release=0.05):
    n = ns(dur + release)
    y = sine(hz(m), n) + 0.12 * sine(hz(m) * 2, n)
    return sat(y, drive) * env_adsr(n, 0.004, 0.3, 0.9, release, hold=dur)


def bass_saw(m, dur, cutoff=700, drive=1.6):
    n = ns(dur + 0.04)
    f = hz(m)
    y = saw(f, n) * 0.6 + sine(f / 2 if m > 40 else f, n) * 0.0 + sine(f, n) * 0.6
    fc = cutoff + 1600 * np.exp(-secs(n) / 0.08)
    y = sweep(y, 'lp', fc, 1.1)
    return sat(y, drive) * env_adsr(n, 0.003, 0.2, 0.8, 0.04, hold=dur) * 0.8


def b808(m, dur, glide_from=None, drive=2.2):
    n = ns(dur + 0.08)
    t = secs(n)
    f = np.full(n, hz(m))
    if glide_from is not None:
        f = hz(m) + (hz(glide_from) - hz(m)) * np.exp(-t / 0.06)
    f = f * (1 + 0.9 * np.exp(-t / 0.012))
    y = np.sin(TAU * np.cumsum(f) / SR)
    y = sat(y * 1.0, drive)
    y = filt(y, 'lp', 1800)
    return y * env_adsr(n, 0.002, 0.8, 0.7, 0.07, hold=dur)


def bell(m, dur, ratio=3.5, index=3.0):
    n = ns(dur + 0.3)
    y = fm(hz(m), n, ratio, index, 0.25) * 0.7 + fm(hz(m) * 2, n, 1.0, 0.8, 0.2) * 0.2
    return y * env_exp(n, dur * 0.5 + 0.2)


def marimba(m, dur=0.4):
    n = ns(dur + 0.2)
    y = fm(hz(m), n, 4.0, 1.6, 0.03) * 0.8 + sine(hz(m) * 4, n) * 0.1 * np.exp(-secs(n) / 0.02)
    return y * env_exp(n, 0.22)


def epiano(m, dur, vel=0.8):
    n = ns(dur + 0.4)
    t = secs(n)
    y = fm(hz(m), n, 1.0, 1.6 * vel, 0.6) + 0.35 * fm(hz(m), n, 14.0, 0.6 * vel, 0.02)
    trem = 1 + 0.12 * np.sin(TAU * 4.5 * t)
    return y * trem * env_adsr(n, 0.002, 1.2, 0.35, 0.3, hold=dur) * 0.5


# ---------------------------------------------------------------- drums
def kick(kind='house', seed=0):
    if kind == '808':
        n = ns(0.9); t = secs(n)
        f = 44 + 120 * np.exp(-t / 0.03)
        y = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.45)
        return sat(y, 2.0)
    if kind == 'soft':
        n = ns(0.35); t = secs(n)
        f = 52 + 70 * np.exp(-t / 0.025)
        y = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.12)
        return filt(sat(y, 1.3), 'lp', 2500)
    n = ns(0.5); t = secs(n)
    f = 48 + 150 * np.exp(-t / 0.022) + 40 * np.exp(-t / 0.1)
    body = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / (0.16 if kind == 'house' else 0.22))
    click = filt(filt(rng(seed).standard_normal(n), 'bp', 3800, 0.8), 'lp', 9000) * np.exp(-t / 0.003) * 0.22
    return sat(body, 1.8 if kind == 'house' else 2.6) + click


def snare(tone=190, seed=0, decay=0.16):
    n = ns(0.45); t = secs(n)
    body = (np.sin(TAU * tone * t) + 0.5 * np.sin(TAU * tone * 1.7 * t)) * np.exp(-t / 0.05)
    nz = filt(rng(seed).standard_normal(n), 'bp', 4000, 0.6) * np.exp(-t / decay)
    return sat(body * 0.6 + nz * 0.9, 1.4)


def clap(seed=0, decay=0.14):
    n = ns(0.5); t = secs(n)
    nz = filt(rng(seed).standard_normal(n), 'bp', 1400, 0.9)
    e = np.exp(-t / decay)
    for d in (0.0, 0.009, 0.019, 0.03):
        i = int(d * SR)
        e[i:i + int(0.008 * SR)] += 0.9 * np.exp(-np.arange(int(0.008 * SR)) / (0.003 * SR))
    return nz * e * 0.7


def hat(open_=False, seed=0, tone=1.0):
    n = ns(0.6 if open_ else 0.12); t = secs(n)
    ratios = np.array([2, 3, 4.16, 5.43, 6.79, 8.21]) * 40 * tone
    met = sum(square(f * 4.5, n, rng(seed + i).random()) for i, f in enumerate(ratios))
    nz = rng(seed).standard_normal(n)
    y = filt(met * 0.25 + nz * 0.6, 'hp', 7000)
    return y * env_exp(n, 0.2 if open_ else 0.022, 0.0008) * 0.6


def shaker(seed=0):
    n = ns(0.14); t = secs(n)
    y = filt(rng(seed).standard_normal(n), 'bp', 6500, 1.2)
    e = np.minimum(1, t / 0.02) * np.exp(-t / 0.04)
    return y * e * 0.5


def rim(seed=0):
    n = ns(0.1); t = secs(n)
    y = np.sin(TAU * 1700 * t) * np.exp(-t / 0.008) + filt(rng(seed).standard_normal(n), 'bp', 3500, 2) * np.exp(-t / 0.01)
    return y * 0.6


def snap(seed=0):
    n = ns(0.2); t = secs(n)
    y = filt(rng(seed).standard_normal(n), 'bp', 2400, 1.6) * np.exp(-t / 0.025)
    return y * 1.2


def tom(f=110, seed=0):
    n = ns(0.6); t = secs(n)
    ff = f * (1 + 0.5 * np.exp(-t / 0.04))
    y = np.sin(TAU * np.cumsum(ff) / SR) * np.exp(-t / 0.25)
    return sat(y + 0.1 * filt(rng(seed).standard_normal(n), 'lp', 3000) * np.exp(-t / 0.03), 1.5)


def crash(dur=2.5, seed=0):
    n = ns(dur); t = secs(n)
    ratios = np.array([2, 3, 4.16, 5.43, 6.79, 8.21]) * 47
    met = sum(square(f * 5.1, n, rng(seed + i).random()) for i, f in enumerate(ratios))
    nz = rng(seed).standard_normal(n)
    y = filt(met * 0.2 + nz * 0.7, 'hp', 4500)
    return y * env_exp(n, dur * 0.3, 0.001) * 0.5


# ---------------------------------------------------------------- effecten / overgangen
def riser(dur, f0=300, f1=9000, seed=0, pitch=True):
    n = ns(dur); t = secs(n)
    k = t / dur
    fc = f0 * (f1 / f0) ** (k ** 1.6)
    y = sweep(rng(seed).standard_normal(n), 'bp', fc, 1.4)
    if pitch:
        y = y + 0.25 * supersaw(110 * 2 ** (k * 2.0), n, 5, 0.4, 0, seed)[:, 0] * k
    return y * k ** 2.2 * 0.6


def downlifter(dur, seed=0):
    return riser(dur, 300, 7000, seed, pitch=False)[::-1] * 0.8


def impact(dur=2.5, seed=0, f=42):
    n = ns(dur); t = secs(n)
    ff = f + 90 * np.exp(-t / 0.05)
    boom = np.sin(TAU * np.cumsum(ff) / SR) * np.exp(-t / 0.7)
    nz = filt(rng(seed).standard_normal(n), 'lp', 5000) * np.exp(-t / 0.18) * 0.5
    return sat(boom + nz, 1.6)


def whoosh(dur=0.7, seed=0):
    n = ns(dur); t = secs(n)
    k = t / dur
    shape = np.sin(np.pi * k) ** 2
    y = sweep(rng(seed).standard_normal(n), 'bp', 500 + 6000 * shape, 1.2)
    return y * shape * 0.7


def rev_cymbal(dur=1.5, seed=0):
    return crash(dur, seed)[::-1] * 0.9


def snare_roll(song, b0, b1, track='drums', gain=0.5, seed=0):
    """versnellende snare-roll van beat b0 tot b1"""
    b = b0; i = 0
    while b < b1:
        k = (b - b0) / (b1 - b0)
        song.put(track, snare(190 + 80 * k, seed + i, 0.08), song.t(b), gain * (0.25 + 0.75 * k ** 1.5))
        step = 0.5 if k < 0.35 else 0.25 if k < 0.7 else 0.125
        b += step; i += 1


def blip(f, dur=0.12, g=1.0):
    n = ns(dur); t = secs(n)
    return (np.sin(TAU * f * t) + 0.3 * np.sin(TAU * f * 2 * t)) * np.exp(-t / (dur / 4)) * g


def crackle(dur, density=30, seed=0):
    n = ns(dur)
    r = rng(seed)
    y = np.zeros(n)
    idx = r.integers(0, n, int(dur * density))
    y[idx] = r.uniform(-1, 1, len(idx)) * r.random(len(idx)) ** 3
    y = filt(y, 'bp', 3000, 0.5)
    hiss = filt(r.standard_normal(n), 'bp', 5000, 0.5) * 0.015
    return y * 0.8 + hiss


# ---------------------------------------------------------------- FluidSynth (echte instrumenten)
def gm(events, program, dur, drum=False, gain=0.7, bend=None, cc=None):
    """events: [(start_sec, len_sec, midi_noot, velocity 1..127)] -> stereo (n,2)"""
    mid = mido.MidiFile(ticks_per_beat=480)
    tr = mido.MidiTrack(); mid.tracks.append(tr)
    tr.append(mido.MetaMessage('set_tempo', tempo=500000))  # 120 bpm: 960 ticks per seconde
    ch = 9 if drum else 0
    if not drum:
        tr.append(mido.Message('program_change', program=program, channel=ch, time=0))
    msgs = []
    for (s, l, m, v) in events:
        s = max(0.0, s)
        msgs.append((s, 1, mido.Message('note_on', note=int(m), velocity=int(np.clip(v, 1, 127)), channel=ch)))
        msgs.append((s + max(0.02, l), 0, mido.Message('note_off', note=int(m), velocity=0, channel=ch)))
    for (s, num, val) in (cc or []):
        msgs.append((s, 2, mido.Message('control_change', control=num, value=int(val), channel=ch)))
    msgs.sort(key=lambda x: (x[0], x[1]))
    last = 0
    for s, _, msg in msgs:
        tk = int(round(s * 960))
        msg.time = max(0, tk - last); last = max(last, tk)
        tr.append(msg)
    with tempfile.TemporaryDirectory() as d:
        mp, wp = os.path.join(d, 'a.mid'), os.path.join(d, 'a.wav')
        mid.save(mp)
        subprocess.run(['fluidsynth', '-ni', '-q', '-R', '0', '-C', '0', '-g', str(gain), '-r', str(SR),
                        '-F', wp, SF2, mp], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        x = read_wav(wp)
    n = ns(dur)
    out = np.zeros((n, 2))
    out[:min(n, len(x))] = x[:n]
    return out


def read_wav(path):
    with wave.open(path) as w:
        ch, sw, fr = w.getnchannels(), w.getsampwidth(), w.getframerate()
        raw = w.readframes(w.getnframes())
    x = np.frombuffer(raw, dtype=np.int16 if sw == 2 else np.int32).astype(float)
    x /= 32768.0 if sw == 2 else 2147483648.0
    x = x.reshape(-1, ch)
    if ch == 1: x = np.repeat(x, 2, axis=1)
    assert fr == SR, fr
    return x


def write_wav(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


# ---------------------------------------------------------------- galm
def make_ir(rt60=2.2, pre=0.018, seed=1, bright=0.6, n_sec=None):
    """synthetische zaal: decorrelated stereo, hoge tonen sterven sneller uit"""
    n = ns(n_sec or rt60 * 1.3)
    t = secs(n)
    r = rng(seed)
    out = np.zeros((n, 2))
    bands = [(150, 1.0), (600, 0.95), (2500, 0.75), (7000, 0.45 * (0.5 + bright))]
    for ch in range(2):
        acc = np.zeros(n)
        lo = 0
        for (fc, k) in bands:
            nz = r.standard_normal(n)
            nz = filt(nz, 'lp', fc) - (filt(nz, 'lp', lo) if lo else 0)
            acc += nz * np.exp(-6.9 * t / (rt60 * k))
            lo = fc
        acc *= np.minimum(1, t / 0.03)
        # vroege reflecties
        for _ in range(10):
            i = int(r.uniform(0.004, 0.07) * SR)
            acc[i] += r.uniform(-1, 1) * 3
        out[:, ch] = acc
    out = np.vstack([np.zeros((int(pre * SR), 2)), out])
    return out / np.sqrt(np.sum(out ** 2) / 2)


def convolve(x, ir):
    wl = signal.fftconvolve(x[:, 0] + 0.35 * x[:, 1], ir[:, 0])[:len(x)]
    wr = signal.fftconvolve(x[:, 1] + 0.35 * x[:, 0], ir[:, 1])[:len(x)]
    return np.stack([wl, wr], 1)


def delay_st(x, tl, tr, fb=0.38, n=7, lp=4500):
    out = np.zeros_like(x)
    for ch, dt in ((0, tl), (1, tr)):
        d = int(dt * SR)
        src = x[:, 1 - ch] * 0.5 + x[:, ch]
        acc = np.zeros(len(x))
        cur = src
        for k in range(1, n + 1):
            cur = lp1(cur, lp)
            sh = np.zeros(len(x)); sh[d * k:] = cur[:len(x) - d * k] if d * k < len(x) else 0
            acc += sh * fb ** (k - 1)
        out[:, ch] = acc
    return out


# ---------------------------------------------------------------- het nummer
class Song:
    def __init__(self, bpm, dur, beat0=0.0):
        self.bpm, self.spb, self.dur, self.beat0 = bpm, 60.0 / bpm, dur, beat0
        self.n = ns(dur)
        self.tracks = {}
        self.kicks = []
        self.vo_env = None      # omhullende van de voice-over (0..1), voor ducking

    def t(self, beat):
        return self.beat0 + beat * self.spb

    def track(self, name, gain_db=0.0, rev=0.0, room=0.0, dly=0.0, duck=0.0, duck_rel=None, hp=None, lp=None,
              chain=None, width=1.0, eq=None, vduck=0.0):
        tr = self.tracks.setdefault(name, {'buf': np.zeros((self.n, 2))})
        tr.update(dict(gain=gain_db, rev=rev, room=room, dly=dly, duck=duck, duck_rel=duck_rel, hp=hp, lp=lp,
                       chain=chain or [], width=width, eq=eq or [], vduck=vduck))
        return name

    def put(self, name, sig, t, gain=1.0, pan=0.0):
        buf = self.tracks[name]['buf']
        i = int(round(t * SR))
        if sig.ndim == 1:
            gl, gr = pan_gains(pan)
            sig = np.stack([sig * gl, sig * gr], 1)
        elif pan:
            gl, gr = pan_gains(pan)
            sig = sig * np.array([gl, gr])
        if i < 0:
            sig = sig[-i:]; i = 0
        if i >= self.n or len(sig) == 0: return
        m = min(len(sig), self.n - i)
        buf[i:i + m] += sig[:m] * gain

    def kick_at(self, t):
        self.kicks.append(t)

    def duck_env(self, depth, rel=None):
        rel = rel or self.spb * 0.85
        g = np.ones(self.n)
        L = int(rel * SR)
        x = np.arange(L) / L
        shape = 1 - depth * (1 - x) ** 2.2
        att = int(0.004 * SR)
        for tk in self.kicks:
            i = int(tk * SR)
            if i >= self.n: continue
            m = min(L, self.n - i)
            g[i:i + m] = np.minimum(g[i:i + m], shape[:m])
            a0 = max(0, i - att)
            g[a0:i] = np.minimum(g[a0:i], np.linspace(1, shape[0], i - a0)) if i > a0 else g[a0:i]
        return g

    def mixdown(self, lufs=-14.0, fade_out=0.8, rt60=2.4, master_lp=None, tail_from=None):
        master = np.zeros((self.n, 2))
        rev = np.zeros((self.n, 2)); room = np.zeros((self.n, 2)); dly = np.zeros((self.n, 2))
        for name, tr in self.tracks.items():
            x = tr['buf']
            if not np.any(x): continue
            if tr['hp']: x = filt(x, 'hp', tr['hp'])
            if tr['lp']: x = filt(x, 'lp', tr['lp'])
            for (kind, f0, q, g) in tr['eq']:
                x = filt(x, kind, f0, q, g)
            if tr['chain']:
                x = pb.Pedalboard(tr['chain'])(x.T.astype(np.float32), SR, reset=True).T.astype(float)
            if tr['duck'] > 0 and self.kicks:
                x = x * self.duck_env(tr['duck'], tr['duck_rel'])[:, None]
            if tr.get('vduck', 0) > 0 and self.vo_env is not None:
                x = x * (1 - tr['vduck'] * self.vo_env[:len(x)])[:, None]
            if tr['width'] != 1.0:
                mid = (x[:, 0] + x[:, 1]) / 2; side = (x[:, 0] - x[:, 1]) / 2 * tr['width']
                x = np.stack([mid + side, mid - side], 1)
            x = x * 10 ** (tr['gain'] / 20)
            master += x
            rev += x * tr['rev']; room += x * tr['room']; dly += x * tr['dly']
        if np.any(dly):
            d = delay_st(dly, self.spb * 0.75, self.spb * 0.5)
            master += d * 0.6; rev += d * 0.25
        if np.any(room):
            master += filt(convolve(room, make_ir(0.7, 0.008, 5, 0.8)), 'hp', 200) * 0.6
        if np.any(rev):
            w = filt(convolve(rev, make_ir(rt60, 0.025, 7)), 'hp', 220)
            if self.kicks: w = w * self.duck_env(0.35)[:, None]
            master += w * 0.75
        master = filt(master, 'hp', 32)
        master = filt(master, 'lowshelf', 75, 0.7, -3.0)
        master = filt(master, 'peak', 2800, 0.8, 1.2)
        if master_lp: master = filt(master, 'lp', master_lp)
        comp = pb.Pedalboard([pb.Compressor(threshold_db=-16, ratio=2.2, attack_ms=12, release_ms=160)])
        master = comp(master.T.astype(np.float32), SR).T.astype(float)
        master = filt(master, 'highshelf', 9000, 0.7, 1.5)
        # loudness
        meter = pyln.Meter(SR)
        L = meter.integrated_loudness(master)
        master *= 10 ** ((lufs - L) / 20)
        lim = pb.Pedalboard([pb.Limiter(threshold_db=-1.2, release_ms=80)])
        master = lim(master.T.astype(np.float32), SR).T.astype(float)
        # fades
        if fade_out:
            k = ns(fade_out)
            master[-k:] *= np.linspace(1, 0, k)[:, None] ** 1.5
        master[:64] *= np.linspace(0, 1, 64)[:, None]
        # de limiter past zelf ook versterking toe: meet opnieuw en zet precies op het doel
        L2 = meter.integrated_loudness(master)
        master *= 10 ** ((lufs - L2) / 20)
        peak = np.max(np.abs(signal.resample_poly(master, 4, 1, axis=0)))
        if peak > 0.93: master *= 0.93 / peak
        return master


def finish(song, path, **kw):
    x = song.mixdown(**kw)
    write_wav(path, x)
    meter = pyln.Meter(SR)
    print(f'{os.path.basename(os.path.dirname(path))}: {len(x)/SR:.1f}s  {meter.integrated_loudness(x):.1f} LUFS  peak {20*np.log10(np.max(np.abs(x))):.1f} dBFS')
    return x


# ---------------------------------------------------------------- koppeling met de video's
import json
VIDEOS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'videos')


def vdir(name):
    return os.path.join(VIDEOS, name)


def out_path(name):
    return os.path.join(vdir(name), 'audio.wav')


def warp_fn(name):
    """scènetijd -> videotijd (zie sync.json); zonder sync.json gelijk"""
    p = os.path.join(vdir(name), 'sync.json')
    if not os.path.exists(p):
        return lambda s: s
    w = np.array(json.load(open(p))['warp'], float)
    return lambda s: float(np.interp(s, w[:, 0], w[:, 1]))


def ui(song, track, kind, t, gain=0.25, pan=0.0, m=84):
    """kleine interface-geluidjes, gestemd in de toonsoort"""
    f = hz(m)
    if kind == 'tick':
        sig = blip(f, 0.09)
    elif kind == 'pop':
        sig = blip(f, 0.16) + blip(f * 1.5, 0.16, 0.4)
    elif kind == 'beep':
        sig = blip(f, 0.2) + blip(f * 1.4983, 0.2, 0.5)
    elif kind == 'chime':
        sig = bell(m, 0.5, 3.0, 1.2) * 0.6
    else:
        sig = blip(f, 0.12)
    song.put(track, sig, t, gain, pan)


def mix(*xs):
    """tel signalen van verschillende lengte (mono of stereo) bij elkaar op"""
    n = max(len(x) for x in xs)
    st = any(x.ndim == 2 for x in xs)
    out = np.zeros((n, 2) if st else n)
    for x in xs:
        if st and x.ndim == 1: x = np.stack([x, x], 1)
        out[:len(x)] += x
    return out


def voice_envelope(vo, look=0.05, release=0.35):
    """0..1-omhullende van een stem (voor ducking): snel omlaag, rustig weer omhoog, iets vooruit"""
    m = np.abs(vo if vo.ndim == 1 else vo.mean(1))
    win = int(0.03 * SR)
    rms = np.sqrt(np.convolve(m ** 2, np.ones(win) / win, 'same'))
    ref = np.percentile(rms[rms > 1e-4], 90) if np.any(rms > 1e-4) else 1.0
    e = np.clip(rms / (ref * 0.5), 0, 1)
    # piek vasthouden + loslaten
    a = np.exp(-1 / (release * SR))
    out = signal.lfilter([1 - a], [1, -a], e)
    out = np.maximum(out, e)
    out = lp1(out, 8.0)
    k = int(look * SR)
    out = np.concatenate([out[k:], np.zeros(k)])
    return np.clip(out / (out.max() + 1e-9), 0, 1)

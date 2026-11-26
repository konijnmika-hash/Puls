"""Voice-over voor filmpje 12 ("Zo werkt Puls").

1. Spreekt elke zin in met Piper (stem: Pim, nl_NL, CC0-licentie), volledig lokaal.
2. Bepaalt met Whisper de woordtijden (voor ondertitels en om de beelden op de woorden te laten vallen).
3. Legt de zinnen op het ritme van de muziek (120 bpm): de drop en de CTA beginnen op een maatstreep.
4. Schrijft videos/12-uitleg/vo.wav, timeline.json en timeline.js (voor de scène).

Modellen worden eenmalig gedownload naar ~/.cache/puls-voices (Hugging Face).
"""
import os, sys, json, wave, re, difflib, urllib.request
import numpy as np
from scipy.signal import resample_poly
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'music'))
from lib import SR, write_wav, vdir
from piper import PiperVoice, SynthesisConfig
from faster_whisper import WhisperModel

V = '12-uitleg'
BPM = 120
SPB = 60 / BPM
CACHE = os.path.expanduser('~/.cache/puls-voices')
VOICE = 'nl_NL-pim-medium'
DOWNLOADS = {
    f'{VOICE}.onnx': 'rhasspy/piper-voices/resolve/main/nl/nl_NL/pim/medium/nl_NL-pim-medium.onnx',
    f'{VOICE}.onnx.json': 'rhasspy/piper-voices/resolve/main/nl/nl_NL/pim/medium/nl_NL-pim-medium.onnx.json',
    'whisper-small/config.json': 'Systran/faster-whisper-small/resolve/main/config.json',
    'whisper-small/model.bin': 'Systran/faster-whisper-small/resolve/main/model.bin',
    'whisper-small/tokenizer.json': 'Systran/faster-whisper-small/resolve/main/tokenizer.json',
    'whisper-small/vocabulary.txt': 'Systran/faster-whisper-small/resolve/main/vocabulary.txt',
}

# (gesproken tekst, tekst in beeld/ondertitel, waar de zin mag beginnen)
# De gesproken spelling helpt de uitspraak: "Daunlood" klinkt als het Engelse "download".
LINES = [
    ("Gokken met je calorieën? Schema's van internet? En na twee weken weer gestopt?", None, 'start'),
    ("Stop met gokken. Met Puls heb je een persoonlijke coach, voor eten, trainen en energie.", None, 'bar'),
    ("Puls berekent precies wat jij per dag nodig hebt, en laat in één oogopslag zien hoe je ervoor staat.", None, 'beat'),
    ("Iets gegeten? Scan de barcode, en het staat erin.", None, 'beat'),
    ("Je krijgt een trainingsschema op jouw niveau, met uitleg bij elke oefening.", None, 'beat'),
    ("En je coach herinnert je aan water, eten en training, en viert het als je je doel haalt.", None, 'beat'),
    ("Daunlood Puls nu, en probeer het 14 dagen gratis.", "Download Puls nu, en probeer het 14 dagen gratis.", 'bar'),
]
GAP = {'start': 0, 'beat': 0.3, 'bar': 0.55}   # minimale stilte voor een zin (s)
TAKES = 8           # per zin meerdere takes; de helderste wint (ook getest met ruis eronder, als muziek)
TAIL = 3.4          # na de laatste zin: CTA laten staan


def ensure_models():
    for rel, url in DOWNLOADS.items():
        p = os.path.join(CACHE, rel)
        if os.path.exists(p): continue
        os.makedirs(os.path.dirname(p), exist_ok=True)
        print('downloaden:', rel)
        urllib.request.urlretrieve('https://huggingface.co/' + url, p + '.part')
        os.replace(p + '.part', p)


def norm(w):
    w = w.lower().replace('14', 'veertien').replace('daunlood', 'download')
    return re.sub(r"[^a-z0-9éëèïöü']", '', w)


def main():
    ensure_models()
    voice = PiperVoice.load(os.path.join(CACHE, f'{VOICE}.onnx'))
    cfg = SynthesisConfig(length_scale=0.95, noise_scale=0.5, noise_w_scale=0.333)
    asr = WhisperModel(os.path.join(CACHE, 'whisper-small'), device='cpu', compute_type='int8')
    out_dir = vdir(V)
    os.makedirs(out_dir, exist_ok=True)

    clips, lines = [], []
    for spoken, shown, rule in LINES:
        shown = shown or spoken
        best = None
        for take in range(TAKES):
            tmp = os.path.join(out_dir, '_tmp.wav')
            with wave.open(tmp, 'wb') as wf:
                voice.synthesize_wav(spoken, wf, syn_config=cfg)
            with wave.open(tmp) as wf:
                sr = wf.getframerate()
                xt = np.frombuffer(wf.readframes(wf.getnframes()), np.int16) / 32768.0
            os.remove(tmp)
            env = np.convolve(np.abs(xt), np.ones(220) / 220, 'same')
            idx = np.where(env > 0.01)[0]
            xt = xt[max(0, idx[0] - int(0.02 * sr)):min(len(xt), idx[-1] + int(0.08 * sr))]
            ref = ''.join(norm(w) for w in shown.split())
            x16 = resample_poly(xt, 320, 441).astype(np.float32)
            score = 0.0
            for snr in (None, 9.0):          # schoon en met muziekachtige ruis (9 dB onder de stem)
                xin = x16
                if snr is not None:
                    nz = np.random.default_rng(take).standard_normal(len(x16))
                    nz = np.convolve(nz, np.ones(6) / 6, 'same')            # wat donkerder, als muziek
                    nz *= np.sqrt(np.mean(x16 ** 2)) / np.sqrt(np.mean(nz ** 2)) * 10 ** (-snr / 20)
                    xin = (x16 + nz).astype(np.float32)
                segs, _ = asr.transcribe(xin, language='nl', beam_size=5)
                hyp = ''.join(norm(w) for sg in segs for w in sg.text.split())
                score += difflib.SequenceMatcher(None, ref, hyp).ratio() / 2
            if best is None or score > best[0]:
                best = (score, xt)
        score, x = best
        print(f'  beste take {score:.3f}: {shown}')
        # woordtijden
        segs, _ = asr.transcribe(resample_poly(x, 320, 441).astype(np.float32), language='nl', beam_size=5, word_timestamps=True)
        heard = [(w.word.strip(), w.start, w.end) for s in segs for w in s.words]
        words = shown.split()
        times = [None] * len(words)
        sm = difflib.SequenceMatcher(a=[norm(w) for w in words], b=[norm(h[0]) for h in heard], autojunk=False)
        for blk in sm.get_matching_blocks():
            for k in range(blk.size):
                times[blk.a + k] = (heard[blk.b + k][1], heard[blk.b + k][2])
        # ontbrekende woorden: verdelen naar lengte tussen de buren
        dur = len(x) / sr
        i = 0
        while i < len(words):
            if times[i] is not None: i += 1; continue
            j = i
            while j < len(words) and times[j] is None: j += 1
            t0 = times[i - 1][1] if i > 0 else 0.0
            t1 = times[j][0] if j < len(words) else dur
            tot = sum(len(w) for w in words[i:j]) or 1
            acc = t0
            for k in range(i, j):
                d = (t1 - t0) * len(words[k]) / tot
                times[k] = (acc, acc + d); acc += d
            i = j
        # 44,1 kHz, gelijk niveau per zin
        y = resample_poly(x, 2, 1)
        y *= 10 ** (-19 / 20) / (np.sqrt(np.mean(y ** 2)) + 1e-9)
        clips.append(y)
        lines.append(dict(text=shown, spoken=spoken, rule=rule, dur=len(y) / SR,
                          words=[dict(w=w, s=round(t[0], 3), e=round(t[1], 3)) for w, t in zip(words, times)],
                          heard=' '.join(h[0] for h in heard)))
    # op het ritme leggen: zoek de verschuiving van het maatraster met de kortste wachttijden
    def layout(o):
        starts, t = [], 0.25
        for i, ln in enumerate(lines):
            if i:
                earliest = starts[-1] + lines[i - 1]['dur'] + GAP[ln['rule']]
                step = {'bar': 4 * SPB, 'beat': SPB}[ln['rule']]
                t = o + np.ceil((earliest - o) / step - 1e-6) * step
            starts.append(float(t))
        return starts
    beat0 = min(np.arange(0, 4 * SPB, 0.05), key=lambda o: layout(o)[-1] + 0.01 * o)
    for ln, st in zip(lines, layout(beat0)):
        ln['start'] = round(st, 4)
        for w in ln['words']:
            w['s'] = round(ln['start'] + w['s'], 3); w['e'] = round(ln['start'] + w['e'], 3)
    end = lines[-1]['start'] + lines[-1]['dur'] + TAIL
    dur = float(beat0 + np.ceil((end - beat0) / (4 * SPB)) * 4 * SPB + 1.2)
    vo = np.zeros(int(dur * SR))
    for ln, y in zip(lines, clips):
        i = int(ln['start'] * SR); vo[i:i + len(y)] += y
    write_wav(os.path.join(out_dir, 'vo.wav'), np.stack([vo, vo], 1))
    tl = dict(bpm=BPM, beat0=round(float(beat0), 3), dur=round(dur, 3), voice=VOICE, lines=lines)
    json.dump(tl, open(os.path.join(out_dir, 'timeline.json'), 'w'), ensure_ascii=False, indent=1)
    open(os.path.join(out_dir, 'timeline.js'), 'w').write('window.TL = ' + json.dumps(tl, ensure_ascii=False) + ';\n')
    for ln in lines:
        print(f"{ln['start']:6.2f}s +{ln['dur']:4.1f}s  {ln['text']}\n         gehoord: {ln['heard']}")
    print(f'maatraster begint op {beat0:.2f}s, totaal {dur:.1f}s')


if __name__ == '__main__':
    main()

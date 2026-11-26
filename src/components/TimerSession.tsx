// Workout op tijd (HIIT, tabata, cardio, stretchen): de timer loopt vanzelf door werk, rust en rondes.
import { useEffect, useRef, useState } from 'react';
import { dateKey, fmt } from '../lib/date';
import { useBack } from '../lib/back';
import { beep } from '../lib/sound';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import type { WorkoutLog } from '../lib/training';
import type { WorkoutDay } from '../lib/workout';
import { TimelineBar } from '../screens/Workouts';
import { Figure } from './Figure';
import { I, Ring, toast } from './ui';

const READY = 10;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const KIND = { work: 'Werk', easy: 'Rustig', rest: 'Rust' } as const;

export function TimerSession({ wd }: { wd: WorkoutDay }) {
  const segs = wd.timer!;
  const kg = useStore((s) => s.profile?.weightKg ?? 70);
  const { startSession, open } = useUI();
  // idx -1 = klaarmaken
  const [idx, setIdx] = useState(-1);
  const [left, setLeft] = useState(READY * 1000);
  const [running, setRunning] = useState(true);
  const [phase, setPhase] = useState<'run' | 'summary'>('run');
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [doneSec, setDoneSec] = useState<number[]>(() => segs.map(() => 0));
  const last = useRef(performance.now());
  const beeped = useRef(-1);
  const started = useRef(Date.now());

  const seg = idx >= 0 ? segs[idx] : null;
  const segLen = idx >= 0 ? segs[idx].sec * 1000 : READY * 1000;

  const go = (to: number) => {
    if (to >= segs.length) {
      setPhase('summary');
      beep(3, 990);
      navigator.vibrate?.([200, 100, 200, 100, 300]);
      return;
    }
    const target = Math.max(-1, to);
    setIdx(target);
    setLeft(target < 0 ? READY * 1000 : segs[target].sec * 1000);
    beeped.current = -1;
  };

  useBack(() => {
    if (phase === 'summary') setPhase('run');
    else if (confirmQuit) setConfirmQuit(false);
    else if (idx > 0) {
      setRunning(false);
      setConfirmQuit(true);
    } else startSession(null);
    return true;
  });

  // scherm aan, achtergrond stil
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    (navigator as Navigator & { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {});
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      void lock?.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!running || phase !== 'run') return;
    last.current = performance.now();
    const t = setInterval(() => {
      const now = performance.now();
      const dt = now - last.current;
      last.current = now;
      setLeft((l) => l - dt);
      if (idx >= 0) setDoneSec((d) => d.map((v, i) => (i === idx ? Math.min(segs[i].sec, v + dt / 1000) : v)));
    }, 100);
    return () => clearInterval(t);
  }, [running, phase, idx, segs]);

  // aftellen met piepjes en door naar het volgende stuk
  useEffect(() => {
    if (phase !== 'run') return;
    const s = Math.ceil(left / 1000);
    if (left <= 0) {
      const next = segs[idx + 1];
      beep(1, next?.kind === 'rest' ? 520 : 990);
      navigator.vibrate?.(next?.kind === 'rest' ? 120 : [80, 60, 80]);
      go(idx + 1);
    } else if (s <= 3 && s !== beeped.current && segLen >= 8000) {
      beeped.current = s;
      beep(1, 660);
    }
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = segs.reduce((t, s) => t + s.sec, 0);
  const done = doneSec.reduce((t, s) => t + s, 0);
  const workSec = doneSec.reduce((t, s, i) => t + (segs[i].kind === 'rest' ? 0 : s), 0);
  const restSec = done - workSec;
  const minutes = Math.max(1, Math.round(done / 60));
  const kcal = Math.round(((wd.met ?? 7) * workSec / 3600 + 2.5 * restSec / 3600) * kg);

  const save = () => {
    const per = new Map<string, number[]>();
    doneSec.forEach((s, i) => {
      if (segs[i].kind === 'rest' || s < 5) return;
      const id = segs[i].exercise.id;
      per.set(id, [...(per.get(id) ?? []), Math.round(s)]);
    });
    const ex = [...per.entries()].map(([id, secs]) => ({ id, sets: secs.map((reps) => ({ kg: 0, reps })) }));
    const entry: WorkoutLog = { date: dateKey(), id: wd.id, name: wd.name, emoji: wd.emoji, minutes, kcal, volume: 0, sets: ex.reduce((t, e) => t + e.sets.length, 0), ex };
    useStore.getState().completeWorkout(dateKey(), wd.id, { name: wd.name, emoji: wd.emoji, minutes, kcal }, {}, entry);
    startSession(null);
    toast(`${wd.name} opgeslagen: ${minutes} min, ${fmt(kcal)} kcal`);
  };

  if (phase === 'summary') {
    const finished = done >= total - 2;
    return (
      <div className="session" role="dialog" aria-label="Workout afgerond">
        <div className="session-inner tr-sum">
          <div className="tr-sum-check" aria-hidden><I.check /></div>
          <div className="cheer-eyebrow" style={{ textAlign: 'center' }}>{finished ? 'Helemaal afgemaakt!' : 'Workout gestopt'}</div>
          <h2 style={{ textAlign: 'center', fontSize: 30 }}>{wd.name}</h2>
          <div className="tr-sum-grid num" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div><b>{mmss(done)}</b><span>actief</span></div>
            <div><b>{Math.round((done / total) * 100)}%</b><span>gedaan</span></div>
            <div><b>{fmt(kcal)}</b><span>kcal</span></div>
          </div>
          <TimelineBar day={wd} at={segs.length} />
          <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>Totale tijd {mmss((Date.now() - started.current) / 1000)} inclusief pauzes.</p>
        </div>
        <div className="session-foot">
          <div className="row" style={{ gap: 8 }}>
            <button className="btn ghost" onClick={() => { setPhase('run'); setRunning(false); }}>Terug</button>
            <button className="btn grow" onClick={save} disabled={done < 30}>Opslaan</button>
          </div>
        </div>
      </div>
    );
  }

  const kind = seg?.kind ?? 'rest';
  const nextWork = segs.slice(idx + 1).find((s) => s.kind !== 'rest');
  const shown = seg ? seg.exercise : segs[0].exercise;
  const remaining = Math.max(0, left / 1000);

  return (
    <div className={'session tm tm-' + (seg ? kind : 'ready')} role="dialog" aria-label={`Workout ${wd.name}`}>
      <div className="session-inner">
        <div className="row between">
          <button className="iconbtn" onClick={() => (idx > 0 ? (setRunning(false), setConfirmQuit(true)) : startSession(null))} aria-label="Workout sluiten"><I.close /></button>
          <div style={{ textAlign: 'center' }}>
            <div className="tiny" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{wd.name}</div>
            <div className="kpi num">{mmss(done)} <span className="muted" style={{ fontSize: 14 }}>/ {mmss(total)}</span></div>
          </div>
          <button className="tag brand num" onClick={() => setPhase('summary')} aria-label="Afronden">Klaar</button>
        </div>
        <TimelineBar day={wd} at={Math.max(0, idx)} />

        {confirmQuit && (
          <div className="card stack">
            <b>Stoppen?</b>
            <div className="small muted">Je kunt opslaan wat je tot nu toe hebt gedaan, of stoppen zonder op te slaan.</div>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn ghost sm grow" onClick={() => { setConfirmQuit(false); setRunning(true); }}>Doorgaan</button>
              <button className="btn sm grow" onClick={() => setPhase('summary')}>Opslaan</button>
              <button className="btn danger sm grow" onClick={() => startSession(null)}>Stoppen</button>
            </div>
          </div>
        )}

        <section className="tm-main" aria-live="polite">
          <div className="tm-kind">{seg ? KIND[kind] : 'Maak je klaar'}{seg?.round && seg.rounds && seg.rounds > 1 ? <span className="num"> · ronde {seg.round}/{seg.rounds}</span> : null}</div>
          <Ring size={232} stroke={14} value={segLen ? remaining / (segLen / 1000) : 0} color="var(--tm-accent)" track="color-mix(in srgb, var(--ink) 10%, transparent)">
            <span className="tm-sec num">{remaining >= 60 ? mmss(Math.ceil(remaining)) : Math.ceil(remaining)}</span>
          </Ring>
          <div className="tm-fig"><Figure anim={shown.anim} still={!running} /></div>
          <h2 className="tm-name">{kind === 'rest' || !seg ? <><span className="muted" style={{ fontWeight: 600 }}>{seg ? 'Hierna: ' : 'Eerst: '}</span>{shown.name}</> : shown.name}</h2>
          {seg?.note && seg.note !== 'Rust' && <div className="tm-note">{seg.note}</div>}
          <button className="link small" style={{ color: 'var(--brand)', fontWeight: 700 }} onClick={() => { setRunning(false); open({ type: 'exercise', id: shown.id }); }}>Hoe doe je deze?</button>
        </section>

        {nextWork && seg?.kind !== 'rest' && (
          <div className="card row tm-next">
            <span className="fig-thumb" style={{ width: 44, height: 42 }}><Figure anim={nextWork.exercise.anim} still /></span>
            <div className="grow"><div className="tiny">Daarna</div><b>{nextWork.exercise.name}</b></div>
            <span className="small muted num">{nextWork.sec >= 60 ? mmss(nextWork.sec) : `${nextWork.sec} sec`}</span>
          </div>
        )}
      </div>

      <div className="session-foot">
        <div className="tm-ctrl">
          <button onClick={() => go(idx - 1)} aria-label="Vorige"><span style={{ transform: 'scaleX(-1)', display: 'grid' }}><I.right /></span></button>
          <button className="tm-play" onClick={() => setRunning(!running)} aria-label={running ? 'Pauze' : 'Verder'}>{running ? <I.pause /> : <I.play />}</button>
          <button onClick={() => go(idx + 1)} aria-label="Volgende"><I.right /></button>
        </div>
      </div>
    </div>
  );
}

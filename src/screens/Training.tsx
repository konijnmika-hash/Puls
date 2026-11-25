import { useEffect, useMemo, useRef, useState } from 'react';
import { addDays, dateKey, DAY_LONG, DAY_SHORT, dayTitle, fmt, parseKey, weekday } from '../lib/date';
import { usePlan } from '../lib/hooks';
import { FOCUS_OPTIONS, PLACE_OPTIONS } from '../lib/options';
import { useStore } from '../lib/store';
import { useBack } from '../lib/back';
import { useUI } from '../lib/ui';
import { EXPERIENCE, SPLIT_NAME, workoutKcal, type WorkoutDay } from '../lib/workout';
import { dayMuscles, records, repRange, setVolume, suggestWeight, weekStreak, weightStep, type SetLog, type Suggestion, type WorkoutLog } from '../lib/training';
import { beep } from '../lib/sound';
import { EXERCISES } from '../data/exercises';
import { Figure } from '../components/Figure';
import { I, Ring, toast, AvatarButton } from '../components/ui';

const NO_LOG: WorkoutLog[] = [];
const restLabel = (s: number) => (s >= 120 ? `${fmt(s / 60, 1)} min` : `${s} sec`);
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const kgText = (kg: number) => `${fmt(kg, 1)} kg`;

export function Training() {
  const profile = useStore((s) => s.profile)!;
  const days = useStore((s) => s.days);
  const log = useStore((s) => s.workoutLog) ?? NO_LOG;
  const plan = usePlan();
  const { open, startSession } = useUI();
  const today = dateKey();
  const todayWd = weekday(today);
  const monday = addDays(today, -todayWd);
  const [sel, setSel] = useState(todayWd);

  const wd = plan.find((p) => p.weekday === sel);
  const selDate = addDays(monday, sel);
  const isDone = (p: WorkoutDay) => !!days[addDays(monday, p.weekday)]?.workoutsDone.includes(p.id);
  const done = wd ? isDone(wd) : false;
  const doneThisWeek = plan.filter(isDone).length;
  const streak = weekStreak(days, plan, monday);
  const focus = FOCUS_OPTIONS.find((f) => f.v === profile.focus)!;
  const place = PLACE_OPTIONS.find((f) => f.v === profile.place)!;
  const doneEntry = wd && done ? [...log].reverse().find((l) => l.date === selDate && l.id === wd.id) : undefined;
  const doneActivity = wd && done ? days[selDate]?.activities.find((a) => a.workout === wd.id) : undefined;
  const nextUp = plan.find((p) => p.weekday > todayWd && !isDone(p)) ?? plan.find((p) => !isDone(p));

  return (
    <div className="page">
      <header className="topbar">
        <h1 className="page-title">Training</h1>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn sm ghost" onClick={() => open({ type: 'planEdit' })}>Schema</button>
          <AvatarButton />
        </div>
      </header>

      {/* Week */}
      <section className="card tr-week" aria-label="Deze week">
        <div className="tr-week-head">
          <Ring size={64} stroke={7} value={plan.length ? doneThisWeek / plan.length : 0} color="var(--brand)">
            <span className="tr-week-num num">{doneThisWeek}<small>/{plan.length}</small></span>
          </Ring>
          <div className="grow">
            <b className="tr-week-title">{plan.length === 0 ? 'Nog geen schema' : doneThisWeek >= plan.length ? 'Week voltooid' : `Nog ${plan.length - doneThisWeek} ${plan.length - doneThisWeek === 1 ? 'training' : 'trainingen'} deze week`}</b>
            <div className="small muted">
              {streak >= 2 ? `${streak} weken op rij je schema gehaald` : streak === 1 ? 'Deze week helemaal gedaan' : log.length ? `${log.length} ${log.length === 1 ? 'training' : 'trainingen'} gelogd in totaal` : 'Je eerste training staat klaar.'}
            </div>
          </div>
        </div>
        <div className="tr-days">
          {DAY_SHORT.map((d, i) => {
            const date = addDays(monday, i);
            const p = plan.find((x) => x.weekday === i);
            const did = p ? isDone(p) : false;
            const past = date < today;
            const state = did ? 'done' : p ? (past ? 'missed' : 'plan') : 'rest';
            return (
              <button key={d} className={`tr-day ${state}${sel === i ? ' sel' : ''}${i === todayWd ? ' today' : ''}`} onClick={() => setSel(i)} aria-pressed={sel === i} aria-label={`${DAY_LONG[i]}: ${p ? p.name : 'rustdag'}${did ? ', gedaan' : ''}`}>
                <span className="d">{d}</span>
                <span className="n num">{parseKey(date).getDate()}</span>
                <span className="st" aria-hidden>{did ? <I.check /> : p ? <I.dumbbell /> : null}</span>
              </button>
            );
          })}
        </div>
      </section>

      {plan.length === 0 ? (
        <div className="card empty">
          <p>Kies op welke dagen je wilt trainen. Je krijgt dan een schema dat past bij je apparatuur en ervaring.</p>
          <button className="btn" onClick={() => open({ type: 'planEdit' })}>Maak mijn schema</button>
        </div>
      ) : wd ? (
        <>
          <section className={'tr-hero' + (done ? ' done' : '')} aria-label={wd.name}>
            <div className="tr-hero-text">
              <div className="tr-eyebrow">{sel === todayWd ? 'Vandaag' : dayTitle(selDate, today).split(',')[0]} · {wd.subtitle}</div>
              <h2>{wd.name}</h2>
              <div className="tr-muscles">{dayMuscles(wd).slice(0, 4).join(' · ')}</div>
              <div className="tr-stats num">
                {done && doneActivity ? (
                  <>
                    <span><I.timer /> {doneActivity.minutes} min</span>
                    <span><I.flame /> {fmt(doneActivity.kcal)} kcal</span>
                    {doneEntry && doneEntry.volume > 0 && <span><I.dumbbell /> {fmt(doneEntry.volume)} kg</span>}
                  </>
                ) : (
                  <>
                    <span><I.timer /> ± {wd.estMinutes} min</span>
                    <span><I.dumbbell /> {wd.exercises.length} oefeningen</span>
                    <span><I.flame /> ± {fmt(workoutKcal(wd, profile.weightKg))} kcal</span>
                  </>
                )}
              </div>
            </div>
            <div className="tr-hero-fig" aria-hidden><Figure anim={wd.exercises[0]?.exercise.anim ?? EXERCISES.squat.anim} /></div>
            {done ? (
              <div className="tr-hero-done"><span className="i18"><I.check /></span> Afgerond</div>
            ) : (
              <button className="btn block tr-start" onClick={() => startSession(wd.id)}>
                <span className="i20"><I.play /></span> {sel === todayWd ? 'Start training' : selDate < today ? 'Nu alsnog doen' : 'Nu al starten'}
              </button>
            )}
          </section>
          <WorkoutList wd={wd} />
        </>
      ) : (
        <section className="card tr-rest">
          <div className="tr-rest-ico"><span className="i20"><I.moon /></span></div>
          <div className="grow">
            <b>Rustdag op {DAY_LONG[sel]}</b>
            <div className="small muted">Herstel hoort bij het schema. Wandelen of rustig stretchen kan altijd.</div>
            {nextUp && <button className="link small" style={{ marginTop: 6 }} onClick={() => setSel(nextUp.weekday)}>Volgende training: {nextUp.name} op {DAY_LONG[nextUp.weekday]} →</button>}
          </div>
        </section>
      )}

      {plan.length > 0 && (
        <>
          <div className="section-title">
            <h2>Jouw schema</h2>
            <button className="link" onClick={() => open({ type: 'planEdit' })}>Aanpassen</button>
          </div>
          <p className="small muted" style={{ margin: '-8px 0 0' }}>{SPLIT_NAME(plan.length)} · {focus.em} {focus.t} · {place.em} {place.t} · {EXPERIENCE[profile.experience].t.toLowerCase()}</p>
          <div className="card" style={{ padding: '2px 14px' }}>
            <div className="list">
              {plan.map((p) => {
                const did = isDone(p);
                return (
                  <button key={p.id} className={'item' + (p.weekday === sel ? ' tr-sel' : '')} onClick={() => setSel(p.weekday)}>
                    <div className="ico" style={did ? { background: 'color-mix(in srgb, var(--ok) 16%, transparent)', color: 'var(--ok)' } : undefined}>{did ? <span className="i20"><I.check /></span> : <span className="i20"><I.dumbbell /></span>}</div>
                    <div className="grow">
                      <div className="t">{p.name}</div>
                      <div className="s">{DAY_LONG[p.weekday]} · {dayMuscles(p).slice(0, 3).join(', ')}</div>
                    </div>
                    {p.weekday === todayWd && !did ? <span className="tag brand">Vandaag</span> : <span className="small muted num">{p.estMinutes} min</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      <History log={log} />
    </div>
  );
}

function WorkoutList({ wd }: { wd: WorkoutDay }) {
  const open = useUI((s) => s.open);
  const lifts = useStore((s) => s.lifts);
  const log = useStore((s) => s.workoutLog) ?? NO_LOG;
  return (
    <div className="card tr-list">
      {wd.exercises.map((e, i) => {
        const sug = suggestWeight(e, log, lifts);
        return (
          <button key={e.exercise.id} className="exrow" onClick={() => open({ type: 'exercise', id: e.exercise.id, slotKey: e.slotKey })}>
            <span className="tr-idx num">{i + 1}</span>
            <span className="fig-thumb"><Figure anim={e.exercise.anim} still /></span>
            <div className="grow">
              <div className="tr-exname">{e.exercise.name}</div>
              <div className="small muted num">{e.sets}×{e.reps} · {restLabel(e.restSec)} rust</div>
              {e.exercise.weighted && sug.kg > 0 && (
                <div className={'tr-sug num' + (sug.why === 'zwaarder' ? ' up' : '')}>
                  {sug.why === 'zwaarder' ? <>↑ Probeer {kgText(sug.kg)} <span>(vorige keer {kgText(sug.last!)})</span></> : <>Vorige keer {kgText(sug.kg)}</>}
                </div>
              )}
            </div>
            <span className="exrow-go" aria-hidden><I.right /></span>
          </button>
        );
      })}
      {wd.cardio && (
        <div className="exrow">
          <span className="tr-idx"><span className="i18"><I.shoe /></span></span>
          <div className="grow">
            <div className="tr-exname">{wd.cardio.label}</div>
            <div className="small muted">{wd.cardio.minutes} minuten</div>
          </div>
        </div>
      )}
    </div>
  );
}

function History({ log }: { log: WorkoutLog[] }) {
  const recent = [...log].reverse().slice(0, 5);
  const today = dateKey();
  if (!recent.length) return null;
  const month = log.filter((l) => l.date >= addDays(today, -30));
  return (
    <>
      <div className="section-title">
        <h2>Recente trainingen</h2>
        <span className="small muted num">{month.length} in 30 dagen</span>
      </div>
      <div className="card" style={{ padding: '2px 14px' }}>
        <div className="list">
          {recent.map((l, i) => (
            <div key={l.date + l.id + i} className="item">
              <div className="ico"><span className="i20"><I.dumbbell /></span></div>
              <div className="grow">
                <div className="t">{l.name}</div>
                <div className="s num">{dayTitle(l.date, today)} · {l.sets} sets{l.volume ? ` · ${fmt(l.volume)} kg volume` : ''}</div>
              </div>
              <span className="small muted num">{l.minutes} min</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------- Trainingssessie ---------- */

interface ExState {
  sets: (SetLog & { done: boolean })[];
}

export function WorkoutSession({ id }: { id: string }) {
  const plan = usePlan();
  const wd = plan.find((p) => p.id === id);
  const kg = useStore((s) => s.profile?.weightKg ?? 70);
  const lifts = useStore((s) => s.lifts);
  const log = useStore((s) => s.workoutLog) ?? NO_LOG;
  const { startSession, open } = useUI();
  const [started] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  const [idx, setIdx] = useState(0);
  const [cardioDone, setCardioDone] = useState(false);
  const [rest, setRest] = useState<{ until: number; total: number; next: string } | null>(null);
  const [phase, setPhase] = useState<'work' | 'summary'>('work');
  const [confirmQuit, setConfirmQuit] = useState(false);
  const sugs = useMemo(() => Object.fromEntries((wd?.exercises ?? []).map((e) => [e.exercise.id, suggestWeight(e, log, lifts)])) as Record<string, Suggestion>, [wd, log, lifts]);
  const [state, setState] = useState<Record<string, ExState>>(() =>
    Object.fromEntries(
      (wd?.exercises ?? []).map((e) => {
        const { lo } = repRange(e.reps);
        return [e.exercise.id, { sets: Array.from({ length: e.sets }, () => ({ kg: sugs[e.exercise.id]?.kg ?? 0, reps: lo, done: false })) }];
      }),
    ),
  );
  const endedRef = useRef(0);

  // terugknop: eerst vragen als er al sets zijn afgevinkt
  useBack(() => {
    if (phase === 'summary') setPhase('work');
    else if (confirmQuit) setConfirmQuit(false);
    else if (state && Object.values(state).some((e) => e.sets.some((x) => x.done))) setConfirmQuit(true);
    else startSession(null);
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
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (rest && now >= rest.until && endedRef.current !== rest.until) {
      endedRef.current = rest.until;
      setRest(null);
      beep(2, 990);
      navigator.vibrate?.([200, 100, 200]);
    }
  }, [now, rest]);

  if (!wd) return null;
  const exs = wd.exercises;
  const elapsed = (now - started) / 1000;
  const totalSets = exs.reduce((s, e) => s + e.sets, 0);
  const doneSets = exs.reduce((s, e) => s + (state[e.exercise.id]?.sets.filter((x) => x.done).length ?? 0), 0);
  const cur = exs[Math.min(idx, exs.length - 1)];
  const curState = state[cur.exercise.id];
  const nextSetIdx = curState.sets.findIndex((s) => !s.done);
  const exDone = nextSetIdx === -1;

  const update = (exId: string, i: number, patch: Partial<SetLog & { done: boolean }>) =>
    setState((s) => {
      const sets = s[exId].sets.map((x, j) => (j === i ? { ...x, ...patch } : x));
      // een nieuw gewicht geldt ook voor de sets die nog komen
      if (patch.kg !== undefined) for (let j = i + 1; j < sets.length; j++) if (!sets[j].done) sets[j] = { ...sets[j], kg: patch.kg };
      return { ...s, [exId]: { sets } };
    });

  const completeSet = () => {
    if (exDone) {
      if (idx < exs.length - 1) setIdx(idx + 1);
      else setPhase('summary');
      return;
    }
    update(cur.exercise.id, nextSetIdx, { done: true });
    navigator.vibrate?.(30);
    const lastOfEx = nextSetIdx === curState.sets.length - 1;
    const lastOfAll = lastOfEx && idx === exs.length - 1;
    if (lastOfAll) {
      if (!wd.cardio) setPhase('summary');
      return;
    }
    const nextName = lastOfEx ? exs[idx + 1].exercise.name : `${cur.exercise.name}, set ${nextSetIdx + 2}`;
    setRest({ until: Date.now() + cur.restSec * 1000, total: cur.restSec, next: nextName });
    if (lastOfEx) setIdx(idx + 1);
  };

  const doneList = exs.map((e) => ({ id: e.exercise.id, sets: state[e.exercise.id].sets.filter((s) => s.done).map(({ kg, reps }) => ({ kg, reps })) })).filter((x) => x.sets.length);
  const volume = doneList.reduce((s, x) => s + setVolume(x.sets), 0);
  const prs = records(log, doneList, lifts);
  const cardioMin = wd.cardio && cardioDone ? wd.cardio.minutes : 0;
  const strengthMin = Math.max(0, wd.estMinutes - (wd.cardio?.minutes ?? 0));
  const minutes = Math.max(1, Math.round(elapsed / 60), Math.round(strengthMin * (totalSets ? doneSets / totalSets : 0) + cardioMin));
  const kcal = Math.round(5 * kg * ((minutes - cardioMin) / 60) + 8 * kg * (cardioMin / 60));

  const save = () => {
    const newLifts: Record<string, number> = {};
    for (const x of doneList) {
      const top = Math.max(...x.sets.map((s) => s.kg));
      if (top > 0) newLifts[x.id] = top;
    }
    const entry: WorkoutLog = { date: dateKey(), id: wd.id, name: wd.name, emoji: wd.emoji, minutes, kcal, volume: Math.round(volume), sets: doneSets, ex: doneList };
    useStore.getState().completeWorkout(dateKey(), wd.id, { name: wd.name, emoji: wd.emoji, minutes, kcal }, newLifts, entry);
    startSession(null);
    toast(prs.length ? `Training opgeslagen, ${prs.length} ${prs.length === 1 ? 'nieuw record' : 'nieuwe records'}` : 'Training opgeslagen');
  };

  if (phase === 'summary') {
    return (
      <div className="session" role="dialog" aria-label="Training afgerond">
        <div className="session-inner tr-sum">
          <div className="tr-sum-check" aria-hidden><I.check /></div>
          <div className="cheer-eyebrow" style={{ textAlign: 'center' }}>Training afgerond</div>
          <h2 style={{ textAlign: 'center', fontSize: 30 }}>{wd.name}</h2>
          <div className="tr-sum-grid num">
            <div><b>{mmss(elapsed)}</b><span>tijd</span></div>
            <div><b>{doneSets}/{totalSets}</b><span>sets</span></div>
            <div><b>{fmt(volume)}</b><span>kg volume</span></div>
            <div><b>{fmt(kcal)}</b><span>kcal</span></div>
          </div>
          {prs.length > 0 && (
            <div className="card tr-prs">
              <b>Nieuwe records</b>
              {prs.map((r) => <div key={r.id} className="row between small"><span>{EXERCISES[r.id]?.name}</span><b className="num">{kgText(r.kg)} <span className="muted" style={{ fontWeight: 500 }}>(was {kgText(r.prev)})</span></b></div>)}
            </div>
          )}
          <div className="card" style={{ padding: '2px 14px' }}>
            <div className="list">
              {doneList.map((x) => (
                <div key={x.id} className="item">
                  <div className="grow">
                    <div className="t">{EXERCISES[x.id]?.name}</div>
                    <div className="s num">{x.sets.map((s) => (s.kg ? `${fmt(s.kg, 1)}×${s.reps}` : `${s.reps}`)).join('  ·  ')}</div>
                  </div>
                </div>
              ))}
              {!doneList.length && <div className="item"><span className="muted small">Nog geen sets afgevinkt.</span></div>}
            </div>
          </div>
        </div>
        <div className="session-foot">
          <div className="row" style={{ gap: 8 }}>
            <button className="btn ghost" onClick={() => setPhase('work')}>Terug</button>
            <button className="btn grow" onClick={save} disabled={!doneSets && !cardioDone}>Opslaan</button>
          </div>
        </div>
      </div>
    );
  }

  const { timed } = repRange(cur.reps);
  const step = weightStep(cur.exercise);
  const sug = sugs[cur.exercise.id];

  return (
    <div className="session" role="dialog" aria-label={`Training ${wd.name}`}>
      <div className="session-inner">
        <div className="row between">
          <button className="iconbtn" onClick={() => (doneSets ? setConfirmQuit(true) : startSession(null))} aria-label="Training sluiten"><I.close /></button>
          <div style={{ textAlign: 'center' }}>
            <div className="tiny" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{wd.name}</div>
            <div className="kpi num">{mmss(elapsed)}</div>
          </div>
          <button className="tag brand num" onClick={() => setPhase('summary')} aria-label="Naar het overzicht">{doneSets}/{totalSets}</button>
        </div>
        <div className="tr-segs" aria-hidden>
          {exs.map((e, i) => {
            const st = state[e.exercise.id].sets;
            const frac = st.filter((s) => s.done).length / st.length;
            return <i key={e.exercise.id} className={i === idx ? 'cur' : ''}><b style={{ width: `${frac * 100}%` }} /></i>;
          })}
        </div>

        {confirmQuit && (
          <div className="card stack">
            <b>Stoppen zonder op te slaan?</b>
            <div className="small muted">Je afgevinkte sets gaan dan verloren. Via het overzicht kun je ook halverwege opslaan.</div>
            <div className="row">
              <button className="btn ghost sm grow" onClick={() => setConfirmQuit(false)}>Doorgaan</button>
              <button className="btn danger sm grow" onClick={() => startSession(null)}>Stoppen</button>
            </div>
          </div>
        )}

        <section className="card tr-cur" key={cur.exercise.id}>
          <div className="tr-cur-top">
            <div className="tr-cur-fig"><Figure anim={cur.exercise.anim} /></div>
            <div className="grow">
              <div className="tr-eyebrow" style={{ color: 'var(--brand)' }}>Oefening {idx + 1} van {exs.length}</div>
              <h2 className="tr-cur-name">{cur.exercise.name}</h2>
              <div className="small muted">{cur.exercise.muscles.join(' · ')}</div>
              <div className="small num" style={{ marginTop: 4 }}><b>{cur.sets}×{cur.reps}</b> · {restLabel(cur.restSec)} rust</div>
              <button className="link small" onClick={() => open({ type: 'exercise', id: cur.exercise.id, slotKey: cur.slotKey })}>Hoe doe je deze?</button>
            </div>
          </div>
          {cur.exercise.weighted && sug.why === 'zwaarder' && <div className="tr-sug up num">↑ Vorige keer haalde je alles met {kgText(sug.last!)}. Probeer nu {kgText(sug.kg)}.</div>}
          {cur.exercise.weighted && sug.why === 'start' && <div className="tr-sug num">Kies een gewicht waarmee de laatste herhalingen zwaar voelen, maar je techniek goed blijft.</div>}

          <div className={'tr-sets' + (cur.exercise.weighted ? '' : ' nokg')}>
            <div className="tr-sets-head"><span>Set</span>{cur.exercise.weighted && <span>Gewicht (kg)</span>}<span>{timed ? 'Seconden' : 'Herhalingen'}</span><span /></div>
            {curState.sets.map((s, i) => (
              <div key={i} className={'tr-set' + (s.done ? ' done' : '') + (i === nextSetIdx ? ' next' : '')}>
                <span className="tr-set-n num">{i + 1}</span>
                {cur.exercise.weighted && (
                  <Adjust value={s.kg} step={step} onChange={(v) => update(cur.exercise.id, i, { kg: v })} label={`Gewicht set ${i + 1}`} />
                )}
                <Adjust value={s.reps} step={timed ? 5 : 1} onChange={(v) => update(cur.exercise.id, i, { reps: v })} label={`${timed ? 'Seconden' : 'Herhalingen'} set ${i + 1}`} />
                <button className={'tr-check' + (s.done ? ' on' : '')} onClick={() => update(cur.exercise.id, i, { done: !s.done })} aria-pressed={s.done} aria-label={`Set ${i + 1} ${s.done ? 'ongedaan maken' : 'afvinken'}`}>
                  <I.check />
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="section-title" style={{ marginTop: 2 }}><h2 style={{ fontSize: 17 }}>Alle oefeningen</h2></div>
        <div className="card" style={{ padding: '2px 12px' }}>
          <div className="list">
            {exs.map((e, i) => {
              const st = state[e.exercise.id].sets;
              const n = st.filter((x) => x.done).length;
              return (
                <button key={e.exercise.id} className={'item tr-upnext' + (i === idx ? ' cur' : '')} onClick={() => setIdx(i)}>
                  <span className="fig-thumb" style={{ width: 44, height: 42 }}><Figure anim={e.exercise.anim} still /></span>
                  <div className="grow">
                    <div className="t">{e.exercise.name}</div>
                    <div className="s num">{n}/{e.sets} sets{sugs[e.exercise.id]?.kg ? ` · ${kgText(st[0].kg)}` : ''}</div>
                  </div>
                  {n >= e.sets ? <span className="tr-mini-done"><I.check /></span> : i === idx ? <span className="tag brand">Nu</span> : null}
                </button>
              );
            })}
            {wd.cardio && (
              <button className="item tr-upnext" onClick={() => setCardioDone(!cardioDone)} aria-pressed={cardioDone}>
                <span className="tr-idx"><span className="i18"><I.shoe /></span></span>
                <div className="grow"><div className="t">{wd.cardio.label}</div><div className="s">{wd.cardio.minutes} minuten · tik om af te vinken</div></div>
                {cardioDone && <span className="tr-mini-done"><I.check /></span>}
              </button>
            )}
          </div>
        </div>
        <button className="btn ghost block" onClick={() => setPhase('summary')}>Training afronden</button>
      </div>

      {rest ? (
        <div className="tr-rest-bar" role="timer" aria-live="polite">
          <Ring size={58} stroke={6} value={Math.max(0, (rest.until - now) / 1000) / rest.total} color="#c9f27a" track="rgb(255 255 255 / 0.15)">
            <span className="num" style={{ fontWeight: 800, fontSize: 15 }}>{mmss(Math.max(0, (rest.until - now) / 1000))}</span>
          </Ring>
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="tiny" style={{ color: 'inherit', opacity: 0.7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rust</div>
            <div className="ellipsis" style={{ fontWeight: 600 }}>Hierna: {rest.next}</div>
          </div>
          <button onClick={() => setRest({ ...rest, until: rest.until + 15000, total: rest.total + 15 })}>+15s</button>
          <button onClick={() => setRest(null)}>Verder</button>
        </div>
      ) : (
        <div className="session-foot">
          <div>
            <button className="btn block tr-go" onClick={completeSet}>
              {exDone ? (idx < exs.length - 1 ? <>Volgende oefening <span className="i20"><I.right /></span></> : 'Naar het overzicht') : <>Set {nextSetIdx + 1} klaar <span className="btn-sub num">{cur.exercise.weighted && curState.sets[nextSetIdx].kg ? `${fmt(curState.sets[nextSetIdx].kg, 1)} kg × ${curState.sets[nextSetIdx].reps}` : timed ? `${curState.sets[nextSetIdx].reps} sec` : `${curState.sets[nextSetIdx].reps} herhalingen`}</span></>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Getal met − en + knoppen; tik op het getal om het te typen. */
function Adjust({ value, step, unit, onChange, label }: { value: number; step: number; unit?: string; onChange: (v: number) => void; label: string }) {
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState('');
  const commit = () => {
    const v = parseFloat(text.replace(',', '.'));
    if (Number.isFinite(v) && v >= 0) onChange(Math.round(v * 2) / 2);
    setEdit(false);
  };
  return (
    <div className="tr-adj" role="group" aria-label={label}>
      <button onClick={() => onChange(Math.max(0, Math.round((value - step) * 2) / 2))} aria-label="Minder">−</button>
      {edit ? (
        <input autoFocus inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()} aria-label={label} />
      ) : (
        <button className="tr-adj-v num" onClick={() => { setText(String(value).replace('.', ',')); setEdit(true); }}>
          {fmt(value, 1)}{unit && <small> {unit}</small>}
        </button>
      )}
      <button onClick={() => onChange(Math.round((value + step) * 2) / 2)} aria-label="Meer">+</button>
    </div>
  );
}


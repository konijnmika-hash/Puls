import { useMemo, useState } from 'react';
import { EQUIP_LABEL, ALL_EQUIP, type Equip, type Exercise, type Muscle } from '../data/exercises';
import { dateKey, dayTitle, fmt, parseKey } from '../lib/date';
import { allExercises, defaultItem, exerciseName, getExercise, isCustomExercise, MUSCLES, TEMPLATE_PREFIX, type TemplateItem } from '../lib/exlib';
import { setVolume, type SetLog } from '../lib/training';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { TrendLine } from './charts';
import { Figure } from './Figure';
import { I, Sheet, toast } from './ui';

const REPS = ['5', '6–8', '8–10', '10–12', '12–15', '15–20', '30 sec', '45 sec', '60 sec'];
const RESTS = [45, 60, 90, 120, 180];

/** Formulier voor een eigen oefening. Geeft de nieuwe id terug via onSaved. */
function CustomExerciseForm({ onSaved, onCancel }: { onSaved: (id: string) => void; onCancel?: () => void }) {
  const [name, setName] = useState('');
  const [muscles, setMuscles] = useState<Muscle[]>([]);
  const [equip, setEquip] = useState<Equip[]>([]);
  const [kind, setKind] = useState<'kg' | 'reps' | 'tijd'>('kg');
  const [note, setNote] = useState('');
  const exists = allExercises().some((e) => e.name.toLowerCase() === name.trim().toLowerCase());
  const ok = name.trim().length >= 2 && muscles.length > 0 && !exists;
  const save = () => {
    const id = useStore.getState().addCustomExercise({ name: name.trim(), muscles, equip, weighted: kind === 'kg', timed: kind === 'tijd', note: note.trim() || undefined });
    toast(`${name.trim()} toegevoegd`);
    onSaved(id);
  };
  return (
    <div className="stack">
      <div className="field"><label htmlFor="cx-name">Naam</label><input id="cx-name" className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Bijv. kettlebell swing" autoFocus /></div>
      {exists && <span className="hint warn">Deze oefening bestaat al. Zoek hem op in de lijst.</span>}
      <div className="field"><span className="lbl">Welke spieren? (kies er minstens één)</span>
        <div className="chips">{MUSCLES.map((m) => { const on = muscles.includes(m); return <button key={m} className={'chip sm' + (on ? ' on' : '')} aria-pressed={on} onClick={() => setMuscles(on ? muscles.filter((x) => x !== m) : [...muscles, m])}>{m}</button>; })}</div>
      </div>
      <div className="field"><span className="lbl">Hoe houd je hem bij?</span>
        <div className="seg">
          {([['kg', 'Gewicht + herhalingen'], ['reps', 'Alleen herhalingen'], ['tijd', 'Op tijd']] as const).map(([k, l]) => <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{l}</button>)}
        </div>
      </div>
      <div className="field"><span className="lbl">Apparatuur (optioneel)</span>
        <div className="chips">{ALL_EQUIP.map((q) => { const on = equip.includes(q); return <button key={q} className={'chip sm' + (on ? ' on' : '')} aria-pressed={on} onClick={() => setEquip(on ? equip.filter((x) => x !== q) : [...equip, q])}>{EQUIP_LABEL[q].t}</button>; })}</div>
      </div>
      <div className="field"><label htmlFor="cx-note">Uitvoering of tip (optioneel)</label><input id="cx-note" className="input" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="Bijv. heupen naar achteren, rug recht" /></div>
      <div className="row">
        {onCancel && <button className="btn ghost sm grow" onClick={onCancel}>Annuleren</button>}
        <button className="btn sm grow" disabled={!ok} onClick={save}>Oefening opslaan</button>
      </div>
    </div>
  );
}

export function CustomExerciseSheet() {
  const close = useUI((s) => s.close);
  const list = useStore((s) => s.customExercises);
  const [adding, setAdding] = useState(list.length === 0);
  const [confirm, setConfirm] = useState<string | null>(null);
  return (
    <Sheet onClose={close} title="Eigen oefeningen">
      <div className="stack">
        {adding ? (
          <div className="card"><CustomExerciseForm onSaved={() => setAdding(false)} onCancel={list.length ? () => setAdding(false) : undefined} /></div>
        ) : (
          <button className="btn block outline" onClick={() => setAdding(true)}><span className="i20"><I.plus /></span> Nieuwe oefening</button>
        )}
        {list.length > 0 && (
          <div className="card" style={{ padding: '2px 14px' }}>
            <div className="list">
              {list.map((c) => (
                <div key={c.id} className="item">
                  <div className="ico"><span className="i20"><I.dumbbell /></span></div>
                  <div className="grow"><div className="t">{c.name}</div><div className="s">{c.muscles.join(', ')} · {c.timed ? 'op tijd' : c.weighted ? 'met gewicht' : 'herhalingen'}</div></div>
                  {confirm === c.id ? (
                    <button className="btn sm danger" onClick={() => { useStore.getState().deleteCustomExercise(c.id); setConfirm(null); toast(`${c.name} verwijderd`); }}>Wis</button>
                  ) : (
                    <button className="iconbtn" onClick={() => setConfirm(c.id)} aria-label={`${c.name} verwijderen`}><I.trash /></button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="tiny" style={{ margin: 0 }}>Eigen oefeningen gebruik je in je eigen trainingen. Je eerdere sets blijven bewaard, ook als je een oefening verwijdert.</p>
      </div>
    </Sheet>
  );
}

/** Oefening kiezen uit alles wat Puls kent plus je eigen oefeningen. */
function ExercisePicker({ onPick, exclude }: { onPick: (e: Exercise) => void; exclude: string[] }) {
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [creating, setCreating] = useState(false);
  const custom = useStore((s) => s.customExercises);
  const list = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return allExercises()
      .filter((e) => !exclude.includes(e.id))
      .filter((e) => !muscle || e.muscles.includes(muscle))
      .filter((e) => words.every((w) => `${e.name} ${e.muscles.join(' ')}`.toLowerCase().includes(w)))
      .slice(0, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, muscle, exclude, custom]);
  if (creating) return <div className="card"><CustomExerciseForm onSaved={(id) => { setCreating(false); const e = getExercise(id); if (e) onPick(e); }} onCancel={() => setCreating(false)} /></div>;
  return (
    <div className="stack">
      <div className="search">
        <I.search />
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek een oefening" aria-label="Zoek een oefening" autoFocus />
      </div>
      <div className="chips scroll">
        <button className={'chip sm' + (!muscle ? ' on' : '')} onClick={() => setMuscle(null)}>Alles</button>
        {MUSCLES.map((m) => <button key={m} className={'chip sm' + (muscle === m ? ' on' : '')} onClick={() => setMuscle(muscle === m ? null : m)}>{m}</button>)}
      </div>
      <button className="btn outline sm" onClick={() => setCreating(true)}><span className="i18"><I.plus /></span> Eigen oefening maken</button>
      <div className="card" style={{ padding: '2px 12px' }}>
        <div className="list">
          {list.map((e) => (
            <button key={e.id} className="item" onClick={() => onPick(e)}>
              <span className="fig-thumb"><Figure anim={e.anim} still /></span>
              <div className="grow"><div className="t">{e.name}{isCustomExercise(e.id) && <span className="tag" style={{ marginLeft: 6 }}>eigen</span>}</div><div className="s">{e.muscles.join(', ')} · {e.equip.length ? e.equip.map((x) => EQUIP_LABEL[x].t).join(' + ') : 'geen apparatuur'}</div></div>
              <span className="i20" style={{ color: 'var(--brand)' }}><I.plus /></span>
            </button>
          ))}
          {!list.length && <div className="item"><span className="small muted">Niets gevonden. Maak hem zelf aan met de knop hierboven.</span></div>}
        </div>
      </div>
    </div>
  );
}

/** Eigen training samenstellen of bewerken. */
export function TemplateEditSheet({ id }: { id?: string }) {
  const close = useUI((s) => s.close);
  const startSession = useUI((s) => s.startSession);
  const existing = useStore((s) => (id ? s.templates.find((t) => t.id === id) : undefined));
  const [name, setName] = useState(existing?.name ?? '');
  const [items, setItems] = useState<TemplateItem[]>(existing?.items ?? []);
  const [fav, setFav] = useState(existing?.fav ?? true);
  const [picking, setPicking] = useState(!existing);
  const [confirm, setConfirm] = useState(false);
  const patch = (i: number, p: Partial<TemplateItem>) => setItems(items.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };
  const save = (start = false) => {
    const tid = useStore.getState().saveTemplate({ id, name: name.trim() || 'Mijn training', items, fav });
    toast(existing ? 'Training bijgewerkt' : 'Training opgeslagen');
    if (start) startSession(TEMPLATE_PREFIX + tid);
    else close();
  };
  const minutes = Math.round((5 + items.reduce((s, x) => s + x.sets * (45 + x.restSec), 0) / 60) / 5) * 5;
  return (
    <Sheet onClose={close} full title={existing ? 'Training bewerken' : 'Nieuwe training'} right={<button className={'iconbtn' + (fav ? ' fav-on' : '')} onClick={() => setFav(!fav)} aria-pressed={fav} aria-label={fav ? 'Uit favorieten' : 'Favoriet'}><I.star /></button>}>
      <div className="stack">
        <div className="field"><label htmlFor="tpl-name">Naam</label><input id="tpl-name" className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Bijv. Thuis full body" /></div>
        {items.length > 0 && (
          <div className="stack" style={{ gap: 8 }}>
            {items.map((it, i) => {
              const e = getExercise(it.ex);
              const timed = /sec|min/.test(it.reps);
              return (
                <div key={it.ex + i} className="card tpl-item">
                  <div className="row" style={{ gap: 10 }}>
                    <span className="tr-idx num">{i + 1}</span>
                    <div className="grow"><b className="ellipsis" style={{ display: 'block' }}>{e?.name ?? 'Verwijderde oefening'}</b><span className="tiny">{e?.muscles.join(', ')}</span></div>
                    <button className="iconbtn sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Omhoog"><span className="i18" style={{ transform: 'rotate(90deg)' }}><I.left /></span></button>
                    <button className="iconbtn sm" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Omlaag"><span className="i18" style={{ transform: 'rotate(90deg)' }}><I.right /></span></button>
                    <button className="iconbtn sm" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="Verwijderen"><I.trash /></button>
                  </div>
                  <div className="tpl-opts">
                    <div className="mini-step" role="group" aria-label="Sets">
                      <button onClick={() => patch(i, { sets: Math.max(1, it.sets - 1) })} aria-label="Minder sets">−</button>
                      <b className="num">{it.sets}<small> sets</small></b>
                      <button onClick={() => patch(i, { sets: Math.min(10, it.sets + 1) })} aria-label="Meer sets">+</button>
                    </div>
                    <select className="input sel" value={it.reps} onChange={(ev) => patch(i, { reps: ev.target.value })} aria-label={timed ? 'Duur' : 'Herhalingen'}>
                      {[...new Set([it.reps, ...REPS])].map((r) => <option key={r} value={r}>{/sec/.test(r) ? r.replace(' sec', ' s') : `${r}×`}</option>)}
                    </select>
                    <select className="input sel" value={it.restSec} onChange={(ev) => patch(i, { restSec: Number(ev.target.value) })} aria-label="Rust">
                      {[...new Set([it.restSec, ...RESTS])].sort((a, b) => a - b).map((r) => <option key={r} value={r}>rust {r} s</option>)}
                    </select>
                  </div>
                </div>
              );
            })}
            <div className="tiny num" style={{ textAlign: 'center' }}>{items.length} oefeningen · {items.reduce((s, x) => s + x.sets, 0)} sets · ± {minutes} minuten</div>
          </div>
        )}
        {picking ? (
          <>
            <div className="section-title" style={{ marginTop: 0 }}><h2 style={{ fontSize: 17 }}>Oefening toevoegen</h2>{items.length > 0 && <button className="link" onClick={() => setPicking(false)}>Klaar</button>}</div>
            <ExercisePicker exclude={items.map((x) => x.ex)} onPick={(e) => { setItems([...items, defaultItem(e)]); toast(`${e.name} toegevoegd`); }} />
          </>
        ) : (
          <button className="btn outline block" onClick={() => setPicking(true)}><span className="i20"><I.plus /></span> Oefening toevoegen</button>
        )}
        <div className="row sticky-foot">
          {existing && (confirm ? (
            <button className="btn danger" onClick={() => { useStore.getState().deleteTemplate(existing.id); toast('Training verwijderd'); close(); }}>Wissen</button>
          ) : (
            <button className="btn danger" onClick={() => setConfirm(true)} aria-label="Training verwijderen"><I.trash /></button>
          ))}
          <button className="btn ghost grow" disabled={!items.length} onClick={() => save(false)}>Opslaan</button>
          <button className="btn grow" disabled={!items.length} onClick={() => save(true)}><span className="i20"><I.play /></span> Start</button>
        </div>
      </div>
    </Sheet>
  );
}

const best = (sets: SetLog[]) => sets.reduce((b, s) => (s.kg > b.kg || (s.kg === b.kg && s.reps > b.reps) ? s : b), { kg: 0, reps: 0 });
/** Geschat 1-herhalingsmaximum (Epley), alleen als vergelijking tussen je eigen trainingen. */
export const oneRm = (s: SetLog) => (s.kg > 0 ? s.kg * (1 + Math.min(s.reps, 12) / 30) : 0);

/** Een training terugkijken en vergelijken met de vorige keer dat je dezelfde training deed. */
export function WorkoutDetailSheet({ index }: { index: number }) {
  const close = useUI((s) => s.close);
  const open = useUI((s) => s.open);
  const log = useStore((s) => s.workoutLog);
  const l = log[index];
  const [confirm, setConfirm] = useState(false);
  if (!l) return null;
  const prevIdx = (() => { for (let i = index - 1; i >= 0; i--) if (log[i].id === l.id) return i; return -1; })();
  const prev = prevIdx >= 0 ? log[prevIdx] : null;
  const remove = () => {
    const s = useStore.getState();
    const act = s.days[l.date]?.activities.find((a) => a.workout === l.id);
    if (act) s.removeActivity(l.date, act.id);
    useStore.setState((st) => ({ workoutLog: st.workoutLog.filter((_, i) => i !== index) }));
    toast('Training verwijderd');
    close();
  };
  const diff = (a: number, b: number, unit = '') => {
    if (!b || Math.abs(a - b) < 0.01) return null;
    return <span className={'cmp num' + (a > b ? ' up' : ' down')}>{a > b ? '↑' : '↓'} {fmt(Math.abs(a - b), 1)}{unit}</span>;
  };
  return (
    <Sheet onClose={close} title={l.name}>
      <div className="stack">
        <div className="small muted">{parseKey(l.date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        <div className="tr-sum-grid num">
          <div><b>{l.minutes}</b><span>min</span></div>
          <div><b>{l.sets}</b><span>sets</span></div>
          <div><b>{fmt(l.volume)}</b><span>kg volume</span></div>
          <div><b>{fmt(l.kcal)}</b><span>kcal</span></div>
        </div>
        {prev && (
          <div className="compare">
            <span className="i18"><I.swap /></span>
            <div className="small">
              Vergeleken met {dayTitle(prev.date).toLowerCase()}: volume {diff(l.volume, prev.volume, ' kg') ?? <b>gelijk</b>}, sets {diff(l.sets, prev.sets) ?? <b>gelijk</b>}
            </div>
          </div>
        )}
        <div className="card" style={{ padding: '2px 14px' }}>
          <div className="list">
            {l.ex.map((x) => {
              const before = prev?.ex.find((p) => p.id === x.id);
              const b = best(x.sets);
              const pb = before ? best(before.sets) : null;
              return (
                <button key={x.id} className="item" onClick={() => open({ type: 'exerciseHistory', id: x.id })}>
                  <div className="grow">
                    <div className="t">{exerciseName(x.id)}</div>
                    <div className="s num">{x.sets.map((s) => (s.kg ? `${fmt(s.kg, 1)}×${s.reps}` : `${s.reps}`)).join('  ·  ')}</div>
                    {pb && <div className="tiny num">Vorige keer: {before!.sets.map((s) => (s.kg ? `${fmt(s.kg, 1)}×${s.reps}` : `${s.reps}`)).join(' · ')}</div>}
                  </div>
                  {pb && b.kg > 0 ? diff(b.kg, pb.kg, ' kg') : pb ? diff(setVolume(x.sets) || x.sets.reduce((s, y) => s + y.reps, 0), setVolume(before!.sets) || before!.sets.reduce((s, y) => s + y.reps, 0)) : null}
                  <span className="i18" style={{ color: 'var(--ink-3)' }}><I.right /></span>
                </button>
              );
            })}
            {!l.ex.length && <div className="item"><span className="small muted">Geen sets opgeslagen bij deze training.</span></div>}
          </div>
        </div>
        {confirm ? (
          <div className="row">
            <button className="btn ghost sm grow" onClick={() => setConfirm(false)}>Annuleren</button>
            <button className="btn danger sm grow" onClick={remove}>Ja, verwijderen</button>
          </div>
        ) : (
          <button className="btn outline block sm" onClick={() => setConfirm(true)}>Training verwijderen</button>
        )}
      </div>
    </Sheet>
  );
}

/** Voortgang van één oefening over al je trainingen. */
export function ExerciseHistorySheet({ id }: { id: string }) {
  const close = useUI((s) => s.close);
  const log = useStore((s) => s.workoutLog);
  const e = getExercise(id);
  const sessions = useMemo(() => log.flatMap((l) => l.ex.filter((x) => x.id === id && x.sets.length).map((x) => ({ date: l.date, sets: x.sets }))), [log, id]);
  const weighted = sessions.some((s) => s.sets.some((x) => x.kg > 0));
  const pr = sessions.reduce((b, s) => Math.max(b, ...s.sets.map((x) => x.kg)), 0);
  const bestRm = sessions.reduce((b, s) => Math.max(b, ...s.sets.map(oneRm)), 0);
  const points = sessions.map((s) => ({
    label: parseKey(s.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'numeric' }),
    title: dayTitle(s.date, dateKey()),
    value: weighted ? Math.round(Math.max(...s.sets.map(oneRm)) * 10) / 10 : Math.max(...s.sets.map((x) => x.reps)),
  }));
  return (
    <Sheet onClose={close} title={e?.name ?? exerciseName(id)}>
      <div className="stack">
        {sessions.length ? (
          <>
            <div className="tr-sum-grid num" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div><b>{sessions.length}</b><span>keer gedaan</span></div>
              <div><b>{weighted ? `${fmt(pr, 1)}` : fmt(Math.max(...sessions.flatMap((s) => s.sets.map((x) => x.reps))))}</b><span>{weighted ? 'kg record' : 'meeste herh.'}</span></div>
              <div><b>{weighted ? fmt(bestRm, 1) : fmt(sessions.reduce((s, x) => s + x.sets.length, 0))}</b><span>{weighted ? 'kg geschat 1RM' : 'sets totaal'}</span></div>
            </div>
            {points.length > 1 && (
              <section className="card stack">
                <div className="label-cap">{weighted ? 'Kracht (geschat 1-herhalingsmaximum)' : 'Meeste herhalingen per keer'}</div>
                <TrendLine points={points} format={(v) => (weighted ? `${fmt(v, 1)} kg` : `${fmt(v)} herhalingen`)} />
                {weighted && <p className="tiny" style={{ margin: 0 }}>Berekend uit je zwaarste set (formule van Epley). Handig om je eigen trainingen te vergelijken; probeer je maximum niet echt uit zonder begeleiding.</p>}
              </section>
            )}
            <div className="card" style={{ padding: '2px 14px' }}>
              <div className="list">
                {[...sessions].reverse().map((s, i) => (
                  <div key={s.date + i} className="item">
                    <div className="grow">
                      <div className="t">{dayTitle(s.date)}</div>
                      <div className="s num">{s.sets.map((x) => (x.kg ? `${fmt(x.kg, 1)}×${x.reps}` : `${x.reps}`)).join('  ·  ')}</div>
                    </div>
                    {weighted && <span className="small num muted">{fmt(setVolume(s.sets))} kg</span>}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="small muted" style={{ margin: 0 }}>Je hebt deze oefening nog niet gedaan. Na je eerste training zie je hier je voortgang.</p>
        )}
      </div>
    </Sheet>
  );
}


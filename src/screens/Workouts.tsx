// Alle workouts: de bibliotheek, de detailpagina van een workout en zelf combineren.
import { useMemo, useState } from 'react';
import { EXERCISES, EQUIP_LABEL, canDo } from '../data/exercises';
import { normalize } from '../data/foods';
import {
  CAT_META, CATS, FINISHERS, GROUP_KEYS, GROUPS, LIBRARY, LIBRARY_BY_ID, MIX_SIZE, mixName,
  type CustomWorkout, type GroupKey, type LibWorkout, type MixSize, type WorkoutCat,
} from '../data/workouts';
import { Figure } from '../components/Figure';
import { WorkoutArt } from '../components/WorkoutArt';
import { I, Sheet, toast } from '../components/ui';
import { DAY_LONG, DAY_SHORT, fmt } from '../lib/date';
import { usePlan } from '../lib/hooks';
import { slotCands } from '../lib/slots';
import { newId, useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { buildWorkout, intervalFor, libMinutes, workoutKcal, type WorkoutDay } from '../lib/workout';
import type { Profile } from '../lib/types';

/** Kan met alleen je lichaam (en een stoel of tafel). */
const noEquip = (w: LibWorkout) => w.slots.every((s) => slotCands(s).some((id) => EXERCISES[id]?.equip.length === 0));
const LEVEL = ['', 'Voor iedereen', 'Gemiddeld', 'Pittig'];

interface Item {
  id: string;
  name: string;
  subtitle: string;
  cat: WorkoutCat;
  cover: string;
  level: 1 | 2 | 3;
  day: WorkoutDay;
  lib?: LibWorkout;
  mix?: CustomWorkout;
}

function useItems(): Item[] {
  const profile = useStore((s) => s.profile)!;
  return useMemo(() => {
    const out: Item[] = [];
    for (const mix of profile.customWorkouts ?? []) {
      const day = buildWorkout(mix.id, profile);
      if (day) out.push({ id: mix.id, name: mix.name, subtitle: 'Eigen combinatie', cat: 'combi', cover: day.exercises[0]?.exercise.id ?? 'squat', level: 2, day, mix });
    }
    for (const lib of LIBRARY) {
      const day = buildWorkout(lib.id, profile);
      if (day) out.push({ id: lib.id, name: lib.name, subtitle: lib.subtitle, cat: lib.cat, cover: lib.cover, level: lib.level, day, lib });
    }
    return out;
  }, [profile]);
}

type Quick = 'kort' | 'zonder' | 'timer' | 'fav';
const QUICK: [Quick, string][] = [['fav', 'Favorieten'], ['kort', 'Max. 20 min'], ['zonder', 'Zonder apparatuur'], ['timer', 'Met timer']];

export function Library() {
  const items = useItems();
  const favs = useStore((s) => s.favWorkouts);
  const { open, pickDay, setTrView } = useUI();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<WorkoutCat | 'alles' | 'eigen'>('alles');
  const [quick, setQuick] = useState<Quick[]>([]);

  const filtered = useMemo(() => {
    const terms = normalize(q.trim()).split(/\s+/).filter(Boolean);
    return items.filter((it) => {
      if (cat === 'eigen' ? !it.mix : cat !== 'alles' && it.cat !== cat) return false;
      for (const f of quick) {
        if (f === 'fav' && !favs.includes(it.id)) return false;
        if (f === 'kort' && it.day.estMinutes > 20) return false;
        if (f === 'zonder' && (!it.lib || !noEquip(it.lib))) return false;
        if (f === 'timer' && !it.day.timer) return false;
      }
      if (terms.length) {
        const hay = normalize([it.name, it.subtitle, CAT_META[it.cat].t, it.lib?.desc ?? '', ...it.day.exercises.flatMap((e) => [e.exercise.name, ...e.exercise.muscles])].join(' '));
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
  }, [items, q, cat, quick, favs]);

  const browsing = cat === 'alles' && !quick.length && !q.trim();
  const mine = items.filter((i) => i.mix);

  return (
    <>
      {pickDay !== null && (
        <div className="card wo-pick">
          <span className="i20"><I.today /></span>
          <div className="grow"><b>Kies een workout voor {DAY_LONG[pickDay]}</b><div className="small muted">Tik op een workout en zet hem op die dag.</div></div>
          <button className="btn sm ghost" onClick={() => setTrView('week')}>Klaar</button>
        </div>
      )}

      <button className="wo-combine" onClick={() => open({ type: 'combine', day: pickDay ?? undefined })}>
        <span className="wo-combine-ico"><I.sparkle /></span>
        <span className="grow">
          <b>Zelf combineren</b>
          <span>Kies spiergroepen (bijv. borst + rug + core) en plak er cardio achter</span>
        </span>
        <span className="i20"><I.right /></span>
      </button>

      <div className="search">
        <I.search />
        <input className="input" placeholder="Zoek: rug, tabata, push-ups, billen…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Zoek workouts" />
        {q && <button className="search-clear" onClick={() => setQ('')} aria-label="Wissen"><I.close /></button>}
      </div>

      <div className="chips scroll">
        <button className={'chip' + (cat === 'alles' ? ' on' : '')} onClick={() => setCat('alles')}>Alles</button>
        {mine.length > 0 && <button className={'chip' + (cat === 'eigen' ? ' on' : '')} onClick={() => setCat('eigen')}>✨ Mijn combinaties</button>}
        {CATS.map((c) => (
          <button key={c} className={'chip' + (cat === c ? ' on' : '')} onClick={() => setCat(cat === c ? 'alles' : c)}>{CAT_META[c].em} {CAT_META[c].t}</button>
        ))}
      </div>
      <div className="chips scroll">
        {QUICK.map(([k, l]) => (
          <button key={k} className={'chip sm' + (quick.includes(k) ? ' on' : '')} aria-pressed={quick.includes(k)} onClick={() => setQuick((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]))}>{l}</button>
        ))}
      </div>

      {browsing ? (
        <>
          {mine.length > 0 && <Row title="✨ Mijn combinaties" sub="Zelf samengesteld" items={mine} onAll={() => setCat('eigen')} />}
          {favs.length > 0 && <Row title="❤️ Favorieten" items={items.filter((i) => favs.includes(i.id))} onAll={() => setQuick(['fav'])} />}
          {CATS.map((c) => {
            const list = items.filter((i) => i.cat === c && i.lib);
            return list.length ? <Row key={c} title={`${CAT_META[c].em} ${CAT_META[c].t}`} sub={CAT_META[c].s} items={list} onAll={() => setCat(c)} /> : null;
          })}
        </>
      ) : (
        <>
          <div className="section-title" style={{ marginTop: 0 }}>
            <h2>{cat === 'alles' ? 'Workouts' : cat === 'eigen' ? 'Mijn combinaties' : CAT_META[cat].t}</h2>
            <span className="small muted num">{filtered.length} {filtered.length === 1 ? 'workout' : 'workouts'}</span>
          </div>
          {filtered.length ? (
            <div className="recipe-grid">{filtered.map((it) => <WorkoutCard key={it.id} item={it} />)}</div>
          ) : (
            <div className="card empty"><b>Geen workouts gevonden</b><div className="small">Probeer een ander filter of zoekwoord.</div></div>
          )}
        </>
      )}
    </>
  );
}

function Row({ title, sub, items, onAll }: { title: string; sub?: string; items: Item[]; onAll: () => void }) {
  return (
    <section className="wo-row">
      <div className="section-title">
        <div style={{ minWidth: 0 }}>
          <h2>{title}</h2>
          {sub && <div className="small muted">{sub}</div>}
        </div>
        <button className="link" onClick={onAll}>Alle {items.length}</button>
      </div>
      <div className="wo-scroll">{items.map((it) => <WorkoutCard key={it.id} item={it} />)}</div>
    </section>
  );
}

function WorkoutCard({ item }: { item: Item }) {
  const open = useUI((s) => s.open);
  const pickDay = useUI((s) => s.pickDay);
  const fav = useStore((s) => s.favWorkouts.includes(item.id));
  const d = item.day;
  return (
    <article className="rcard wocard">
      <button className="rcard-main" onClick={() => open({ type: 'workout', id: item.id, day: pickDay ?? undefined })}>
        <div className="rcard-photo">
          <WorkoutArt id={item.id} cat={item.cat} cover={item.cover} />
          <span className="rcard-time"><span className="i"><I.timer /></span>{d.estMinutes} min</span>
          {d.timer && <span className="wocard-timer">Timer</span>}
        </div>
        <div className="rcard-body">
          <div className="rcard-name">{item.name}</div>
          <div className="rcard-meta">{item.subtitle}</div>
          <div className="wocard-level"><span className="diff">{[1, 2, 3].map((n) => <i key={n} className={n <= item.level ? 'on' : ''} />)}</span> {d.timer ? `${new Set(d.exercises.map((e) => e.exercise.id)).size} oefeningen` : `${d.exercises.length} oefeningen`}</div>
        </div>
      </button>
      <button className={'rcard-fav' + (fav ? ' on' : '')} onClick={() => useStore.getState().toggleFavWorkout(item.id)} aria-label={fav ? 'Uit favorieten' : 'Bewaar als favoriet'} aria-pressed={fav}>
        <I.heart filled={fav} />
      </button>
    </article>
  );
}

/* ---------- Detail van een workout ---------- */

/** Wat staat er op elke dag van je week (voor "zet in je schema"). */
function useWeek() {
  const plan = usePlan();
  return DAY_SHORT.map((_, i) => plan.find((p) => p.weekday === i));
}

export function WorkoutSheet({ id, day }: { id: string; day?: number }) {
  const close = useUI((s) => s.close);
  const { startSession, setTrView } = useUI();
  const profile = useStore((s) => s.profile)!;
  const fav = useStore((s) => s.favWorkouts.includes(id));
  const week = useWeek();
  const [planning, setPlanning] = useState(day !== undefined);
  const [confirmDel, setConfirmDel] = useState(false);
  const wd = useMemo(() => buildWorkout(id, profile), [id, profile]);
  if (!wd) return null;
  const lib = LIBRARY_BY_ID[id];
  const mix = profile.customWorkouts?.find((c) => c.id === id);
  const cat: WorkoutCat = lib?.cat ?? 'combi';
  const cover = lib?.cover ?? wd.exercises[0]?.exercise.id;
  const kcal = workoutKcal(wd, profile.weightKg);
  const iv = lib?.interval ? intervalFor(lib, profile.experience) : null;
  const unique = wd.exercises;
  const missing = unique.filter((e) => !canDo(e.exercise, profile.equipment)).flatMap((e) => e.exercise.equip.filter((q) => !profile.equipment.includes(q)));
  const onDays = week.map((w, i) => (w?.id === id ? i : -1)).filter((i) => i >= 0);

  const setDay = (d: number) => {
    useStore.getState().setDayWorkout(d, id);
    toast(`${wd.name} staat op ${DAY_LONG[d]}`);
    if (day !== undefined) {
      setTrView('week');
      close();
    }
  };

  return (
    <Sheet onClose={close} title={wd.name} right={
      <button className={'iconbtn' + (fav ? ' fav-on' : '')} onClick={() => useStore.getState().toggleFavWorkout(id)} aria-label={fav ? 'Uit favorieten' : 'Bewaar als favoriet'} aria-pressed={fav}><I.heart filled={fav} /></button>
    }>
      <div className="stack">
        <div className="wo-hero">
          <WorkoutArt id={id} cat={cat} cover={cover} animate />
          <div className="wo-hero-tags">
            <span className="wo-pill">{lib ? `${CAT_META[cat].em} ${CAT_META[cat].t}` : '✨ Eigen combinatie'}</span>
            {lib && <span className="wo-pill">{LEVEL[lib.level]}</span>}
          </div>
        </div>
        {(lib?.desc || mix) && <p className="small" style={{ margin: 0, color: 'var(--ink-2)' }}>{lib?.desc ?? `Je eigen combinatie van ${mix!.groups.map((g) => GROUPS[g].t.toLowerCase()).join(', ')}.`}</p>}

        <div className="wo-stats num">
          <div><b>{wd.estMinutes}</b><span>min</span></div>
          <div><b>± {fmt(kcal)}</b><span>kcal</span></div>
          {iv ? <div><b>{iv.rounds}×</b><span>{iv.rounds === 1 ? 'ronde' : 'rondes'}</span></div> : <div><b>{unique.length}</b><span>oefeningen</span></div>}
          {iv ? <div><b>{iv.work}/{iv.rest}</b><span>sec werk/rust</span></div> : wd.timer ? <div><b>{wd.timer.filter((s) => s.kind !== 'rest').length}</b><span>blokken</span></div> : <div><b>{unique.reduce((s, e) => s + e.sets, 0)}</b><span>sets</span></div>}
        </div>

        {wd.timer && <TimelineBar day={wd} />}

        {missing.length > 0 && (
          <div className="card flat row small" style={{ alignItems: 'flex-start' }}>
            <span style={{ width: 20, height: 20, flex: 'none', color: 'var(--brand)' }}><I.info /></span>
            <span>Hiervoor heb je {[...new Set(missing)].map((q) => EQUIP_LABEL[q].t.toLowerCase()).join(' en ')} nodig, die staan niet bij jouw apparatuur. Buiten fietsen, lopen of roeien kan natuurlijk ook.</span>
          </div>
        )}

        <div className="card" style={{ padding: '2px 12px' }}>
          <div className="list">
            {unique.map((e, i) => (
              <button key={e.slotKey} className="exrow" onClick={() => useUI.getState().open({ type: 'exercise', id: e.exercise.id, slotKey: e.slotKey, wid: id })}>
                <span className="tr-idx num">{i + 1}</span>
                <span className="fig-thumb"><Figure anim={e.exercise.anim} still /></span>
                <div className="grow">
                  <div className="tr-exname">{e.exercise.name}</div>
                  <div className="small muted num">{wd.timer ? (iv ? `${iv.rounds}× ${iv.work} sec` : `${e.reps} in totaal`) : `${e.sets}×${e.reps} · ${e.restSec} sec rust`}</div>
                </div>
                <span className="exrow-go" aria-hidden><I.right /></span>
              </button>
            ))}
            {wd.cardio && (
              <div className="exrow">
                <span className="tr-idx"><span className="i18"><I.shoe /></span></span>
                <div className="grow"><div className="tr-exname">{wd.cardio.label}</div><div className="small muted">{wd.cardio.minutes} minuten</div></div>
              </div>
            )}
          </div>
        </div>
        <p className="tiny" style={{ margin: '-4px 2px 0' }}>Oefeningen zijn gekozen op jouw apparatuur en ervaring. Tik op een oefening voor uitleg of om te wisselen.</p>

        {planning ? (
          <div className="card stack">
            <b>{day !== undefined ? `Op ${DAY_LONG[day]} zetten?` : 'Op welke dag wil je hem doen?'}</b>
            <div className="wo-days">
              {DAY_SHORT.map((d, i) => {
                const cur = week[i];
                return (
                  <button key={d} className={'wo-day' + (cur?.id === id ? ' on' : '') + (i === day ? ' want' : '')} onClick={() => setDay(i)} aria-label={`${DAY_LONG[i]}${cur ? `, nu: ${cur.name}` : ', rustdag'}`}>
                    <span className="d">{d}</span>
                    <span className="w">{cur?.id === id ? '✓' : cur ? cur.emoji : '–'}</span>
                  </button>
                );
              })}
            </div>
            <span className="tiny">Je andere dagen blijven zoals ze zijn. Op een rustdag komt hij er als extra training bij.</span>
          </div>
        ) : null}

        <div className="row" style={{ gap: 8 }}>
          {!planning && <button className="btn ghost" onClick={() => setPlanning(true)}><span className="i20"><I.today /></span> {onDays.length ? `Op ${onDays.map((d) => DAY_SHORT[d]).join(', ')}` : 'In schema'}</button>}
          <button className="btn grow" onClick={() => startSession(id)}><span className="i20"><I.play /></span> Start nu</button>
        </div>

        {mix && (confirmDel ? (
          <div className="card stack">
            <b>Deze combinatie verwijderen?</b>
            <div className="row"><button className="btn ghost sm grow" onClick={() => setConfirmDel(false)}>Annuleren</button><button className="btn danger sm grow" onClick={() => { useStore.getState().deleteCustomWorkout(id); toast('Combinatie verwijderd'); close(); }}>Verwijderen</button></div>
          </div>
        ) : (
          <div className="row" style={{ gap: 8 }}>
            <button className="btn outline sm grow" onClick={() => useUI.getState().open({ type: 'combine', edit: id })}><span className="i18"><I.pencil /></span> Aanpassen</button>
            <button className="btn outline sm grow" onClick={() => setConfirmDel(true)}><span className="i18"><I.trash /></span> Verwijderen</button>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

/** Balk met de hele tijdlijn: werk, rustig en rust in verhouding. */
export function TimelineBar({ day, at }: { day: WorkoutDay; at?: number }) {
  const segs = day.timer ?? [];
  const total = segs.reduce((t, s) => t + s.sec, 0);
  return (
    <div className="wo-tl" aria-hidden>
      {segs.map((s, i) => <i key={i} className={s.kind + (at !== undefined && i < at ? ' past' : '') + (i === at ? ' cur' : '')} style={{ flexGrow: s.sec / total }} />)}
    </div>
  );
}

/* ---------- Zelf combineren ---------- */

export function CombineSheet({ edit, day }: { edit?: string; day?: number }) {
  const close = useUI((s) => s.close);
  const { startSession, setTrView } = useUI();
  const profile = useStore((s) => s.profile)!;
  const existing = profile.customWorkouts?.find((c) => c.id === edit);
  const [groups, setGroups] = useState<GroupKey[]>(existing?.groups ?? []);
  const [size, setSize] = useState<MixSize>(existing?.size ?? 'normaal');
  const [finisher, setFinisher] = useState<string | undefined>(existing?.finisher);
  const [name, setName] = useState(existing?.name ?? '');
  const auto = mixName(groups);
  const draft: CustomWorkout = { id: existing?.id ?? 'mix-' + newId(), name: name.trim() || auto, groups, size, finisher };
  const preview = useMemo(() => (groups.length ? buildWorkout(draft.id, { ...profile, customWorkouts: [draft] } as Profile) : null), [groups, size, finisher, profile]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (g: GroupKey) => setGroups((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));

  const save = (then: 'start' | 'close') => {
    useStore.getState().saveCustomWorkout(draft);
    if (day !== undefined) {
      useStore.getState().setDayWorkout(day, draft.id);
      setTrView('week');
      toast(`${draft.name} staat op ${DAY_LONG[day]}`);
    } else toast(existing ? 'Combinatie bijgewerkt' : 'Opgeslagen bij Mijn combinaties');
    if (then === 'start') startSession(draft.id);
    else close();
  };

  return (
    <Sheet onClose={close} title={existing ? 'Combinatie aanpassen' : 'Zelf combineren'}>
      <div className="stack">
        <div className="field">
          <span className="lbl">Welke dagen wil je combineren? <span className="muted">(in deze volgorde)</span></span>
          <div className="wo-groups">
            {GROUP_KEYS.map((g) => {
              const n = groups.indexOf(g);
              return (
                <button key={g} className={'wo-group' + (n >= 0 ? ' on' : '')} onClick={() => toggle(g)} aria-pressed={n >= 0}>
                  <span className="em">{GROUPS[g].em}</span>
                  <span className="t">{GROUPS[g].day}</span>
                  {n >= 0 && <span className="n num">{n + 1}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="field">
          <span className="lbl">Hoe lang?</span>
          <div className="seg seg-wide" role="radiogroup">
            {(Object.keys(MIX_SIZE) as MixSize[]).map((k) => (
              <button key={k} role="radio" aria-checked={size === k} className={size === k ? 'on' : ''} onClick={() => setSize(k)}>{MIX_SIZE[k].t} <span className="muted" style={{ fontWeight: 600 }}>{MIX_SIZE[k].s}</span></button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="lbl">Afsluiten met cardio, core of stretchen</span>
          <div className="chips">
            <button className={'chip' + (!finisher ? ' on' : '')} onClick={() => setFinisher(undefined)}>Geen</button>
            {FINISHERS.map((f) => {
              const l = LIBRARY_BY_ID[f];
              return <button key={f} className={'chip' + (finisher === f ? ' on' : '')} onClick={() => setFinisher(f)}>{l.emoji} {l.name} · {libMinutes(l)} min</button>;
            })}
          </div>
        </div>

        <div className="field">
          <span className="lbl">Naam</span>
          <input className="input" value={name} placeholder={auto} onChange={(e) => setName(e.target.value)} maxLength={40} />
        </div>

        {preview ? (
          <div className="card" style={{ padding: '10px 12px 2px' }}>
            <div className="row between small" style={{ marginBottom: 2 }}>
              <b>Voorbeeld</b>
              <span className="muted num">± {preview.estMinutes} min · ± {fmt(workoutKcal(preview, profile.weightKg))} kcal</span>
            </div>
            <div className="list">
              {preview.exercises.map((e) => (
                <div key={e.slotKey} className="item">
                  <span className="fig-thumb" style={{ width: 44, height: 42 }}><Figure anim={e.exercise.anim} still /></span>
                  <div className="grow"><div className="t">{e.exercise.name}</div><div className="s num">{e.exercise.muscles.slice(0, 2).join(', ')} · {e.sets}×{e.reps}</div></div>
                </div>
              ))}
              {preview.cardio && <div className="item"><span className="tr-idx"><span className="i18"><I.shoe /></span></span><div className="grow"><div className="t">{preview.cardio.label}</div><div className="s">{preview.cardio.minutes} minuten</div></div></div>}
            </div>
          </div>
        ) : (
          <div className="card flat small muted" style={{ textAlign: 'center' }}>Kies hierboven één of meer dagen, bijvoorbeeld Rugdag + Borstdag.</div>
        )}

        <div className="row" style={{ gap: 8 }}>
          <button className="btn ghost grow" disabled={!groups.length} onClick={() => save('close')}>{day !== undefined ? `Op ${DAY_SHORT[day]} zetten` : 'Opslaan'}</button>
          <button className="btn grow" disabled={!groups.length} onClick={() => save('start')}><span className="i20"><I.play /></span> Start nu</button>
        </div>
      </div>
    </Sheet>
  );
}


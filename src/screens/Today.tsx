import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { mealRange, entryNutrients, skipsMeal, stepsToKm, sumNutrients } from '../lib/calc';
import { addDays, DAY_SHORT, dateKey, dayTitle, fmt, greeting, liters, parseKey, weekday } from '../lib/date';
import { dayTotals, useDay, useMealRoom, usePlan, useTargets, useWaterTarget } from '../lib/hooks';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { MEALS, type MealKey } from '../lib/types';
import { AvatarButton, Bar, I, Logo, Ring, toast } from '../components/ui';
import { CoachCard, useCoachCtx } from '../components/Coach';
import { coachFeed } from '../lib/coach';
import { MealIdea } from '../components/RecipeSheets';
import { FoodIcon } from '../components/FoodIcon';
import { Glass } from '../components/WaterSheet';
import { recentlyEaten, suggest } from '../lib/recipes';
import { burnedOn, recentFeed, type FeedItem } from '../lib/stats';
import { challengeStatus } from '../lib/motivation';

const NONE: never[] = [];
const NO_IDS: string[] = [];

export const MEAL_META: Record<MealKey, { label: string; icon: () => ReactElement; tint: string; color: string }> = {
  ontbijt: { label: 'Ontbijt', icon: I.sunrise, tint: 'color-mix(in srgb, var(--carb) 22%, transparent)', color: 'var(--carb)' },
  lunch: { label: 'Lunch', icon: I.sun, tint: 'color-mix(in srgb, var(--brand) 18%, transparent)', color: 'var(--brand)' },
  diner: { label: 'Avondeten', icon: I.moon, tint: 'color-mix(in srgb, var(--fat) 18%, transparent)', color: 'var(--fat)' },
  snacks: { label: 'Snacks', icon: I.apple, tint: 'color-mix(in srgb, var(--protein) 16%, transparent)', color: 'var(--protein)' },
};

export function Today() {
  const profile = useStore((s) => s.profile)!;
  const { date, setDate, open } = useUI();
  const t = useTargets()!;
  const day = useDay(date);
  const { eaten, count } = dayTotals(day);
  const burned = burnedOn(day, profile.weightKg, profile.heightCm);
  // Verbrande kcal tellen bewust niet mee: het calorie-doel houdt al rekening met je activiteit
  const budget = t.kcal;
  const remaining = Math.round(budget - eaten.kcal);
  const over = remaining < 0;
  const today = dateKey();
  const narrow = useNarrow();

  return (
    <div className="page">
      <header className="topbar">
        <div className="row">
          <span className="hide-desktop"><Logo size={36} /></span>
          <div className="hello">
            {greeting()}
            <b>{profile.name || 'daar'}</b>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Bell />
          <AvatarButton />
        </div>
      </header>

      <div className="cols dash">
        <div className="col">
          <WeekStrip date={date} today={today} onPick={setDate} target={t.kcal} />

          <section className="daycard" aria-label="Calorieën vandaag">
            <div className="ringwrap">
              <div className="stat">
                <div className="v num">{fmt(eaten.kcal)}</div>
                <div className="l">Gegeten</div>
              </div>
              <Ring size={narrow ? 150 : 186} stroke={narrow ? 13 : 15} value={eaten.kcal / budget} color={over ? 'var(--protein)' : 'var(--brand)'}>
                <div className="ring-center">
                  <div className="cap">{over ? 'Boven je doel' : 'Nog over'}</div>
                  <div className="big num">{fmt(Math.abs(remaining))}</div>
                  <div className="goal num">doel {fmt(t.kcal)} kcal</div>
                </div>
              </Ring>
              <button className="stat stat-btn" onClick={() => open({ type: 'activity' })} aria-label={`Verbrand: ${fmt(burned.logged)} kcal geregistreerd met activiteiten. Activiteit toevoegen`}>
                <div className="v num">{fmt(burned.logged)}</div>
                <div className="l">Verbrand</div>
                <div className="stat-sub">geregistreerd</div>
              </button>
            </div>
            <div className="macros">
              <Macro name="Eiwit" v={eaten.p} t={t.p} color="var(--protein)" />
              <Macro name="Koolh." v={eaten.c} t={t.c} color="var(--carb)" />
              <Macro name="Vet" v={eaten.f} t={t.f} color="var(--fat)" />
              <Macro name="Vezels" v={eaten.fib} t={t.fib} color="var(--fiber)" />
            </div>
          </section>

          <div className="glance">
            <WaterCard date={date} />
            <MoveCard date={date} heightCm={profile.heightCm} target={t.steps} />
            <BurnCard logged={burned.logged} fromSteps={burned.fromSteps} steps={day.steps} />
          </div>

          <div className="section-title">
            <h2>Voedingslogboek</h2>
            <span className="row" style={{ gap: 10 }}>
              {count > 0 && <button className="link small" onClick={() => open({ type: 'copy', from: date })}><span className="i14" style={{ verticalAlign: '-2px' }}><I.copy /></span> Dag kopiëren</button>}
              <span className="small muted num">{fmt(eaten.kcal)} kcal</span>
            </span>
          </div>
          <div className="meals-grid">
            {MEALS.map((m) => (
              <MealCard key={m} meal={m} date={date} kcal={t.kcal} split={t.split} />
            ))}
          </div>
        </div>

        <div className="col">
          <TrainingTeaser date={date} />
          <GoalsMini date={date} />
          <Activities date={date} />
          <NoteCard date={date} />
          <RecentCard />
          <CoachCard date={date} />
        </div>
      </div>
    </div>
  );
}

function Bell() {
  const ctx = useCoachCtx(dateKey());
  const open = useUI((s) => s.open);
  const n = ctx ? coachFeed(ctx).filter((m) => m.tone === 'nudge' || m.tone === 'care').length : 0;
  return (
    <button className="iconbtn bell" style={{ width: 42, height: 42, background: 'var(--surface)' }} onClick={() => open({ type: 'inbox' })} aria-label={`Tips en herinneringen${n ? `, ${n} nieuw` : ''}`}>
      <I.bell />
      {n > 0 && <span className="badge num">{n}</span>}
    </button>
  );
}

function Macro({ name, v, t, color }: { name: string; v: number; t: number; color: string }) {
  return (
    <div className="macro">
      <div className="name">{name}</div>
      <div className="val num">{fmt(v)}<span>/{fmt(t)} g</span></div>
      <Bar value={v / t} color={color} />
    </div>
  );
}

/** Week met per dag een ringetje: hoe dicht je bij je calorie-doel zat. */
function WeekStrip({ date, today, onPick, target }: { date: string; today: string; onPick: (d: string) => void; target: number }) {
  const days = useStore((s) => s.days);
  const setTab = useUI((s) => s.setTab);
  const monday = addDays(date, -weekday(date));
  const keys = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const thisWeek = keys.includes(today);
  const month = parseKey(date).toLocaleDateString('nl-NL', { month: 'long' });
  return (
    <nav className="weekstrip" aria-label="Dag kiezen">
      <div className="ws-head">
        <button className="arrow" onClick={() => onPick(addDays(date, -7))} aria-label="Vorige week"><I.left /></button>
        <button className="ws-title" onClick={() => onPick(today)} aria-label="Naar vandaag">
          {dayTitle(date, today)}
          {date !== today && <span className="ws-today">{thisWeek ? 'Terug naar vandaag' : `${month} · naar vandaag`}</span>}
        </button>
        <span className="row" style={{ gap: 0 }}>
          <button className="arrow" onClick={() => setTab('kalender')} aria-label="Kalender openen"><I.calendar /></button>
          <button className="arrow" onClick={() => onPick(addDays(date, 7))} aria-label="Volgende week"><I.right /></button>
        </span>
      </div>
      <div className="ws-days">
        {keys.map((k, i) => {
          const d = days[k];
          const kcal = d ? dayTotals(d).eaten.kcal : 0;
          const pct = kcal / target;
          const state = kcal === 0 ? 'leeg' : pct > 1.1 ? 'over' : pct >= 0.85 ? 'goed' : 'onder';
          const color = state === 'over' ? 'var(--protein)' : state === 'goed' ? 'var(--brand)' : 'var(--carb)';
          return (
            <button
              key={k}
              className={'ws-day' + (k === date ? ' sel' : '') + (k === today ? ' today' : '') + (k > today ? ' future' : '')}
              onClick={() => onPick(k)}
              aria-label={`${dayTitle(k, today)}${kcal ? `, ${fmt(kcal)} kcal` : ''}`}
              aria-current={k === date ? 'date' : undefined}
            >
              <span className="ws-d">{DAY_SHORT[i]}</span>
              <Ring size={36} stroke={3.5} value={Math.min(1, pct)} color={color}>
                <span className="ws-n num">{parseKey(k).getDate()}</span>
              </Ring>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function WaterCard({ date }: { date: string }) {
  const day = useDay(date);
  const glass = useStore((s) => s.glassMl);
  const open = useUI((s) => s.open);
  const target = useWaterTarget(date);
  const ml = day.waterMl;
  const pct = ml / target;
  const left = Math.max(0, target - ml);
  const glassesLeft = Math.ceil(left / glass);

  let hint = `Nog ${glassesLeft} ${glassesLeft === 1 ? 'glas' : 'glazen'} te gaan`;
  let cls = 'hint';
  if (pct >= 1) {
    hint = 'Doel gehaald';
    cls = 'hint good';
  } else if (date === dateKey()) {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    const expected = target * Math.max(0, Math.min(1, (h - 7) / 14));
    if (ml < expected - glass * 2) {
      hint = 'Iets achter op schema';
      cls = 'hint warn';
    } else if (ml >= expected) hint = `Goed op schema · nog ${glassesLeft} ${glassesLeft === 1 ? 'glas' : 'glazen'}`;
  } else if (date < dateKey()) {
    hint = `${Math.round(pct * 100)}% van je doel gedronken`;
  }

  return (
    <div className="card water tile-card">
      <button className="tile-open" onClick={() => open({ type: 'water' })} aria-label="Watertracker openen">
        <div className="label-cap" style={{ color: 'var(--water)' }}>Water <span className="i14 tile-more"><I.right /></span></div>
        <div className="top">
          <Glass pct={pct} />
          <div className="kpi num">
            {liters(ml)}<small> / {liters(target)} L</small>
          </div>
        </div>
        <div className={cls}>{hint}</div>
      </button>
      <div className="pillbtns">
        <button onClick={() => useStore.getState().addWater(date, -glass)} disabled={ml <= 0} aria-label="Glas eraf">−</button>
        <button className="primary" onClick={() => { useStore.getState().addWater(date, glass); navigator.vibrate?.(15); }} aria-label={`Glas water toevoegen (${glass} ml)`}>+ glas</button>
      </div>
    </div>
  );
}

function MoveCard({ date, target, heightCm }: { date: string; target: number; heightCm: number }) {
  const day = useDay(date);
  const open = useUI((s) => s.open);
  const pct = day.steps / target;
  const active = day.activities.reduce((s, a) => s + a.minutes, 0);
  return (
    <div className="card water tile-card">
      <button className="tile-open" onClick={() => open({ type: 'steps' })} aria-label="Stappen invullen">
        <div className="label-cap" style={{ color: 'var(--steps)' }}>Beweging <span className="i14 tile-more"><I.right /></span></div>
        <div className="top">
          <Ring size={52} stroke={6} value={pct} color="var(--steps)"><span style={{ color: 'var(--steps)', width: 22, height: 22, display: 'grid' }}><I.shoe /></span></Ring>
          <div className="kpi num">
            {fmt(day.steps)}
            <small><br />van {fmt(target)} stappen</small>
          </div>
        </div>
        <div className={'hint' + (pct >= 1 ? ' good' : '')}>
          {pct >= 1 ? 'Stappendoel gehaald' : `${fmt(stepsToKm(day.steps, heightCm), 1)} km`}{active ? ` · ${active} min actief` : pct >= 1 ? '' : ` · nog ${fmt(Math.max(0, target - day.steps))}`}
        </div>
      </button>
      <div className="pillbtns">
        <button onClick={() => open({ type: 'steps' })}>Invoeren</button>
        <button className="primary steps" onClick={() => open({ type: 'connect' })} aria-label="Stappen koppelen"><span style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: '-3px' }}><I.link /></span></button>
      </div>
    </div>
  );
}

/** Verbranding met een duidelijk onderscheid: wat jij registreerde en wat Puls schat uit je stappen. */
function BurnCard({ logged, fromSteps, steps }: { logged: number; fromSteps: number; steps: number }) {
  const open = useUI((s) => s.open);
  return (
    <div className="card burn">
      <div className="row between">
        <div className="label-cap" style={{ color: 'var(--fat)' }}>Verbrand</div>
        <button className="link small" onClick={() => open({ type: 'activity' })}>+ Activiteit</button>
      </div>
      <div className="burn-rows">
        <div className="burn-row">
          <span className="burn-dot" style={{ background: 'var(--fat)' }} />
          <span className="grow">Geregistreerd<span className="tiny burn-sub">activiteiten en trainingen</span></span>
          <b className="num">{fmt(logged)} kcal</b>
        </div>
        <div className="burn-row">
          <span className="burn-dot est" />
          <span className="grow">Geschat<span className="tiny burn-sub">uit {fmt(steps)} stappen</span></span>
          <b className="num muted">± {fmt(fromSteps)} kcal</b>
        </div>
      </div>
      <p className="tiny" style={{ margin: 0 }}>Komt niet bij je eetbudget: je calorie-doel houdt al rekening met je gemiddelde beweging.</p>
    </div>
  );
}

function TrainingTeaser({ date }: { date: string }) {
  const plan = usePlan();
  const day = useDay(date);
  const wd = plan.find((p) => p.weekday === weekday(date));
  const { setTab, startSession } = useUI();
  if (!wd) {
    const next = plan.find((p) => p.weekday > weekday(date)) ?? plan[0];
    return (
      <button className="card row" style={{ textAlign: 'left' }} onClick={() => setTab('training')}>
        <div className="meal-icon" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}><I.moon /></div>
        <div className="grow">
          <b>Rustdag</b>
          <div className="small muted">{next ? `Volgende training: ${next.name}` : 'Stel je trainingsschema in'}</div>
        </div>
        <I.right />
      </button>
    );
  }
  const done = day.workoutsDone.includes(wd.id);
  return (
    <div className="card row">
      <div className="meal-icon" style={{ background: 'color-mix(in srgb, var(--brand) 16%, transparent)', color: 'var(--brand)' }}><I.dumbbell /></div>
      <button className="grow" style={{ textAlign: 'left' }} onClick={() => setTab('training')}>
        <div className="tiny" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Training {date === dateKey() ? 'vandaag' : 'deze dag'}</div>
        <b>{wd.name}</b>
        <div className="small muted">{wd.exercises.length} oefeningen · ± {wd.estMinutes} min</div>
      </button>
      {done ? (
        <span className="tag brand"><span style={{ width: 14, height: 14, display: 'inline-block' }}><I.check /></span> Klaar</span>
      ) : date === dateKey() ? (
        <button className="btn sm" onClick={() => startSession(wd.id)}>Start</button>
      ) : null}
    </div>
  );
}

/** Doelen van vandaag in het klein: gewoontes afvinken en de uitdaging van de dag. */
function GoalsMini({ date }: { date: string }) {
  const profile = useStore((s) => s.profile)!;
  const habits = useStore((s) => s.goals.habits);
  const checked = useStore((s) => s.habitLog[date]) ?? NO_IDS;
  const manual = useStore((s) => !!s.challengeDone[date]);
  const t = useTargets()!;
  const day = useDay(date);
  const setTab = useUI((s) => s.setTab);
  const ctx = useMemo(() => ({ profile, t }), [profile, t]);
  const ch = challengeStatus(date, ctx, day, manual);
  const on = habits.filter((h) => h.on);
  const done = on.filter((h) => checked.includes(h.id)).length;
  return (
    <section className="card stack goals-mini">
      <div className="row between">
        <div className="label-cap">Doelen &amp; gewoontes</div>
        <button className="link small" onClick={() => setTab('doelen')}>Alles bekijken</button>
      </div>
      <button className={'gm-challenge' + (ch.done ? ' done' : '')} onClick={() => setTab('doelen')}>
        <span className="gm-em">{ch.challenge.em}</span>
        <span className="grow"><span className="tiny">Uitdaging van de dag</span><b>{ch.challenge.title}</b></span>
        {ch.done ? <span className="tr-mini-done"><I.check /></span> : <I.right />}
      </button>
      {on.length > 0 && (
        <>
          <div className="row between"><span className="small" style={{ fontWeight: 600 }}>Gewoontes</span><span className="tiny num">{done}/{on.length}</span></div>
          <div className="habit-chips">
            {on.map((h) => {
              const isOn = checked.includes(h.id);
              return (
                <button key={h.id} className={'habit-chip' + (isOn ? ' on' : '')} aria-pressed={isOn} onClick={() => { useStore.getState().toggleHabit(date, h.id); if (!isOn) navigator.vibrate?.(15); }}>
                  <span>{h.em}</span>{h.name}
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function Activities({ date }: { date: string }) {
  const day = useDay(date);
  const open = useUI((s) => s.open);
  return (
    <section className="card stack">
      <div className="row between">
        <div className="label-cap">Activiteiten</div>
        <button className="link small" onClick={() => open({ type: 'activity' })}>+ Activiteit</button>
      </div>
      {day.activities.length === 0 ? (
        <div className="row">
          <div className="meal-icon" style={{ background: 'color-mix(in srgb, var(--steps) 16%, transparent)', color: 'var(--steps)' }}><I.flame /></div>
          <div className="grow">
            <b>Nog niets gelogd</b>
            <div className="small muted">Hardlopen, fietsen, padel of een training? Houd hier bij wat je deed.</div>
          </div>
        </div>
      ) : (
        <div className="list">
          {day.activities.map((a) => (
            <div key={a.id} className="item">
              <div className="ico">{a.workout ? <span className="i20" style={{ color: 'var(--brand)' }}><I.dumbbell /></span> : a.emoji}</div>
              <div className="grow">
                <div className="t">{a.name}</div>
                <div className="s num">{a.minutes} min{a.km ? ` · ${fmt(a.km, 1)} km` : ''}</div>
              </div>
              <b className="num" style={{ color: 'var(--fat)' }}>{fmt(a.kcal)} kcal</b>
              <button className="iconbtn" aria-label={`${a.name} verwijderen`} onClick={() => { useStore.getState().removeActivity(date, a.id); toast('Activiteit verwijderd'); }}>
                <I.trash />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function NoteCard({ date }: { date: string }) {
  const note = useDay(date).note;
  const open = useUI((s) => s.open);
  return (
    <button className="card note-card" onClick={() => open({ type: 'note', date })}>
      <span className="i20" style={{ color: 'var(--ink-2)' }}><I.note /></span>
      <span className="grow" style={{ textAlign: 'left', minWidth: 0 }}>
        <b>Notitie</b>
        <span className={'small' + (note ? '' : ' muted')} style={{ display: 'block', whiteSpace: 'pre-wrap' }}>{note || 'Hoe ging je dag? Schrijf het op.'}</span>
      </span>
      <span className="i18" style={{ color: 'var(--ink-3)' }}>{note ? <I.pencil /> : <I.plus />}</span>
    </button>
  );
}

const FEED_ICON: Record<FeedItem['kind'], { icon: () => ReactElement; color: string }> = {
  food: { icon: I.apple, color: 'var(--brand)' },
  water: { icon: I.drop, color: 'var(--water)' },
  activity: { icon: I.flame, color: 'var(--steps)' },
  workout: { icon: I.dumbbell, color: 'var(--fat)' },
  weight: { icon: I.scale, color: 'var(--carb)' },
};
const MEAL_NAME: Record<string, string> = { ontbijt: 'Ontbijt', lunch: 'Lunch', diner: 'Avondeten', snacks: 'Snacks' };

function RecentCard() {
  const days = useStore((s) => s.days);
  const weights = useStore((s) => s.weights);
  const { setTab, setDate } = useUI();
  const today = dateKey();
  const feed = useMemo(() => recentFeed(days, weights, today, 6), [days, weights, today]);
  if (!feed.length) return null;
  return (
    <section className="card stack">
      <div className="row between">
        <div className="label-cap">Recente activiteit</div>
        <button className="link small" onClick={() => setTab('kalender')}>Kalender</button>
      </div>
      <div className="feed">
        {feed.map((f, i) => {
          const m = FEED_ICON[f.kind];
          const Icon = m.icon;
          return (
            <button key={i} className="feed-row" onClick={() => { setDate(f.date); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              <span className="feed-ico" style={{ color: m.color, background: `color-mix(in srgb, ${m.color} 13%, transparent)` }}><Icon /></span>
              <span className="grow" style={{ minWidth: 0 }}>
                <span className="feed-t ellipsis">{f.title}</span>
                <span className="feed-s">{dayTitle(f.date, today).split(',')[0]} · {MEAL_NAME[f.sub] ?? f.sub}</span>
              </span>
              {f.value && <span className="small num" style={{ fontWeight: 700 }}>{f.value}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function MealCard({ meal, date, kcal, split }: { meal: MealKey; date: string; kcal: number; split: Record<MealKey, [number, number]> }) {
  const day = useDay(date);
  const open = useUI((s) => s.open);
  const entries = day.meals[meal];
  const sum = sumNutrients(entries);
  const [lo, hi] = mealRange(meal, kcal, split);
  const skipped = skipsMeal(meal, split);
  const meta = MEAL_META[meal];
  const Icon = meta.icon;
  const yesterday = useStore((s) => s.days[addDays(date, -1)]?.meals[meal]) ?? NONE;
  const idea = useMealIdea(meal, date, entries.length === 0 && date >= dateKey() && !skipped);
  const fill = hi ? sum.kcal / hi : 0;

  return (
    <div className={'card meal' + (skipped && !entries.length ? ' skipped' : '')}>
      <div className="meal-head">
        <div className="meal-icon" style={{ background: meta.tint, color: meta.color }}><Icon /></div>
        <div className="grow">
          <h3>{meta.label}</h3>
          <div className="small muted num">
            {entries.length
              ? `${fmt(sum.kcal)} kcal · ${fmt(sum.p)} g eiwit`
              : skipped ? 'Sla je over in je eetpatroon (16:8)' : `Aanbevolen ${fmt(lo)}–${fmt(hi)} kcal`}
          </div>
        </div>
        <button className={'addbtn' + (entries.length || skipped ? '' : ' solid')} onClick={() => open({ type: 'addFood', meal })} aria-label={`Toevoegen aan ${meta.label}`}>
          <I.plus />
        </button>
      </div>
      {entries.length > 0 && !skipped && (
        <div className="meal-fill" title={`Aanbevolen ${fmt(lo)}–${fmt(hi)} kcal`}>
          <i style={{ width: `${Math.min(100, fill * 100)}%`, background: fill > 1.15 ? 'var(--protein)' : meta.color }} />
          <span className="meal-fill-lo" style={{ left: `${(lo / hi) * 100}%` }} />
        </div>
      )}
      {entries.length > 0 && (
        <div className="entries">
          {entries.map((e) => (
            <button key={e.id} className="entry" onClick={() => open({ type: 'editEntry', meal, entryId: e.id })}>
              <FoodIcon cat={e.food.cat} size={34} />
              <div className="grow">
                <div className="name ellipsis">{e.food.name}</div>
                <div className="sub ellipsis">{e.label}{e.food.brand ? ` · ${e.food.brand}` : ''}</div>
              </div>
              <span className="kc num">{fmt(entryNutrients(e).kcal)}</span>
            </button>
          ))}
        </div>
      )}
      {idea && <MealIdea meal={meal} recipe={idea.recipe} factor={idea.factor} kcal={idea.n.kcal} protein={idea.n.p} />}
      {(entries.length > 0 || yesterday.length > 0) && (
        <div className="meal-actions">
          {entries.length === 0 && yesterday.length > 0 && (
            <button className="tag" onClick={() => { const n = useStore.getState().copyMeal(addDays(date, -1), date, meal); if (n) toast(`${meta.label} van gisteren gekopieerd`); }}>
              <span className="i14"><I.copy /></span> Zelfde als gisteren
            </button>
          )}
          {entries.length > 0 && (
            <button className="tag" onClick={() => open({ type: 'copy', from: date, meal })}>
              <span className="i14"><I.copy /></span> Kopiëren
            </button>
          )}
          {entries.length > 1 && (
            <button className="tag" onClick={() => open({ type: 'saveMeal', meal })}>
              <span className="i14"><I.bookmark /></span> Bewaren als maaltijd
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Het beste recept voor een lege maaltijd, afgestemd op wat je vandaag nog over hebt. */
function useMealIdea(meal: MealKey, date: string, enabled: boolean) {
  const room = useMealRoom(meal, date);
  const prefs = useStore((s) => s.recipePrefs);
  const favorites = useStore((s) => s.favRecipes);
  const days = useStore((s) => s.days);
  return useMemo(() => {
    if (!enabled || !room) return null;
    return suggest(meal, room, { prefs, favorites, recent: recentlyEaten(days, date), seed: date })[0] ?? null;
  }, [enabled, room, meal, prefs, favorites, days, date]);
}

/** Smal scherm (kleine telefoons): compactere dagring. */
function useNarrow(limit = 380) {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < limit);
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < limit);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [limit]);
  return narrow;
}

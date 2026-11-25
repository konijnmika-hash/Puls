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
import { recentlyEaten, suggest } from '../lib/recipes';

const NONE: never[] = [];

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
  const { eaten, burned } = dayTotals(day);
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
          <Logo size={36} />
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

      <WeekStrip date={date} today={today} onPick={setDate} target={t.kcal} />

      <section className="daycard" aria-label="Calorieën vandaag">
        <div className="ringwrap">
          <div className="stat">
            <div className="v num">{fmt(eaten.kcal)}</div>
            <div className="l">Gegeten</div>
          </div>
          <Ring size={narrow ? 150 : 186} stroke={narrow ? 13 : 15} value={eaten.kcal / budget} color={over ? 'var(--protein)' : 'var(--brand)'}>
            <div className="ring-center">
              <div className="cap">{over ? 'Te veel' : 'Nog over'}</div>
              <div className="big num">{fmt(Math.abs(remaining))}</div>
              <div className="goal num">doel {fmt(t.kcal)} kcal</div>
            </div>
          </Ring>
          <div className="stat">
            <div className="v num">{fmt(burned)}</div>
            <div className="l">Verbrand</div>
          </div>
        </div>
        <div className="macros">
          <Macro name="Eiwit" v={eaten.p} t={t.p} color="var(--protein)" />
          <Macro name="Koolh." v={eaten.c} t={t.c} color="var(--carb)" />
          <Macro name="Vet" v={eaten.f} t={t.f} color="var(--fat)" />
          <Macro name="Vezels" v={eaten.fib} t={t.fib} color="var(--fiber)" />
        </div>
      </section>

      <div className="section-title">
        <h2>Voedingslogboek</h2>
        <span className="small muted num">{fmt(eaten.kcal)} kcal</span>
      </div>
      {MEALS.map((m) => (
        <MealCard key={m} meal={m} date={date} kcal={t.kcal} split={t.split} />
      ))}

      <div className="section-title">
        <h2>Water & sport</h2>
      </div>
      <div className="grid2">
        <WaterCard date={date} />
        <StepsCard date={date} heightCm={profile.heightCm} target={t.steps} />
      </div>

      <TrainingTeaser date={date} />

      <div className="section-title">
        <h2>Activiteiten</h2>
        <button className="link" onClick={() => open({ type: 'activity' })}>+ Activiteit</button>
      </div>
      <div className="card">
        {day.activities.length === 0 ? (
          <div className="row">
            <div className="meal-icon" style={{ background: 'color-mix(in srgb, var(--steps) 16%, transparent)', color: 'var(--steps)' }}><I.flame /></div>
            <div className="grow">
              <b>Nog niets gelogd</b>
              <div className="small muted">Hardlopen, fietsen of een training? Houd hier bij wat je verbrandt. Dit komt niet bij je eetbudget.</div>
            </div>
          </div>
        ) : (
          <div className="list">
            {day.activities.map((a) => (
              <div key={a.id} className="item">
                <div className="ico">{a.workout ? <span className="i20" style={{ color: 'var(--brand)' }}><I.dumbbell /></span> : a.emoji}</div>
                <div className="grow">
                  <div className="t">{a.name}</div>
                  <div className="s num">{a.minutes} min</div>
                </div>
                <b className="num" style={{ color: 'var(--steps)' }}>−{fmt(a.kcal)} kcal</b>
                <button className="iconbtn" aria-label={`${a.name} verwijderen`} onClick={() => { useStore.getState().removeActivity(date, a.id); toast('Activiteit verwijderd'); }}>
                  <I.trash />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 8 }}>
        <CoachCard date={date} />
      </div>
    </div>
  );
}

function Bell() {
  const ctx = useCoachCtx(dateKey());
  const open = useUI((s) => s.open);
  const n = ctx ? coachFeed(ctx).filter((m) => m.tone === 'nudge').length : 0;
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
        <button className="arrow" onClick={() => onPick(addDays(date, 7))} aria-label="Volgende week"><I.right /></button>
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

function Glass({ pct }: { pct: number }) {
  const h = 52 * Math.min(1, pct);
  return (
    <svg className="glass" viewBox="0 0 46 62" aria-hidden>
      <defs>
        <clipPath id="glassclip"><path d="M4 4h38l-4.5 52a3 3 0 01-3 2.7H11.5a3 3 0 01-3-2.7z" /></clipPath>
      </defs>
      <g clipPath="url(#glassclip)">
        <rect x="0" y="0" width="46" height="62" fill="color-mix(in srgb, var(--water) 10%, transparent)" />
        <g style={{ transform: `translateY(${58 - h}px)`, transition: 'transform 0.6s cubic-bezier(.2,.8,.2,1)' }}>
          <path d="M-46 3 q11.5 -6 23 0 t23 0 t23 0 t23 0 t23 0 V70 H-46z" fill="var(--water)" opacity="0.9">
            <animateTransform attributeName="transform" type="translate" from="0 0" to="46 0" dur="2.4s" repeatCount="indefinite" />
          </path>
        </g>
      </g>
      <path d="M4 4h38l-4.5 52a3 3 0 01-3 2.7H11.5a3 3 0 01-3-2.7z" fill="none" stroke="var(--water)" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

function WaterCard({ date }: { date: string }) {
  const day = useDay(date);
  const glass = useStore((s) => s.glassMl);
  const setWater = useStore((s) => s.setWater);
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
    <div className="card water">
      <div className="label-cap" style={{ color: 'var(--water)' }}>Water</div>
      <div className="top">
        <Glass pct={pct} />
        <div className="kpi num">
          {liters(ml)}<small> / {liters(target)} L</small>
        </div>
      </div>
      <div className={cls}>{hint}</div>
      <div className="pillbtns">
        <button onClick={() => setWater(date, ml - glass)} aria-label="Glas eraf">−</button>
        <button className="primary" onClick={() => setWater(date, ml + glass)} aria-label={`Glas water toevoegen (${glass} ml)`}>+ glas</button>
      </div>
    </div>
  );
}

function StepsCard({ date, target, heightCm }: { date: string; target: number; heightCm: number }) {
  const day = useDay(date);
  const open = useUI((s) => s.open);
  const pct = day.steps / target;
  return (
    <div className="card water">
      <div className="label-cap" style={{ color: 'var(--steps)' }}>Stappen</div>
      <div className="top">
        <Ring size={52} stroke={6} value={pct} color="var(--steps)"><span style={{ color: 'var(--steps)', width: 22, height: 22, display: 'grid' }}><I.shoe /></span></Ring>
        <div className="kpi num">
          {fmt(day.steps)}
          <small><br />van {fmt(target)}</small>
        </div>
      </div>
      <div className={'hint' + (pct >= 1 ? ' good' : '')}>
        {pct >= 1 ? 'Doel gehaald' : `${fmt(stepsToKm(day.steps, heightCm), 1)} km · nog ${fmt(Math.max(0, target - day.steps))}`}
      </div>
      <div className="pillbtns">
        <button onClick={() => open({ type: 'steps' })}>Invoeren</button>
        <button className="primary steps" onClick={() => open({ type: 'connect' })} aria-label="Stappen koppelen"><span style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: '-3px' }}><I.link /></span></button>
      </div>
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
        <div className="tiny" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Training vandaag</div>
        <b>{wd.name}</b>
        <div className="small muted">{wd.exercises.length} oefeningen · ± {wd.estMinutes} min</div>
      </button>
      {done ? (
        <span className="tag brand"><span style={{ width: 14, height: 14, display: 'inline-block' }}><I.check /></span> Klaar</span>
      ) : (
        <button className="btn sm" onClick={() => startSession(wd.id)}>Start</button>
      )}
    </div>
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
      {(entries.length > 1 || (entries.length === 0 && yesterday.length > 0)) && (
        <div className="meal-actions">
          {entries.length === 0 && yesterday.length > 0 && (
            <button className="tag" onClick={() => { useStore.getState().copyMeal(addDays(date, -1), date, meal); toast(`${meta.label} van gisteren gekopieerd`); }}>
              <span className="i14"><I.copy /></span> Zelfde als gisteren
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

import { useMemo, useRef, useState } from 'react';
import { entryNutrients, sumNutrients } from '../lib/calc';
import { addDays, DAY_SHORT, dateKey, fmt, liters, parseKey } from '../lib/date';
import { dayTotals, useTargets } from '../lib/hooks';
import { burnedOn, foodCount, monthStart, trainingsOn, waterTargetFor } from '../lib/stats';
import { emptyDay, useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { MEALS } from '../lib/types';
import { I, Ring } from '../components/ui';
import { PageHead } from '../components/Nav';
import { FoodIcon } from '../components/FoodIcon';
import { MEAL_META } from './Today';

const NONE: string[] = [];

const shiftMonth = (key: string, n: number) => {
  const d = parseKey(key);
  return dateKey(new Date(d.getFullYear(), d.getMonth() + n, 1));
};

export function CalendarScreen() {
  const today = dateKey();
  const uiDate = useUI((s) => s.date);
  const [sel, setSel] = useState(uiDate <= today ? uiDate : today);
  const [month, setMonth] = useState(monthStart(sel));
  const days = useStore((s) => s.days);
  const profile = useStore((s) => s.profile)!;
  const t = useTargets()!;
  const detailRef = useRef<HTMLDivElement>(null);
  // op de telefoon staat het dagoverzicht onder de kalender: schuif het in beeld na een tik
  const pick = (k: string) => {
    setSel(k);
    if (window.innerWidth < 1024) requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const cells = useMemo(() => {
    const first = parseKey(month);
    const lead = (first.getDay() + 6) % 7;
    const start = addDays(month, -lead);
    const n = Math.ceil((lead + new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()) / 7) * 7;
    return Array.from({ length: n }, (_, i) => addDays(start, i));
  }, [month]);

  const inMonth = cells.filter((k) => k.slice(0, 7) === month.slice(0, 7) && k <= today);
  const logged = inMonth.filter((k) => foodCount(days[k]) > 0);
  const avg = logged.length ? logged.reduce((s, k) => s + dayTotals(days[k]).eaten.kcal, 0) / logged.length : 0;
  const trainings = inMonth.reduce((s, k) => s + trainingsOn(days[k]), 0);
  const title = parseKey(month).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });

  return (
    <div className="page">
      <PageHead title="Kalender" sub="Terugkijken op elke dag" hub />
      <div className="cols cal-cols">
        <div className="col">
          <section className="card cal">
            <div className="cal-head">
              <button className="iconbtn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Vorige maand"><I.left /></button>
              <b className="cal-title">{title}</b>
              <button className="iconbtn" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= monthStart(today)} aria-label="Volgende maand"><I.right /></button>
            </div>
            <div className="cal-grid" role="grid" aria-label={title}>
              {DAY_SHORT.map((d) => <span key={d} className="cal-dow" role="columnheader">{d}</span>)}
              {cells.map((k) => {
                const d = days[k];
                const other = k.slice(0, 7) !== month.slice(0, 7);
                const future = k > today;
                const kcal = d ? dayTotals(d).eaten.kcal : 0;
                const pct = kcal / t.kcal;
                const color = pct > 1.1 ? 'var(--protein)' : pct >= 0.85 ? 'var(--brand)' : 'var(--carb)';
                const water = !!d && d.waterMl >= waterTargetFor(profile, t, k);
                const trained = trainingsOn(d) > 0;
                return (
                  <button
                    key={k} role="gridcell"
                    className={'cal-day' + (k === sel ? ' sel' : '') + (k === today ? ' today' : '') + (other ? ' other' : '')}
                    disabled={future}
                    onClick={() => { pick(k); if (other) setMonth(monthStart(k)); }}
                    aria-selected={k === sel}
                    aria-label={`${parseKey(k).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}${kcal ? `, ${fmt(kcal)} kcal` : ''}${water ? ', waterdoel gehaald' : ''}${trained ? ', getraind' : ''}${d?.note ? ', notitie' : ''}`}
                  >
                    <Ring size={34} stroke={3} value={kcal ? Math.min(1, pct) : 0} color={color}>
                      <span className="cal-n num">{parseKey(k).getDate()}</span>
                    </Ring>
                    <span className="cal-dots" aria-hidden>
                      <i className={water ? 'w' : ''} />
                      <i className={trained ? 't' : ''} />
                      <i className={d?.note ? 'n' : ''} />
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="cal-legend tiny">
              <span><i className="ring" /> calorieën</span>
              <span><i className="w" /> waterdoel</span>
              <span><i className="t" /> training</span>
              <span><i className="n" /> notitie</span>
            </div>
          </section>
          <div className="kpis three">
            <div className="tile"><div className="v num">{logged.length}<small>/{inMonth.length}</small></div><div className="l">dagen bijgehouden</div></div>
            <div className="tile"><div className="v num">{avg ? fmt(avg) : '–'}</div><div className="l">kcal gemiddeld</div></div>
            <div className="tile"><div className="v num">{trainings}</div><div className="l">trainingen</div></div>
          </div>
        </div>
        <div className="col" ref={detailRef} style={{ scrollMarginTop: 12 }}>
          <DayDetail date={sel} />
        </div>
      </div>
    </div>
  );
}

function DayDetail({ date }: { date: string }) {
  const day = useStore((s) => s.days[date]) ?? emptyDay();
  const profile = useStore((s) => s.profile)!;
  const habits = useStore((s) => s.goals.habits);
  const checked = useStore((s) => s.habitLog[date]) ?? NONE;
  const t = useTargets()!;
  const { open, setDate, setTab } = useUI();
  const { eaten, count } = dayTotals(day);
  const water = waterTargetFor(profile, t, date);
  const burned = burnedOn(day, profile.weightKg, profile.heightCm);
  const title = parseKey(date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  const goTo = () => { setDate(date); setTab('vandaag'); };
  const doneHabits = habits.filter((h) => checked.includes(h.id));

  return (
    <section className="card stack day-detail" aria-live="polite">
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="label-cap">{date === dateKey() ? 'Vandaag' : 'Dagoverzicht'}</div>
          <h2 className="dd-title">{title[0].toUpperCase() + title.slice(1)}</h2>
        </div>
        <button className="btn sm" onClick={goTo}>Open dagboek</button>
      </div>

      <div className="dd-rings">
        <DDRing label="Calorieën" v={eaten.kcal} goal={t.kcal} text={`${fmt(eaten.kcal)}`} unit="kcal" color={eaten.kcal > t.kcal * 1.1 ? 'var(--protein)' : 'var(--brand)'} />
        <DDRing label="Eiwit" v={eaten.p} goal={t.p} text={`${fmt(eaten.p)}`} unit="g" color="var(--protein)" />
        <DDRing label="Water" v={day.waterMl} goal={water} text={liters(day.waterMl)} unit="L" color="var(--water)" />
        <DDRing label="Stappen" v={day.steps} goal={t.steps} text={day.steps >= 10000 ? `${fmt(day.steps / 1000, 1)}k` : fmt(day.steps)} unit="" color="var(--steps)" />
      </div>

      {count > 0 ? (
        <>
          <div className="dd-macros num">
            <span><i style={{ background: 'var(--protein)' }} />Eiwit <b>{fmt(eaten.p)} g</b></span>
            <span><i style={{ background: 'var(--carb)' }} />Koolh. <b>{fmt(eaten.c)} g</b></span>
            <span><i style={{ background: 'var(--fat)' }} />Vet <b>{fmt(eaten.f)} g</b></span>
            <span><i style={{ background: 'var(--fiber)' }} />Vezels <b>{fmt(eaten.fib)} g</b></span>
          </div>
          <div className="dd-meals">
            {MEALS.filter((m) => day.meals[m].length).map((m) => {
              const n = sumNutrients(day.meals[m]);
              return (
                <div key={m} className="dd-meal">
                  <div className="row between"><b>{MEAL_META[m].label}</b><span className="small num muted">{fmt(n.kcal)} kcal · {fmt(n.p)} g eiwit</span></div>
                  {day.meals[m].map((e) => (
                    <div key={e.id} className="dd-entry">
                      <FoodIcon cat={e.food.cat} size={26} />
                      <span className="grow ellipsis">{e.food.name}</span>
                      <span className="tiny">{e.label}</span>
                      <span className="small num">{fmt(entryNutrients(e).kcal)}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <button className="link small" style={{ alignSelf: 'flex-start', color: 'var(--brand)', fontWeight: 700 }} onClick={() => open({ type: 'copy', from: date })}>
            <span className="i14" style={{ verticalAlign: '-2px' }}><I.copy /></span> Deze dag kopiëren naar een andere dag
          </button>
        </>
      ) : (
        <p className="small muted" style={{ margin: 0 }}>Geen eten bijgehouden op deze dag.</p>
      )}

      {(day.activities.length > 0 || burned.fromSteps > 0) && (
        <div className="dd-block">
          <div className="label-cap">Beweging</div>
          {day.activities.map((a) => (
            <div key={a.id} className="dd-entry">
              <span className="dd-em">{a.workout ? '🏋️' : a.emoji}</span>
              <span className="grow ellipsis">{a.name}</span>
              <span className="tiny num">{a.minutes} min{a.km ? ` · ${fmt(a.km, 1)} km` : ''}</span>
              <span className="small num">{fmt(a.kcal)} kcal</span>
            </div>
          ))}
          <div className="tiny num">Verbrand: {fmt(burned.logged)} kcal geregistreerd · ± {fmt(burned.fromSteps)} kcal geschat uit {fmt(day.steps)} stappen</div>
        </div>
      )}

      {(day.sips?.length ?? 0) > 0 && (
        <div className="dd-block">
          <div className="label-cap" style={{ color: 'var(--water)' }}>Water</div>
          <div className="tiny num">{day.sips!.map((s) => `${new Date(s.t).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })} ${s.ml} ml`).join(' · ')}</div>
        </div>
      )}

      {doneHabits.length > 0 && (
        <div className="dd-block">
          <div className="label-cap">Gewoontes</div>
          <div className="chips">{doneHabits.map((h) => <span key={h.id} className="tag brand">{h.em} {h.name}</span>)}</div>
        </div>
      )}

      <div className="dd-note">
        <div className="row between">
          <div className="label-cap">Notitie</div>
          <button className="link small" style={{ color: 'var(--brand)', fontWeight: 700 }} onClick={() => open({ type: 'note', date })}>{day.note ? 'Bewerken' : '+ Notitie'}</button>
        </div>
        {day.note ? <p className="small" style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{day.note}</p> : <p className="tiny" style={{ margin: '4px 0 0' }}>Schrijf op hoe je je voelde, hoe je sliep of waarom deze dag anders was.</p>}
      </div>
    </section>
  );
}

function DDRing({ label, v, goal, text, unit, color }: { label: string; v: number; goal: number; text: string; unit: string; color: string }) {
  return (
    <div className="dd-ring">
      <Ring size={62} stroke={6} value={goal ? v / goal : 0} color={color}>
        <span className="dd-ring-v num">{text}<small>{unit}</small></span>
      </Ring>
      <span className="tiny">{label}</span>
      <span className="tiny num" style={{ fontWeight: 700, color: 'var(--ink-2)' }}>{goal ? Math.round((v / goal) * 100) : 0}%</span>
    </div>
  );
}

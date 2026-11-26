import { useId, useMemo, useState } from 'react';
import { calcTargets } from '../lib/calc';
import { addDays, dateKey, DAY_SHORT, dayTitle, fmt, liters, weekday } from '../lib/date';
import { useDay, useEnergyInsight, useTargets, useWaterTarget } from '../lib/hooks';
import { waterTargetFor } from '../lib/stats';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { MiniBars } from './charts';
import { I, NumField, Sheet, Stepper, toast } from './ui';

/** Glas dat zich vult, met een rustige golf. */
export function Glass({ pct, size = 46 }: { pct: number; size?: number }) {
  const id = useId().replace(/:/g, '');
  const h = 52 * Math.min(1, Math.max(0, pct));
  return (
    <svg className="glass" viewBox="0 0 46 62" style={{ width: size, height: (size * 62) / 46 }} aria-hidden>
      <defs>
        <clipPath id={`g${id}`}><path d="M4 4h38l-4.5 52a3 3 0 01-3 2.7H11.5a3 3 0 01-3-2.7z" /></clipPath>
      </defs>
      <g clipPath={`url(#g${id})`}>
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

const AMOUNTS = [
  { ml: 150, label: 'Kopje', em: '☕' },
  { ml: 250, label: 'Glas', em: '🥛' },
  { ml: 330, label: 'Blikje', em: '🥫' },
  { ml: 500, label: 'Flesje', em: '🧴' },
];

const time = (t: number) => new Date(t).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

export function WaterSheet() {
  const { date, close } = useUI();
  const day = useDay(date);
  const target = useWaterTarget(date);
  const glass = useStore((s) => s.glassMl);
  const profile = useStore((s) => s.profile)!;
  const days = useStore((s) => s.days);
  const t = useTargets()!;
  const insight = useEnergyInsight();
  const [custom, setCustom] = useState(0);
  const [editGoal, setEditGoal] = useState(false);
  const advice = calcTargets({ ...profile, custom: { ...profile.custom, waterMl: undefined } }, insight).waterMl;
  const [goal, setGoal] = useState(profile.custom?.waterMl ?? advice);
  const ml = day.waterMl;
  const pct = ml / target;
  const add = (n: number) => {
    useStore.getState().addWater(date, n);
    navigator.vibrate?.(15);
    toast(`+${fmt(n)} ml water`);
  };
  const history = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const k = addDays(date, i - 6);
      return { label: DAY_SHORT[weekday(k)], title: dayTitle(k), value: days[k]?.waterMl ?? 0, goal: waterTargetFor(profile, t, k) };
    }),
    [date, days, profile, t],
  );
  const amounts = AMOUNTS.some((a) => a.ml === glass) ? AMOUNTS : [...AMOUNTS, { ml: glass, label: 'Jouw glas', em: '🥛' }].sort((a, b) => a.ml - b.ml);
  const saveGoal = () => {
    useStore.getState().updateProfile({ custom: { ...profile.custom, waterMl: goal === advice ? undefined : goal } });
    toast(`Waterdoel: ${liters(goal)} liter`);
    setEditGoal(false);
  };

  return (
    <Sheet onClose={close} title={`Water · ${dayTitle(date).split(',')[0].toLowerCase()}`}>
      <div className="stack">
        <section className="water-hero">
          <Glass pct={pct} size={78} />
          <div className="grow">
            <div className="water-big num">{liters(ml)}<small> / {liters(target)} L</small></div>
            <div className="small muted">{pct >= 1 ? 'Doel gehaald. Goed bezig!' : `Nog ${fmt(Math.max(0, target - ml))} ml, ongeveer ${Math.ceil(Math.max(0, target - ml) / glass)} ${Math.ceil(Math.max(0, target - ml) / glass) === 1 ? 'glas' : 'glazen'}`}</div>
            <div className="water-track" aria-hidden><i style={{ width: `${Math.min(100, pct * 100)}%` }} /></div>
          </div>
        </section>

        <div className="water-amounts" role="group" aria-label="Water toevoegen">
          {amounts.map((a) => (
            <button key={a.ml} className="water-amt" onClick={() => add(a.ml)} aria-label={`${a.label} toevoegen, ${a.ml} ml`}>
              <span className="em">{a.em}</span>
              <b className="num">+{a.ml}</b>
              <span>{a.label}</span>
            </button>
          ))}
        </div>
        <div className="row">
          <NumField className="input num" value={custom} onValue={setCustom} placeholder="Eigen hoeveelheid in ml" aria-label="Eigen hoeveelheid in ml" />
          <button className="btn sm" style={{ height: 50 }} disabled={custom <= 0 || custom > 2000} onClick={() => { add(Math.round(custom)); setCustom(0); }}>Toevoegen</button>
        </div>
        {custom > 2000 && <span className="hint warn">Voeg maximaal 2 liter per keer toe.</span>}

        <div className="section-title" style={{ marginTop: 4 }}><h2 style={{ fontSize: 17 }}>Vandaag gedronken</h2>{ml > 0 && <button className="link small" onClick={() => { useStore.getState().setWater(date, 0); toast('Water van deze dag gewist'); }}>Alles wissen</button>}</div>
        <div className="card" style={{ padding: '2px 14px' }}>
          {day.sips?.length ? (
            <div className="list">
              {[...day.sips].map((s, i) => ({ s, i })).reverse().map(({ s, i }) => (
                <div key={s.t + '-' + i} className="item">
                  <div className="ico" style={{ color: 'var(--water)', background: 'color-mix(in srgb, var(--water) 12%, transparent)' }}><span className="i20"><I.drop /></span></div>
                  <div className="grow"><div className="t num">{fmt(s.ml)} ml</div><div className="s num">{time(s.t)}</div></div>
                  <button className="iconbtn" onClick={() => { useStore.getState().removeSip(date, i); toast(`${s.ml} ml weggehaald`); }} aria-label={`${s.ml} ml van ${time(s.t)} weghalen`}><I.trash /></button>
                </div>
              ))}
            </div>
          ) : (
            <div className="item"><span className="small muted">{ml > 0 ? `${fmt(ml)} ml in totaal (zonder tijden).` : 'Nog niets gedronken. Tik hierboven op een hoeveelheid.'}</span></div>
          )}
        </div>

        <div className="section-title" style={{ marginTop: 4 }}><h2 style={{ fontSize: 17 }}>Afgelopen week</h2><span className="tiny">{history.filter((h) => h.value >= h.goal).length}/7 dagen doel gehaald</span></div>
        <div className="card">
          <MiniBars data={history} color="var(--water)" target={target} format={(v) => liters(v)} />
        </div>

        <div className="card stack">
          <div className="row between">
            <div>
              <b>Dagelijks waterdoel</b>
              <div className="small muted num">{liters(profile.custom?.waterMl ?? advice)} L{profile.custom?.waterMl ? ' (eigen doel)' : ` (advies, +0,5 L op trainingsdagen)`}</div>
            </div>
            {!editGoal && <button className="btn sm ghost" onClick={() => setEditGoal(true)}>Aanpassen</button>}
          </div>
          {editGoal && (
            <>
              <Stepper id="water-goal" value={goal} onChange={setGoal} step={250} min={1000} max={5000} />
              {goal > 4000 && <span className="hint warn">Meer dan 4 liter per dag is bijna nooit nodig. Drink vooral op je dorst en bij warmte of sport wat extra.</span>}
              <div className="row">
                <button className="btn outline sm" onClick={() => setGoal(advice)}>Advies ({liters(advice)} L)</button>
                <button className="btn sm grow" onClick={saveGoal}>Opslaan</button>
              </div>
            </>
          )}
          <div className="row between">
            <span className="small">Eén glas is</span>
            <div className="seg">
              {[200, 250, 330].map((g) => <button key={g} className={glass === g ? 'on' : ''} onClick={() => useStore.getState().setSettings({ glassMl: g })}>{g} ml</button>)}
            </div>
          </div>
        </div>
        {date !== dateKey() && <p className="tiny" style={{ margin: 0, textAlign: 'center' }}>Je past {dayTitle(date).toLowerCase()} aan.</p>}
      </div>
    </Sheet>
  );
}

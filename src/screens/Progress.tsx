import { useMemo, useState } from 'react';
import { bmi } from '../lib/calc';
import { addDays, dateKey, fmt, liters, parseKey } from '../lib/date';
import { useEnergyInsight, useTargets } from '../lib/hooks';
import { forecast, insightNeeds, weightRate, weightTrend } from '../lib/insights';
import { buckets, change, type Bucket, type Period } from '../lib/stats';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { Bar, I, toast } from '../components/ui';
import { BarChart2, StackedBars, TrendLine, type BarDatum } from '../components/charts';
import { PageHead } from '../components/Nav';

const longDate = (key: string) => parseKey(key).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });
const shortDate = (key: string) => parseKey(key).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }).replace('.', '');

const PERIODS: [Period, string][] = [['dag', 'Dag'], ['week', 'Week'], ['maand', 'Maand']];
const UNIT: Record<Period, string> = { dag: 'per dag', week: 'per week', maand: 'per maand' };

/** Gemiddelden en totalen over alle balken in beeld. */
function summarize(bs: Bucket[]) {
  const logged = bs.reduce((s, b) => s + b.loggedDays, 0);
  const w = (k: 'kcal' | 'p' | 'c' | 'f' | 'fib') => (logged ? bs.reduce((s, b) => s + b[k] * b.loggedDays, 0) / logged : 0);
  const elapsed = bs.reduce((s, b) => s + b.elapsed, 0);
  return {
    logged, elapsed, kcal: w('kcal'), p: w('p'), c: w('c'), f: w('f'), fib: w('fib'),
    trainings: bs.reduce((s, b) => s + b.trainings, 0),
    activeMin: bs.reduce((s, b) => s + b.activeMin, 0),
    waterGoalDays: bs.reduce((s, b) => s + b.waterGoalDays, 0),
    burned: bs.reduce((s, b) => s + b.burnedLogged, 0),
  };
}

export function Progress() {
  const days = useStore((s) => s.days);
  const weights = useStore((s) => s.weights);
  const profile = useStore((s) => s.profile)!;
  const goals = useStore((s) => s.goals);
  const t = useTargets()!;
  const [period, setPeriod] = useState<Period>('dag');
  const [page, setPage] = useState(0);
  const today = dateKey();
  const ctx = useMemo(() => ({ profile, t }), [profile, t]);
  const bs = useMemo(() => buckets(period, days, weights, ctx, today, page), [period, days, weights, ctx, today, page]);
  const prev = useMemo(() => buckets(period, days, weights, ctx, today, page + 1), [period, days, weights, ctx, today, page]);
  const sum = summarize(bs);
  const before = summarize(prev);
  const rangeTitle = `${shortDate(bs[0].from)} – ${shortDate(bs[bs.length - 1].to > today ? today : bs[bs.length - 1].to)}`;
  const days7 = period === 'dag' ? 1 : period === 'week' ? 7 : 30.4;

  const pick = (p: Period) => { setPeriod(p); setPage(0); };
  /** `tracked`: was er in deze periode iets bijgehouden voor dit onderdeel? Zo niet, dan tonen we "–" in plaats van 0. */
  const bar = (b: Bucket, value: number, note?: string, tracked = true): BarDatum => ({ label: b.label, title: b.title, value, note, empty: (b.future && b.elapsed === 0) || !tracked });
  const per = period === 'dag' ? '' : ' gem. per dag';

  return (
    <div className="page">
      <PageHead title="Statistieken" sub="Hoe het gaat, per dag, week en maand" hub />

      <div className="stat-controls">
        <div className="seg" role="tablist" aria-label="Weergave">
          {PERIODS.map(([p, l]) => <button key={p} role="tab" aria-selected={period === p} className={period === p ? 'on' : ''} onClick={() => pick(p)}>{l}</button>)}
        </div>
        <div className="period-nav">
          <button className="iconbtn" onClick={() => setPage(page + 1)} aria-label="Eerdere periode"><I.left /></button>
          <span className="num">{rangeTitle}</span>
          <button className="iconbtn" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} aria-label="Latere periode"><I.right /></button>
        </div>
      </div>

      <div className="kpis">
        <Kpi v={sum.kcal ? fmt(sum.kcal) : '–'} u="kcal" l="gemiddeld per gelogde dag" delta={change(sum.kcal, before.kcal)} neutral />
        <Kpi v={`${sum.logged}`} u={`/${sum.elapsed}`} l="dagen bijgehouden" delta={change(sum.logged, before.logged)} />
        <Kpi v={`${sum.trainings}`} u="×" l="trainingen" delta={change(sum.trainings, before.trainings)} />
        <Kpi v={fmt(sum.activeMin)} u="min" l="actief bewogen" delta={change(sum.activeMin, before.activeMin)} />
      </div>

      <div className="card-grid">
        <section className="card stack">
          <CardHead title="Calorieën" sub={`doel ${fmt(t.kcal)} kcal`} />
          <BarChart2 data={bs.map((b) => bar(b, Math.round(b.kcal), period === 'dag' ? undefined : `${b.loggedDays} ${b.loggedDays === 1 ? 'dag' : 'dagen'} gelogd`, b.loggedDays > 0))} color="var(--brand)" overColor="var(--protein)" target={t.kcal} targetLabel="je doel" format={(v) => `${fmt(v)} kcal${per}`} />
          <p className="tiny" style={{ margin: 0 }}>Stippellijn = je dagdoel. {period !== 'dag' && 'Week en maand tonen het gemiddelde over de dagen die je bijhield.'}</p>
        </section>

        <section className="card stack">
          <CardHead title="Eiwit, koolhydraten en vet" sub="energie in kcal" />
          <StackedBars
            unit="kcal"
            series={[{ key: 'p', label: 'Eiwit', color: 'var(--protein)' }, { key: 'c', label: 'Koolhydraten', color: 'var(--carb)' }, { key: 'f', label: 'Vet', color: 'var(--fat)' }]}
            data={bs.map((b) => ({ label: b.label, title: b.title, empty: !b.loggedDays, values: { p: b.p * 4, c: b.c * 4, f: b.f * 9 } }))}
            format={(v) => `${fmt(v)} kcal`}
          />
          {sum.logged > 0 ? (
            <div className="avg-rows">
              <AvgRow name="Eiwit" v={sum.p} goal={t.p} color="var(--protein)" />
              <AvgRow name="Koolhydraten" v={sum.c} goal={t.c} color="var(--carb)" />
              <AvgRow name="Vet" v={sum.f} goal={t.f} color="var(--fat)" />
              <AvgRow name="Vezels" v={sum.fib} goal={t.fib} color="var(--fiber)" />
            </div>
          ) : <p className="small muted" style={{ margin: 0 }}>Nog niets gelogd in deze periode.</p>}
          {sum.logged > 0 && sum.p < t.p * 0.8 && <p className="tiny" style={{ margin: 0 }}>Eiwit blijft wat achter. Kwark, skyr, eieren, kip, vis, tofu en peulvruchten helpen.</p>}
          {sum.logged > 0 && sum.fib < t.fib * 0.7 && <p className="tiny" style={{ margin: 0 }}>Meer vezels? Kies volkoren, peulvruchten, groente en fruit met schil.</p>}
        </section>

        <section className="card stack">
          <CardHead title="Water" sub={`doel ± ${liters(t.waterMl)} L`} color="var(--water)" />
          <BarChart2 data={bs.map((b) => bar(b, Math.round(b.water), period === 'dag' ? undefined : `doel gehaald op ${b.waterGoalDays} ${b.waterGoalDays === 1 ? 'dag' : 'dagen'}`, b.waterDays > 0))} color="var(--water)" target={t.waterMl} format={(v) => `${liters(v)} L${per}`} tick={(v) => `${liters(v)} L`} />
        </section>

        <section className="card stack">
          <CardHead title="Stappen" sub={`doel ${fmt(t.steps)}`} color="var(--steps)" />
          <BarChart2 data={bs.map((b) => bar(b, Math.round(b.steps), undefined, b.stepDays > 0))} color="var(--steps)" target={t.steps} format={(v) => `${fmt(v)} stappen${per}`} />
        </section>

        <section className="card stack">
          <CardHead title="Sport en activiteiten" sub={`actieve minuten ${UNIT[period]}`} color="var(--steps)" />
          <BarChart2
            data={bs.map((b) => bar(b, b.activeMin, b.burnedLogged ? `${fmt(b.burnedLogged)} kcal geregistreerd` : undefined))}
            color="var(--fat)"
            target={Math.round(goals.activeMin * days7 / 7)}
            targetLabel="je doel"
            format={(v) => `${fmt(v)} min`}
          />
          <p className="tiny" style={{ margin: 0 }}>Doel: {fmt(goals.activeMin)} minuten per week{goals.activeMin === 150 ? ' (advies van de Gezondheidsraad)' : ''}. Kcal zijn wat je zelf registreerde bij je activiteiten.</p>
        </section>

        <section className="card stack">
          <CardHead title="Trainingsfrequentie" sub={`trainingen ${UNIT[period]}`} color="var(--brand)" />
          <BarChart2
            data={bs.map((b) => bar(b, b.trainings))}
            color="var(--brand)"
            target={period === 'dag' ? undefined : Math.round(goals.trainings * days7 / 7)}
            targetLabel="je doel"
            format={(v) => `${fmt(v)} ${v === 1 ? 'training' : 'trainingen'}`}
          />
          <p className="tiny" style={{ margin: 0 }}>Telt je schema- en eigen trainingen en sport van minstens 20 minuten. Doel: {goals.trainings}× per week.</p>
        </section>

        <WeightCard period={period} />
        <EnergyCard />
      </div>
    </div>
  );
}

function Kpi({ v, u, l, delta, neutral }: { v: string; u: string; l: string; delta: number | null; neutral?: boolean }) {
  const show = delta !== null && Math.abs(delta) >= 0.01;
  return (
    <div className="tile kpi-tile">
      <div className="v num">{v}<small> {u}</small></div>
      <div className="l">{l}</div>
      {show && (
        <div className={'delta num' + (neutral ? '' : delta! > 0 ? ' up' : ' down')}>
          {delta! > 0 ? '↑' : '↓'} {fmt(Math.abs(delta!) * 100)}% <span>vs vorige periode</span>
        </div>
      )}
    </div>
  );
}

function CardHead({ title, sub, color }: { title: string; sub?: string; color?: string }) {
  return (
    <div className="row between card-head">
      <div className="label-cap" style={color ? { color } : undefined}>{title}</div>
      {sub && <span className="tiny">{sub}</span>}
    </div>
  );
}

function AvgRow({ name, v, goal, color }: { name: string; v: number; goal: number; color: string }) {
  const pct = goal ? v / goal : 0;
  return (
    <div className="avg-row">
      <div className="row between">
        <span className="small" style={{ fontWeight: 600 }}>{name}</span>
        <span className="small num"><b>{fmt(v)} g</b> <span className="muted">/ {fmt(goal)} g · {fmt(pct * 100)}%</span></span>
      </div>
      <Bar value={pct} color={color} />
    </div>
  );
}

const SPAN: Record<Period, number> = { dag: 30, week: 84, maand: 365 };

function WeightCard({ period }: { period: Period }) {
  const profile = useStore((s) => s.profile)!;
  const weights = useStore((s) => s.weights);
  const open = useUI((s) => s.open);
  const t = useTargets()!;
  const today = dateKey();
  const series = useMemo(() => weightTrend(weights), [weights]);
  const from = addDays(today, -SPAN[period]);
  const shown = series.filter((w) => w.date >= from);
  const rate = weightRate(weights, today);
  const start = profile.startWeightKg ?? weights[0]?.kg ?? profile.weightKg;
  const trendNow = series.length ? series[series.length - 1].trend : profile.weightKg;
  const diff = trendNow - start;
  const losing = profile.goal === 'afvallen' || profile.goal === 'recomp';
  const actual = rate && Math.abs(rate.kgPerWeek) >= 0.05 ? rate.kgPerWeek : null;
  const fc = profile.goal === 'onderhouden' ? null : forecast(trendNow, profile.goalWeightKg, actual ?? t.kgPerWeek, today);
  const b = bmi(profile.weightKg, profile.heightCm);

  return (
    <section className="card stack">
      <div className="row between">
        <div>
          <div className="label-cap">Gewicht</div>
          <div className="kpi num" style={{ fontSize: 30 }}>{fmt(profile.weightKg, 1)} <small>kg</small></div>
          {series.length > 2 && <div className="tiny num">Trendgewicht {fmt(trendNow, 1)} kg</div>}
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn sm ghost" onClick={() => open({ type: 'weightHistory' })} aria-label="Alle wegingen bekijken en bewerken"><span className="i18"><I.history /></span></button>
          <button className="btn sm" onClick={() => open({ type: 'weight' })}>+ Wegen</button>
        </div>
      </div>
      <div className="chips">
        <span className={'tag' + ((losing ? diff < 0 : diff > 0) ? ' brand' : '')}>{diff > 0 ? '+' : ''}{fmt(diff, 1)} kg sinds start</span>
        {rate && <span className="tag num">{rate.kgPerWeek > 0 ? '+' : ''}{fmt(rate.kgPerWeek, 2)} kg per week</span>}
        <span className="tag">BMI {fmt(b, 1)}</span>
      </div>
      {shown.length > 1 ? (
        <TrendLine
          points={shown.map((w) => ({ label: parseKey(w.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'numeric' }), title: longDate(w.date), value: w.trend, raw: w.kg }))}
          goal={profile.goal !== 'onderhouden' ? profile.goalWeightKg : undefined}
          goalLabel={`streef ${fmt(profile.goalWeightKg, 1)}`}
          format={(v) => `${fmt(v, 1)} kg`}
        />
      ) : (
        <p className="small muted" style={{ margin: 0 }}>{weights.length > 1 ? 'Geen wegingen in deze periode.' : 'Weeg je een paar keer per week; hier verschijnt dan je trendlijn.'}</p>
      )}
      {profile.goal !== 'onderhouden' && (
        <div className="forecast">
          <span className="i20" style={{ color: 'var(--brand)' }}><I.target /></span>
          <div className="small">
            {fc?.reached ? (
              <><b>Streefgewicht bereikt.</b> Overweeg om naar "Gewicht behouden" te gaan.</>
            ) : fc ? (
              <>Op dit tempo haal je <b>{fmt(profile.goalWeightKg, 1)} kg</b> rond <b>{longDate(fc.date)}</b> ({Math.round(fc.weeks)} weken){actual === null ? ', als je je plan volgt' : ''}.</>
            ) : (
              <>Nog {fmt(Math.abs(trendNow - profile.goalWeightKg), 1)} kg tot {fmt(profile.goalWeightKg, 1)} kg. {rate ? 'Je gewicht gaat nu niet de goede kant op; kijk naar je gemiddelde calorieën.' : 'Weeg je vaker, dan rekent Puls uit wanneer je er bent.'}</>
            )}
          </div>
        </div>
      )}
      <p className="tiny" style={{ margin: 0 }}>Je gewicht schommelt per dag door vocht en eten. De lijn is je trendgewicht, de puntjes zijn je wegingen.</p>
    </section>
  );
}

/** Gemeten verbruik: wat Puls leert uit je eten en je gewichtstrend. */
function EnergyCard() {
  const profile = useStore((s) => s.profile)!;
  const days = useStore((s) => s.days);
  const weights = useStore((s) => s.weights);
  const insight = useEnergyInsight();
  const t = useTargets()!;
  const need = insightNeeds(days, weights, dateKey());
  const ready = !!insight && insight.confidence >= 0.3;
  const toggle = () => {
    useStore.getState().updateProfile({ adaptive: !profile.adaptive });
    toast(profile.adaptive ? 'Slimme bijsturing uit' : 'Je doel wordt bijgestuurd op je gemeten verbruik');
  };
  return (
    <section className="card stack energy">
      <div className="row between">
        <div className="label-cap">Jouw verbruik</div>
        <span className={'tag' + (profile.adaptive ? ' brand' : '')}>{profile.adaptive ? 'Slimme bijsturing aan' : 'Schatting'}</span>
      </div>
      {insight ? (
        <>
          <div className="energy-nums">
            <div><div className="kpi num">{fmt(insight.tdee)}</div><div className="tiny">kcal gemeten</div></div>
            <div><div className="kpi num muted">{fmt(t.tdee)}</div><div className="tiny">kcal {t.adaptive ? 'in je doel' : 'volgens formule'}</div></div>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            Je at gemiddeld <b className="num" style={{ color: 'var(--ink)' }}>{fmt(insight.intake)} kcal</b> en je gewicht ging <b className="num" style={{ color: 'var(--ink)' }}>{insight.kgPerWeek > 0 ? '+' : ''}{fmt(insight.kgPerWeek, 2)} kg per week</b>. Daaruit volgt je echte verbruik ({insight.loggedDays} dagen, {insight.weighIns} wegingen).
          </p>
          <div className="conf"><span className="tiny">Betrouwbaarheid</span><Bar value={insight.confidence} color="var(--brand)" /></div>
          {insight.tdee < t.tdee * 0.85 && (
            <p className="tiny" style={{ margin: 0 }}>Flink lager dan verwacht. Vaak komt dat doordat niet alles gelogd is: denk aan drinken, sauzen, olie en tussendoortjes. Bijsturen kan maximaal 20% schelen.</p>
          )}
          {ready ? (
            <button className={'btn sm ' + (profile.adaptive ? 'ghost' : '')} onClick={toggle}>{profile.adaptive ? 'Bijsturing uitzetten' : 'Stuur mijn doel hierop bij'}</button>
          ) : (
            <p className="tiny" style={{ margin: 0 }}>Nog niet betrouwbaar genoeg om je doel op aan te passen. Blijf loggen en wegen.</p>
          )}
        </>
      ) : (
        <>
          <p className="small muted" style={{ margin: 0 }}>Na ± 2 weken loggen en een paar keer wegen rekent Puls uit hoeveel jij echt verbruikt. Zo klopt je doel steeds beter.</p>
          <div className="needs">
            <div><div className="row between tiny"><span>Volledig gelogde dagen</span><b className="num">{need.logged}/14</b></div><Bar value={need.logged / 14} color="var(--brand)" /></div>
            <div><div className="row between tiny"><span>Wegingen (4 weken)</span><b className="num">{need.weighed}/4</b></div><Bar value={need.weighed / 4} color="var(--fat)" /></div>
          </div>
        </>
      )}
    </section>
  );
}


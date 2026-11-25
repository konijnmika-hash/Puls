import { useMemo, useState } from 'react';
import { bmi } from '../lib/calc';
import { addDays, dateKey, DAY_SHORT, fmt, parseKey, weekday } from '../lib/date';
import { dayTotals, useEnergyInsight, useTargets } from '../lib/hooks';
import { averageNutrients, forecast, insightNeeds, weightRate, weightTrend } from '../lib/insights';
import { emptyDay, useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { BarChart, Bar, I, LineChart, AvatarButton, toast } from '../components/ui';

const longDate = (key: string) => parseKey(key).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });

export function Progress() {
  const days = useStore((s) => s.days);
  const premium = useStore((s) => s.premium);
  const open = useUI((s) => s.open);
  const t = useTargets()!;
  const [range, setRange] = useState<7 | 30>(7);
  const today = dateKey();

  const keys = Array.from({ length: range }, (_, i) => addDays(today, i - range + 1));
  const label = (k: string) => (range === 7 ? DAY_SHORT[weekday(k)] : String(parseKey(k).getDate()));
  const logs = keys.map((k) => days[k] ?? emptyDay());
  const kcal = logs.map((d, i) => ({ label: label(keys[i]), value: Math.round(dayTotals(d).eaten.kcal) }));
  const water = logs.map((d, i) => ({ label: label(keys[i]), value: d.waterMl }));
  const steps = logs.map((d, i) => ({ label: label(keys[i]), value: d.steps }));
  const avg = useMemo(() => averageNutrients(keys.map((k) => days[k])), [days, keys.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const workouts = logs.reduce((s, d) => s + d.workoutsDone.length, 0);
  const onTarget = kcal.filter((k) => k.value > 0 && Math.abs(k.value - t.kcal) <= t.kcal * 0.1).length;

  // Streak: aaneengesloten dagen (t/m vandaag of gisteren) waarop iets gegeten is gelogd
  let streak = 0;
  for (let k = days[today] && dayTotals(days[today]).count ? today : addDays(today, -1); days[k] && dayTotals(days[k]).count > 0; k = addDays(k, -1)) streak++;

  return (
    <div className="page">
      <header className="topbar">
        <h1 className="page-title">Voortgang</h1>
        <AvatarButton />
      </header>
      <div className="row between" style={{ marginTop: -6 }}>
        <span className="small muted">Jouw trends</span>
        <div className="seg" role="tablist" aria-label="Periode">
          <button className={range === 7 ? 'on' : ''} onClick={() => setRange(7)}>7 dagen</button>
          <button className={range === 30 ? 'on' : ''} onClick={() => (premium ? setRange(30) : open({ type: 'premium', reason: 'Bekijk je voortgang over 30 dagen met Premium.' }))}>
            30 dagen {!premium && <span className="lock" style={{ width: 14, height: 14 }}><I.lock /></span>}
          </button>
        </div>
      </div>

      <div className="tiles3">
        <div className="tile"><div className="v num">{streak}</div><div className="l">dagen op rij</div></div>
        <div className="tile"><div className="v num">{onTarget}<small>/{range}</small></div><div className="l">dagen op doel</div></div>
        <div className="tile"><div className="v num">{workouts}</div><div className="l">trainingen</div></div>
      </div>

      <WeightCard />
      <EnergyCard />

      <section className="card stack">
        <div className="row between">
          <div className="label-cap">Calorieën</div>
          <span className="tiny">stippellijn = doel {fmt(t.kcal)}</span>
        </div>
        <BarChart data={kcal} target={t.kcal} color="var(--brand)" unit="kcal" />
        {avg && (
          <p className="small muted" style={{ margin: 0 }}>
            Gemiddeld <b className="num" style={{ color: 'var(--ink)' }}>{fmt(avg.kcal)} kcal</b> op {avg.days} gelogde {avg.days === 1 ? 'dag' : 'dagen'}, {fmt((avg.kcal / t.kcal) * 100)}% van je doel.
          </p>
        )}
      </section>

      <section className="card stack">
        <div className="row between">
          <div className="label-cap">Voeding gemiddeld</div>
          <span className="tiny">per gelogde dag</span>
        </div>
        {avg ? (
          <div className="avg-rows">
            <AvgRow name="Eiwit" v={avg.p} goal={t.p} color="var(--protein)" />
            <AvgRow name="Koolhydraten" v={avg.c} goal={t.c} color="var(--carb)" />
            <AvgRow name="Vet" v={avg.f} goal={t.f} color="var(--fat)" />
            <AvgRow name="Vezels" v={avg.fib} goal={t.fib} color="var(--fiber)" />
          </div>
        ) : (
          <p className="small muted" style={{ margin: 0 }}>Log een paar dagen je eten, dan zie je hier of je genoeg eiwit en vezels binnenkrijgt.</p>
        )}
        {avg && avg.fib < t.fib * 0.7 && <p className="tiny" style={{ margin: 0 }}>Weinig vezels? Kies volkoren brood en pasta, peulvruchten, groente en fruit met schil.</p>}
        {avg && avg.p < t.p * 0.8 && <p className="tiny" style={{ margin: 0 }}>Eiwit blijft achter. Kwark, skyr, eieren, kip, vis, tofu en peulvruchten helpen.</p>}
      </section>

      <section className="card stack">
        <div className="row between">
          <div className="label-cap" style={{ color: 'var(--water)' }}>Water (ml)</div>
          <span className="tiny">doel {fmt(t.waterMl)} ml</span>
        </div>
        <BarChart data={water} target={t.waterMl} color="var(--water)" height={120} />
      </section>

      <section className="card stack">
        <div className="row between">
          <div className="label-cap" style={{ color: 'var(--steps)' }}>Stappen</div>
          <span className="tiny">doel {fmt(t.steps)}</span>
        </div>
        <BarChart data={steps} target={t.steps} color="var(--steps)" height={120} />
      </section>
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

function WeightCard() {
  const profile = useStore((s) => s.profile)!;
  const weights = useStore((s) => s.weights);
  const open = useUI((s) => s.open);
  const t = useTargets()!;
  const today = dateKey();
  const series = useMemo(() => weightTrend(weights), [weights]);
  const shown = series.slice(-30);
  const rate = weightRate(weights, today);
  const start = profile.startWeightKg ?? weights[0]?.kg ?? profile.weightKg;
  const trendNow = series.length ? series[series.length - 1].trend : profile.weightKg;
  const diff = trendNow - start;
  const losing = profile.goal === 'afvallen' || profile.goal === 'recomp';
  // voorspelling: met je echte tempo als dat de goede kant op gaat, anders met het geplande tempo
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
        <button className="btn sm" onClick={() => open({ type: 'weight' })}>+ Wegen</button>
      </div>
      <div className="chips">
        <span className={'tag' + ((losing ? diff < 0 : diff > 0) ? ' brand' : '')}>{diff > 0 ? '+' : ''}{fmt(diff, 1)} kg sinds start</span>
        {rate && <span className="tag num">{rate.kgPerWeek > 0 ? '+' : ''}{fmt(rate.kgPerWeek, 2)} kg per week</span>}
        <span className="tag">BMI {fmt(b, 1)}</span>
      </div>
      {shown.length > 1 ? (
        <LineChart
          points={shown.map((w) => ({ label: parseKey(w.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'numeric' }), value: w.kg }))}
          trend={shown.length > 2 ? shown.map((w) => w.trend) : undefined}
          goal={profile.goal !== 'onderhouden' ? profile.goalWeightKg : undefined}
        />
      ) : (
        <p className="small muted" style={{ margin: 0 }}>Weeg je een paar keer per week; hier verschijnt dan je trendlijn naar je streefgewicht (oranje stippellijn).</p>
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
      <p className="tiny" style={{ margin: 0 }}>Je gewicht schommelt per dag door vocht en eten. De groene trendlijn filtert dat eruit.</p>
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

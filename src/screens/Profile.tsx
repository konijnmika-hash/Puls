import { useState } from 'react';
import { ACTIVITY, MACRO_STYLE, PATTERNS, bmi } from '../lib/calc';
import { dateKey, fmt, liters } from '../lib/date';
import { useEnergyInsight, useTargets } from '../lib/hooks';
import { insightNeeds } from '../lib/insights';
import { GOAL_OPTIONS } from '../lib/options';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import type { EatPattern, MacroStyle } from '../lib/types';
import { ReminderRows, SettingsRows } from '../components/Sheets';
import { HealthNotes } from '../components/HealthNotes';
import { planNotes } from '../lib/health';
import { I, Switch, toast } from '../components/ui';

export function ProfileScreen() {
  const profile = useStore((s) => s.profile)!;
  const premium = useStore((s) => s.premium);
  const open = useUI((s) => s.open);
  const t = useTargets()!;
  const [confirm, setConfirm] = useState(false);
  const goal = GOAL_OPTIONS.find((g) => g.v === profile.goal)!;

  return (
    <div className="page">
      <header className="topbar">
        <div className="row" style={{ gap: 6 }}>
          <button className="iconbtn hide-desktop" onClick={() => useUI.getState().setTab('vandaag')} aria-label="Terug naar vandaag"><I.left /></button>
          <h1 className="page-title">Profiel</h1>
        </div>
        {premium && <span className="tag gold">Premium</span>}
      </header>
      <div className="cols">
      <div className="col">

      <section className="card row" style={{ alignItems: 'flex-start' }}>
        <div className="avatar" style={{ width: 56, height: 56, fontSize: 24, flex: 'none' }}>{(profile.name || 'P').slice(0, 1).toUpperCase()}</div>
        <div className="grow">
          <h2 style={{ fontSize: 22 }}>{profile.name || 'Jij'}</h2>
          <div className="small muted num">{profile.age} jaar · {profile.heightCm} cm · {fmt(profile.weightKg, 1)} kg</div>
          <div className="small muted">{goal.em} {goal.t} · {ACTIVITY[profile.activity].label.toLowerCase()}</div>
          <div className="profile-stats num">
            <span>BMI <b>{fmt(bmi(profile.weightKg, profile.heightCm), 1)}</b></span>
            <span>Vet <b>± {fmt(t.bodyFat)}%</b></span>
            <span>Vetvrij <b>{fmt(t.lbm)} kg</b></span>
          </div>
        </div>
        <button className="iconbtn" onClick={() => open({ type: 'profileEdit' })} aria-label="Gegevens bewerken"><I.pencil /></button>
      </section>

      {!premium && (
        <button className="premium-banner" onClick={() => open({ type: 'premium' })}>
          <div className="grow"><b>Puls Premium</b><div className="small muted">Barcodescanner en eigen calorie-doel · € 4,99 /mnd</div></div>
          <I.right />
        </button>
      )}

      <div className="section-title">
        <h2>Jouw dagdoelen</h2>
        <button className="link" onClick={() => open({ type: 'goalEdit' })}>Aanpassen</button>
      </div>
      <section className="card stack">
        <div className="grid2">
          <Goal v={`${fmt(t.kcal)}`} u="kcal" l="Calorieën" c="var(--brand)" />
          <Goal v={liters(t.waterMl)} u="liter" l="Water (+0,5 L op trainingsdagen)" c="var(--water)" />
          <Goal v={fmt(t.steps)} u="stappen" l="Stappendoel" c="var(--steps)" />
          <Goal v={`${profile.trainDays.length}×`} u="per week" l="Trainen" c="var(--fat)" />
        </div>
        <div className="grid2" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          <Goal v={`${t.p}`} u="g" l="Eiwit" c="var(--protein)" small />
          <Goal v={`${t.c}`} u="g" l="Koolh." c="var(--carb)" small />
          <Goal v={`${t.f}`} u="g" l="Vet" c="var(--fat)" small />
          <Goal v={`${t.fib}`} u="g" l="Vezels" c="var(--fiber)" small />
        </div>
        <button className="explain-btn" onClick={() => open({ type: 'explain' })}>
          <span className="i20"><I.calc /></span>
          <span className="grow">
            <b>Zo rekent Puls</b>
            <span className="tiny" style={{ display: 'block' }}>Verbruik {fmt(t.tdee)} kcal{t.delta ? ` · ${t.delta < 0 ? 'tekort' : 'overschot'} ${fmt(Math.abs(t.delta))} kcal` : ''}{Math.abs(t.kgPerWeek) >= 0.05 ? ` · ± ${fmt(Math.abs(t.kgPerWeek), 2)} kg per week` : ''}{profile.custom ? ' · eigen doelen' : ''}</span>
          </span>
          <I.right />
        </button>
        <button className="explain-btn" onClick={() => open(premium ? { type: 'goals' } : { type: 'premium', reason: 'Zelf je calorie-doel instellen zit in Puls Premium. Water, stappen en je weekdoelen pas je gratis aan.' })}>
          <span className="i20"><I.flame /></span>
          <span className="grow">
            <b>Eigen calorie-doel</b>
            <span className="tiny" style={{ display: 'block' }}>{profile.custom?.kcal ? `Ingesteld op ${fmt(profile.custom.kcal)} kcal` : 'Standaard volgt je doel uit je gegevens'}</span>
          </span>
          {premium ? <I.right /> : <span className="lock" style={{ width: 18, height: 18 }}><I.lock /></span>}
        </button>
        <HealthNotes notes={planNotes(profile, t)} />
        <p className="tiny" style={{ margin: 0 }}>
          Dit zijn schattingen, geen exacte waarden en geen regels die je moet volgen. Zie ze als richtlijn en luister naar je lichaam. Twijfel je, overleg dan met je huisarts of een diëtist.
        </p>
      </section>

      <div className="section-title"><h2>Voeding</h2></div>
      <NutritionPrefs />
      </div>
      <div className="col">

      <div className="section-title"><h2>Coach &amp; reminders</h2></div>
      <section className="card" style={{ padding: '4px 14px' }}>
        <ReminderRows />
      </section>

      <div className="section-title"><h2>Koppelingen</h2></div>
      <button className="card row" style={{ textAlign: 'left' }} onClick={() => open({ type: 'connect' })}>
        <div className="meal-icon" style={{ background: 'color-mix(in srgb, var(--steps) 16%, transparent)', color: 'var(--steps)' }}><I.shoe /></div>
        <div className="grow"><b>Stappen &amp; workouts</b><div className="small muted">Health Connect (Google) of Apple Gezondheid</div></div>
        <I.right />
      </button>

      <div className="section-title"><h2>Instellingen</h2></div>
      <section className="card" style={{ padding: '4px 14px' }}>
        <SettingsRows />
      </section>

      <div className="section-title"><h2>Account en gegevens</h2></div>
      <section className="card" style={{ padding: '4px 14px' }}>
        <div className="list">
          <button className="item" onClick={() => open({ type: 'data' })}>
            <div className="ico"><span className="i20"><I.download /></span></div>
            <div className="grow"><div className="t">Exporteren en back-up</div><div className="s">CSV voor Excel, back-up maken of terugzetten</div></div>
            <I.right />
          </button>
          <button className="item" onClick={() => open({ type: 'weightHistory' })}>
            <div className="ico"><span className="i20"><I.scale /></span></div>
            <div className="grow"><div className="t">Wegingen</div><div className="s">Bekijken, aanpassen of verwijderen</div></div>
            <I.right />
          </button>
          <button className="item" onClick={() => open({ type: 'premium' })}>
            <div className="ico"><span className="i20"><I.star /></span></div>
            <div className="grow"><div className="t">Abonnement</div><div className="s">{premium ? 'Premium staat aan' : 'Gratis versie'}</div></div>
            <I.right />
          </button>
        </div>
      </section>

      <section className="card stack">
        {confirm ? (
          <>
            <b>Alles wissen?</b>
            <p className="small muted" style={{ margin: 0 }}>Je profiel, dagboek, trainingen, doelen en gewichten worden van dit apparaat verwijderd. Dit kun je niet ongedaan maken. Maak eerst een back-up als je je gegevens wilt houden.</p>
            <div className="row">
              <button className="btn ghost sm grow" onClick={() => setConfirm(false)}>Annuleren</button>
              <button className="btn danger sm grow" onClick={() => { useStore.getState().reset(); useUI.getState().setTab('vandaag'); }}>Ja, alles wissen</button>
            </div>
          </>
        ) : (
          <button className="btn danger block sm" onClick={() => setConfirm(true)}>Gegevens wissen en opnieuw beginnen</button>
        )}
      </section>
      <p className="tiny" style={{ textAlign: 'center' }}>Puls 0.4 · Je gegevens blijven op dit apparaat en blijven bewaard als je de app sluit.<br />Voedingswaarden: eigen basisdatabase + Open Food Facts (ODbL).</p>
      </div>
      </div>
    </div>
  );
}

/** Eetpatroon, macroverdeling en slimme bijsturing. */
function NutritionPrefs() {
  const profile = useStore((s) => s.profile)!;
  const days = useStore((s) => s.days);
  const weights = useStore((s) => s.weights);
  const insight = useEnergyInsight();
  const t = useTargets()!;
  const update = useStore((s) => s.updateProfile);
  const pattern = profile.pattern ?? 'standaard';
  const style = profile.macroStyle ?? 'gebalanceerd';
  const need = insightNeeds(days, weights, dateKey());
  const ready = !!insight && insight.confidence >= 0.3;
  return (
    <section className="card stack">
      <div className="field">
        <span className="lbl">Eetpatroon</span>
        <div className="chips" role="radiogroup" aria-label="Eetpatroon">
          {(Object.keys(PATTERNS) as EatPattern[]).map((k) => (
            <button key={k} role="radio" aria-checked={pattern === k} className={'chip sm' + (pattern === k ? ' on' : '')} onClick={() => { update({ pattern: k }); toast(`Eetpatroon: ${PATTERNS[k].label.toLowerCase()}`); }}>{PATTERNS[k].label}</button>
          ))}
        </div>
        <span className="tiny">{PATTERNS[pattern].hint}. Bepaalt hoeveel kcal Puls per maaltijd aanraadt en hoe groot je porties in recepten zijn.</span>
      </div>
      <div className="field">
        <span className="lbl">Verdeling vet en koolhydraten</span>
        <div className="chips" role="radiogroup" aria-label="Macroverdeling">
          {(Object.keys(MACRO_STYLE) as MacroStyle[]).map((k) => (
            <button key={k} role="radio" aria-checked={style === k} className={'chip sm' + (style === k ? ' on' : '')} onClick={() => update({ macroStyle: k })}>{MACRO_STYLE[k].label}</button>
          ))}
        </div>
        <span className="tiny">{MACRO_STYLE[style].hint}. Je eiwit blijft gelijk.</span>
      </div>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="grow">
          <b>Slimme bijsturing</b>
          <div className="small muted">
            {ready
              ? `Gemeten verbruik ± ${fmt(insight!.tdee)} kcal per dag, uit ${insight!.loggedDays} gelogde dagen en ${insight!.weighIns} wegingen.${profile.adaptive ? ` Je doel is nu ${fmt(t.kcal)} kcal.` : ''}`
              : `Puls leert je echte verbruik uit wat je eet en hoe je gewicht verandert. Nog nodig: ${need.days ? `${need.days} volledig gelogde ${need.days === 1 ? 'dag' : 'dagen'}` : ''}${need.days && need.weighIns ? ' en ' : ''}${need.weighIns ? `${need.weighIns}× wegen` : ''}${!need.days && !need.weighIns ? 'iets meer tijd' : ''}.`}
          </div>
        </div>
        <Switch on={!!profile.adaptive} onChange={(v) => { update({ adaptive: v }); toast(v ? (ready ? 'Je doel wordt bijgestuurd op je gemeten verbruik' : 'Staat aan: Puls stuurt bij zodra er genoeg gegevens zijn') : 'Slimme bijsturing uit'); }} label="Slimme bijsturing" />
      </div>
    </section>
  );
}

function Goal({ v, u, l, c, small }: { v: string; u: string; l: string; c: string; small?: boolean }) {
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 16, padding: small ? 10 : 12 }}>
      <div className="kpi num" style={{ color: c, fontSize: small ? 18 : 22 }}>{v} <small>{u}</small></div>
      <div className="tiny" style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{l}</div>
    </div>
  );
}

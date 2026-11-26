import { useState } from 'react';
import { calcTargets } from '../lib/calc';
import { fmt, liters } from '../lib/date';
import { useEnergyInsight } from '../lib/hooks';
import { GOAL_LIMITS, useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import type { Goals } from '../lib/types';
import { I, Sheet, Stepper, Switch, toast } from './ui';

type WeekKey = Exclude<keyof Goals, 'habits'>;

const ROWS: { k: WeekKey; t: string; s: string; step: number; unit: string }[] = [
  { k: 'logDays', t: 'Eten bijhouden', s: 'Op hoeveel dagen per week', step: 1, unit: 'dagen' },
  { k: 'waterDays', t: 'Waterdoel halen', s: 'Op hoeveel dagen per week', step: 1, unit: 'dagen' },
  { k: 'stepDays', t: 'Stappendoel halen', s: 'Op hoeveel dagen per week', step: 1, unit: 'dagen' },
  { k: 'activeMin', t: 'Actieve minuten', s: 'Sport en activiteiten per week', step: 15, unit: 'min' },
  { k: 'trainings', t: 'Trainingen', s: 'Per week (maximaal 6: rust hoort erbij)', step: 1, unit: '×' },
];

const EMOJIS = ['✨', '🥗', '🍵', '🧠', '📖', '🚶', '🛌', '🦷', '💊', '🌞', '🎧', '🙏'];

export function GoalEditSheet() {
  const close = useUI((s) => s.close);
  const goals = useStore((s) => s.goals);
  const profile = useStore((s) => s.profile)!;
  const insight = useEnergyInsight();
  const advice = calcTargets({ ...profile, custom: undefined }, insight);
  const [g, setG] = useState(goals);
  const [steps, setSteps] = useState(profile.custom?.steps ?? advice.steps);
  const [water, setWater] = useState(profile.custom?.waterMl ?? advice.waterMl);
  const [newHabit, setNewHabit] = useState('');
  const [em, setEm] = useState('✨');
  const set = (k: WeekKey, v: number) => setG({ ...g, [k]: Math.max(GOAL_LIMITS[k][0], Math.min(GOAL_LIMITS[k][1], Math.round(v))) });

  const save = () => {
    const s = useStore.getState();
    s.setGoals({ logDays: g.logDays, waterDays: g.waterDays, stepDays: g.stepDays, activeMin: g.activeMin, trainings: g.trainings });
    s.updateProfile({ custom: { ...profile.custom, steps: steps === advice.steps ? undefined : steps, waterMl: water === advice.waterMl ? undefined : water } });
    toast('Doelen opgeslagen');
    close();
  };

  return (
    <Sheet onClose={close} title="Doelen aanpassen">
      <div className="stack">
        <p className="small muted" style={{ margin: 0 }}>Kies doelen die bij je leven passen. Liever een doel dat je bijna altijd haalt dan een dat je stress geeft.</p>

        <section className="card stack">
          <div className="label-cap">Elke dag</div>
          <div className="field">
            <span className="lbl">Water per dag (advies {liters(advice.waterMl)} L)</span>
            <Stepper id="ge-water" value={water} onChange={setWater} step={250} min={1000} max={5000} />
            {water > 4000 && <span className="hint warn">Meer dan 4 liter is bijna nooit nodig.</span>}
          </div>
          <div className="field">
            <span className="lbl">Stappen per dag (advies {fmt(advice.steps)})</span>
            <Stepper id="ge-steps" value={steps} onChange={setSteps} step={500} min={2000} max={25000} />
            {steps > 15000 && <span className="hint warn">Een hoog doel. Bouw liever langzaam op, dan houd je het vol.</span>}
          </div>
          <p className="tiny" style={{ margin: 0 }}>Je calorie- en eiwitdoel volgen uit je gegevens. Die pas je aan via Profiel.</p>
        </section>

        <section className="card stack">
          <div className="label-cap">Per week</div>
          {ROWS.map((r) => (
            <div key={r.k} className="goal-row">
              <div className="grow"><b>{r.t}</b><div className="tiny">{r.s}</div></div>
              <div className="mini-step" role="group" aria-label={r.t}>
                <button onClick={() => set(r.k, g[r.k] - r.step)} disabled={g[r.k] <= GOAL_LIMITS[r.k][0]} aria-label="Minder">−</button>
                <b className="num">{fmt(g[r.k])}<small> {r.unit}</small></b>
                <button onClick={() => set(r.k, g[r.k] + r.step)} disabled={g[r.k] >= GOAL_LIMITS[r.k][1]} aria-label="Meer">+</button>
              </div>
            </div>
          ))}
          {g.activeMin < 150 && <p className="tiny" style={{ margin: 0 }}>De Gezondheidsraad raadt minstens 150 minuten matig intensief bewegen per week aan. Begin gerust lager en bouw op.</p>}
          {g.trainings >= 5 && <p className="tiny" style={{ margin: 0 }}>Plan genoeg rustdagen: je spieren worden sterker als je herstelt.</p>}
        </section>

        <section className="card stack">
          <div className="label-cap">Gezonde gewoontes</div>
          <div className="list">
            {g.habits.map((h) => (
              <div key={h.id} className="item">
                <div className="ico">{h.em}</div>
                <div className="grow"><div className="t">{h.name}</div>{!h.builtin && <div className="s">Eigen gewoonte</div>}</div>
                {!h.builtin && <button className="iconbtn" onClick={() => setG({ ...g, habits: g.habits.filter((x) => x.id !== h.id) })} aria-label={`${h.name} verwijderen`}><I.trash /></button>}
                <Switch on={h.on} onChange={(on) => setG({ ...g, habits: g.habits.map((x) => (x.id === h.id ? { ...x, on } : x)) })} label={h.name} />
              </div>
            ))}
          </div>
          <div className="field">
            <span className="lbl">Eigen gewoonte toevoegen</span>
            <div className="chips scroll" style={{ margin: 0, padding: 0 }}>{EMOJIS.map((e) => <button key={e} className={'chip sm' + (em === e ? ' on' : '')} onClick={() => setEm(e)} aria-label={`Icoon ${e}`}>{e}</button>)}</div>
            <div className="row">
              <input className="input" value={newHabit} maxLength={60} onChange={(e) => setNewHabit(e.target.value)} placeholder="Bijv. 10 minuten lezen" aria-label="Naam van je gewoonte" />
              <button className="btn sm" style={{ height: 50 }} disabled={!newHabit.trim()} onClick={() => { setG({ ...g, habits: [...g.habits, { id: 'h-' + Math.random().toString(36).slice(2, 10), name: newHabit.trim(), em, on: true }] }); setNewHabit(''); }}>Toevoegen</button>
            </div>
          </div>
        </section>

        <button className="btn block" onClick={() => { useStore.setState({ goals: { ...useStore.getState().goals, habits: g.habits } }); save(); }}>Opslaan</button>
        <p className="tiny" style={{ margin: 0, textAlign: 'center' }}>Puls houdt het gezond: geen extreme doelen en geen wedstrijdjes rond gewicht.</p>
      </div>
    </Sheet>
  );
}

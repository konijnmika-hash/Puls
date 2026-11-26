import { useMemo } from 'react';
import { addDays, dateKey, fmt, liters, parseKey, weekday } from '../lib/date';
import { dayTotals, useDay, usePlan, useTargets, useWaterTarget } from '../lib/hooks';
import { badges, challengeStatus, milestones, weekFeedback, weekGoals, type Badge } from '../lib/motivation';
import { activeDaysIn, activeGrid, foodCount, logStreak, mondayOf } from '../lib/stats';
import { useStore } from '../lib/store';
import { useUI } from '../lib/ui';
import { Bar, I, Ring, toast } from '../components/ui';
import { PageHead } from '../components/Nav';

const NONE: string[] = [];

export function GoalsScreen() {
  const open = useUI((s) => s.open);
  return (
    <div className="page">
      <PageHead title="Doelen" sub="Kleine stappen, elke dag" hub right={<button className="btn sm ghost" onClick={() => open({ type: 'goalEdit' })}><span className="i18"><I.pencil /></span> Aanpassen</button>} />
      <div className="cols">
        <div className="col">
          <Feedback />
          <ChallengeCard />
          <TodayGoals />
          <WeekGoals />
        </div>
        <div className="col">
          <ActiveDays />
          <Badges />
          <Milestones />
        </div>
      </div>
    </div>
  );
}

function useCtx() {
  const profile = useStore((s) => s.profile)!;
  const t = useTargets()!;
  return useMemo(() => ({ profile, t }), [profile, t]);
}

function Feedback() {
  const days = useStore((s) => s.days);
  const goals = useStore((s) => s.goals);
  const c = useCtx();
  const today = dateKey();
  const wg = weekGoals(goals, days, c, today);
  const mon = mondayOf(today);
  const thisWeek = activeDaysIn(days, today, weekday(today) + 1);
  const lastWeek = activeDaysIn(days, addDays(mon, -1), 7);
  const f = weekFeedback(wg, thisWeek, lastWeek, foodCount(days[today]) > 0, new Date().getHours());
  return (
    <section className="feedback">
      <span className="feedback-ico"><I.sparkle /></span>
      <div className="grow">
        <b>{f.title}</b>
        <p>{f.text}</p>
      </div>
    </section>
  );
}

function ChallengeCard() {
  const today = dateKey();
  const day = useDay(today);
  const manual = useStore((s) => !!s.challengeDone[today]);
  const c = useCtx();
  const { challenge, done, measured } = challengeStatus(today, c, day, manual);
  return (
    <section className={'card challenge' + (done ? ' done' : '')}>
      <div className="challenge-em" aria-hidden>{challenge.em}</div>
      <div className="grow">
        <div className="label-cap" style={{ color: 'var(--brand)' }}>Uitdaging van vandaag</div>
        <b className="challenge-title">{challenge.title}</b>
        <p className="small muted" style={{ margin: '2px 0 0' }}>{challenge.text}</p>
        <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
          {done ? (
            <span className="tag brand"><span className="i14"><I.check /></span> Gehaald{measured ? ', Puls zag het' : ''}</span>
          ) : challenge.auto ? (
            <span className="tag">Puls vinkt hem vanzelf af</span>
          ) : null}
          {(!challenge.auto || (manual && !measured)) && (
            <button className={'btn sm' + (manual ? ' ghost' : '')} onClick={() => { useStore.getState().setChallengeDone(today, !manual); if (!manual) toast('Uitdaging gehaald. Mooi zo!'); }}>
              {manual ? 'Toch niet gedaan' : 'Gedaan!'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function TodayGoals() {
  const today = dateKey();
  const day = useDay(today);
  const t = useTargets()!;
  const water = useWaterTarget(today);
  const goals = useStore((s) => s.goals);
  const checked = useStore((s) => s.habitLog[today]) ?? NONE;
  const plan = usePlan();
  const open = useUI((s) => s.open);
  const { eaten, count } = dayTotals(day);
  const workout = plan.find((p) => p.weekday === weekday(today));
  const habits = goals.habits.filter((h) => h.on);
  const rows = [
    { id: 'log', label: 'Eten bijgehouden', v: count > 0 ? 1 : 0, text: count ? `${count} ${count === 1 ? 'product' : 'producten'}` : 'Nog niets', color: 'var(--brand)', go: () => open({ type: 'addFood', meal: 'ontbijt' }) },
    { id: 'p', label: 'Eiwit', v: eaten.p / t.p, text: `${fmt(eaten.p)} / ${fmt(t.p)} g`, color: 'var(--protein)' },
    { id: 'water', label: 'Water', v: day.waterMl / water, text: `${liters(day.waterMl)} / ${liters(water)} L`, color: 'var(--water)', go: () => open({ type: 'water' }) },
    { id: 'steps', label: 'Stappen', v: day.steps / t.steps, text: `${fmt(day.steps)} / ${fmt(t.steps)}`, color: 'var(--steps)', go: () => open({ type: 'steps' }) },
    ...(workout ? [{ id: 'train', label: workout.name, v: day.workoutsDone.includes(workout.id) ? 1 : 0, text: day.workoutsDone.includes(workout.id) ? 'Gedaan' : 'Op je schema', color: 'var(--fat)', go: () => useUI.getState().setTab('training') }] : []),
  ];
  const done = rows.filter((r) => r.v >= 1).length + habits.filter((h) => checked.includes(h.id)).length;
  const total = rows.length + habits.length;
  return (
    <section className="card stack">
      <div className="row between">
        <div>
          <div className="label-cap">Vandaag</div>
          <b className="num" style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>{done} van {total} gehaald</b>
        </div>
        <Ring size={48} stroke={6} value={total ? done / total : 0} color="var(--brand)"><span className="tiny num" style={{ color: 'var(--ink)', fontWeight: 800 }}>{total ? Math.round((done / total) * 100) : 0}%</span></Ring>
      </div>
      <div className="goal-list">
        {rows.map((r) => (
          <button key={r.id} className="goal-line" onClick={r.go} disabled={!r.go}>
            <span className={'goal-check' + (r.v >= 1 ? ' on' : '')} aria-hidden><I.check /></span>
            <span className="grow">
              <span className="row between"><b>{r.label}</b><span className="tiny num">{r.text}</span></span>
              {r.id !== 'log' && r.id !== 'train' && <Bar value={r.v} color={r.color} />}
            </span>
          </button>
        ))}
      </div>
      {habits.length > 0 && (
        <>
          <div className="label-cap" style={{ marginTop: 4 }}>Gewoontes</div>
          <div className="habit-grid">
            {habits.map((h) => {
              const on = checked.includes(h.id);
              return (
                <button key={h.id} className={'habit' + (on ? ' on' : '')} aria-pressed={on} onClick={() => { useStore.getState().toggleHabit(today, h.id); if (!on) navigator.vibrate?.(15); }}>
                  <span className="habit-em">{h.em}</span>
                  <span className="grow">{h.name}</span>
                  <span className="goal-check" aria-hidden><I.check /></span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function WeekGoals() {
  const days = useStore((s) => s.days);
  const goals = useStore((s) => s.goals);
  const c = useCtx();
  const open = useUI((s) => s.open);
  const today = dateKey();
  const wg = weekGoals(goals, days, c, today);
  const left = 6 - weekday(today);
  return (
    <section className="card stack">
      <div className="row between">
        <div className="label-cap">Deze week</div>
        <span className="tiny">{left === 0 ? 'laatste dag' : `nog ${left} ${left === 1 ? 'dag' : 'dagen'}`}</span>
      </div>
      {wg.map((g) => {
        const pct = g.value / g.target;
        return (
          <div key={g.id} className="week-goal">
            <span className="wg-em" aria-hidden>{g.em}</span>
            <div className="grow">
              <div className="row between"><span className="small" style={{ fontWeight: 600 }}>{g.label}</span><span className="small num"><b>{fmt(g.value)}</b> <span className="muted">/ {fmt(g.target)} {g.unit}</span></span></div>
              <Bar value={pct} color={pct >= 1 ? 'var(--ok)' : 'var(--brand)'} />
            </div>
            {pct >= 1 && <span className="tr-mini-done" aria-label="gehaald"><I.check /></span>}
          </div>
        );
      })}
      <button className="link small" style={{ alignSelf: 'flex-start', color: 'var(--brand)', fontWeight: 700 }} onClick={() => open({ type: 'goalEdit' })}>Weekdoelen aanpassen →</button>
    </section>
  );
}

const LEVEL_TEXT = ['Niets bijgehouden', '1 doel', '2 doelen', '3 doelen', '4 doelen'];

function ActiveDays() {
  const days = useStore((s) => s.days);
  const c = useCtx();
  const today = dateKey();
  const grid = useMemo(() => activeGrid(days, c, today, 16), [days, c, today]);
  const last30 = activeDaysIn(days, today, 30);
  const streak = logStreak(days, today);
  return (
    <section className="card stack">
      <div className="row between">
        <div className="label-cap">Actieve dagen</div>
        <span className="tiny">laatste 16 weken</span>
      </div>
      <div className="active-nums">
        <div><b className="num">{activeDaysIn(days, today, 7)}<small>/7</small></b><span>deze 7 dagen</span></div>
        <div><b className="num">{last30}<small>/30</small></b><span>laatste 30 dagen</span></div>
        <div><b className="num">{streak}</b><span>{streak === 1 ? 'dag' : 'dagen'} op rij gelogd</span></div>
      </div>
      <div className="heat" role="img" aria-label={`${last30} actieve dagen in de laatste 30 dagen`}>
        <div className="heat-days" aria-hidden>{['ma', '', 'wo', '', 'vr', '', 'zo'].map((d, i) => <span key={i}>{d}</span>)}</div>
        <div className="heat-grid">
          {grid.map((w, wi) => (
            <div key={wi} className="heat-col">
              {w.map((d) => <i key={d.date} className={`l${d.level}`} title={d.level < 0 ? '' : `${parseKey(d.date).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}: ${LEVEL_TEXT[d.level]}`} />)}
            </div>
          ))}
        </div>
      </div>
      <div className="heat-legend tiny"><span>Minder</span>{[0, 1, 2, 3, 4].map((l) => <i key={l} className={`l${l}`} />)}<span>Meer</span></div>
      <p className="tiny" style={{ margin: 0 }}>Hoe donkerder, hoe meer van je doelen je haalde: eten bijgehouden, waterdoel, bewogen en getraind. Een dag overslaan is geen probleem; het gaat om het totaal.</p>
    </section>
  );
}

function Badges() {
  const days = useStore((s) => s.days);
  const cooked = useStore((s) => s.cooked);
  const habitLog = useStore((s) => s.habitLog);
  const challengeDone = useStore((s) => s.challengeDone);
  const workoutLog = useStore((s) => s.workoutLog);
  const c = useCtx();
  const today = dateKey();
  const list = useMemo(() => {
    // gehaalde uitdagingen: handmatig afgevinkt of door Puls gemeten
    let challengeDays = 0;
    for (let i = 0; i < 365; i++) {
      const k = addDays(today, -i);
      if (!days[k] && !challengeDone[k]) continue;
      if (challengeStatus(k, c, days[k], !!challengeDone[k]).done) challengeDays++;
    }
    return badges({ days, cooked, habitLog, challengeDays, workouts: workoutLog.length, c, today });
  }, [days, cooked, habitLog, challengeDone, workoutLog, c, today]);
  const earned = list.reduce((s, b) => s + b.level, 0);
  return (
    <section className="card stack">
      <div className="row between">
        <div className="label-cap">Badges</div>
        <span className="tiny num">{earned} behaald</span>
      </div>
      <div className="badge-grid">
        {list.map((b) => <BadgeTile key={b.id} b={b} />)}
      </div>
    </section>
  );
}

const fmtBig = (n: number) => (n >= 1_000_000 ? `${fmt(n / 1_000_000, 1)} mln` : n >= 10_000 ? `${fmt(n / 1000)}k` : fmt(n));

function BadgeTile({ b }: { b: Badge }) {
  const prevTier = b.level ? b.tiers[b.level - 1] : 0;
  const pct = b.next ? (b.value - prevTier) / (b.next - prevTier) : 1;
  return (
    <div className={'badge' + (b.level ? ' got' : '')} aria-label={`${b.name}: niveau ${b.level} van ${b.tiers.length}. ${b.text}: ${fmt(b.value)}`}>
      <div className="badge-medal" aria-hidden>
        <span>{b.em}</span>
        {b.level > 0 && <i className="num">{b.level}</i>}
      </div>
      <b>{b.name}</b>
      <span className="tiny">{b.next ? `${fmtBig(b.value)} / ${fmtBig(b.next)}` : 'Alles gehaald'}</span>
      <div className="badge-bar"><i style={{ width: `${Math.min(100, pct * 100)}%` }} /></div>
    </div>
  );
}

function Milestones() {
  const days = useStore((s) => s.days);
  const c = useCtx();
  const today = dateKey();
  const list = useMemo(() => milestones(days, c, today), [days, c, today]);
  return (
    <section className="card stack">
      <div className="label-cap">Mijlpalen</div>
      {list.length ? (
        <ol className="timeline">
          {list.slice(0, 8).map((m) => (
            <li key={m.id}>
              <span className="tl-em" aria-hidden>{m.em}</span>
              <div className="grow"><b>{m.title}</b><div className="tiny">{parseKey(m.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</div></div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="small muted" style={{ margin: 0 }}>Je eerste mijlpaal is dichtbij: vul vandaag je eten in.</p>
      )}
    </section>
  );
}

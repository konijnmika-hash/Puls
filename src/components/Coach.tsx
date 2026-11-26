import { useEffect, useMemo, useRef, useState } from 'react';
import { achievements, coachFeed, type CoachAction, type CoachCtx, type CoachMsg } from '../lib/coach';
import { dateKey, fmt, liters, weekday } from '../lib/date';
import { dayTotals, useDay, usePlan, useTargets, useWaterTarget } from '../lib/hooks';
import { useStore } from '../lib/store';
import { mealForNow, useUI } from '../lib/ui';
import { I, Sheet, toast } from './ui';

const NONE: string[] = [];

export function useCoachCtx(date: string): CoachCtx | null {
  const profile = useStore((s) => s.profile);
  const days = useStore((s) => s.days);
  const weights = useStore((s) => s.weights);
  const prefs = useStore((s) => s.recipePrefs);
  const favorites = useStore((s) => s.favRecipes);
  const t = useTargets();
  const plan = usePlan();
  const day = useDay(date);
  const waterTarget = useWaterTarget(date);
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const id = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(id);
  }, []);
  return useMemo(() => {
    if (!profile || !t) return null;
    const wd = weekday(date);
    return {
      profile, t, day, days, date, today: dateKey(), hour, waterTarget, weights, prefs, favorites,
      workout: plan.find((p) => p.weekday === wd),
      nextWorkout: plan.find((p) => p.weekday > wd) ?? plan[0],
    };
  }, [profile, t, day, days, date, hour, waterTarget, weights, plan, prefs, favorites]);
}

export function useCoachAction() {
  const { open, startSession, date } = useUI();
  const plan = usePlan();
  return (action: NonNullable<CoachMsg['action']>) => {
    const s = useStore.getState();
    switch (action.kind as CoachAction) {
      case 'water': {
        s.addWater(date, s.glassMl);
        toast(`+${s.glassMl} ml water`);
        return;
      }
      case 'food': return open({ type: 'addFood', meal: mealForNow() });
      case 'train': {
        const w = plan.find((p) => p.weekday === weekday(date));
        if (w) startSession(w.id);
        return;
      }
      case 'steps': return open({ type: 'steps' });
      case 'weight': return open({ type: 'weight' });
      case 'activity': return open({ type: 'activity' });
      case 'recipe': return action.ref ? open({ type: 'recipe', id: action.ref, meal: action.meal }) : useUI.getState().setTab('recepten');
    }
  };
}

const TONE: Record<CoachMsg['tone'], { label: string; color: string }> = {
  cheer: { label: 'Gehaald', color: 'var(--ok)' },
  nudge: { label: 'Herinnering', color: 'var(--steps)' },
  tip: { label: 'Tip', color: 'var(--water)' },
  plan: { label: 'Vandaag', color: 'var(--brand)' },
  care: { label: 'Let op je gezondheid', color: 'var(--danger)' },
};

export function CoachCard({ date }: { date: string }) {
  const ctx = useCoachCtx(date);
  const act = useCoachAction();
  const open = useUI((s) => s.open);
  const feed = useMemo(() => (ctx ? coachFeed(ctx) : []), [ctx]);
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [date]);
  const msg = feed[Math.min(i, feed.length - 1)];
  if (!msg) return null;
  const tone = TONE[msg.tone];
  return (
    <section className="coach" aria-live="polite">
      <div className="coach-top">
        <div className="grow">
          <h2 className="coach-h">Tips en herinneringen</h2>
        </div>
        {feed.length > 1 && (
          <button className="coach-next" onClick={() => setI((i + 1) % feed.length)} aria-label="Volgend bericht">
            {i + 1}/{feed.length} <span style={{ width: 16, height: 16, display: 'inline-block' }}><I.right /></span>
          </button>
        )}
      </div>
      <div className="coach-bubble" key={msg.id} style={{ borderLeftColor: tone.color }}>
        <div className="coach-tone" style={{ color: tone.color }}>{tone.label}</div>
        <b>{msg.title}</b>
        <p>{msg.text}</p>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {msg.action && <button className="btn sm" onClick={() => act(msg.action!)}>{msg.action.label}</button>}
          <button className="btn sm ghost" onClick={() => open({ type: 'inbox' })}>Alle berichten</button>
        </div>
      </div>
    </section>
  );
}

export function InboxSheet() {
  const { close, date } = useUI();
  const ctx = useCoachCtx(date);
  const act = useCoachAction();
  const fired = useStore((s) => s.fired[dateKey()]) ?? NONE;
  const feed = ctx ? coachFeed(ctx) : [];
  return (
    <Sheet onClose={close} title="Tips en herinneringen">
      <div className="stack">
        {feed.map((m) => (
          <div key={m.id} className="card" style={{ padding: 14 }}>
            <div className="tiny" style={{ color: TONE[m.tone].color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{TONE[m.tone].label}</div>
            <b>{m.title}</b>
            <p className="small muted" style={{ margin: '4px 0 0' }}>{m.text}</p>
            {m.action && <button className="btn sm" style={{ marginTop: 10 }} onClick={() => { if (m.action!.kind !== 'recipe') close(); act(m.action!); }}>{m.action.label}</button>}
          </div>
        ))}
        {fired.length > 0 && <p className="tiny" style={{ margin: 0 }}>Vandaag {fired.length} {fired.length === 1 ? 'reminder' : 'reminders'} verstuurd.</p>}
      </div>
    </Sheet>
  );
}

/* ---------- Gehaalde doelen ---------- */

export function Celebrations() {
  const today = dateKey();
  const ctx = useCoachCtx(today);
  const primed = useRef(false);

  useEffect(() => {
    if (!ctx) return;
    const done = achievements(ctx);
    const s = useStore.getState();
    const seen = s.cheered[today] ?? [];
    const fresh = done.filter((d) => !seen.includes(d.id));
    if (!fresh.length) {
      primed.current = true;
      return;
    }
    s.markCheered(today, fresh.map((f) => f.id));
    // bij het openen van de app geen meldingen voor oude successen
    if (!primed.current) {
      primed.current = true;
      return;
    }
    toast(fresh.map((f) => f.title).join(' · '));
    navigator.vibrate?.(40);
  }, [ctx, today]);

  return null;
}

/* ---------- Reminders ---------- */
export async function requestNotifications(): Promise<NotificationPermission | 'unsupported'> {
  try {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    return await Notification.requestPermission();
  } catch {
    return 'unsupported';
  }
}

async function notify(title: string, body: string) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return false;
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg) await reg.showNotification(title, { body, icon: './icon-192.png', badge: './icon-192.png', tag: title });
    else new Notification(title, { body, icon: './icon-192.png' });
    return true;
  } catch {
    return false;
  }
}

const hm = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + (m || 0);
};

/** Controleert elke halve minuut of er een reminder klaarstaat (zolang de app open is of op de achtergrond draait). */
export function useReminders() {
  const ctx = useCoachCtx(dateKey());
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  useEffect(() => {
    const check = () => {
      const c = ctxRef.current;
      const s = useStore.getState();
      const r = s.reminders;
      if (!c || !r.on) return;
      const today = dateKey();
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      const fired = s.fired[today] ?? [];
      const { eaten, count } = dayTotals(c.day);
      const list: { id: string; at: number; when: boolean; title: string; body: string }[] = [];
      if (r.water) {
        for (const h of [10, 12, 14, 16, 18, 20]) {
          const expected = c.waterTarget * Math.max(0, Math.min(1, (h - 7) / 14));
          list.push({ id: `water-${h}`, at: h * 60, when: c.day.waterMl < expected - 250, title: 'Water drinken', body: `Je zit op ${liters(c.day.waterMl)} van ${liters(c.waterTarget)} liter.` });
        }
      }
      if (r.meals) {
        list.push({ id: 'meal-ontbijt', at: 9 * 60 + 30, when: c.day.meals.ontbijt.length === 0, title: 'Ontbijt invullen', body: 'Je hebt nog geen ontbijt ingevuld.' });
        list.push({ id: 'meal-lunch', at: 13 * 60 + 30, when: c.day.meals.lunch.length === 0, title: 'Lunch invullen', body: 'Je hebt nog geen lunch ingevuld.' });
        list.push({ id: 'meal-diner', at: 19 * 60 + 30, when: c.day.meals.diner.length === 0, title: 'Avondeten invullen', body: `Je hebt nog ${fmt(Math.max(0, c.t.kcal - eaten.kcal))} kcal over voor vandaag.` });
      }
      if (r.training && c.workout) {
        list.push({ id: 'training', at: hm(r.trainingTime), when: !c.day.workoutsDone.includes(c.workout.id), title: `Training: ${c.workout.name}`, body: `Ongeveer ${c.workout.estMinutes} minuten.` });
      }
      if (r.evening) {
        list.push({ id: 'evening', at: 21 * 60, when: count > 0, title: 'Je dag', body: `${fmt(eaten.kcal)} kcal · ${fmt(eaten.p)} g eiwit · ${liters(c.day.waterMl)} L water · ${fmt(c.day.steps)} stappen.` });
      }
      for (const it of list) {
        // alleen versturen binnen een uur na het moment, en maar één keer per dag
        if (fired.includes(it.id) || mins < it.at || mins > it.at + 60 || !it.when) continue;
        s.markFired(today, it.id);
        notify(it.title, it.body).then((sent) => {
          if (!sent || document.visibilityState === 'visible') toast(`${it.title} ${it.body}`);
        });
        break;
      }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, []);
}

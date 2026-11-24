// Rekenwerk voor trainingen: herhalingen lezen, gewicht voorstellen (progressie), volume en reeksen.
import type { Exercise } from '../data/exercises';
import { addDays } from './date';
import type { DayLog } from './types';
import type { PlannedExercise, WorkoutDay } from './workout';

export interface SetLog {
  kg: number;
  reps: number;
}

export interface WorkoutLog {
  date: string;
  /** id van de trainingsdag, bijv. "pull" */
  id: string;
  name: string;
  emoji: string;
  minutes: number;
  kcal: number;
  /** totaal kg × herhalingen */
  volume: number;
  sets: number;
  ex: { id: string; sets: SetLog[] }[];
}

/** "8–10" -> [8, 10], "12 langzaam" -> [12, 12], "30 sec" -> [30, 30] met timed. */
export function repRange(reps: string): { lo: number; hi: number; timed: boolean } {
  const nums = (reps.match(/\d+/g) ?? ['10']).map(Number);
  return { lo: nums[0], hi: nums[1] ?? nums[0], timed: /sec|min/.test(reps) };
}

/** Kleinste stap op de gewichten: dumbbells per 2 kg, stang, kabel en machines per 2,5 kg. */
export const weightStep = (e: Exercise) => (e.equip.includes('dumbbells') && !e.equip.includes('stang') ? 2 : 2.5);

/** Laatste keer dat je deze oefening deed. */
export function lastSets(log: WorkoutLog[], exId: string) {
  for (let i = log.length - 1; i >= 0; i--) {
    const hit = log[i].ex.find((x) => x.id === exId);
    if (hit && hit.sets.length) return { date: log[i].date, sets: hit.sets };
  }
  return null;
}

export interface Suggestion {
  kg: number;
  /** waarom: 'zwaarder' = je haalde alle herhalingen, 'zelfde' = nog even vasthouden, 'start' = nog geen historie */
  why: 'zwaarder' | 'zelfde' | 'start';
  last?: number;
}

/**
 * Dubbele progressie: haalde je vorige keer bij álle sets de bovenkant van je herhalingen,
 * dan mag er een stapje bij. Anders hetzelfde gewicht en probeer je meer herhalingen.
 */
export function suggestWeight(p: PlannedExercise, log: WorkoutLog[], lifts: Record<string, number>): Suggestion {
  const e = p.exercise;
  if (!e.weighted) return { kg: 0, why: 'start' };
  const prev = lastSets(log, e.id);
  if (!prev) return lifts[e.id] ? { kg: lifts[e.id], why: 'zelfde', last: lifts[e.id] } : { kg: 0, why: 'start' };
  const { hi } = repRange(p.reps);
  const top = Math.max(...prev.sets.map((s) => s.kg));
  const allHit = prev.sets.length >= p.sets && prev.sets.every((s) => s.kg >= top && s.reps >= hi);
  if (allHit && top > 0) return { kg: Math.round((top + weightStep(e)) * 2) / 2, why: 'zwaarder', last: top };
  return { kg: top, why: 'zelfde', last: top };
}

export const setVolume = (sets: SetLog[]) => sets.reduce((s, x) => s + x.kg * x.reps, 0);

/** Nieuwe records: zwaarder dan ooit tevoren op deze oefening. */
export function records(log: WorkoutLog[], done: { id: string; sets: SetLog[] }[], lifts: Record<string, number>) {
  const out: { id: string; kg: number; prev: number }[] = [];
  for (const x of done) {
    const best = Math.max(0, ...x.sets.map((s) => s.kg));
    if (!best) continue;
    const prev = Math.max(lifts[x.id] ?? 0, ...log.flatMap((l) => l.ex.filter((e) => e.id === x.id).flatMap((e) => e.sets.map((s) => s.kg))));
    if (prev > 0 && best > prev) out.push({ id: x.id, kg: best, prev });
  }
  return out;
}

/** Hoeveel weken op rij je al je geplande trainingen deed (deze week telt mee als hij al vol is). */
export function weekStreak(days: Record<string, DayLog>, plan: WorkoutDay[], monday: string) {
  if (!plan.length) return 0;
  const doneIn = (mon: string) => plan.filter((p) => days[addDays(mon, p.weekday)]?.workoutsDone.includes(p.id)).length;
  let n = doneIn(monday) >= plan.length ? 1 : 0;
  for (let w = 1; w < 104; w++) {
    if (doneIn(addDays(monday, -7 * w)) >= plan.length) n++;
    else break;
  }
  return n;
}

/** Spiergroepen van een trainingsdag, meest getraind eerst. */
export function dayMuscles(wd: WorkoutDay) {
  const count = new Map<string, number>();
  for (const e of wd.exercises) for (const m of e.exercise.muscles) count.set(m, (count.get(m) ?? 0) + e.sets);
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);
}

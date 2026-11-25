import { skipsMeal } from './calc';
import { addDays, fmt, greeting, liters } from './date';
import { dayTotals } from './hooks';
import type { DayLog, MealKey, Profile, Targets, WeightEntry } from './types';
import { recentlyEaten, roomFor, suggest, type Prefs } from './recipes';
import type { WorkoutDay } from './workout';

export type Tone = 'cheer' | 'nudge' | 'tip' | 'plan';
export type CoachAction = 'water' | 'food' | 'train' | 'steps' | 'weight' | 'activity' | 'recipe';

export interface CoachMsg {
  id: string;
  tone: Tone;
  title: string;
  text: string;
  action?: { label: string; kind: CoachAction; ref?: string; meal?: MealKey };
  prio: number;
}

export interface CoachCtx {
  profile: Profile;
  t: Targets;
  day: DayLog;
  days: Record<string, DayLog>;
  date: string;
  today: string;
  hour: number;
  waterTarget: number;
  workout?: WorkoutDay;
  nextWorkout?: WorkoutDay;
  weights: WeightEntry[];
  /** voorkeuren voor receptvoorstellen */
  prefs?: Prefs;
  favorites?: string[];
}

const IDEA: Record<MealKey, { from: number; to: number; title: string; prio: number }> = {
  ontbijt: { from: 6, to: 10, title: 'Ontbijt', prio: 47 },
  lunch: { from: 11, to: 14, title: 'Lunch', prio: 52 },
  diner: { from: 15, to: 20, title: 'Avondeten', prio: 64 },
  snacks: { from: 99, to: 99, title: '', prio: 0 },
};

/** Een receptvoorstel voor de maaltijd die nu aan de beurt is. */
function mealIdea(c: CoachCtx): CoachMsg | null {
  const meal = (Object.keys(IDEA) as MealKey[]).find((m) => c.hour >= IDEA[m].from && c.hour <= IDEA[m].to);
  if (!meal || c.day.meals[meal].length || skipsMeal(meal, c.t.split)) return null;
  const { eaten } = dayTotals(c.day);
  const room = roomFor(meal, c.t, c.day, eaten);
  const best = suggest(meal, room, { prefs: c.prefs ?? { vega: false }, favorites: c.favorites, recent: recentlyEaten(c.days, c.date), seed: c.date })[0];
  if (!best) return null;
  const left = Math.max(0, c.t.kcal - eaten.kcal);
  const r = best.recipe;
  return {
    id: `idea-${meal}`, tone: 'tip', prio: IDEA[meal].prio, title: IDEA[meal].title,
    text: `${eaten.kcal > 0 ? `Je hebt nog ${fmt(left)} kcal over. ` : ''}Bijvoorbeeld ${r.name.charAt(0).toLowerCase() + r.name.slice(1)}: ${fmt(best.n.kcal)} kcal, ${fmt(best.n.p)} g eiwit, ${r.minutes} minuten.`,
    action: { label: 'Bekijk recept', kind: 'recipe', ref: r.id, meal },
  };
}

const TIPS = [
  'Eet bij elke maaltijd een portie eiwit, zoals kwark, eieren, kip of peulvruchten. Dan heb je minder snel trek.',
  'Halve bord groente, kwart eiwit, kwart koolhydraten: een makkelijke vuistregel voor je avondeten.',
  'Met 7 tot 9 uur slaap herstel je beter en heb je minder trek in snacks.',
  'Een glas water vóór elke maaltijd helpt je om aan je waterdoel te komen.',
  'Probeer in de gym elke week één herhaling of 2,5 kg meer te doen dan de vorige keer.',
  'Plan je trainingen in je agenda alsof het afspraken zijn. Dan sla je ze minder snel over.',
  'Een wandeling van 10 minuten na het eten helpt je bloedsuiker én je stappendoel.',
  'Honger tussendoor? Fruit met een handje noten of een bakje skyr houdt je lang verzadigd.',
  'Je hoeft niet perfect te zijn. Als het meestal lukt, zie je resultaat.',
  'Weeg jezelf liever een paar keer per week en kijk naar de trend, niet naar één dag.',
];

const firstName = (p: Profile) => (p.name ? `, ${p.name}` : '');

export function streakFor(days: Record<string, DayLog>, today: string) {
  let n = 0;
  let k = days[today] && dayTotals(days[today]).count ? today : addDays(today, -1);
  while (days[k] && dayTotals(days[k]).count > 0) {
    n++;
    k = addDays(k, -1);
  }
  return n;
}

/** Alle coachberichten voor een dag, belangrijkste eerst. */
export function coachFeed(c: CoachCtx): CoachMsg[] {
  const { profile, t, day, hour } = c;
  const out: CoachMsg[] = [];
  const { eaten, count } = dayTotals(day);
  const budget = t.kcal;
  const workoutDone = !!c.workout && day.workoutsDone.includes(c.workout.id);

  if (c.date !== c.today) {
    if (c.date > c.today) {
      out.push({ id: 'future', tone: 'plan', prio: 50, title: c.workout ? `Gepland: ${c.workout.name}` : 'Rustdag gepland', text: c.workout ? `${c.workout.exercises.length} oefeningen, ongeveer ${c.workout.estMinutes} minuten.` : 'Geen training. Je stappen tellen wel.' });
      return out;
    }
    const parts = [`${fmt(eaten.kcal)} van ${fmt(t.kcal)} kcal`, `${liters(day.waterMl)} L water`, `${fmt(day.steps)} stappen`];
    out.push({ id: 'past', tone: count ? 'cheer' : 'tip', prio: 50, title: count ? 'Terugblik op deze dag' : 'Deze dag is leeg', text: count ? parts.join(' · ') + (workoutDone ? ' · training gedaan' : '') : 'Je kunt alsnog invullen wat je hebt gegeten.' });
    return out;
  }

  // Ochtendplan
  if (hour < 11) {
    out.push({
      id: 'plan', tone: 'plan', prio: 50,
      title: hour < 6 ? `Hoi${firstName(profile)}` : `${greeting(hour)}${firstName(profile)}`,
      text: c.workout
        ? `Vandaag staat ${c.workout.name} op het programma (± ${c.workout.estMinutes} min). Je doelen: ${fmt(t.kcal)} kcal, ${liters(c.waterTarget)} L water en ${fmt(t.steps)} stappen.`
        : `Rustdag vandaag: je spieren herstellen en groeien nu. Je doelen: ${fmt(t.kcal)} kcal, ${liters(c.waterTarget)} L water en ${fmt(t.steps)} stappen.`,
    });
  }

  // Training
  if (c.workout && !workoutDone && hour >= 11) {
    out.push({ id: 'train', tone: 'nudge', prio: hour >= 16 ? 78 : 66, title: `${c.workout.name} staat nog open`, text: `${c.workout.exercises.length} oefeningen, ± ${c.workout.estMinutes} minuten. Nog te doen vandaag.`, action: { label: 'Start training', kind: 'train' } });
  }
  if (workoutDone) out.push({ id: 'train-done', tone: 'cheer', prio: 80, title: 'Training gedaan', text: 'Eet in de komende uren een eiwitrijke maaltijd en drink wat extra water.' });

  // Nog niks gelogd
  if (count === 0 && hour >= 10) {
    out.push({ id: 'log', tone: 'nudge', prio: 72, title: 'Nog niets ingevuld vandaag', text: 'Vul in wat je tot nu toe gegeten hebt.', action: { label: 'Eten toevoegen', kind: 'food' } });
  }

  // Water
  const expected = c.waterTarget * Math.max(0, Math.min(1, (hour - 7) / 14));
  if (day.waterMl >= c.waterTarget) {
    out.push({ id: 'water-done', tone: 'cheer', prio: 60, title: 'Waterdoel gehaald', text: `${liters(day.waterMl)} liter gedronken.` });
  } else if (day.waterMl < expected - 400) {
    out.push({ id: 'water', tone: 'nudge', prio: 75, title: 'Tijd voor een glas water', text: `${liters(day.waterMl)} van ${liters(c.waterTarget)} liter. Je loopt iets achter op schema.`, action: { label: '+ glas water', kind: 'water' } });
  }

  // Eiwit
  if (eaten.p >= t.p * 0.95) {
    out.push({ id: 'protein-done', tone: 'cheer', prio: 65, title: 'Eiwitdoel gehaald', text: `${fmt(eaten.p)} g eiwit vandaag.` });
  } else if (hour >= 14 && count > 0 && eaten.p < t.p * 0.5) {
    const snack = suggest('snacks', { kcal: 200, p: t.p - eaten.p }, { prefs: c.prefs ?? { vega: false }, seed: c.date }).sort((a, b) => b.n.p / b.n.kcal - a.n.p / a.n.kcal)[0];
    out.push({
      id: 'protein', tone: 'tip', prio: 55, title: `Nog ${fmt(t.p - eaten.p)} g eiwit te gaan`,
      text: snack ? `${snack.recipe.name}: ${fmt(snack.n.p)} g eiwit, ${fmt(snack.n.kcal)} kcal.` : 'Bijvoorbeeld skyr (17 g), kipfilet (36 g) of linzen (14 g).',
      action: snack ? { label: 'Bekijk snack', kind: 'recipe', ref: snack.recipe.id, meal: 'snacks' } : { label: 'Eten toevoegen', kind: 'food' },
    });
  }

  // Vezels
  if (eaten.fib >= t.fib * 0.95 && count > 0) {
    out.push({ id: 'fiber-done', tone: 'cheer', prio: 44, title: 'Vezeldoel gehaald', text: `${fmt(eaten.fib)} g vezels vandaag. Goed voor je darmen en je verzadiging.` });
  } else if (hour >= 15 && count >= 2 && eaten.fib < t.fib * 0.45) {
    out.push({ id: 'fiber', tone: 'tip', prio: 42, title: `Nog ${fmt(t.fib - eaten.fib)} g vezels te gaan`, text: 'Kies bij het avondeten volkoren pasta of rijst, peulvruchten of een extra portie groente.', action: { label: 'Eten toevoegen', kind: 'food' } });
  }

  // Receptidee voor de volgende maaltijd
  const idea = mealIdea(c);
  if (idea) out.push(idea);

  // Calorieën
  if (eaten.kcal > budget * 1.1) {
    out.push({ id: 'kcal-over', tone: 'tip', prio: 40, title: 'Iets boven je doel', text: 'Eén dag maakt weinig uit. Kijk vooral naar je gemiddelde over de week.' });
  } else if (hour >= 19 && eaten.kcal >= budget * 0.85) {
    out.push({ id: 'kcal-good', tone: 'cheer', prio: 62, title: 'Mooi binnen je calorieën', text: `${fmt(eaten.kcal)} van ${fmt(budget)} kcal.` });
  }

  // Stappen
  if (day.steps >= t.steps) {
    out.push({ id: 'steps-done', tone: 'cheer', prio: 61, title: 'Stappendoel gehaald', text: `${fmt(day.steps)} stappen.` });
  } else if (hour >= 17 && day.steps < t.steps * 0.7) {
    const left = t.steps - day.steps;
    out.push({ id: 'steps', tone: 'nudge', prio: 58, title: `Nog ${fmt(left)} stappen`, text: `Een wandeling van ongeveer ${Math.max(5, Math.round(left / 110 / 5) * 5)} minuten is genoeg.`, action: { label: 'Stappen invullen', kind: 'steps' } });
  }

  // Streak
  const streak = streakFor(c.days, c.today);
  if (streak >= 3) out.push({ id: 'streak', tone: 'cheer', prio: 45, title: `${streak} dagen op rij ingevuld`, text: 'Bijhouden is het lastigste deel, en dat lukt je.' });

  // Wegen
  const last = c.weights[c.weights.length - 1];
  if (hour < 12 && (!last || last.date < addDays(c.today, -7))) {
    out.push({ id: 'weigh', tone: 'tip', prio: 35, title: 'Even op de weegschaal?', text: 'Eén keer per week is genoeg, het liefst ’s ochtends voor het ontbijt.', action: { label: 'Gewicht invullen', kind: 'weight' } });
  }

  // Rustdag-tip
  if (!c.workout && hour >= 11) {
    out.push({ id: 'rest', tone: 'tip', prio: 30, title: 'Rustdag', text: c.nextWorkout ? `Volgende training: ${c.nextWorkout.name}.` : 'Geen training vandaag.' });
  }

  // Tip van de dag
  const n = Number(c.date.replace(/-/g, '')) % TIPS.length;
  out.push({ id: 'tip', tone: 'tip', prio: 10, title: 'Tip', text: TIPS[n] });

  return out.sort((a, b) => b.prio - a.prio);
}

/** Doelen die je vandaag gehaald hebt, voor de felicitaties. */
export function achievements(c: Pick<CoachCtx, 'day' | 't' | 'waterTarget' | 'workout'>) {
  const { eaten } = dayTotals(c.day);
  const list: { id: string; title: string; text: string }[] = [];
  if (c.day.waterMl >= c.waterTarget) list.push({ id: 'water', title: 'Waterdoel gehaald', text: '' });
  if (eaten.p >= c.t.p * 0.95) list.push({ id: 'protein', title: 'Eiwitdoel gehaald', text: '' });
  if (c.day.steps >= c.t.steps) list.push({ id: 'steps', title: 'Stappendoel gehaald', text: '' });
  if (c.workout && c.day.workoutsDone.includes(c.workout.id)) list.push({ id: 'workout', title: 'Training gedaan', text: '' });
  return list;
}

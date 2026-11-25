// Inzichten uit je eigen gegevens: gewichtstrend, je echte verbruik en wanneer je je doel haalt.
import { KCAL_PER_KG, sumNutrients, type Nutrients, NO_NUTRIENTS, addNutrients } from './calc';
import { addDays, parseKey } from './date';
import { MEALS, type DayLog, type WeightEntry } from './types';

const dayNum = (key: string) => Math.round(parseKey(key).getTime() / 86400000);

export const dayNutrients = (d: DayLog): Nutrients => sumNutrients(MEALS.flatMap((m) => d.meals[m]));

/** Een dag telt als volledig ingevuld bij minstens twee maaltijden en 800 kcal. */
export function isComplete(d: DayLog | undefined) {
  if (!d) return false;
  const meals = MEALS.filter((m) => d.meals[m].length > 0).length;
  return meals >= 2 && dayNutrients(d).kcal >= 800;
}

export interface TrendPoint {
  date: string;
  kg: number;
  /** gladgestreken gewicht: dagelijkse schommelingen (vocht, zout, eten) vallen weg */
  trend: number;
}

/** Trendgewicht als voortschrijdend gemiddelde: elke dag weegt de nieuwe meting 10% mee. */
export function weightTrend(weights: WeightEntry[]): TrendPoint[] {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const out: TrendPoint[] = [];
  let trend = 0;
  let prev = 0;
  for (const w of sorted) {
    const day = dayNum(w.date);
    if (!out.length) trend = w.kg;
    else trend += (1 - Math.pow(0.9, Math.max(1, day - prev))) * (w.kg - trend);
    prev = day;
    out.push({ date: w.date, kg: w.kg, trend });
  }
  return out;
}

/** Hoe snel je gewicht verandert (kg per week), met een rechte lijn door je metingen. */
export function weightRate(weights: WeightEntry[], today: string, window = 28) {
  const from = addDays(today, -window);
  const pts = weights.filter((w) => w.date > from && w.date <= today);
  if (pts.length < 2) return null;
  const xs = pts.map((w) => dayNum(w.date));
  const span = Math.max(...xs) - Math.min(...xs);
  if (span < 7) return null;
  const mx = xs.reduce((s, x) => s + x, 0) / xs.length;
  const my = pts.reduce((s, w) => s + w.kg, 0) / pts.length;
  let num = 0;
  let den = 0;
  pts.forEach((w, i) => {
    num += (xs[i] - mx) * (w.kg - my);
    den += (xs[i] - mx) ** 2;
  });
  return { kgPerWeek: den ? (num / den) * 7 : 0, points: pts.length, span };
}

export interface EnergyInsight {
  /** gemeten verbruik in kcal per dag */
  tdee: number;
  /** gemiddeld gegeten op volledige dagen */
  intake: number;
  /** gewichtsverandering per week */
  kgPerWeek: number;
  loggedDays: number;
  weighIns: number;
  /** dagen tussen eerste en laatste weging */
  span: number;
  /** 0-1: hoe betrouwbaar de meting is */
  confidence: number;
}

/**
 * Je echte verbruik, zoals een slimme weegschaal-app dat doet: wat je gemiddeld at, gecorrigeerd voor hoe je
 * gewicht veranderde. Viel je 0,5 kg per week af bij 2000 kcal, dan verbruik je ± 2000 + 550 = 2550 kcal.
 * Hoe meer volledig gelogde dagen en wegingen, hoe betrouwbaarder.
 */
export function energyInsight(days: Record<string, DayLog>, weights: WeightEntry[], today: string, window = 28): EnergyInsight | null {
  const keys = Array.from({ length: window }, (_, i) => addDays(today, -1 - i));
  const complete = keys.filter((k) => isComplete(days[k]));
  const rate = weightRate(weights, today, window);
  if (complete.length < 7 || !rate) return null;
  const intake = complete.reduce((s, k) => s + dayNutrients(days[k]).kcal, 0) / complete.length;
  const tdee = intake - (rate.kgPerWeek / 7) * KCAL_PER_KG;
  if (tdee < 1000 || tdee > 6000) return null;
  const confidence = Math.min(1, complete.length / 21) * Math.min(1, rate.points / 6) * Math.min(1, rate.span / 21);
  return { tdee: Math.round(tdee), intake: Math.round(intake), kgPerWeek: rate.kgPerWeek, loggedDays: complete.length, weighIns: rate.points, span: rate.span, confidence };
}

/** Wat er nog nodig is voor een betrouwbare meting. */
export function insightNeeds(days: Record<string, DayLog>, weights: WeightEntry[], today: string, window = 28) {
  const keys = Array.from({ length: window }, (_, i) => addDays(today, -1 - i));
  const logged = keys.filter((k) => isComplete(days[k])).length;
  const from = addDays(today, -window);
  const weighIns = weights.filter((w) => w.date > from && w.date <= today).length;
  return { days: Math.max(0, 14 - logged), weighIns: Math.max(0, 4 - weighIns), logged, weighed: weighIns };
}

let cache: { days: unknown; weights: unknown; today: string; v: EnergyInsight | null } | null = null;

/** energyInsight met een kleine cache: veel schermen vragen het tegelijk op. */
export function cachedInsight(days: Record<string, DayLog>, weights: WeightEntry[], today: string) {
  if (cache && cache.days === days && cache.weights === weights && cache.today === today) return cache.v;
  const v = energyInsight(days, weights, today);
  cache = { days, weights, today, v };
  return v;
}

/** Wanneer je je streefgewicht haalt bij dit tempo. */
export function forecast(current: number, goal: number, kgPerWeek: number, today: string) {
  const diff = goal - current;
  if (Math.abs(diff) < 0.3) return { reached: true as const };
  if (Math.abs(kgPerWeek) < 0.03 || Math.sign(kgPerWeek) !== Math.sign(diff)) return null;
  const weeks = diff / kgPerWeek;
  if (weeks > 156) return null;
  return { reached: false as const, weeks, date: addDays(today, Math.round(weeks * 7)) };
}

/** Gemiddelde voedingswaarden over de dagen waarop je iets hebt gelogd. */
export function averageNutrients(days: (DayLog | undefined)[]) {
  const logged = days.filter((d): d is DayLog => !!d && MEALS.some((m) => d.meals[m].length > 0));
  if (!logged.length) return null;
  const sum = logged.reduce((acc, d) => addNutrients(acc, dayNutrients(d)), NO_NUTRIENTS);
  const n = logged.length;
  return { kcal: sum.kcal / n, p: sum.p / n, c: sum.c / n, f: sum.f / n, fib: sum.fib / n, days: n };
}

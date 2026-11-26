// Statistieken uit je dagboek: per dag, per week en per maand, plus actieve dagen en verbranding.
// Alles is puur rekenwerk (geen React), zodat het makkelijk te testen is.
import { stepsKcal, sumNutrients, TRAINING_WATER_BONUS, type Nutrients } from './calc';
import { addDays, dateKey, parseKey, weekday } from './date';
import { weightTrend } from './insights';
import { MEALS, type DayLog, type Profile, type Targets, type WeightEntry } from './types';

export type Period = 'dag' | 'week' | 'maand';

/** Lichte bezigheden tellen wel als actieve minuten, maar niet als training. */
const LIGHT = ['Wandelen', 'Yoga', 'Pilates', 'Tuinieren', 'Huishouden', 'Golf (lopend)'];
const isLight = (name: string) => LIGHT.some((l) => name.startsWith(l));

/** Trainingen op een dag: schema- en eigen trainingen, plus sport van minstens 20 minuten. */
export const trainingsOn = (d?: DayLog) => (d ? d.activities.filter((a) => a.workout || (!isLight(a.name) && a.minutes >= 20)).length : 0);

/** Waterdoel voor een dag: +0,5 L op trainingsdagen (tenzij je een eigen doel hebt). */
export function waterTargetFor(p: Pick<Profile, 'trainDays' | 'custom'>, t: Pick<Targets, 'waterMl'>, date: string) {
  return t.waterMl + (p.trainDays.includes(weekday(date)) && !p.custom?.waterMl ? TRAINING_WATER_BONUS : 0);
}

export const foodCount = (d?: DayLog) => (d ? MEALS.reduce((s, m) => s + d.meals[m].length, 0) : 0);

/** Verbranding op een dag, met een duidelijk onderscheid tussen wat jij registreerde en wat Puls schat. */
export function burnedOn(d: DayLog | undefined, kg: number, heightCm: number) {
  const logged = d ? d.activities.reduce((s, a) => s + a.kcal, 0) : 0;
  const fromSteps = d ? stepsKcal(d.steps, kg, heightCm) : 0;
  return { logged, fromSteps, total: logged + fromSteps };
}

export interface DayStat {
  date: string;
  /** er is eten gelogd */
  logged: boolean;
  n: Nutrients;
  water: number;
  waterGoal: number;
  steps: number;
  activeMin: number;
  trainings: number;
  burnedLogged: number;
  burnedSteps: number;
}

export interface StatCtx {
  profile: Profile;
  t: Targets;
}

export function dayStat(date: string, d: DayLog | undefined, c: StatCtx): DayStat {
  const n = d ? sumNutrients(MEALS.flatMap((m) => d.meals[m])) : { kcal: 0, p: 0, c: 0, f: 0, fib: 0 };
  const b = burnedOn(d, c.profile.weightKg, c.profile.heightCm);
  return {
    date,
    logged: foodCount(d) > 0,
    n,
    water: d?.waterMl ?? 0,
    waterGoal: waterTargetFor(c.profile, c.t, date),
    steps: d?.steps ?? 0,
    activeMin: d ? d.activities.reduce((s, a) => s + a.minutes, 0) : 0,
    trainings: trainingsOn(d),
    burnedLogged: b.logged,
    burnedSteps: b.fromSteps,
  };
}

export interface Bucket {
  key: string;
  /** kort label onder de balk */
  label: string;
  /** volledig label voor de uitleg bij een balk */
  title: string;
  from: string;
  to: string;
  /** dagen in deze periode tot en met vandaag */
  elapsed: number;
  /** dagen met eten gelogd */
  loggedDays: number;
  /** gemiddeld per gelogde dag */
  kcal: number;
  p: number;
  c: number;
  f: number;
  fib: number;
  /** gemiddeld water per dag dat je water bijhield */
  water: number;
  waterDays: number;
  /** dagen waarop je je waterdoel haalde */
  waterGoalDays: number;
  /** gemiddeld aantal stappen per dag dat je stappen bijhield */
  steps: number;
  stepDays: number;
  /** totalen over de periode */
  activeMin: number;
  trainings: number;
  burnedLogged: number;
  burnedSteps: number;
  /** trendgewicht aan het eind van de periode (als je je woog) */
  weight: number | null;
  /** echte weging in deze periode */
  weighed: boolean;
  /** de periode ligt (deels) in de toekomst */
  future: boolean;
}

const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const MONTHS_LONG = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const DAYS_LONG = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
const DAYS_SHORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

const dm = (key: string) => {
  const d = parseKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/** ISO-weeknummer. */
export function weekNumber(key: string) {
  const d = parseKey(key);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y.getTime()) / 86400000 + 1) / 7);
}

export const mondayOf = (key: string) => addDays(key, -weekday(key));
export const monthStart = (key: string) => key.slice(0, 8) + '01';
const monthEnd = (key: string) => {
  const d = parseKey(key);
  return dateKey(new Date(d.getFullYear(), d.getMonth() + 1, 0));
};
const shiftMonth = (key: string, n: number) => {
  const d = parseKey(key);
  return dateKey(new Date(d.getFullYear(), d.getMonth() + n, 1));
};

/** Hoeveel balken er per weergave zijn. */
export const PERIOD_COUNT: Record<Period, number> = { dag: 7, week: 8, maand: 6 };

/** De periodes (van oud naar nieuw) die eindigen bij `today`, `page` stappen terug in de tijd. */
export function ranges(period: Period, today: string, page = 0, count = PERIOD_COUNT[period]) {
  const out: { from: string; to: string; label: string; title: string }[] = [];
  if (period === 'dag') {
    const end = addDays(today, -page * count);
    for (let i = count - 1; i >= 0; i--) {
      const k = addDays(end, -i);
      const d = parseKey(k);
      out.push({ from: k, to: k, label: count <= 7 ? DAYS_SHORT[weekday(k)] : String(d.getDate()), title: `${DAYS_LONG[weekday(k)]} ${dm(k)}` });
    }
  } else if (period === 'week') {
    const endMon = addDays(mondayOf(today), -7 * page * count);
    for (let i = count - 1; i >= 0; i--) {
      const mon = addDays(endMon, -7 * i);
      const sun = addDays(mon, 6);
      out.push({ from: mon, to: sun, label: `wk ${weekNumber(mon)}`, title: `Week ${weekNumber(mon)} · ${dm(mon)} – ${dm(sun)}` });
    }
  } else {
    const endM = shiftMonth(monthStart(today), -page * count);
    for (let i = count - 1; i >= 0; i--) {
      const first = shiftMonth(endM, -i);
      const d = parseKey(first);
      out.push({ from: first, to: monthEnd(first), label: MONTHS[d.getMonth()], title: `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}` });
    }
  }
  return out;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

export function buckets(period: Period, days: Record<string, DayLog>, weights: WeightEntry[], c: StatCtx, today: string, page = 0, count?: number): Bucket[] {
  const trend = weightTrend(weights);
  return ranges(period, today, page, count).map((r) => {
    const stats: DayStat[] = [];
    for (let k = r.from; k <= r.to && k <= today; k = addDays(k, 1)) stats.push(dayStat(k, days[k], c));
    const logged = stats.filter((s) => s.logged);
    const watered = stats.filter((s) => s.water > 0);
    const stepped = stats.filter((s) => s.steps > 0);
    const inRange = trend.filter((w) => w.date >= r.from && w.date <= r.to);
    return {
      key: r.from,
      label: r.label,
      title: r.title,
      from: r.from,
      to: r.to,
      elapsed: stats.length,
      loggedDays: logged.length,
      kcal: avg(logged.map((s) => s.n.kcal)),
      p: avg(logged.map((s) => s.n.p)),
      c: avg(logged.map((s) => s.n.c)),
      f: avg(logged.map((s) => s.n.f)),
      fib: avg(logged.map((s) => s.n.fib)),
      water: avg(watered.map((s) => s.water)),
      waterDays: watered.length,
      waterGoalDays: stats.filter((s) => s.water >= s.waterGoal).length,
      steps: avg(stepped.map((s) => s.steps)),
      stepDays: stepped.length,
      activeMin: stats.reduce((s, x) => s + x.activeMin, 0),
      trainings: stats.reduce((s, x) => s + x.trainings, 0),
      burnedLogged: stats.reduce((s, x) => s + x.burnedLogged, 0),
      burnedSteps: stats.reduce((s, x) => s + x.burnedSteps, 0),
      weight: inRange.length ? inRange[inRange.length - 1].trend : null,
      weighed: inRange.length > 0,
      future: r.to > today,
    };
  });
}

/** Procentueel verschil, of null als er niets te vergelijken valt. */
export const change = (now: number, before: number) => (before > 0 && now > 0 ? (now - before) / before : null);

/* ---------- Actieve dagen ---------- */

export interface ActiveDay {
  date: string;
  /** 0 = niets, 1-4 = hoeveel van: eten gelogd, waterdoel, bewogen (stappen of sport), training */
  level: number;
}

export function activeLevel(d: DayLog | undefined, c: StatCtx, date: string) {
  if (!d) return 0;
  let n = 0;
  if (foodCount(d) > 0) n++;
  if (d.waterMl >= waterTargetFor(c.profile, c.t, date)) n++;
  if (d.steps >= c.t.steps || d.activities.some((a) => !a.workout && a.minutes >= 20)) n++;
  if (trainingsOn(d) > 0) n++;
  return n;
}

/** Een dag is actief als je iets bijhield of bewoog. */
export const isActiveDay = (d: DayLog | undefined) => !!d && (foodCount(d) > 0 || d.waterMl > 0 || d.steps > 0 || d.activities.length > 0);

/** Laatste `weeks` weken (maandag t/m zondag), oud naar nieuw: voor de heatmap. */
export function activeGrid(days: Record<string, DayLog>, c: StatCtx, today: string, weeks = 12): ActiveDay[][] {
  const start = addDays(mondayOf(today), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, i) => {
      const k = addDays(start, w * 7 + i);
      return { date: k, level: k > today ? -1 : activeLevel(days[k], c, k) };
    }),
  );
}

/** Aantal actieve dagen in de laatste n dagen (t/m vandaag). Vergevingsgezind: telt dagen, geen reeks. */
export function activeDaysIn(days: Record<string, DayLog>, today: string, n: number) {
  let count = 0;
  for (let i = 0; i < n; i++) if (isActiveDay(days[addDays(today, -i)])) count++;
  return count;
}

/** Dagen op rij met eten gelogd (t/m vandaag, of t/m gisteren als je vandaag nog niets invulde). */
export function logStreak(days: Record<string, DayLog>, today: string) {
  let n = 0;
  let k = foodCount(days[today]) ? today : addDays(today, -1);
  while (foodCount(days[k]) > 0 && n < 3650) {
    n++;
    k = addDays(k, -1);
  }
  return n;
}

/* ---------- Recente activiteit (voor het dashboard) ---------- */

export interface FeedItem {
  date: string;
  /** sorteervolgorde binnen een dag */
  t: number;
  kind: 'food' | 'water' | 'activity' | 'workout' | 'weight';
  title: string;
  sub: string;
  value?: string;
}

export function recentFeed(days: Record<string, DayLog>, weights: WeightEntry[], today: string, limit = 6, lookback = 7): FeedItem[] {
  const out: FeedItem[] = [];
  const fmt = (n: number) => Math.round(n).toLocaleString('nl-NL');
  for (let i = 0; i < lookback; i++) {
    const k = addDays(today, -i);
    const d = days[k];
    const base = (lookback - i) * 1000;
    const w = weights.find((x) => x.date === k);
    if (w) out.push({ date: k, t: base + 1, kind: 'weight', title: 'Gewogen', sub: 'Gewicht', value: `${w.kg.toLocaleString('nl-NL', { maximumFractionDigits: 1 })} kg` });
    if (!d) continue;
    MEALS.forEach((m, mi) => {
      const list = d.meals[m];
      if (!list.length) return;
      const n = sumNutrients(list);
      const names = list.map((e) => e.food.name.replace(/ \(.*\)$/, ''));
      out.push({ date: k, t: base + 10 + mi, kind: 'food', title: names.slice(0, 2).join(', ') + (names.length > 2 ? ` +${names.length - 2}` : ''), sub: m, value: `${fmt(n.kcal)} kcal` });
    });
    if (d.waterMl > 0) {
      const last = d.sips?.length ? d.sips[d.sips.length - 1].t : 0;
      out.push({ date: k, t: base + 5 + (last ? (last % 86400000) / 86400000 : 0), kind: 'water', title: 'Water', sub: d.sips?.length ? `${d.sips.length}× gedronken` : 'gedronken', value: `${(d.waterMl / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 2 })} L` });
    }
    d.activities.forEach((a, ai) => {
      out.push({ date: k, t: base + 20 + ai, kind: a.workout ? 'workout' : 'activity', title: a.name, sub: `${a.minutes} min${a.km ? ` · ${a.km.toLocaleString('nl-NL', { maximumFractionDigits: 1 })} km` : ''}`, value: `${fmt(a.kcal)} kcal` });
    });
  }
  return out.sort((a, b) => b.t - a.t).slice(0, limit);
}

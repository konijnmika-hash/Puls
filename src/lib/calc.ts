import { addDays, parseKey } from './date';
import { MEALS, type ActivityLevel, type DayLog, type FoodEntry, type Goal, type MealKey, type Pace, type Profile, type Targets, type WeightEntry } from './types';

/**
 * Activiteit buiten je trainingen om (werk, lopen, fietsen). Je trainingen tellen we apart op basis
 * van je trainingsdagen, zodat ze niet dubbel meetellen.
 */
export const ACTIVITY: Record<ActivityLevel, { factor: number; label: string; hint: string; steps: number }> = {
  zittend: { factor: 1.2, label: 'Vooral zittend', hint: 'Kantoorbaan, weinig lopen', steps: 7000 },
  licht: { factor: 1.32, label: 'Licht actief', hint: 'Af en toe wandelen of fietsen', steps: 8000 },
  gemiddeld: { factor: 1.45, label: 'Gemiddeld actief', hint: 'Veel op de been, of elke dag fietsen', steps: 9000 },
  actief: { factor: 1.6, label: 'Erg actief', hint: 'Fysiek werk, zoals bouw of zorg', steps: 10000 },
  zeer: { factor: 1.75, label: 'Zeer actief', hint: 'Zwaar fysiek werk de hele dag', steps: 12000 },
};

/** Tempo in kg per week. 1 kg lichaamsvet ≈ 7700 kcal. */
export const PACE: Record<Pace, { kgPerWeek: number; label: string }> = {
  rustig: { kgPerWeek: 0.25, label: 'Rustig' },
  normaal: { kgPerWeek: 0.5, label: 'Normaal' },
  snel: { kgPerWeek: 0.75, label: 'Snel' },
};

/** Bij aankomen en bij afvallen + spieropbouw ga je bewust langzamer, zodat het vooral spier wordt (of blijft). */
const PACE_SCALE: Record<Goal, number> = { afvallen: 1, recomp: 0.6, onderhouden: 0, aankomen: 0.5 };

/** Gewichtsverandering per week voor jouw doel en tempo (negatief = afvallen). */
export function weeklyChange(goal: Goal, pace: Pace) {
  const kg = PACE[pace].kgPerWeek * PACE_SCALE[goal];
  return goal === 'aankomen' ? kg : -kg;
}

/** Doelen die op een tekort draaien: dan maken we recepten lichter. */
export const isCut = (goal: Goal | undefined) => goal === 'afvallen' || goal === 'recomp';

const round = (n: number, to: number) => Math.round(n / to) * to;

/** Basaal metabolisme volgens Mifflin-St Jeor. */
export function bmr(p: Pick<Profile, 'sex' | 'weightKg' | 'heightCm' | 'age'>) {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  const sexOffset = p.sex === 'man' ? 5 : p.sex === 'vrouw' ? -161 : -78;
  return base + sexOffset;
}

export const bmi = (weightKg: number, heightCm: number) => weightKg / (heightCm / 100) ** 2;

/**
 * Geschat vetpercentage uit de zelfinschatting (1-10). Meer spieren bij hetzelfde "dikte-gevoel"
 * betekent iets minder vet. Dit is een ruwe schatting, geen meting.
 */
export function bodyFat(p: Pick<Profile, 'sex' | 'fat' | 'muscle'>) {
  const [lo, step] = p.sex === 'man' ? [7, 3.4] : p.sex === 'vrouw' ? [15, 3.6] : [11, 3.5];
  const bf = lo + (p.fat - 1) * step - (p.muscle - 5) * 0.6;
  return Math.max(p.sex === 'vrouw' ? 12 : 5, Math.min(55, bf));
}

/** Vetvrije massa in kg. */
export const leanMass = (p: Pick<Profile, 'sex' | 'fat' | 'muscle' | 'weightKg'>) => p.weightKg * (1 - bodyFat(p) / 100);

/** Al slank: dan verlies je bij een groot tekort sneller spier, dus houden we het tekort kleiner. */
const isLean = (p: Pick<Profile, 'sex' | 'fat' | 'muscle'>) => bodyFat(p) < (p.sex === 'vrouw' ? 22 : p.sex === 'man' ? 14 : 18);

/** Gemiddeld extra verbruik per dag door je trainingen (krachttraining ≈ 5 MET, ± 50 min actief). */
export function trainingKcalPerDay(p: Pick<Profile, 'trainDays' | 'weightKg' | 'focus'>) {
  const met = p.focus === 'afvallen' || p.focus === 'fit' ? 5.5 : 5;
  // alleen het deel bovenop rust (1 MET) telt extra
  return (p.trainDays.length * (met - 1) * p.weightKg * (50 / 60)) / 7;
}

/** Wat we leren uit je dagboek en weegmomenten: je echte verbruik. */
export interface Observed {
  tdee: number;
  days: number;
}

export function calcTargets(p: Profile, observed?: Observed | null): Targets {
  // Gemiddelde van Mifflin-St Jeor (lengte/gewicht/leeftijd) en Katch-McArdle (vetvrije massa),
  // met een kleine correctie voor spiermassa: spieren verbruiken meer energie in rust.
  const lbm = leanMass(p);
  const katch = (370 + 21.6 * lbm) * (1 + (p.muscle - 5) * 0.01);
  const b = (bmr(p) + katch) / 2;
  // Dagelijkse activiteit + trainingen + verteren van eten (zit al grotendeels in de factor)
  let tdee = b * ACTIVITY[p.activity].factor + trainingKcalPerDay(p);
  // Heb je een paar weken trouw gelogd en gewogen? Dan schuiven we op naar je echte verbruik.
  let adapted = 0;
  if (observed && observed.days >= 10) {
    const obs = Math.max(tdee * 0.75, Math.min(tdee * 1.25, observed.tdee));
    const w = Math.min(0.6, observed.days / 40);
    adapted = Math.round((obs - tdee) * w);
    tdee += adapted;
  }

  const perDay = (Math.abs(weeklyChange(p.goal, p.pace)) * 7700) / 7;
  let kcal = tdee;
  if (isCut(p.goal)) {
    // Nooit meer dan 25% onder je verbruik (20% als je al slank bent, 20% bij afvallen + spieren)
    const maxShare = isLean(p) || p.goal === 'recomp' ? 0.2 : 0.25;
    kcal = tdee - Math.min(perDay, tdee * maxShare);
  } else if (p.goal === 'aankomen') {
    // Beginners bouwen sneller spier op, dus mogen iets meer overschot hebben
    const extra = p.experience === 'nieuw' || p.experience === 'beginner' ? 1.15 : 1;
    kcal = tdee + Math.min(perDay * extra, tdee * 0.15);
  }
  // Ondergrens: niet onder je rustverbranding en niet onder 1500 (man) of 1200 (vrouw)
  const floor = Math.max(p.sex === 'man' ? 1500 : p.sex === 'vrouw' ? 1200 : 1350, b);
  kcal = Math.max(kcal, floor);
  kcal = round(p.custom?.kcal ?? kcal, 10);

  // Eiwit op basis van vetvrije massa (zo telt overgewicht niet mee). Tijdens een tekort meer,
  // om spieren te beschermen; bij afvallen + spieren opbouwen het meest.
  const trains = p.trainDays.length >= 2;
  let perLbm =
    p.goal === 'recomp' ? 2.7
      : p.goal === 'afvallen' ? (trains ? 2.6 : 2.3)
        : p.goal === 'aankomen' ? 2.2
          : trains ? 2.1 : 1.8;
  if (isCut(p.goal) && isLean(p)) perLbm += 0.2; // slank + tekort = meer risico op spierverlies
  if (p.focus === 'spiermassa' || p.focus === 'kracht') perLbm = Math.max(perLbm, 2.2);
  if (p.age >= 50) perLbm += 0.15; // oudere spieren hebben wat meer eiwit nodig
  const protein = Math.round(Math.max(p.weightKg * 1.2, Math.min(lbm * perLbm, p.weightKg * 2.4, 250)));

  // Vet: 25-30% van je calorieën, maar minstens 0,6 g per kg (van je streefgewicht als dat lager is)
  const fatKg = Math.min(p.weightKg, Math.max(p.goalWeightKg || p.weightKg, lbm * 1.15));
  const fatShare = isCut(p.goal) ? 0.25 : 0.28;
  const fat = Math.round(Math.max((kcal * fatShare) / 9, fatKg * 0.6));
  const carbs = Math.max(50, Math.round((kcal - protein * 4 - fat * 9) / 4));

  // Water: ± 35 ml per kg, met wat extra als je veel beweegt
  const water = Math.min(4000, Math.max(1500, round(p.weightKg * 35 + (p.activity === 'actief' || p.activity === 'zeer' ? 500 : 0), 250)));
  let steps = ACTIVITY[p.activity].steps + (isCut(p.goal) ? 1000 : 0);
  steps = Math.min(steps, 12000);

  return {
    kcal,
    p: protein,
    c: carbs,
    f: fat,
    waterMl: p.custom?.waterMl ?? water,
    steps: p.custom?.steps ?? steps,
    bmr: Math.round(b),
    tdee: Math.round(tdee),
    adapted,
  };
}

/**
 * Je echte verbruik uit de laatste 4 weken: gemiddeld gegeten min (of plus) de verandering van je
 * gewicht. Alleen dagen waarop je duidelijk alles hebt gelogd tellen mee, vandaag niet.
 */
export function observedTdee(days: Record<string, DayLog>, weights: WeightEntry[], today: string): Observed | null {
  const from = addDays(today, -28);
  const ws = weights.filter((w) => w.date >= from && w.date < today);
  if (ws.length < 3) return null;
  const t0 = parseKey(ws[0].date).getTime();
  const xs = ws.map((w) => (parseKey(w.date).getTime() - t0) / 864e5);
  if (xs[xs.length - 1] < 14) return null;
  // trendlijn door je weegmomenten, zodat één zware dag niet alles bepaalt
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ws.reduce((a, w) => a + w.kg, 0) / ws.length;
  let num = 0;
  let den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (ws[i].kg - my); den += (x - mx) ** 2; });
  const slope = den ? num / den : 0; // kg per dag

  let total = 0;
  let n = 0;
  for (let d = addDays(today, -1); d >= from; d = addDays(d, -1)) {
    const day = days[d];
    if (!day) continue;
    const k = sumNutrients(MEALS.flatMap((m) => day.meals[m])).kcal;
    if (k < 900) continue; // waarschijnlijk niet alles ingevuld
    total += k;
    n++;
  }
  if (n < 10) return null;
  return { tdee: total / n - slope * 7700, days: n };
}

/** Extra water op trainingsdagen. */
export const TRAINING_WATER_BONUS = 500;

export const MEAL_SPLIT: Record<MealKey, [number, number]> = {
  ontbijt: [0.2, 0.3],
  lunch: [0.25, 0.35],
  diner: [0.3, 0.4],
  snacks: [0.05, 0.15],
};

export const mealRange = (meal: MealKey, kcal: number) =>
  MEAL_SPLIT[meal].map((f) => round(kcal * f, 50)) as [number, number];

export interface Nutrients {
  kcal: number;
  p: number;
  c: number;
  f: number;
}

export const entryNutrients = (e: FoodEntry): Nutrients => {
  const k = e.grams / 100;
  return { kcal: e.food.kcal * k, p: e.food.p * k, c: e.food.c * k, f: e.food.f * k };
};

export const sumNutrients = (entries: FoodEntry[]): Nutrients =>
  entries.reduce(
    (acc, e) => {
      const n = entryNutrients(e);
      return { kcal: acc.kcal + n.kcal, p: acc.p + n.p, c: acc.c + n.c, f: acc.f + n.f };
    },
    { kcal: 0, p: 0, c: 0, f: 0 },
  );

/** kcal verbrand bij een activiteit: MET × kg × uur */
export const metKcal = (met: number, kg: number, minutes: number) => Math.round(met * kg * (minutes / 60));

/** Gemiddelde staplengte in meters (≈ 0,415 × lengte). */
export const stepsToKm = (steps: number, heightCm = 175) => (steps * heightCm * 0.415) / 100 / 1000;

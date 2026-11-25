import type { ActivityLevel, FoodEntry, MealKey, Pace, Profile, Targets } from './types';

/**
 * Activiteit in het dagelijks leven, zónder trainingen. Die rekenen we apart mee op basis van
 * je trainingsdagen, zodat sporten niet dubbel telt.
 */
export const ACTIVITY: Record<ActivityLevel, { factor: number; label: string; hint: string; steps: number }> = {
  zittend: { factor: 1.2, label: 'Vooral zittend', hint: 'Kantoorbaan of studie, weinig lopen', steps: 7000 },
  licht: { factor: 1.33, label: 'Licht actief', hint: 'Dagelijks een stukje wandelen of fietsen', steps: 8000 },
  gemiddeld: { factor: 1.45, label: 'Gemiddeld actief', hint: 'Veel op de been, zoals in de winkel of de zorg', steps: 9000 },
  actief: { factor: 1.6, label: 'Erg actief', hint: 'Fysiek werk, zoals in de bouw of als koerier', steps: 10000 },
  zeer: { factor: 1.75, label: 'Zwaar fysiek werk', hint: 'De hele dag zwaar tillen of sjouwen', steps: 12000 },
};

/** Zo snel mag je hoogstens afvallen: 1% van je gewicht per week. */
export const MAX_LOSS_PCT_PER_WEEK = 0.01;

/** Dagelijks verschil in kcal t.o.v. onderhoud. 1 kg lichaamsvet ≈ 7700 kcal. */
export const PACE: Record<Pace, { kgPerWeek: number; label: string }> = {
  rustig: { kgPerWeek: 0.25, label: 'Rustig' },
  normaal: { kgPerWeek: 0.5, label: 'Normaal' },
  snel: { kgPerWeek: 0.75, label: 'Snel' },
};

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

/** Dit vetpercentage geldt als slank: daaronder houden we het tekort extra klein. */
export const leanBodyFat = (sex: Profile['sex']) => (sex === 'man' ? 14 : sex === 'vrouw' ? 22 : 18);

/** Absolute ondergrens per dag, wat je doel ook is. */
export const kcalFloor = (sex: Profile['sex']) => (sex === 'man' ? 1500 : sex === 'vrouw' ? 1200 : 1350);

/**
 * Gemiddeld extra verbruik per dag door je trainingen: (MET − 1) × kg × uur per sessie, verdeeld over de week.
 * Krachttraining ± 5 MET; met de cardio-finisher bij "vet verbranden" iets meer.
 */
export function trainingKcalPerDay(p: Pick<Profile, 'trainDays' | 'weightKg' | 'focus' | 'experience'>) {
  const minutes = p.experience === 'nieuw' ? 40 : p.experience === 'ervaren' ? 65 : 55;
  const met = p.focus === 'afvallen' ? 6 : p.focus === 'fit' ? 5.5 : 5;
  const perSession = (met - 1) * p.weightKg * (minutes / 60);
  return (perSession * p.trainDays.length) / 7;
}

export function calcTargets(p: Profile): Targets {
  // Gemiddelde van Mifflin-St Jeor (lengte/gewicht/leeftijd) en Katch-McArdle (vetvrije massa),
  // met een kleine correctie voor spiermassa: spieren verbruiken meer energie in rust.
  const lbm = leanMass(p);
  const katch = (370 + 21.6 * lbm) * (1 + (p.muscle - 5) * 0.01);
  const b = (bmr(p) + katch) / 2;
  const daily = b * ACTIVITY[p.activity].factor;
  const train = trainingKcalPerDay(p);
  const tdee = daily + train;

  // Hoeveel tekort (of overschot) is verantwoord voor jou?
  const bf = bodyFat(p);
  const lean = bf < leanBodyFat(p.sex);
  const young = p.age < 18;
  let delta = 0;
  if (p.goal === 'afvallen') {
    const kgWeek = Math.min(PACE[p.pace].kgPerWeek, p.weightKg * MAX_LOSS_PCT_PER_WEEK);
    const maxPct = young ? 0.1 : lean ? 0.15 : 0.25;
    delta = -Math.min((kgWeek * 7700) / 7, tdee * maxPct);
  } else if (p.goal === 'recomp') {
    // klein tekort (± 10-12%): genoeg om vet te verliezen, met ruimte om spieren op te bouwen
    delta = -Math.min(tdee * (young || lean ? 0.08 : 0.12), 350);
  } else if (p.goal === 'aankomen') {
    delta = Math.min(((PACE[p.pace].kgPerWeek * 7700) / 7) * 0.6, tdee * 0.15);
  }

  // Nooit (ver) onder je rustverbranding of onder de absolute ondergrens
  const minKcal = round(Math.max(kcalFloor(p.sex), b * 0.9), 10);
  const auto = Math.max(tdee + delta, minKcal);
  const kcal = round(p.custom?.kcal ?? auto, 10);
  const realDelta = auto - tdee;

  // Eiwit op basis van vetvrije massa: bij afvallen extra om spieren te behouden
  let perLbm = p.goal === 'recomp' ? 2.7 : p.goal === 'afvallen' ? 2.5 : p.goal === 'aankomen' ? 2.3 : 2.0;
  if (p.focus === 'spiermassa' || p.focus === 'kracht') perLbm = Math.max(perLbm, 2.3);
  const protein = Math.round(Math.min(lbm * perLbm, p.weightKg * (p.goal === 'recomp' ? 2.6 : 2.4)));
  // Vet: ± 28% van je calorieën, maar minstens 0,6 g per kg voor je hormonen
  const fat = Math.round(Math.max((kcal * 0.28) / 9, Math.min(p.weightKg * 0.6, (kcal * 0.4) / 9)));
  const carbs = Math.max(50, Math.round((kcal - protein * 4 - fat * 9) / 4));

  const water = Math.min(4000, Math.max(1500, round(p.weightKg * 35, 250)));
  let steps = ACTIVITY[p.activity].steps + (p.goal === 'afvallen' || p.goal === 'recomp' ? 1000 : 0);
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
    dailyKcal: Math.round(daily),
    trainKcal: Math.round(train),
    delta: Math.round(realDelta),
    kgPerWeek: Math.round(((realDelta * 7) / 7700) * 100) / 100,
    minKcal,
  };
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

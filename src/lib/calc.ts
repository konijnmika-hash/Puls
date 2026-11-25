import type { ActivityLevel, EatPattern, Experience, FoodEntry, Goal, MacroStyle, MealKey, Pace, Profile, Targets } from './types';

/**
 * Dagelijkse activiteit zónder je trainingen (die tellen we apart mee).
 * De factor gaat over je rustverbranding en bevat ook de energie die je kwijt bent aan verteren.
 */
export const ACTIVITY: Record<ActivityLevel, { factor: number; label: string; hint: string; steps: number }> = {
  zittend: { factor: 1.2, label: 'Vooral zittend', hint: 'Kantoor of studie, weinig lopen', steps: 7000 },
  licht: { factor: 1.35, label: 'Licht actief', hint: 'Dagelijks wat wandelen of fietsen', steps: 8000 },
  gemiddeld: { factor: 1.5, label: 'Gemiddeld actief', hint: 'Veel op de been, zoals in een winkel of de zorg', steps: 9000 },
  actief: { factor: 1.65, label: 'Erg actief', hint: 'Lichamelijk werk, zoals bouw, horeca of bezorging', steps: 10000 },
  zeer: { factor: 1.8, label: 'Zwaar lichamelijk werk', hint: 'De hele dag zwaar fysiek bezig', steps: 12000 },
};

/**
 * Tempo als deel van je verbruik: zo past het tekort bij jouw lichaam in plaats van één getal voor iedereen.
 * cut = tekort bij afvallen, bulk = overschot bij aankomen.
 */
export const PACE: Record<Pace, { label: string; cut: number; bulk: number; hint: string }> = {
  rustig: { label: 'Rustig', cut: 0.12, bulk: 0.05, hint: 'Makkelijk vol te houden' },
  normaal: { label: 'Normaal', cut: 0.2, bulk: 0.1, hint: 'Aanbevolen' },
  snel: { label: 'Snel', cut: 0.25, bulk: 0.15, hint: 'Vraagt meer discipline' },
};

/** Hoeveel kcal er in 1 kg lichaamsgewicht zit (vet met wat water en spier). */
export const KCAL_PER_KG = 7700;

export const PATTERNS: Record<EatPattern, { label: string; hint: string; split: Record<MealKey, [number, number]> }> = {
  standaard: {
    label: 'Standaard', hint: 'Drie maaltijden en iets tussendoor',
    split: { ontbijt: [0.2, 0.3], lunch: [0.25, 0.35], diner: [0.3, 0.4], snacks: [0.05, 0.15] },
  },
  'groot-ontbijt': {
    label: 'Groot ontbijt', hint: 'Stevig beginnen, lichter eindigen',
    split: { ontbijt: [0.3, 0.4], lunch: [0.25, 0.35], diner: [0.2, 0.3], snacks: [0.05, 0.15] },
  },
  'geen-ontbijt': {
    label: 'Ontbijt overslaan (16:8)', hint: 'Eten tussen ongeveer 12 en 20 uur',
    split: { ontbijt: [0, 0], lunch: [0.35, 0.45], diner: [0.4, 0.5], snacks: [0.1, 0.2] },
  },
  tussendoor: {
    label: 'Vaker kleine porties', hint: 'Lichtere maaltijden en meer tussendoortjes',
    split: { ontbijt: [0.15, 0.25], lunch: [0.2, 0.3], diner: [0.25, 0.35], snacks: [0.2, 0.3] },
  },
};

export const MACRO_STYLE: Record<MacroStyle, { label: string; hint: string; fat: number }> = {
  gebalanceerd: { label: 'Gebalanceerd', hint: 'Een gewone verdeling die bij bijna iedereen past', fat: 0.28 },
  koolhydraatarm: { label: 'Koolhydraatarm', hint: 'Meer vet, minder brood, pasta en rijst', fat: 0.4 },
  sportief: { label: 'Sportief', hint: 'Meer koolhydraten voor duursport en zware trainingen', fat: 0.22 },
};

const round = (n: number, to: number) => Math.round(n / to) * to;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Basaal metabolisme volgens Mifflin-St Jeor. */
export function bmr(p: Pick<Profile, 'sex' | 'weightKg' | 'heightCm' | 'age'>) {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  const sexOffset = p.sex === 'man' ? 5 : p.sex === 'vrouw' ? -161 : -78;
  return base + sexOffset;
}

export const bmi = (weightKg: number, heightCm: number) => weightKg / (heightCm / 100) ** 2;

/** Vetpercentage volgens Deurenberg (1991), uit BMI, leeftijd en geslacht. */
export function bmiFat(p: Pick<Profile, 'sex' | 'weightKg' | 'heightCm' | 'age'>) {
  const s = p.sex === 'man' ? 1 : p.sex === 'vrouw' ? 0 : 0.5;
  return 1.2 * bmi(p.weightKg, p.heightCm) + 0.23 * p.age - 10.8 * s - 5.4;
}

type FatInput = Pick<Profile, 'sex' | 'fat' | 'muscle'> & Partial<Pick<Profile, 'weightKg' | 'heightCm' | 'age'>>;

/**
 * Geschat vetpercentage. Basis is je eigen inschatting (schaal 1-10); meer spieren bij hetzelfde
 * "dikte-gevoel" betekent iets minder vet. Weten we ook lengte, gewicht en leeftijd, dan mengen we er
 * de BMI-formule doorheen. Die zit ernaast bij gespierde mensen, dus dan telt hij minder mee.
 * Dit blijft een schatting, geen meting.
 */
export function bodyFat(p: FatInput) {
  const [lo, step] = p.sex === 'man' ? [7, 3.4] : p.sex === 'vrouw' ? [15, 3.6] : [11, 3.5];
  let bf = lo + (p.fat - 1) * step - (p.muscle - 5) * 0.6;
  if (p.weightKg && p.heightCm && p.age) {
    const w = Math.max(0.05, 0.4 - Math.max(0, p.muscle - 5) * 0.07);
    bf = bf * (1 - w) + bmiFat({ sex: p.sex, weightKg: p.weightKg, heightCm: p.heightCm, age: p.age }) * w;
  }
  return clamp(bf, p.sex === 'vrouw' ? 12 : 5, 55);
}

/** Vetvrije massa in kg. */
export const leanMass = (p: FatInput & Pick<Profile, 'weightKg'>) => p.weightKg * (1 - bodyFat(p) / 100);

/** Rustverbranding: gemiddelde van Mifflin-St Jeor en Katch-McArdle (vetvrije massa), met een correctie voor spieren. */
export function restingKcal(p: Pick<Profile, 'sex' | 'weightKg' | 'heightCm' | 'age' | 'fat' | 'muscle'>) {
  const katch = (370 + 21.6 * leanMass(p)) * (1 + (p.muscle - 5) * 0.01);
  return (bmr(p) + katch) / 2;
}

/** Gemiddelde duur van een training per ervaring, in minuten. */
const SESSION_MIN: Record<Experience, number> = { nieuw: 40, beginner: 50, gemiddeld: 60, ervaren: 70 };

/**
 * Extra verbruik door je trainingen (netto, dus bovenop wat je in rust al verbrandt).
 * Krachttraining ± 4,5 MET en intervallen ± 7 MET; we rekenen met jouw eigen rustverbranding per kilo.
 */
export function trainingKcal(p: Pick<Profile, 'weightKg' | 'experience' | 'focus' | 'trainDays'>, rmrPerKgH = 1) {
  const strengthH = SESSION_MIN[p.experience] / 60;
  const cardioH = (p.focus === 'afvallen' ? 15 : p.focus === 'fit' ? 10 : 0) / 60;
  const perSession = (3.5 * strengthH + 6 * cardioH) * p.weightKg * rmrPerKgH;
  return { perSession, perDay: (perSession * p.trainDays.length) / 7 };
}

/** Eiwit per kg vetvrije massa, per doel. */
const PROTEIN: Record<Goal, number> = { afvallen: 2.4, recomp: 2.6, onderhouden: 2.0, aankomen: 2.2 };
const WATER_BONUS: Record<ActivityLevel, number> = { zittend: 0, licht: 0, gemiddeld: 250, actief: 500, zeer: 750 };

/** Gemeten verbruik uit je eigen gegevens (zie insights.ts) */
export interface Measured {
  tdee: number;
  confidence: number;
}

/**
 * Alle dagdoelen.
 * 1. Rustverbranding × dagelijkse activiteit (zonder sport) + gemiddelde trainingsverbruik = verbruik.
 * 2. Met "slimme bijsturing" schuift het verbruik op richting wat je echt verbruikt (eten + gewichtstrend), max ± 20%.
 * 3. Tekort of overschot als deel van je verbruik, met een veilige ondergrens.
 * 4. Eiwit op vetvrije massa, vet als deel van je calorieën (minimaal 0,6 g/kg), de rest koolhydraten.
 */
export function calcTargets(p: Profile, measured?: Measured | null): Targets {
  const bf = bodyFat(p);
  const lbm = p.weightKg * (1 - bf / 100);
  const rest = restingKcal(p);
  const neat = rest * ACTIVITY[p.activity].factor;
  const sport = trainingKcal(p, rest / 24 / p.weightKg).perDay;
  const formula = neat + sport;
  let tdee = formula;
  let adaptive = false;
  if (p.adaptive && measured && measured.confidence >= 0.3) {
    const blended = formula + (measured.tdee - formula) * Math.min(0.85, measured.confidence);
    tdee = clamp(blended, formula * 0.8, formula * 1.2);
    adaptive = true;
  }

  // Tekort of overschot
  const leanCut = bf < (p.sex === 'vrouw' ? 20 : p.sex === 'man' ? 12 : 16);
  const highFat = bf > (p.sex === 'vrouw' ? 38 : p.sex === 'man' ? 30 : 34);
  let delta = 0;
  if (p.goal === 'afvallen') delta = -tdee * Math.max(0.08, PACE[p.pace].cut + (highFat ? 0.03 : 0) - (leanCut ? 0.04 : 0));
  else if (p.goal === 'recomp') delta = -Math.min(tdee * 0.1, 350);
  else if (p.goal === 'aankomen') delta = tdee * PACE[p.pace].bulk * (p.experience === 'ervaren' ? 0.7 : 1);
  const floor = Math.max(p.sex === 'man' ? 1500 : p.sex === 'vrouw' ? 1200 : 1350, rest * 0.9);
  let kcal = Math.max(tdee + delta, floor);
  kcal = round(p.custom?.kcal ?? kcal, 10);

  // Eiwit op basis van vetvrije massa: bij afvallen extra om spieren te behouden, vanaf 50 jaar iets meer
  let perLbm = PROTEIN[p.goal];
  if (p.focus === 'spiermassa' || p.focus === 'kracht') perLbm = Math.max(perLbm, 2.3);
  if (p.age >= 50) perLbm += 0.1;
  const protein = Math.round(Math.min(260, Math.max(p.weightKg * 1.2, Math.min(lbm * perLbm, p.weightKg * (p.goal === 'recomp' ? 2.6 : 2.5)))));

  // Vet: deel van de calorieën, maar nooit minder dan 0,6 g per kg (hormonen) en niet meer dan 45%
  const style = MACRO_STYLE[p.macroStyle ?? 'gebalanceerd'];
  let fat = Math.min((kcal * 0.45) / 9, Math.max(p.weightKg * 0.6, (kcal * style.fat) / 9));
  let carbs = (kcal - protein * 4 - fat * 9) / 4;
  if (carbs < 50) {
    carbs = 50;
    fat = Math.max(20, (kcal - protein * 4 - carbs * 4) / 9);
  }

  // Vezels: 14 g per 1000 kcal (Gezondheidsraad), tussen 20 en 40 g
  const fib = Math.round(clamp(kcal * 0.014, 20, 40));
  // Water: 30 ml per kg plus wat extra bij een actief leven; op trainingsdagen komt er nog 0,5 L bij
  const water = clamp(round(p.weightKg * 30 + WATER_BONUS[p.activity], 250), 1500, 3500);
  let steps = ACTIVITY[p.activity].steps + (p.goal === 'afvallen' || p.goal === 'recomp' ? 1000 : 0);
  steps = Math.min(steps, 12000);

  const realDelta = kcal - tdee;
  return {
    kcal,
    p: protein,
    c: Math.round(carbs),
    f: Math.round(fat),
    fib,
    waterMl: p.custom?.waterMl ?? water,
    steps: p.custom?.steps ?? steps,
    bmr: Math.round(rest),
    tdee: Math.round(tdee),
    neat: Math.round(neat),
    sport: Math.round(sport),
    delta: Math.round(realDelta),
    kgPerWeek: (realDelta * 7) / KCAL_PER_KG,
    bodyFat: bf,
    lbm,
    split: PATTERNS[p.pattern ?? 'standaard'].split,
    adaptive,
  };
}

/** Extra water op trainingsdagen. */
export const TRAINING_WATER_BONUS = 500;

/** Standaard maaltijdverdeling (voor als er geen eetpatroon bekend is). */
export const MEAL_SPLIT = PATTERNS.standaard.split;

export const mealRange = (meal: MealKey, kcal: number, split: Record<MealKey, [number, number]> = MEAL_SPLIT) =>
  split[meal].map((f) => round(kcal * f, 50)) as [number, number];

/** Deze maaltijd sla je over in je eetpatroon (bijv. ontbijt bij 16:8). */
export const skipsMeal = (meal: MealKey, split: Record<MealKey, [number, number]> = MEAL_SPLIT) => split[meal][1] === 0;

export interface Nutrients {
  kcal: number;
  p: number;
  c: number;
  f: number;
  /** vezels */
  fib: number;
}

export const NO_NUTRIENTS: Nutrients = { kcal: 0, p: 0, c: 0, f: 0, fib: 0 };

export const entryNutrients = (e: FoodEntry): Nutrients => {
  const k = e.grams / 100;
  return { kcal: e.food.kcal * k, p: e.food.p * k, c: e.food.c * k, f: e.food.f * k, fib: (e.food.fib ?? 0) * k };
};

export const addNutrients = (a: Nutrients, b: Nutrients): Nutrients => ({
  kcal: a.kcal + b.kcal, p: a.p + b.p, c: a.c + b.c, f: a.f + b.f, fib: a.fib + b.fib,
});

export const sumNutrients = (entries: FoodEntry[]): Nutrients => entries.reduce((acc, e) => addNutrients(acc, entryNutrients(e)), NO_NUTRIENTS);

/** Deel van de energie uit eiwit, koolhydraten en vet (vezels en alcohol tellen niet mee). */
export function energySplit(n: Pick<Nutrients, 'p' | 'c' | 'f'>) {
  const p = n.p * 4, c = n.c * 4, f = n.f * 9;
  const total = p + c + f || 1;
  return { p: p / total, c: c / total, f: f / total };
}

/**
 * kcal verbrand bij een activiteit: MET × kg × uur. Met je rustverbranding erbij rekenen we met jouw eigen
 * "1 MET" in plaats van het standaardgetal (1 kcal per kg per uur); dat is nauwkeuriger bij meer of minder vet.
 */
export const metKcal = (met: number, kg: number, minutes: number, restKcal?: number) =>
  Math.round(met * kg * (minutes / 60) * (restKcal ? clamp(restKcal / 24 / kg, 0.7, 1.3) : 1));

/** Gemiddelde staplengte in meters (≈ 0,415 × lengte). */
export const stepsToKm = (steps: number, heightCm = 175) => (steps * heightCm * 0.415) / 100 / 1000;

/** kcal door wandelen: ± 0,5 kcal per kg per km (bruto). */
export const stepsKcal = (steps: number, kg: number, heightCm = 175) => Math.round(stepsToKm(steps, heightCm) * kg * 0.5);

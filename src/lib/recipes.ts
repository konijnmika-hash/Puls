import { FOODS, type Food } from '../data/foods';
import { RECIPES, type Recipe } from '../data/recipes';
import { MEAL_SPLIT, mealRange, type Nutrients } from './calc';
import { addDays } from './date';
import { MEALS, type DayLog, type MealKey, type Targets } from './types';

const FOOD_BY_NAME = new Map(FOODS.map((f) => [f.name, f]));

/** "Ei (rauw)" -> "Ei": zonder bereidingswijze, voor lijstjes. */
export const plainName = (name: string) => name.replace(/ \((gekookt|gebakken|uitgelekt|bereid|rauw|diepvries|blik)\)/, '');

export interface ResolvedIng {
  food: Food;
  grams: number;
}

/* ---------- Lichter koken bij afvallen ---------- */

/**
 * Bij afvallen schrappen we kcal die je niet mist: lichtere sauzen en zuivel, melk aangelengd met
 * water, minder olie en minder noten of zoetigheid (een beetje mag, voor de smaak).
 */
interface Swap {
  /** vervangend product */
  to?: string;
  /** hoeveelheid keer dit getal */
  mult?: number;
  /** de helft vervangen door water */
  water?: boolean;
  note: string;
}

const NUTS = 'minder noten en zaden, net genoeg voor de bite';
const SWEET = 'minder zoet, de helft van de honing of siroop';

export const LIGHT_SWAPS: Record<string, Swap> = {
  'Mayonaise': { to: 'Fritessaus', note: 'fritessaus in plaats van mayonaise' },
  'Knoflooksaus': { to: 'Yoghurtdressing', note: 'yoghurtdressing in plaats van knoflooksaus' },
  'Halfvolle melk': { water: true, note: 'melk half melk, half water' },
  'Volle melk': { to: 'Halfvolle melk', water: true, note: 'halfvolle melk, half aangelengd met water' },
  'Olijfolie': { mult: 0.5, note: 'de helft van de olie (of bakspray)' },
  'Kokosolie': { mult: 0.5, note: 'de helft van de olie (of bakspray)' },
  'Boter': { to: 'Halvarine', mult: 0.5, note: 'een dun laagje halvarine in plaats van boter' },
  'Griekse yoghurt 10%': { to: 'Griekse yoghurt 0%', note: 'Griekse yoghurt 0% in plaats van 10%' },
  'Volle yoghurt': { to: 'Halfvolle yoghurt', note: 'halfvolle in plaats van volle yoghurt' },
  'Volle kwark': { to: 'Magere kwark', note: 'magere kwark in plaats van volle' },
  'Halfvolle kwark': { to: 'Magere kwark', note: 'magere kwark in plaats van halfvolle' },
  'Jonge kaas 48+': { to: 'Kaas 30+', note: '30+ kaas in plaats van 48+' },
  'Belegen kaas 48+': { to: 'Kaas 30+', note: '30+ kaas in plaats van 48+' },
  'Oude kaas 48+': { to: 'Kaas 30+', note: '30+ kaas in plaats van 48+' },
  'Mozzarella': { to: 'Mozzarella light', note: 'mozzarella light' },
  'Burrata': { to: 'Mozzarella light', note: 'mozzarella light in plaats van burrata' },
  'Roomkaas': { to: 'Light smeerkaas', note: 'light smeerkaas in plaats van roomkaas' },
  'Smeerkaas': { to: 'Light smeerkaas', note: 'light smeerkaas' },
  'Hummus': { to: 'Hummus light', note: 'hummus light' },
  'Kokosmelk': { to: 'Kokosmelk light', note: 'kokosmelk light' },
  'Slagroom': { to: 'Kookroom light', note: 'kookroom light in plaats van slagroom' },
  'Rundergehakt (gebakken)': { to: 'Mager rundergehakt (gebakken)', note: 'mager rundergehakt' },
  'Half-om-half gehakt (gebakken)': { to: 'Mager rundergehakt (gebakken)', note: 'mager rundergehakt in plaats van half-om-half' },
  'Kippendij (gebakken)': { to: 'Kipfilet (gebakken)', note: 'kipfilet in plaats van kippendij' },
  'Feta': { mult: 0.6, note: 'iets minder feta, de smaak blijft' },
  'Parmezaanse kaas': { mult: 0.6, note: 'iets minder Parmezaan' },
  'Halloumi': { mult: 0.7, note: 'iets minder halloumi' },
  'Pesto': { mult: 0.5, note: 'de helft van de pesto' },
  'Satésaus': { mult: 0.5, note: 'de helft van de satésaus' },
  'Pindakaas': { mult: 0.5, note: 'de helft van de pindakaas' },
  'Pindakaas 100% pinda': { mult: 0.5, note: 'de helft van de pindakaas' },
  'Avocado': { mult: 0.5, note: 'een halve portie avocado' },
  'Walnoten': { mult: 0.5, note: NUTS },
  'Amandelen': { mult: 0.5, note: NUTS },
  'Cashewnoten': { mult: 0.5, note: NUTS },
  'Ongebrande gemengde noten': { mult: 0.5, note: NUTS },
  'Pompoenpitten': { mult: 0.5, note: NUTS },
  'Sesamzaad': { mult: 0.5, note: NUTS },
  'Chiazaad': { mult: 0.5, note: NUTS },
  'Kokosrasp': { mult: 0.5, note: NUTS },
  'Granola': { mult: 0.5, note: 'de helft van de granola' },
  'Pure chocolade 70%': { mult: 0.5, note: 'de helft van de chocolade' },
  'Honing': { mult: 0.5, note: SWEET },
  'Ahornsiroop': { mult: 0.5, note: SWEET },
  'Agavesiroop': { mult: 0.5, note: SWEET },
  'Suiker': { mult: 0.5, note: SWEET },
};

let light = false;

/** Zet lichte recepten aan of uit (bij afvallen). Leegt de rekencaches. */
export function setLightRecipes(on: boolean) {
  if (on === light) return;
  light = on;
  cache.clear();
  portionCache.clear();
  recipeFoodsCache = null;
}
export const lightRecipes = () => light;

const byName = (name: string, r: Recipe) => {
  const food = FOOD_BY_NAME.get(name);
  if (!food) throw new Error(`Onbekend ingrediënt in ${r.id}: ${name}`);
  return food;
};

/** Wat er bij afvallen aan dit recept is aangepast. */
export function lightNotes(r: Recipe, on = light): string[] {
  if (!on) return [];
  const notes: string[] = [];
  for (const i of r.ing) if (typeof i !== 'string' && LIGHT_SWAPS[i[0]] && !notes.includes(LIGHT_SWAPS[i[0]].note)) notes.push(LIGHT_SWAPS[i[0]].note);
  return notes;
}

export function ingredients(r: Recipe, on = light) {
  const items: ResolvedIng[] = [];
  const extras: string[] = [];
  const add = (food: Food, grams: number) => {
    const same = items.find((x) => x.food.id === food.id);
    if (same) same.grams += grams;
    else items.push({ food, grams });
  };
  for (const i of r.ing) {
    if (typeof i === 'string') { extras.push(i); continue; }
    const [name, grams] = i;
    const sw = on ? LIGHT_SWAPS[name] : undefined;
    if (!sw) { add(byName(name, r), grams); continue; }
    const food = byName(sw.to ?? name, r);
    const g = grams * (sw.mult ?? 1);
    if (sw.water) {
      const half = Math.round(g / 2 / 5) * 5;
      add(food, half);
      add(byName('Water', r), Math.round(g - half));
    } else add(food, Math.max(1, Math.round(g)));
  }
  return { items, extras };
}

const cache = new Map<string, Nutrients & { grams: number }>();

const kcalOf = (items: ResolvedIng[]) => items.reduce((s, i) => s + (i.food.kcal * i.grams) / 100, 0);

/** Hoeveel kcal de lichte versie per standaardportie scheelt. */
export const lightSaving = (r: Recipe) => kcalOf(ingredients(r, false).items) - kcalOf(ingredients(r, true).items);

/** Voedingswaarden van één standaardportie. */
export function recipeNutrients(r: Recipe) {
  let n = cache.get(r.id);
  if (!n) {
    n = { kcal: 0, p: 0, c: 0, f: 0, grams: 0 };
    for (const { food, grams } of ingredients(r).items) {
      const k = grams / 100;
      n.kcal += food.kcal * k;
      n.p += food.p * k;
      n.c += food.c * k;
      n.f += food.f * k;
      n.grams += grams;
    }
    cache.set(r.id, n);
  }
  return n;
}

export const scaleN = (n: Nutrients, factor: number): Nutrients => ({ kcal: n.kcal * factor, p: n.p * factor, c: n.c * factor, f: n.f * factor });

const MEAT = /kip|ham|rookvlees|salami|gehakt|biefstuk|varken|shoarma|bacon|worst|frikandel|kroket|nugget|zalm|tonijn|kabeljauw|pangasius|garnaal|haring|kibbeling|americain/i;

export type RecipeTag = 'vega' | 'eiwitrijk' | 'snel' | 'mealprep' | 'budget' | 'zoet' | 'comfort';

export const TAG_LABEL: Record<RecipeTag, string> = {
  vega: 'Vega',
  eiwitrijk: 'Eiwitrijk',
  snel: 'Snel',
  mealprep: 'Meal prep',
  budget: 'Budget',
  zoet: 'Zoet',
  comfort: 'Comfortfood',
};

export function recipeTags(r: Recipe): RecipeTag[] {
  const n = recipeNutrients(r);
  const tags: RecipeTag[] = [];
  if (!ingredients(r).items.some((i) => i.food.cat === 'vlees' || MEAT.test(i.food.name))) tags.push('vega');
  if (n.p >= 25 || (n.p >= 12 && (n.p * 4) / n.kcal >= 0.3)) tags.push('eiwitrijk');
  if (r.minutes <= 15) tags.push('snel');
  return [...tags, ...(r.tags ?? [])];
}

/* ---------- Porties en hoeveelheden ---------- */

const FRACTION: Record<number, string> = { 0.25: '¼', 0.5: '½', 0.75: '¾' };

export function fraction(n: number) {
  const q = Math.round(n * 4) / 4;
  const whole = Math.floor(q);
  const rest = q - whole;
  if (!rest) return String(whole);
  return (whole ? String(whole) : '') + FRACTION[rest];
}

/** Eenheden die je telt in een recept: sneetjes brood, eieren, plakken kaas, lepels. */
const COUNT_UNITS = /^(stuk|snee|plak|bolletje|teentje|eetlepel|theelepel|schep|stengel|struik|moot|filet|partje|cherrytomaatje)$/;
const PLURAL: Record<string, string> = {
  stuk: 'stuks', snee: 'sneetjes', plak: 'plakken', bolletje: 'bolletjes', teentje: 'teentjes', eetlepel: 'eetlepels',
  theelepel: 'theelepels', schep: 'scheppen', stengel: 'stengels', struik: 'struiken', moot: 'moten', filet: 'filets',
  partje: 'partjes', cherrytomaatje: 'cherrytomaatjes',
};

/** Hiervan kun je gerust een halve gebruiken: lepels en fruit of groente per stuk. Brood, eieren en plakken alleen heel. */
const halvable = (food: Food, unit: string, unitGrams: number) =>
  unit.endsWith('lepel') ||
  ((food.cat === 'fruit' || food.cat === 'groente' || food.name === 'Avocado') && (unit === 'stuk' || unit === 'struik') && unitGrams >= 50);

/** De telbare eenheid waarin het recept dit ingrediënt gebruikt, bijv. 2 sneetjes of ½ banaan. */
function countUnit(food: Food, baseGrams: number) {
  for (const p of food.portions) {
    if (!COUNT_UNITS.test(p.label)) continue;
    const n = baseGrams / p.g;
    if (n < 0.5 || Math.abs(n * 2 - Math.round(n * 2)) > 0.1) continue;
    if (p.label.endsWith('lepel') && n > 3) continue; // 5 eetlepels havermout leest beter als 50 g
    return p;
  }
  return null;
}

/** Gram of ml afronden op wat je in de keuken echt afweegt. */
const niceGrams = (g: number) => (g < 10 ? Math.max(1, Math.round(g)) : g < 100 ? Math.round(g / 5) * 5 : Math.round(g / 10) * 10);

export interface Amount {
  food: Food;
  /** afgeronde hoeveelheid in gram of ml */
  grams: number;
  /** aantal in de telbare eenheid, altijd heel of een halve */
  count?: number;
  unit?: string;
}

/** Eén ingrediënt geschaald en afgerond: hele sneetjes en eieren, hooguit een halve banaan of lepel. */
export function scaleAmount(food: Food, baseGrams: number, mult: number): Amount {
  const p = countUnit(food, baseGrams);
  if (p) {
    const step = halvable(food, p.label, p.g) ? 0.5 : 1;
    const count = Math.max(step, Math.round((baseGrams * mult) / p.g / step) * step);
    return { food, grams: count * p.g, count, unit: p.label };
  }
  return { food, grams: mult === 1 ? baseGrams : niceGrams(baseGrams * mult) };
}

/** Alle ingrediënten voor een portie (of voor meerdere personen). */
export function scaledItems(r: Recipe, mult: number): Amount[] {
  return ingredients(r).items.map(({ food, grams }) => scaleAmount(food, grams, mult));
}

/** "2 sneetjes · 70 g" of "150 g" */
export function amountText(a: Amount) {
  const unit = a.food.unit === 'ml' ? 'ml' : 'g';
  const base = `${Math.round(a.grams)} ${unit}`;
  if (a.count === undefined || !a.unit) return { amount: base, grams: '' };
  return { amount: `${fraction(a.count)} ${a.count >= 2 ? PLURAL[a.unit] ?? a.unit : a.unit}`, grams: base };
}

/** Hoeveelheid voor een ingrediënt zoals het in het recept staat (zonder schalen). */
export const amountLabel = (food: Food, grams: number) => amountText(scaleAmount(food, grams, 1));

const portionCache = new Map<string, Nutrients & { grams: number }>();

/** Voedingswaarden van precies wat je eet: berekend uit de afgeronde hoeveelheden. */
export function portionNutrients(r: Recipe, factor: number) {
  const key = `${r.id}|${factor}`;
  let n = portionCache.get(key);
  if (!n) {
    n = { kcal: 0, p: 0, c: 0, f: 0, grams: 0 };
    for (const { food, grams } of scaledItems(r, factor)) {
      const k = grams / 100;
      n.kcal += food.kcal * k;
      n.p += food.p * k;
      n.c += food.c * k;
      n.f += food.f * k;
      n.grams += grams;
    }
    portionCache.set(key, n);
  }
  return n;
}

/** Halve en hele porties: geen rare kwarten. */
export const PORTION_STEPS = [0.5, 1, 1.5, 2];

/** De portie (½ tot 2) waarmee een recept het dichtst bij je doel voor die maaltijd komt. */
export function portionFor(r: Recipe, targetKcal: number) {
  const max = r.meal === 'snacks' ? 1.5 : 2;
  let best = 1;
  for (const f of PORTION_STEPS) {
    if (f > max) continue;
    if (Math.abs(portionNutrients(r, f).kcal - targetKcal) < Math.abs(portionNutrients(r, best).kcal - targetKcal)) best = f;
  }
  return best;
}

export const portionText = (f: number) => `${fraction(f)} ${f > 1 ? 'porties' : 'portie'}`;

/** Gemiddeld doel voor een maaltijd. */
export const mealTarget = (meal: MealKey, kcal: number) => {
  const [lo, hi] = mealRange(meal, kcal);
  return (lo + hi) / 2;
};

const mid = (m: MealKey) => (MEAL_SPLIT[m][0] + MEAL_SPLIT[m][1]) / 2;

/**
 * Hoeveel kcal en eiwit er nog over is voor deze maaltijd: wat je vandaag nog over hebt, verdeeld
 * over de maaltijden die nog leeg zijn. Zo past een voorstel ook als je ontbijt groter was.
 */
export function roomFor(meal: MealKey, t: Targets, day: DayLog | undefined, eaten: Nutrients) {
  const base = mealTarget(meal, t.kcal);
  if (!day || eaten.kcal === 0) return { kcal: base, p: t.p * mid(meal) * 1.15, adjusted: false };
  const open = MEALS.filter((m) => m === meal || day.meals[m].length === 0);
  const share = mid(meal) / open.reduce((s, m) => s + mid(m), 0);
  const leftK = Math.max(0, t.kcal - eaten.kcal);
  const leftP = Math.max(0, t.p - eaten.p);
  const hi = mealRange(meal, t.kcal)[1];
  const kcal = Math.max(base * 0.45, Math.min(hi, leftK * share));
  return { kcal, p: leftP * share, adjusted: Math.abs(kcal - base) > 60 };
}

/* ---------- Voorstellen ---------- */

export interface Prefs {
  vega: boolean;
}

export interface Suggestion {
  recipe: Recipe;
  factor: number;
  n: Nutrients;
  score: number;
  why: string;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

/** Recepten die je recent gelogd hebt, zodat de coach afwisselt. */
export function recentlyEaten(days: Record<string, DayLog>, date: string, back = 3) {
  const ids = new Set<string>();
  for (let i = 0; i <= back; i++) {
    const d = days[addDays(date, -i)];
    if (!d) continue;
    for (const m of MEALS) for (const e of d.meals[m]) if (e.food.id.startsWith('recipe-')) ids.add(e.food.id.slice(7));
  }
  return ids;
}

export function suggest(
  meal: MealKey,
  room: { kcal: number; p: number },
  opts: { prefs: Prefs; favorites?: string[]; recent?: Set<string>; seed?: string; pool?: Recipe[] },
): Suggestion[] {
  const pool = (opts.pool ?? RECIPES).filter((r) => r.meal === meal && (!opts.prefs.vega || recipeTags(r).includes('vega')));
  return pool
    .map((recipe) => {
      const factor = portionFor(recipe, room.kcal);
      const n = portionNutrients(recipe, factor);
      const kcalFit = 1 - Math.min(1, Math.abs(n.kcal - room.kcal) / room.kcal);
      const pFit = room.p > 0 ? Math.min(1, n.p / room.p) : 0.5;
      let score = kcalFit * 50 + pFit * 35;
      if (light) {
        // bij afvallen: veel eiwit en volume per kcal, weinig vet
        const pShare = (n.p * 4) / Math.max(1, n.kcal);
        const fShare = (n.f * 9) / Math.max(1, n.kcal);
        score += Math.min(1, pShare / 0.35) * 12 - Math.max(0, fShare - 0.35) * 30;
      }
      if (opts.favorites?.includes(recipe.id)) score += 8;
      if (opts.recent?.has(recipe.id)) score -= 20;
      score += hash(recipe.id + (opts.seed ?? '')) * 14;
      const why =
        room.p > 0 && n.p >= room.p * 0.8
          ? `${Math.round(n.p)} g eiwit`
          : kcalFit > 0.9
            ? `Past in je ${Math.round(room.kcal / 10) * 10} kcal`
            : `${Math.round(n.kcal)} kcal · ${Math.round(n.p)} g eiwit`;
      return { recipe, factor, n, score, why };
    })
    .sort((a, b) => b.score - a.score);
}

export interface DayMenu {
  items: Record<MealKey, Suggestion>;
  total: Nutrients;
}

/** Een dagmenu (één recept per maaltijd) dat zo dicht mogelijk bij je calorie- en eiwitdoel komt. */
export function dayMenu(t: Targets, prefs: Prefs, seed: string, favorites: string[] = []): DayMenu | null {
  const cands = MEALS.map((m) => suggest(m, { kcal: mealTarget(m, t.kcal), p: t.p * mid(m) }, { prefs, favorites, seed }).slice(0, 5));
  if (cands.some((c) => c.length === 0)) return null;
  let best: { cost: number; pick: Suggestion[] } | null = null;
  const pick: Suggestion[] = [];
  const walk = (i: number) => {
    if (i === MEALS.length) {
      const tot = pick.reduce((s, x) => ({ kcal: s.kcal + x.n.kcal, p: s.p + x.n.p }), { kcal: 0, p: 0 });
      const cost = Math.abs(tot.kcal - t.kcal) / t.kcal + (Math.max(0, t.p - tot.p) / t.p) * 1.5 + (Math.max(0, tot.p - t.p * 1.25) / t.p) * 0.6 - pick.reduce((s, x) => s + x.score, 0) / 4000;
      if (!best || cost < best.cost) best = { cost, pick: [...pick] };
      return;
    }
    for (const c of cands[i]) {
      pick.push(c);
      walk(i + 1);
      pick.pop();
    }
  };
  walk(0);
  const chosen = (best as { cost: number; pick: Suggestion[] } | null)?.pick;
  if (!chosen) return null;
  const items = Object.fromEntries(MEALS.map((m, i) => [m, chosen[i]])) as Record<MealKey, Suggestion>;
  const total = chosen.reduce((s, x) => ({ kcal: s.kcal + x.n.kcal, p: s.p + x.n.p, c: s.c + x.n.c, f: s.f + x.n.f }), { kcal: 0, p: 0, c: 0, f: 0 });
  return { items, total };
}

/* ---------- Loggen ---------- */

/** Een recept als één product in je dagboek, met waarden per 100 g van precies jouw portie. */
export function recipeFood(r: Recipe, factor = 1): Food {
  const n = portionNutrients(r, factor);
  const per = 100 / n.grams;
  const round1 = (v: number) => Math.round(v * 10) / 10;
  return {
    id: 'recipe-' + r.id,
    name: r.name,
    cat: 'recept',
    kcal: Math.round(n.kcal * per),
    p: round1(n.p * per),
    c: round1(n.c * per),
    f: round1(n.f * per),
    unit: 'g',
    portions: [{ label: 'portie', g: Math.round(n.grams / factor) }],
    source: 'recipe',
  };
}

let recipeFoodsCache: Food[] | null = null;
/** Alle recepten als product, om in je dagboek op te zoeken. */
export const recipeFoods = () => (recipeFoodsCache ??= RECIPES.map((r) => recipeFood(r)));

/* ---------- Boodschappen ---------- */

export interface ShopItem {
  /** unieke sleutel van deze regel */
  key: string;
  /** product-id (of x-... voor kruiden) */
  id: string;
  name: string;
  /** gram of ml; ontbreekt bij kruiden en extra's */
  grams?: number;
  unit?: 'g' | 'ml';
  done: boolean;
  /** voor welke recepten */
  from: string[];
}

export function mergeShopping(list: ShopItem[], r: Recipe, factor: number): ShopItem[] {
  const out = list.map((i) => ({ ...i, from: [...i.from] }));
  const { extras } = ingredients(r);
  const add = (id: string, name: string, grams?: number, unit?: 'g' | 'ml') => {
    const existing = out.find((i) => i.id === id && !i.done);
    if (existing) {
      if (grams !== undefined) existing.grams = (existing.grams ?? 0) + grams;
      if (!existing.from.includes(r.name)) existing.from.push(r.name);
    } else out.push({ key: `${id}:${Math.random().toString(36).slice(2, 8)}`, id, name, grams, unit, done: false, from: [r.name] });
  };
  for (const { food, grams } of scaledItems(r, factor)) if (food.name !== 'Water') add(food.id, plainName(food.name), grams, food.unit);
  for (const e of extras) add('x-' + e.toLowerCase(), e[0].toUpperCase() + e.slice(1));
  return out;
}

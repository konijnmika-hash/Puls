import { FOODS, type Food } from '../data/foods';
import { RECIPES, type Recipe } from '../data/recipes';
import { MEAL_SPLIT, mealRange, NO_NUTRIENTS, type Nutrients } from './calc';
import { addDays } from './date';
import { MEALS, type DayLog, type MealKey, type Targets } from './types';

const FOOD_BY_NAME = new Map(FOODS.map((f) => [f.name, f]));

/** "Ei (rauw)" -> "Ei": zonder bereidingswijze, voor lijstjes. */
export const plainName = (name: string) => name.replace(/ \((gekookt|gebakken|uitgelekt|bereid|rauw|diepvries|blik)\)/, '');

export interface ResolvedIng {
  food: Food;
  grams: number;
}

export function ingredients(r: Recipe) {
  const items: ResolvedIng[] = [];
  const extras: string[] = [];
  for (const i of r.ing) {
    if (typeof i === 'string') extras.push(i);
    else {
      const food = FOOD_BY_NAME.get(i[0]);
      if (!food) throw new Error(`Onbekend ingrediënt in ${r.id}: ${i[0]}`);
      items.push({ food, grams: i[1] });
    }
  }
  return { items, extras };
}

const cache = new Map<string, Nutrients & { grams: number }>();

/** Voedingswaarden van één standaardportie. */
export function recipeNutrients(r: Recipe) {
  let n = cache.get(r.id);
  if (!n) {
    n = { ...NO_NUTRIENTS, grams: 0 };
    for (const { food, grams } of ingredients(r).items) {
      const k = grams / 100;
      n.kcal += food.kcal * k;
      n.p += food.p * k;
      n.c += food.c * k;
      n.f += food.f * k;
      n.fib += (food.fib ?? 0) * k;
      n.grams += grams;
    }
    cache.set(r.id, n);
  }
  return n;
}

export const scaleN = (n: Nutrients, factor: number): Nutrients => ({ kcal: n.kcal * factor, p: n.p * factor, c: n.c * factor, f: n.f * factor, fib: n.fib * factor });

/* ---------- Labels ---------- */

const PLANT = /soja|haver|amandel|kokos|rijstdrink|erwtendrink|cashewdrink|plantaardig|vega|vegetarisch/i;
/** Vlees en vis, ook als beleg of in een salade. Alleen aan het begin van een woord, zodat "champignons" geen ham bevat. */
const MEAT = /(^|[\s(-])(kip|kalkoen|ham|achterham|schouderham|beenham|parmaham|serranoham|rookvlees|salami|gehakt|biefstuk|varken|shoarma|bacon|ontbijtspek|spek|rookworst|worst|frikandel|kroket|nugget|zalm|tonijn|kabeljauw|pangasius|garnaal|garnalen|haring|kibbeling|filet americain|rosbief|chorizo|pastrami|fricandeau|leverworst|leverpastei|pate|makreel|krab|ansjovis|vis|rund|lams|eend|cervelaat|boterhamworst|spareribs|pulled|scampi|mosselen|forel|paling|sardines|surimi)/i;
/** Zuivel, ei en honing: niet veganistisch. */
const ANIMAL = /(^|[\s(-])(ei|eieren|honing|boter|roomboter|kaas|feta|mozzarella|burrata|parmezaan|pecorino|halloumi|ricotta|paneer|hüttenkäse|brie|camembert|cheddar|emmentaler|gruyère|roomkaas|smeerkaas|mascarpone|labneh|ghee|slagroom|kookroom|crème fraîche|zure room|yoghurt|griekse yoghurt|kwark|skyr|melk|halfvolle|volle|magere|karnemelk|kefir|vla|whey|caseïne|mayonaise|tzatziki|ayran|pesto|geitenkaas|geraspte kaas|jonge kaas|belegen kaas|oude kaas|kaas)/i;

export const isMeat = (f: Food) => !PLANT.test(f.name) && (f.cat === 'vlees' || MEAT.test(f.name));
export const isAnimal = (f: Food) => isMeat(f) || (!PLANT.test(f.name) && (ANIMAL.test(f.name) || (f.cat === 'zuivel' && !PLANT.test(f.name))));

export type RecipeTag = 'vega' | 'vegan' | 'eiwitrijk' | 'vezelrijk' | 'koolhydraatarm' | 'snel' | 'mealprep' | 'budget' | 'zoet' | 'comfort';

export const TAG_LABEL: Record<RecipeTag, string> = {
  vega: 'Vega',
  vegan: 'Veganistisch',
  eiwitrijk: 'Eiwitrijk',
  vezelrijk: 'Vezelrijk',
  koolhydraatarm: 'Koolhydraatarm',
  snel: 'Snel',
  mealprep: 'Meal prep',
  budget: 'Budget',
  zoet: 'Zoet',
  comfort: 'Comfortfood',
};

const tagCache = new Map<string, RecipeTag[]>();

export function recipeTags(r: Recipe): RecipeTag[] {
  let tags = tagCache.get(r.id);
  if (tags) return tags;
  const n = recipeNutrients(r);
  const foods = ingredients(r).items.map((i) => i.food);
  tags = [];
  if (!foods.some(isMeat)) tags.push('vega');
  if (!foods.some(isAnimal)) tags.push('vegan');
  if (n.p >= 25 || (n.p >= 12 && (n.p * 4) / n.kcal >= 0.3)) tags.push('eiwitrijk');
  if (n.fib >= (r.meal === 'snacks' ? 5 : 8)) tags.push('vezelrijk');
  if (n.kcal > 0 && (n.c * 4) / n.kcal <= 0.2) tags.push('koolhydraatarm');
  if (r.minutes <= 15) tags.push('snel');
  tags = [...new Set([...tags, ...(r.tags ?? [])])];
  tagCache.set(r.id, tags);
  return tags;
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
    n = { ...NO_NUTRIENTS, grams: 0 };
    for (const { food, grams } of scaledItems(r, factor)) {
      const k = grams / 100;
      n.kcal += food.kcal * k;
      n.p += food.p * k;
      n.c += food.c * k;
      n.f += food.f * k;
      n.fib += (food.fib ?? 0) * k;
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

type Split = Record<MealKey, [number, number]>;

/** Gemiddeld doel voor een maaltijd. */
export const mealTarget = (meal: MealKey, kcal: number, split: Split = MEAL_SPLIT) => {
  const [lo, hi] = mealRange(meal, kcal, split);
  return (lo + hi) / 2;
};

const mid = (m: MealKey, split: Split = MEAL_SPLIT) => (split[m][0] + split[m][1]) / 2;

/**
 * Hoeveel kcal en eiwit er nog over is voor deze maaltijd: wat je vandaag nog over hebt, verdeeld
 * over de maaltijden die nog leeg zijn. Zo past een voorstel ook als je ontbijt groter was.
 * Sla je een maaltijd over in je eetpatroon (16:8), dan krijgt die een kleine standaardportie als je hem toch opent.
 */
export function roomFor(meal: MealKey, t: Pick<Targets, 'kcal' | 'p'> & { split?: Split }, day: DayLog | undefined, eaten: Pick<Nutrients, 'kcal' | 'p'>) {
  const split = t.split ?? MEAL_SPLIT;
  const share0 = mid(meal, split) || MEAL_SPLIT[meal][0];
  const base = mid(meal, split) ? mealTarget(meal, t.kcal, split) : Math.round((t.kcal * share0) / 50) * 50;
  if (!day || eaten.kcal === 0) return { kcal: base, p: t.p * share0 * 1.15, adjusted: false };
  const open = MEALS.filter((m) => m === meal || (day.meals[m].length === 0 && mid(m, split) > 0));
  const share = share0 / open.reduce((s, m) => s + (m === meal ? share0 : mid(m, split)), 0);
  const leftK = Math.max(0, t.kcal - eaten.kcal);
  const leftP = Math.max(0, t.p - eaten.p);
  const hi = mid(meal, split) ? mealRange(meal, t.kcal, split)[1] : base * 1.5;
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
  /** één recept per maaltijd; maaltijden die je overslaat (16:8) ontbreken */
  items: Partial<Record<MealKey, Suggestion>>;
  meals: MealKey[];
  total: Nutrients;
}

/** Een dagmenu (één recept per maaltijd) dat zo dicht mogelijk bij je calorie- en eiwitdoel komt. */
export function dayMenu(t: Pick<Targets, 'kcal' | 'p'> & { split?: Split }, prefs: Prefs, seed: string, favorites: string[] = []): DayMenu | null {
  const split = t.split ?? MEAL_SPLIT;
  const meals = MEALS.filter((m) => mid(m, split) > 0);
  const cands = meals.map((m) => suggest(m, { kcal: mealTarget(m, t.kcal, split), p: t.p * mid(m, split) }, { prefs, favorites, seed }).slice(0, 5));
  if (cands.some((c) => c.length === 0)) return null;
  let best: { cost: number; pick: Suggestion[] } | null = null;
  const pick: Suggestion[] = [];
  const walk = (i: number) => {
    if (i === meals.length) {
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
  const items = Object.fromEntries(meals.map((m, i) => [m, chosen[i]])) as Partial<Record<MealKey, Suggestion>>;
  const total = chosen.reduce((s, x) => ({ kcal: s.kcal + x.n.kcal, p: s.p + x.n.p, c: s.c + x.n.c, f: s.f + x.n.f, fib: s.fib + x.n.fib }), NO_NUTRIENTS);
  return { items, meals, total };
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
    fib: round1(n.fib * per),
    unit: 'g',
    portions: [{ label: 'portie', g: Math.round(n.grams / factor) }],
    source: 'recipe',
  };
}

export const RECIPE_FOODS = RECIPES.map(recipeFood);

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
  for (const { food, grams } of scaledItems(r, factor)) add(food.id, plainName(food.name), grams, food.unit);
  for (const e of extras) add('x-' + e.toLowerCase(), e[0].toUpperCase() + e.slice(1));
  return out;
}

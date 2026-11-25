import { describe, expect, it } from 'vitest';
import { FOOD_BY_ID, FOODS } from '../src/data/foods';

const FOODS_BY_NAME = new Map(FOODS.map((f) => [f.name, f]));
import { RECIPES } from '../src/data/recipes';
import { ALL_EQUIP } from '../src/data/exercises';
import { calcTargets, mealRange } from '../src/lib/calc';
import { coachFeed } from '../src/lib/coach';
import {
  amountLabel, amountText, dayMenu, ingredients, mergeShopping, portionFor, portionNutrients, portionText, PORTION_STEPS, recipeFood,
  recipeNutrients, recipeTags, roomFor, scaledItems, suggest,
} from '../src/lib/recipes';
import { emptyDay } from '../src/lib/store';
import { MEALS, type Profile } from '../src/lib/types';

const profile: Profile = {
  name: 'Test', sex: 'vrouw', age: 32, heightCm: 168, weightKg: 70, goalWeightKg: 64, activity: 'licht', goal: 'afvallen',
  pace: 'normaal', trainDays: [1, 3], focus: 'fit', experience: 'beginner', place: 'gym', createdAt: '',
  equipment: [...ALL_EQUIP], excluded: [], swaps: {}, fat: 5, muscle: 4,
};
const t = calcTargets(profile);

describe('recipes', () => {
  it('has recipes for every meal, with unique ids and known ingredients', () => {
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(RECIPES.length);
    for (const m of MEALS) expect(RECIPES.filter((r) => r.meal === m).length).toBeGreaterThanOrEqual(8);
    for (const r of RECIPES) {
      expect(() => ingredients(r), r.id).not.toThrow();
      expect(r.steps.length, r.id).toBeGreaterThan(0);
    }
  });

  it('computes sensible nutrition per portion', () => {
    for (const r of RECIPES) {
      const n = recipeNutrients(r);
      const [lo, hi] = r.meal === 'snacks' ? [80, 400] : [200, 800];
      expect(n.kcal, r.id).toBeGreaterThan(lo);
      expect(n.kcal, r.id).toBeLessThan(hi);
    }
  });

  it('tags vegetarian, protein-rich and quick dishes', () => {
    const byId = (id: string) => RECIPES.find((r) => r.id === id)!;
    expect(recipeTags(byId('chili-sin-carne'))).toContain('vega');
    expect(recipeTags(byId('teriyaki-zalm'))).not.toContain('vega');
    expect(recipeTags(byId('wrap-kip-pesto'))).not.toContain('vega');
    expect(recipeTags(byId('kwarkbowl-aardbei'))).toContain('eiwitrijk');
    expect(recipeTags(byId('kwarkbowl-aardbei'))).toContain('snel');
  });

  it('scales the portion towards the meal target', () => {
    const r = RECIPES.find((x) => x.id === 'tonijnsalade-brood')!;
    const kcal = recipeNutrients(r).kcal;
    expect(portionFor(r, kcal)).toBe(1);
    expect(portionFor(r, kcal * 2)).toBe(2);
    expect(portionFor(r, kcal * 0.5)).toBe(0.5);
    expect(portionFor(r, kcal * 10)).toBe(2);
    expect(portionText(1.5)).toBe('1½ porties');
    expect(portionText(0.5)).toBe('½ portie');
  });

  it('shows friendly amounts', () => {
    expect(amountLabel(FOOD_BY_ID.get('db-ei-rauw')!, 165).amount).toBe('3 stuks');
    expect(amountLabel(FOOD_BY_ID.get('db-banaan')!, 60).amount).toBe('½ stuk');
    expect(amountLabel(FOOD_BY_ID.get('db-volkorenbrood')!, 70).amount).toBe('2 sneetjes');
    expect(amountLabel(FOOD_BY_ID.get('db-magere-kwark')!, 200).amount).toBe('200 g');
    expect(amountLabel(FOOD_BY_ID.get('db-halfvolle-melk')!, 125).amount).toBe('125 ml');
  });

  it('gives what is left today to the meals that are still open', () => {
    const day = emptyDay();
    const fresh = roomFor('diner', t, day, { kcal: 0, p: 0, c: 0, f: 0 });
    const [lo, hi] = mealRange('diner', t.kcal);
    expect(fresh.kcal).toBe((lo + hi) / 2);
    // groot ontbijt en lunch gehad: avondeten krijgt minder ruimte
    day.meals.ontbijt.push({ id: 'x', food: recipeFood(RECIPES[0]), grams: 100, label: '' });
    day.meals.lunch.push({ id: 'y', food: recipeFood(RECIPES[0]), grams: 100, label: '' });
    const after = roomFor('diner', t, day, { kcal: t.kcal - 500, p: 60, c: 0, f: 0 });
    expect(after.kcal).toBeLessThan(fresh.kcal);
    expect(after.kcal).toBeLessThanOrEqual(500);
  });

  it('suggests recipes that fit and respects vegetarian preference', () => {
    const s = suggest('diner', { kcal: 650, p: 40 }, { prefs: { vega: true } });
    expect(s.length).toBeGreaterThan(2);
    for (const x of s) expect(recipeTags(x.recipe)).toContain('vega');
    expect(Math.abs(s[0].n.kcal - 650)).toBeLessThan(200);
  });

  it('builds a day menu close to the calorie target', () => {
    const menu = dayMenu(t, { vega: false }, 'seed')!;
    expect(menu).not.toBeNull();
    expect(Math.abs(menu.total.kcal - t.kcal) / t.kcal).toBeLessThan(0.12);
    for (const m of MEALS) expect(menu.items[m].recipe.meal).toBe(m);
  });

  it('logs a recipe as one food with per-100 g values of exactly that portion', () => {
    const r = RECIPES[0];
    for (const factor of PORTION_STEPS) {
      const f = recipeFood(r, factor);
      const n = portionNutrients(r, factor);
      expect(f.kcal * (n.grams / 100)).toBeCloseTo(n.kcal, -1);
    }
  });

  it('never uses odd fractions: whole bread, eggs and slices, at most a half of fruit or a spoon', () => {
    for (const r of RECIPES) {
      for (const mult of [...PORTION_STEPS, 3, 4]) {
        for (const a of scaledItems(r, mult)) {
          const text = amountText(a).amount;
          expect(text, `${r.id} ${mult}x ${a.food.name}`).not.toMatch(/[¼¾⅓⅔]|\d,\d/);
          if (a.count !== undefined && a.count % 1) {
            expect(['stuk', 'struik', 'eetlepel', 'theelepel'], `${a.food.name} ${text}`).toContain(a.unit);
            if (a.unit === 'stuk') expect(['fruit', 'groente', 'beleg'], `${a.food.name} ${text}`).toContain(a.food.cat);
          }
        }
      }
    }
    const bread = scaledItems(RECIPES.find((x) => x.id === 'roerei-spinazie')!, 1.5).find((a) => a.food.name === 'Volkorenbrood')!;
    expect(amountText(bread).amount).toBe('3 sneetjes');
    const eggs = scaledItems(RECIPES.find((x) => x.id === 'roerei-spinazie')!, 1.5).find((a) => a.food.name === 'Ei (rauw)')!;
    expect(eggs.count! % 1).toBe(0);
  });

  it('merges shopping lists', () => {
    const a = RECIPES.find((x) => x.id === 'overnight-oats')!;
    const b = RECIPES.find((x) => x.id === 'appel-kaneel-pap')!;
    let list = mergeShopping([], a, 1);
    list = mergeShopping(list, b, 2);
    const oats = list.filter((i) => i.name === 'Havermout');
    expect(oats).toHaveLength(1);
    expect(oats[0].grams).toBe(50 + 100);
    expect(oats[0].from).toEqual([a.name, b.name]);
    expect(new Set(list.map((i) => i.key)).size).toBe(list.length);
  });

  it('lets the coach suggest dinner in the afternoon', () => {
    const day = emptyDay();
    day.meals.lunch.push({ id: 'y', food: recipeFood(RECIPES[10]), grams: 300, label: '' });
    const feed = coachFeed({ profile, t, day, days: {}, date: '2026-05-05', today: '2026-05-05', hour: 17, waterTarget: 2500, weights: [] });
    const idea = feed.find((m) => m.id === 'idea-diner');
    expect(idea?.action?.kind).toBe('recipe');
    expect(idea?.action?.ref).toBeTruthy();
  });
});

describe('more recipes and smarter labels', () => {
  const byId = (id: string) => RECIPES.find((r) => r.id === id)!;
  it('has well over a hundred recipes, spread over the day', () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(140);
    for (const m of MEALS) expect(RECIPES.filter((r) => r.meal === m).length, m).toBeGreaterThanOrEqual(25);
  });
  it('tells vegetarian and vegan apart, and champignons are not ham', () => {
    expect(recipeTags(byId('champignonrisotto'))).toContain('vega');
    expect(recipeTags(byId('erwtensoep-snel'))).not.toContain('vega');
    expect(recipeTags(byId('toast-avocado-hummus'))).toContain('vegan');
    expect(recipeTags(byId('pita-falafel-tahin'))).toContain('vega');
    expect(recipeTags(byId('pita-falafel-tahin'))).not.toContain('vegan');
    expect(recipeTags(byId('curry-zoete-aardappel-kikkererwten'))).toEqual(expect.arrayContaining(['vegan', 'vezelrijk']));
    expect(recipeTags(byId('eimuffins-groente'))).toContain('koolhydraatarm');
    for (const r of RECIPES) {
      const tags = recipeTags(r);
      expect(new Set(tags).size, r.id).toBe(tags.length);
      if (tags.includes('vegan')) expect(tags, r.id).toContain('vega');
    }
  });
  it('recognises meat and animal products by whole words', async () => {
    const { isMeat, isAnimal } = await import('../src/lib/recipes');
    const f = (name: string) => FOODS_BY_NAME.get(name)!;
    for (const n of ['Champignons', 'Pompoen', 'Pompoenpitten', 'Sushirijst (bereid)', 'Lasagnebladen (droog)', 'Vegetarische kipstukjes', 'Pindakaas']) expect(isMeat(f(n)), n).toBe(false);
    for (const n of ['Achterham', 'Kipfilet (beleg)', 'Frikandel', 'Babi pangang', 'Pom (Surinaams)', 'Sushi (maki)', 'Vissaus']) expect(isMeat(f(n)), n).toBe(true);
    for (const n of ['Honingmeloen', 'Paneermeel', 'Sojadrink', 'Kokosyoghurt', 'Pindakaas', 'Hummus']) expect(isAnimal(f(n)), n).toBe(false);
    for (const n of ['Honing', 'Halfvolle melk', 'Ei (rauw)', 'Geraspte kaas 30+', 'Proteïnepoeder (whey)', 'Mayonaise']) expect(isAnimal(f(n)), n).toBe(true);
  });
  it('counts fibre in recipes and logged portions', () => {
    const r = byId('linzensoep-wortel');
    expect(recipeNutrients(r).fib).toBeGreaterThan(8);
    expect(recipeFood(r, 1).fib).toBeGreaterThan(0);
  });
  it('skips breakfast in the day menu when you eat 16:8', () => {
    const fasting = calcTargets({ ...profile, pattern: 'geen-ontbijt' });
    const menu = dayMenu(fasting, { vega: false }, 'seed')!;
    expect(menu.meals).not.toContain('ontbijt');
    expect(menu.items.ontbijt).toBeUndefined();
    expect(Math.abs(menu.total.kcal - fasting.kcal) / fasting.kcal).toBeLessThan(0.15);
    // opent je toch een ontbijtrecept, dan krijg je een redelijke portie
    expect(roomFor('ontbijt', fasting, emptyDay(), { kcal: 0, p: 0 }).kcal).toBeGreaterThan(200);
  });
});

describe('number input', async () => {
  const { parseNum } = await import('../src/components/ui');
  it('reads Dutch numbers', () => {
    expect(parseNum('72,5')).toBe(72.5);
    expect(parseNum('72.5')).toBe(72.5);
    expect(parseNum('10.000')).toBe(10000);
    expect(parseNum('1.234.567')).toBe(1234567);
    expect(parseNum('2.500,5')).toBe(2500.5);
    expect(Number.isNaN(parseNum(''))).toBe(true);
  });
});

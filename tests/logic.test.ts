import { describe, expect, it } from 'vitest';
import { ALCOHOL, FOODS, searchFoods } from '../src/data/foods';
import { ALL_EQUIP, EXERCISES } from '../src/data/exercises';
import { bmr, bodyFat, calcTargets, entryNutrients, mealRange } from '../src/lib/calc';
import { coachFeed } from '../src/lib/coach';
import { emptyDay } from '../src/lib/store';
import { addDays, weekday } from '../src/lib/date';
import { fromOff } from '../src/lib/openfoodfacts';
import type { Profile } from '../src/lib/types';
import { buildPlan, workoutKcal } from '../src/lib/workout';

const base: Profile = {
  name: 'Test', sex: 'man', age: 30, heightCm: 180, weightKg: 80, goalWeightKg: 75, activity: 'gemiddeld', goal: 'afvallen',
  pace: 'normaal', trainDays: [0, 2, 4], focus: 'spiermassa', experience: 'gemiddeld', place: 'gym', createdAt: '',
  equipment: [...ALL_EQUIP], excluded: [], swaps: {}, fat: 5, muscle: 5,
};

describe('calories', () => {
  it('uses Mifflin-St Jeor', () => {
    expect(bmr(base)).toBe(10 * 80 + 6.25 * 180 - 5 * 30 + 5); // 1780
    expect(bmr({ ...base, sex: 'vrouw' })).toBe(1780 - 166);
  });
  it('blends Mifflin-St Jeor with lean mass, adds training and takes 20% off for a normal pace', () => {
    const t = calcTargets(base);
    const lbm = 80 * (1 - bodyFat(base) / 100);
    const b = (1780 + 370 + 21.6 * lbm) / 2;
    expect(t.bmr).toBe(Math.round(b));
    // dagelijks leven (gemiddeld actief) + 3 trainingen van ± 60 min, netto 3,5 MET
    const sport = (3 * 3.5 * 80 * (b / 24 / 80)) / 7;
    expect(t.neat).toBe(Math.round(b * 1.5));
    expect(t.sport).toBe(Math.round(sport));
    expect(t.tdee).toBe(Math.round(b * 1.5 + sport));
    expect(t.kcal).toBe(Math.round(((b * 1.5 + sport) * 0.8) / 10) * 10);
    expect(t.kgPerWeek).toBeCloseTo((t.kcal - (b * 1.5 + sport)) * 7 / 7700, 5);
    expect(t.kgPerWeek).toBeLessThan(-0.4);
    expect(t.kgPerWeek).toBeGreaterThan(-0.7);
  });
  it('counts more training days as more energy', () => {
    const none = calcTargets({ ...base, trainDays: [] });
    const five = calcTargets({ ...base, trainDays: [0, 1, 2, 3, 4] });
    expect(none.sport).toBe(0);
    expect(five.tdee - none.tdee).toBeGreaterThan(150);
    expect(five.kcal).toBeGreaterThan(none.kcal);
  });
  it('scales the pace to your body', () => {
    const slow = calcTargets({ ...base, pace: 'rustig' });
    const fast = calcTargets({ ...base, pace: 'snel' });
    expect(slow.delta).toBeGreaterThan(fast.delta);
    expect(Math.abs(fast.delta)).toBeLessThanOrEqual(fast.tdee * 0.26);
    const heavy = calcTargets({ ...base, weightKg: 120, fat: 9 });
    expect(Math.abs(heavy.kgPerWeek)).toBeGreaterThan(Math.abs(calcTargets(base).kgPerWeek));
    const gain = calcTargets({ ...base, goal: 'aankomen' });
    expect(gain.delta).toBeGreaterThan(0);
    expect(gain.kgPerWeek).toBeGreaterThan(0);
  });
  it('sets fibre, water and fat sensibly', () => {
    const t = calcTargets(base);
    expect(t.fib).toBe(Math.round(Math.min(40, Math.max(20, t.kcal * 0.014))));
    expect(t.waterMl).toBe(Math.round((80 * 30 + 250) / 250) * 250);
    expect(t.f).toBeGreaterThanOrEqual(80 * 0.6 - 1);
    const low = calcTargets({ ...base, macroStyle: 'koolhydraatarm' });
    expect(low.c).toBeLessThan(t.c);
    expect(low.f).toBeGreaterThan(t.f);
    expect(low.p).toBe(t.p);
  });
  it('steers towards the measured energy use when asked, within 20%', () => {
    const t = calcTargets(base);
    expect(calcTargets(base, { tdee: t.tdee + 400, confidence: 1 }).kcal).toBe(t.kcal);
    const smart = calcTargets({ ...base, adaptive: true }, { tdee: t.tdee + 400, confidence: 1 });
    expect(smart.adaptive).toBe(true);
    expect(smart.tdee).toBeGreaterThan(t.tdee + 300);
    const wild = calcTargets({ ...base, adaptive: true }, { tdee: t.tdee * 2, confidence: 1 });
    expect(wild.tdee).toBeLessThanOrEqual(Math.round(t.tdee * 1.2) + 1);
    const unsure = calcTargets({ ...base, adaptive: true }, { tdee: t.tdee + 400, confidence: 0.1 });
    expect(unsure.tdee).toBe(t.tdee);
  });
  it('uses the BMI formula less for muscular people', () => {
    const avg = { sex: 'man' as const, fat: 3, muscle: 5, weightKg: 95, heightCm: 180, age: 30 };
    const strong = { ...avg, muscle: 9 };
    // hoge BMI trekt het vetpercentage omhoog, maar bij veel spieren nauwelijks
    const avgShift = bodyFat(avg) - bodyFat({ sex: 'man', fat: 3, muscle: 5 });
    const strongShift = bodyFat(strong) - bodyFat({ sex: 'man', fat: 3, muscle: 9 });
    expect(avgShift).toBeGreaterThan(2);
    expect(strongShift).toBeLessThan(avgShift / 2);
  });
  it('uses the fat and muscle scales', () => {
    expect(bodyFat({ sex: 'man', fat: 1, muscle: 5 })).toBe(7);
    expect(bodyFat({ sex: 'man', fat: 10, muscle: 5 })).toBeCloseTo(37.6);
    expect(bodyFat({ sex: 'vrouw', fat: 5, muscle: 5 })).toBeGreaterThan(bodyFat({ sex: 'man', fat: 5, muscle: 5 }));
    // meer spieren = meer verbranding en meer eiwit
    const lean = calcTargets({ ...base, fat: 3, muscle: 9 });
    const soft = calcTargets({ ...base, fat: 8, muscle: 2 });
    expect(lean.bmr).toBeGreaterThan(soft.bmr);
    expect(lean.p).toBeGreaterThan(soft.p);
  });
  it('macros add up to the calorie target', () => {
    const t = calcTargets(base);
    expect(Math.abs(t.p * 4 + t.c * 4 + t.f * 9 - t.kcal)).toBeLessThan(15);
    expect(t.p).toBeGreaterThan(130);
    expect(t.p).toBeLessThan(80 * 2.4);
  });
  it('never goes below a safe floor', () => {
    const t = calcTargets({ ...base, sex: 'vrouw', weightKg: 45, heightCm: 150, age: 60, activity: 'zittend', pace: 'snel' });
    expect(t.kcal).toBeGreaterThanOrEqual(1200);
  });
  it('custom targets cannot go below the floor', () => {
    expect(calcTargets({ ...base, sex: 'vrouw', custom: { kcal: 900 } }).kcal).toBe(1200);
    expect(calcTargets({ ...base, sex: 'man', custom: { kcal: 1300 } }).kcal).toBe(1500);
  });
  it('respects custom targets', () => {
    const t = calcTargets({ ...base, custom: { kcal: 2222, steps: 15000 } });
    expect(t.kcal).toBe(2220);
    expect(t.steps).toBe(15000);
  });
  it('splits meals sensibly', () => {
    expect(mealRange('ontbijt', 2000)).toEqual([400, 600]);
    const fasting = calcTargets({ ...base, pattern: 'geen-ontbijt' });
    expect(mealRange('ontbijt', 2000, fasting.split)).toEqual([0, 0]);
    for (const p of ['standaard', 'groot-ontbijt', 'geen-ontbijt', 'tussendoor'] as const) {
      const split = calcTargets({ ...base, pattern: p }).split;
      const mid = Object.values(split).reduce((s, [lo, hi]) => s + (lo + hi) / 2, 0);
      expect(mid, p).toBeCloseTo(1, 5);
    }
  });
});

describe('food database', () => {
  it('has many foods with unique ids, fibre and consistent energy', () => {
    expect(FOODS.length).toBeGreaterThan(1000);
    expect(new Set(FOODS.map((f) => f.id)).size).toBe(FOODS.length);
    for (const f of FOODS) {
      expect(f.fib, f.name).toBeGreaterThanOrEqual(0);
      // vezels leveren ± 2 kcal per gram; alcohol (7 kcal/g) zit niet in de macro's
      const est = f.p * 4 + f.c * 4 + f.f * 9 + (f.fib ?? 0) * 2;
      if (!ALCOHOL.has(f.name)) expect(Math.abs(est - f.kcal), f.name).toBeLessThan(Math.max(25, f.kcal * 0.2));
    }
    for (const n of ALCOHOL) expect(FOODS.some((f) => f.name === n), n).toBe(true);
    const cats = new Set(FOODS.map((f) => f.cat));
    for (const c of ['zoet', 'afhaal', 'gerecht', 'snack']) expect(cats.has(c as never), c).toBe(true);
  });
  it('finds foods forgivingly', () => {
    expect(searchFoods('kip', FOODS)[0].name).toMatch(/^Kipfilet/);
    expect(searchFoods('huttenkase', FOODS)[0].name).toBe('Hüttenkäse');
    expect(searchFoods('bananen', FOODS)[0].name).toBe('Banaan');
    expect(searchFoods('druiven', FOODS).map((f) => f.name)).toContain('Druiven');
    expect(searchFoods('friet', FOODS)[0].name).toBe('Patat');
    expect(searchFoods('eieren', FOODS)[0].name).toMatch(/^Ei/);
    expect(searchFoods('spaghetti', FOODS).some((f) => f.name === 'Pasta (gekookt)')).toBe(true);
    // wat je vaak gebruikt komt eerder
    const fav = FOODS.find((f) => f.name === 'Kippendij (gebakken)')!;
    expect(searchFoods('kip', FOODS, 40, (f) => (f.id === fav.id ? 100 : 0))[0].name).toBe('Kippendij (gebakken)');
  });
  it('calculates portion nutrients', () => {
    const oats = FOODS.find((f) => f.name === 'Havermout')!;
    expect(entryNutrients({ id: 'x', food: oats, grams: 40, label: '' }).kcal).toBeCloseTo(148);
  });
  it('parses Open Food Facts products', () => {
    const f = fromOff({ code: '1', product_name: 'Skyr', brands: 'Arla, Foo', nutriments: { 'energy-kcal_100g': 63, proteins_100g: 11, carbohydrates_100g: 4, fat_100g: '0.2', fiber_100g: '0,5' }, serving_quantity: 150, quantity: '450 g' });
    expect(f).toMatchObject({ name: 'Skyr', brand: 'Arla', kcal: 63, p: 11, f: 0.2, fib: 0.5 });
    expect(fromOff({ product_name: 'Zonder vezels', nutriments: { 'energy-kcal_100g': 50 } })!.fib).toBeUndefined();
    expect(f!.portions.map((p) => p.g)).toEqual([150, 450]);
    expect(fromOff({ product_name: 'Zonder waarden' })).toBeNull();
    expect(fromOff({ product_name: 'kJ only', nutriments: { energy_100g: 418.4 } })!.kcal).toBe(100);
  });
});

describe('workout plans', () => {
  it('makes one workout per chosen day without duplicates', () => {
    for (let n = 1; n <= 7; n++) {
      const days = Array.from({ length: n }, (_, i) => i);
      const plan = buildPlan({ ...base, trainDays: days });
      expect(plan).toHaveLength(n);
      expect(plan.map((p) => p.weekday)).toEqual(days);
      for (const d of plan) {
        expect(d.exercises.length).toBeGreaterThanOrEqual(4);
        expect(new Set(d.exercises.map((e) => e.exercise.id)).size).toBe(d.exercises.length);
      }
    }
  });
  it('uses full body for 1-2 days and muscle groups from 3 days', () => {
    expect(buildPlan({ ...base, trainDays: [0, 3] }).map((d) => d.id)).toEqual(['fullbody-a', 'fullbody-b']);
    expect(buildPlan(base).map((d) => d.id)).toEqual(['push', 'pull', 'legs']);
    expect(buildPlan({ ...base, trainDays: [0, 1, 3, 4] }).map((d) => d.id)).toEqual(['borst-triceps', 'rug-biceps', 'legs', 'schouders-armen']);
    expect(buildPlan({ ...base, trainDays: [0, 1, 2, 3, 4] }).map((d) => d.id)).toEqual(['borst', 'rug', 'legs', 'schouders', 'armen']);
  });
  it('only picks exercises you have equipment for', () => {
    const home = buildPlan({ ...base, place: 'thuis', equipment: [] });
    for (const d of home) for (const e of d.exercises) expect(e.exercise.equip, e.exercise.id).toEqual([]);
    const noBarbell = buildPlan({ ...base, equipment: ALL_EQUIP.filter((q) => q !== 'stang') });
    for (const d of noBarbell) for (const e of d.exercises) expect(e.exercise.equip).not.toContain('stang');
  });
  it('matches difficulty to experience', () => {
    const newbie = buildPlan({ ...base, experience: 'nieuw' });
    for (const d of newbie) {
      expect(d.exercises.length).toBeLessThanOrEqual(4);
      for (const e of d.exercises) expect(e.exercise.diff, e.exercise.id).toBe(1);
    }
    const pro = buildPlan({ ...base, experience: 'ervaren' });
    expect(pro[0].exercises[0].exercise.id).toBe('bench');
    expect(pro[0].exercises[0].sets).toBe(4);
  });
  it('respects excluded exercises and swaps', () => {
    const ex = buildPlan({ ...base, experience: 'ervaren', excluded: ['bench'] });
    expect(ex.flatMap((d) => d.exercises.map((e) => e.exercise.id))).not.toContain('bench');
    const first = buildPlan({ ...base, experience: 'ervaren' })[0].exercises[0];
    const alt = first.alternatives[0].id;
    const swapped = buildPlan({ ...base, experience: 'ervaren', swaps: { [first.slotKey]: alt } })[0].exercises[0];
    expect(swapped.exercise.id).toBe(alt);
  });
  it('has steps and an animation for every exercise', () => {
    for (const e of Object.values(EXERCISES)) {
      expect(e.steps.length, e.id).toBeGreaterThanOrEqual(3);
      expect(e.anim.a.anchor).toBe(e.anim.b.anchor);
    }
  });
  it('adapts reps to the goal', () => {
    const strength = buildPlan({ ...base, focus: 'kracht' })[0];
    expect(strength.exercises[0].reps).toBe('5');
    const fatloss = buildPlan({ ...base, focus: 'afvallen' })[0];
    expect(fatloss.cardio?.minutes).toBe(15);
    expect(workoutKcal(fatloss, 80)).toBeGreaterThan(150);
  });
});

describe('coach', () => {
  const t = calcTargets(base);
  const ctx = (o: object) => ({ profile: base, t, day: emptyDay(), days: {}, date: '2026-11-24', today: '2026-11-24', hour: 9, waterTarget: 3000, weights: [], ...o });
  it('plans the morning and nudges when behind', () => {
    expect(coachFeed(ctx({ hour: 8 })).some((m) => m.id === 'plan')).toBe(true);
    const evening = coachFeed(ctx({ hour: 18 }));
    expect(evening[0].tone).toBe('nudge');
    expect(evening.some((m) => m.id === 'water')).toBe(true);
  });
  it('does not add burned calories to what you can eat', () => {
    const oats = FOODS.find((f) => f.name === 'Havermout')!;
    const grams = ((t.kcal * 1.15) / oats.kcal) * 100;
    const day = { ...emptyDay(), activities: [{ id: 'a', name: 'Hardlopen', emoji: '🏃', minutes: 60, kcal: 800 }], meals: { ...emptyDay().meals, ontbijt: [{ id: 'e', food: oats, grams, label: '' }] } };
    expect(coachFeed(ctx({ hour: 20, day })).some((m) => m.id === 'kcal-over')).toBe(true);
  });
  it('cheers when goals are reached', () => {
    const day = { ...emptyDay(), waterMl: 3200, steps: 12000 };
    const feed = coachFeed(ctx({ hour: 20, day }));
    expect(feed.some((m) => m.id === 'water-done')).toBe(true);
    expect(feed.some((m) => m.id === 'steps-done')).toBe(true);
  });
});

describe('dates', () => {
  it('handles weekdays and month boundaries', () => {
    expect(weekday('2026-11-23')).toBe(0); // maandag
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
  });
});

describe('recomp goal', () => {
  it('uses a small deficit and the most protein', () => {
    const lose = calcTargets(base);
    const keep = calcTargets({ ...base, goal: 'onderhouden' });
    const recomp = calcTargets({ ...base, goal: 'recomp' });
    expect(recomp.kcal).toBeLessThan(keep.kcal);
    expect(recomp.kcal).toBeGreaterThan(lose.kcal);
    expect(keep.kcal - recomp.kcal).toBeLessThanOrEqual(360);
    expect(recomp.p).toBeGreaterThan(lose.p);
    expect(recomp.steps).toBe(lose.steps);
  });
});

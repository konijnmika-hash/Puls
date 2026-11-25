import { describe, expect, it } from 'vitest';
import { FOODS } from '../src/data/foods';
import { addDays } from '../src/lib/date';
import { averageNutrients, energyInsight, forecast, insightNeeds, isComplete, weightRate, weightTrend } from '../src/lib/insights';
import { emptyDay } from '../src/lib/store';
import type { DayLog, WeightEntry } from '../src/lib/types';

const oats = FOODS.find((f) => f.name === 'Havermout')!;
const today = '2026-11-25';

/** Een dag met `kcal` aan havermout, verdeeld over ontbijt en lunch. */
const dayWith = (kcal: number): DayLog => {
  const grams = (kcal / oats.kcal) * 100;
  const d = emptyDay();
  d.meals.ontbijt.push({ id: 'a', food: oats, grams: grams / 2, label: '' });
  d.meals.lunch.push({ id: 'b', food: oats, grams: grams / 2, label: '' });
  return d;
};

describe('weight trend', () => {
  it('smooths daily swings', () => {
    const w: WeightEntry[] = [
      { date: '2026-11-01', kg: 80 },
      { date: '2026-11-02', kg: 81.5 },
      { date: '2026-11-03', kg: 79.8 },
    ];
    const t = weightTrend(w);
    expect(t[0].trend).toBe(80);
    expect(t[1].trend).toBeGreaterThan(80);
    expect(t[1].trend).toBeLessThan(80.3);
    expect(t[2].trend).toBeLessThan(t[1].trend);
  });
  it('measures the rate per week', () => {
    const w = Array.from({ length: 5 }, (_, i) => ({ date: addDays(today, -i * 7), kg: 80 + i * 0.5 }));
    expect(weightRate(w, today)!.kgPerWeek).toBeCloseTo(-0.5, 5);
    expect(weightRate([{ date: today, kg: 80 }], today)).toBeNull();
  });
});

describe('measured energy use', () => {
  it('derives energy use from intake and weight change', () => {
    const days: Record<string, DayLog> = {};
    for (let i = 1; i <= 28; i++) days[addDays(today, -i)] = dayWith(2000);
    // 0,5 kg per week eraf bij 2000 kcal: verbruik ± 2000 + 550
    const weights = Array.from({ length: 7 }, (_, i) => ({ date: addDays(today, -i * 4), kg: 80 + ((i * 4) / 7) * 0.5 }));
    const e = energyInsight(days, weights, today)!;
    expect(e.intake).toBeCloseTo(2000, -1);
    expect(e.tdee).toBeCloseTo(2550, -1);
    expect(e.loggedDays).toBe(28);
    expect(e.confidence).toBeGreaterThan(0.8);
  });
  it('needs enough data', () => {
    const days: Record<string, DayLog> = { [addDays(today, -1)]: dayWith(2000) };
    expect(energyInsight(days, [{ date: today, kg: 80 }], today)).toBeNull();
    const need = insightNeeds(days, [{ date: today, kg: 80 }], today);
    expect(need.days).toBe(13);
    expect(need.weighIns).toBe(3);
  });
  it('only counts complete days', () => {
    const half = emptyDay();
    half.meals.ontbijt.push({ id: 'a', food: oats, grams: 100, label: '' });
    expect(isComplete(half)).toBe(false);
    expect(isComplete(dayWith(1800))).toBe(true);
    expect(isComplete(dayWith(500))).toBe(false);
  });
});

describe('forecast and averages', () => {
  it('predicts when the goal is reached', () => {
    const f = forecast(84, 80, -0.5, today);
    expect(f && !f.reached && Math.round(f.weeks)).toBe(8);
    expect(forecast(84, 80, 0.2, today)).toBeNull();
    expect(forecast(80.1, 80, -0.5, today)).toEqual({ reached: true });
  });
  it('averages only days with food', () => {
    const avg = averageNutrients([dayWith(2000), emptyDay(), undefined, dayWith(1000)])!;
    expect(avg.days).toBe(2);
    expect(avg.kcal).toBeCloseTo(1500, 0);
    expect(avg.fib).toBeGreaterThan(0);
  });
});

import { useMemo } from 'react';
import { calcTargets, NO_NUTRIENTS, sumNutrients, TRAINING_WATER_BONUS } from './calc';
import { dateKey, weekday } from './date';
import { cachedInsight } from './insights';
import { emptyDay, useStore } from './store';
import { MEALS, type DayLog, type MealKey } from './types';
import { roomFor } from './recipes';
import { buildPlan, buildWorkout } from './workout';

const EMPTY = emptyDay();

export function useDay(date: string): DayLog {
  return useStore((s) => s.days[date]) ?? EMPTY;
}

/** Je gemeten verbruik uit de laatste 4 weken (eten + gewichtstrend), of null als er te weinig gegevens zijn. */
export function useEnergyInsight() {
  const days = useStore((s) => s.days);
  const weights = useStore((s) => s.weights);
  return cachedInsight(days, weights, dateKey());
}

export function useTargets() {
  const profile = useStore((s) => s.profile);
  // alleen opnieuw rekenen als slimme bijsturing aan staat
  const days = useStore((s) => (s.profile?.adaptive ? s.days : null));
  const weights = useStore((s) => s.weights);
  const measured = days ? cachedInsight(days, weights, dateKey()) : null;
  const mt = measured?.tdee;
  const mc = measured?.confidence;
  return useMemo(
    () => (profile ? calcTargets(profile, mt !== undefined && mc !== undefined ? { tdee: mt, confidence: mc } : null) : null),
    [profile, mt, mc],
  );
}

export function usePlan() {
  const profile = useStore((s) => s.profile);
  return useMemo(
    () => (profile ? buildPlan(profile) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile?.trainDays.join(), profile?.focus, profile?.experience, profile?.place, profile?.equipment?.join(), profile?.excluded?.join(), JSON.stringify(profile?.swaps), JSON.stringify(profile?.dayPlan), profile?.customWorkouts],
  );
}

export function dayTotals(day: DayLog) {
  const all = MEALS.flatMap((m) => day.meals[m]);
  const eaten = sumNutrients(all);
  const burned = day.activities.reduce((s, a) => s + a.kcal, 0);
  return { eaten, burned, count: all.length };
}

export function useWaterTarget(date: string) {
  const t = useTargets();
  const profile = useStore((s) => s.profile);
  if (!t || !profile) return 2000;
  const trains = profile.trainDays.includes(weekday(date));
  return t.waterMl + (trains && !profile.custom?.waterMl ? TRAINING_WATER_BONUS : 0);
}

/** Hoeveel ruimte (kcal en eiwit) er nog is voor een maaltijd op een dag. */
export function useMealRoom(meal: MealKey, date: string) {
  const t = useTargets();
  const day = useStore((s) => s.days[date]);
  return useMemo(() => (t ? roomFor(meal, t, day, day ? dayTotals(day).eaten : NO_NUTRIENTS) : null), [t, day, meal]);
}

/** Een workout uit je schema, de bibliotheek of je eigen combinaties. */
export function useWorkout(id: string | null | undefined) {
  const plan = usePlan();
  const profile = useStore((s) => s.profile);
  return useMemo(() => {
    if (!id || !profile) return null;
    return plan.find((p) => p.id === id) ?? buildWorkout(id, profile);
  }, [id, plan, profile]);
}

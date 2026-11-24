import { describe, expect, it } from 'vitest';
import { EXERCISES } from '../src/data/exercises';
import { addDays } from '../src/lib/date';
import { emptyDay } from '../src/lib/store';
import { records, repRange, setVolume, suggestWeight, weekStreak, weightStep, type WorkoutLog } from '../src/lib/training';
import type { PlannedExercise, WorkoutDay } from '../src/lib/workout';

const planned = (id: string, reps = '8–10', sets = 3): PlannedExercise => ({ exercise: EXERCISES[id], sets, reps, restSec: 90, slotKey: id, alternatives: [] });
const entry = (id: string, sets: { kg: number; reps: number }[], date = '2026-11-10'): WorkoutLog => ({ date, id: 'pull', name: 'Rug', emoji: '', minutes: 50, kcal: 300, volume: setVolume(sets), sets: sets.length, ex: [{ id, sets }] });

describe('training', () => {
  it('reads rep ranges', () => {
    expect(repRange('8–10')).toEqual({ lo: 8, hi: 10, timed: false });
    expect(repRange('12 langzaam')).toEqual({ lo: 12, hi: 12, timed: false });
    expect(repRange('30 sec').timed).toBe(true);
  });

  it('suggests more weight only when every set reached the top of the range', () => {
    const p = planned('row');
    const step = weightStep(EXERCISES.row);
    expect(suggestWeight(p, [entry('row', [{ kg: 50, reps: 10 }, { kg: 50, reps: 10 }, { kg: 50, reps: 10 }])], {})).toEqual({ kg: 50 + step, why: 'zwaarder', last: 50 });
    expect(suggestWeight(p, [entry('row', [{ kg: 50, reps: 10 }, { kg: 50, reps: 9 }, { kg: 50, reps: 8 }])], {}).kg).toBe(50);
    expect(suggestWeight(p, [], { row: 40 })).toEqual({ kg: 40, why: 'zelfde', last: 40 });
    expect(suggestWeight(p, [], {}).why).toBe('start');
  });

  it('uses 2 kg steps for dumbbells and 2,5 kg for barbells', () => {
    expect(weightStep(EXERCISES.curl)).toBe(2);
    expect(weightStep(EXERCISES.squat)).toBe(2.5);
  });

  it('finds new records', () => {
    const log = [entry('row', [{ kg: 50, reps: 10 }])];
    expect(records(log, [{ id: 'row', sets: [{ kg: 55, reps: 8 }] }], {})).toEqual([{ id: 'row', kg: 55, prev: 50 }]);
    expect(records(log, [{ id: 'row', sets: [{ kg: 50, reps: 12 }] }], {})).toEqual([]);
  });

  it('counts weeks in a row with the whole schedule done', () => {
    const plan = [{ id: 'a', weekday: 0 }, { id: 'b', weekday: 2 }] as WorkoutDay[];
    const monday = '2026-11-23';
    const days: Record<string, ReturnType<typeof emptyDay>> = {};
    const mark = (date: string, id: string) => { days[date] = { ...(days[date] ?? emptyDay()), workoutsDone: [...(days[date]?.workoutsDone ?? []), id] }; };
    for (const w of [1, 2]) { mark(addDays(monday, -7 * w), 'a'); mark(addDays(monday, -7 * w + 2), 'b'); }
    expect(weekStreak(days, plan, monday)).toBe(2);
    mark(monday, 'a');
    expect(weekStreak(days, plan, monday)).toBe(2);
    mark(addDays(monday, 2), 'b');
    expect(weekStreak(days, plan, monday)).toBe(3);
  });
});

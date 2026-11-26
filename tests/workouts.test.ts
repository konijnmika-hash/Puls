import { describe, expect, it } from 'vitest';
import { ALL_EQUIP, EXERCISES } from '../src/data/exercises';
import { FINISHERS, GROUP_KEYS, LIBRARY, LIBRARY_BY_ID, mixName, mixSlots } from '../src/data/workouts';
import { slotCands } from '../src/lib/slots';
import { buildPlan, buildWorkout, libMinutes, splitFor, timerSeconds, workoutKcal } from '../src/lib/workout';
import type { Profile } from '../src/lib/types';

const base = { trainDays: [0, 2, 4], focus: 'fit', experience: 'gemiddeld', place: 'gym', equipment: [...ALL_EQUIP], excluded: [], swaps: {} } as unknown as Profile;
const home = { ...base, place: 'thuis', equipment: [] } as Profile;
const starter = { ...home, experience: 'nieuw' } as Profile;

describe('workout-bibliotheek', () => {
  it('heeft veel workouts met unieke ids en bestaande oefeningen', () => {
    expect(LIBRARY.length).toBeGreaterThanOrEqual(60);
    expect(new Set(LIBRARY.map((w) => w.id)).size).toBe(LIBRARY.length);
    for (const w of LIBRARY) {
      expect(EXERCISES[w.cover], `${w.id} cover`).toBeTruthy();
      for (const s of w.slots) for (const id of slotCands(s)) expect(EXERCISES[id], `${w.id}: ${id}`).toBeTruthy();
      for (const step of w.timeline ?? []) expect(step[0]).toBeLessThan(w.slots.length);
    }
  });

  it('botst niet met de dagen van het standaardschema', () => {
    const split = new Set([1, 2, 3, 4, 5, 6, 7].flatMap((n) => splitFor(n).map((t) => t.id)));
    for (const w of LIBRARY) expect(split.has(w.id), w.id).toBe(false);
  });

  it('bouwt elke workout voor gym, thuis en starters', () => {
    for (const p of [base, home, starter]) {
      for (const w of LIBRARY) {
        const d = buildWorkout(w.id, p)!;
        expect(d.exercises.length, `${w.id} (${p.place}/${p.experience})`).toBeGreaterThan(0);
        expect(d.estMinutes).toBeGreaterThan(0);
        expect(workoutKcal(d, 75)).toBeGreaterThan(0);
      }
    }
  });

  it('workouts op tijd hebben een tijdlijn die klopt', () => {
    const tabata = buildWorkout('tabata', base)!;
    expect(timerSeconds(tabata)).toBe(4 * 60 - 10);
    expect(tabata.timer!.filter((s) => s.kind === 'work')).toHaveLength(8);
    const tb = buildWorkout('tabata-16', base)!;
    expect(tb.timer!.filter((s) => s.kind === 'work')).toHaveLength(32);
    expect(libMinutes(LIBRARY_BY_ID['fiets-zone2'])).toBe(30);
    // rust toont wat er hierna komt
    const hiit = buildWorkout('hiit-20', base)!;
    const i = hiit.timer!.findIndex((s) => s.kind === 'rest');
    expect(hiit.timer![i].exercise.id).toBe(hiit.timer![i + 1].exercise.id);
    // starters: minder rondes, langere rust
    const easy = buildWorkout('hiit-20', starter)!;
    expect(timerSeconds(easy)).toBeLessThan(timerSeconds(hiit));
  });

  it('thuis zonder apparatuur kiest geen gym-oefeningen voor krachtworkouts', () => {
    for (const w of LIBRARY.filter((l) => !l.interval && !l.timeline)) {
      for (const e of buildWorkout(w.id, home)!.exercises) expect(e.exercise.equip, `${w.id}: ${e.exercise.id}`).toEqual([]);
    }
  });

  it('vaste sets en herhalingen (5×5) blijven staan', () => {
    const d = buildWorkout('grote-drie', base)!;
    expect(d.exercises[0]).toMatchObject({ sets: 5, reps: '5' });
  });
});

describe('zelf combineren', () => {
  it('neemt om en om uit elke spiergroep', () => {
    const slots = mixSlots(['borst', 'rug'], 'normaal');
    expect(slots).toHaveLength(6);
    expect(mixName(['borst', 'rug', 'core'])).toBe('Borst, Rug & core');
    for (const g of GROUP_KEYS) expect(mixSlots([g], 'kort').length).toBeGreaterThan(0);
  });

  it('bouwt een eigen combinatie met afsluiter', () => {
    const p = { ...base, customWorkouts: [{ id: 'mix-1', name: 'Borst & rug', groups: ['borst', 'rug'], size: 'normaal', finisher: 'tabata' }] } as Profile;
    const d = buildWorkout('mix-1', p)!;
    expect(d.exercises.map((e) => e.exercise.muscles[0])).toEqual(expect.arrayContaining(['Borst', 'Rug']));
    expect(d.cardio?.label).toContain('Tabata');
    for (const f of FINISHERS) expect(LIBRARY_BY_ID[f]).toBeTruthy();
  });
});

describe('workouts in je schema', () => {
  it('vervangt één dag en laat de rest staan', () => {
    const plain = buildPlan(base);
    const plan = buildPlan({ ...base, dayPlan: { 2: 'hiit-20' } });
    expect(plan.map((d) => d.id)).toEqual([plain[0].id, 'hiit-20', plain[2].id]);
  });

  it('zet een workout op een rustdag erbij zonder je schema te veranderen', () => {
    const plain = buildPlan(base);
    const plan = buildPlan({ ...base, dayPlan: { 6: 'ochtendstretch' } });
    expect(plan).toHaveLength(4);
    expect(plan.slice(0, 3).map((d) => d.id)).toEqual(plain.map((d) => d.id));
    expect(plan[3]).toMatchObject({ id: 'ochtendstretch', weekday: 6 });
  });
});

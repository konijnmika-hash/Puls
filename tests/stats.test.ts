import { beforeEach, describe, expect, it } from 'vitest';
import { ALL_EQUIP } from '../src/data/exercises';
import { calcTargets, stepsKcal } from '../src/lib/calc';
import { addDays } from '../src/lib/date';
import { backupJson, daysCsv, foodCsv, parseBackup, workoutsCsv } from '../src/lib/export';
import { badges, challengeFor, challengeStatus, milestones, weekFeedback, weekGoals } from '../src/lib/motivation';
import { activeDaysIn, activeGrid, buckets, burnedOn, logStreak, ranges, recentFeed, trainingsOn, waterTargetFor, weekNumber } from '../src/lib/stats';
import { defaultGoals, emptyDay, useStore } from '../src/lib/store';
import type { DayLog, Profile } from '../src/lib/types';
import type { Food } from '../src/data/foods';

const profile: Profile = {
  name: 'Test', sex: 'vrouw', age: 35, heightCm: 170, weightKg: 70, goalWeightKg: 65, activity: 'licht', goal: 'afvallen',
  pace: 'normaal', trainDays: [0, 2, 4], focus: 'fit', experience: 'beginner', place: 'gym', createdAt: '',
  equipment: [...ALL_EQUIP], excluded: [], swaps: {}, fat: 5, muscle: 5,
};
const t = calcTargets(profile);
const c = { profile, t };
const kwark: Food = { id: 'kwark', name: 'Magere kwark', cat: 'zuivel', kcal: 50, p: 9, c: 4, f: 0.1, fib: 0, unit: 'g', portions: [], source: 'db' };
const day = (o: Partial<DayLog> = {}): DayLog => ({ ...emptyDay(), ...o });
const withFood = (grams: number, o: Partial<DayLog> = {}) => day({ meals: { ontbijt: [{ id: 'x', food: kwark, grams, label: '' }], lunch: [], diner: [], snacks: [] }, ...o });

// 2026-11-26 is een donderdag
const TODAY = '2026-11-26';

describe('perioden', () => {
  it('dag: 7 dagen eindigend vandaag, met bladeren terug', () => {
    const r = ranges('dag', TODAY);
    expect(r).toHaveLength(7);
    expect(r[6].from).toBe(TODAY);
    expect(r[0].from).toBe(addDays(TODAY, -6));
    expect(ranges('dag', TODAY, 1)[6].from).toBe(addDays(TODAY, -7));
  });
  it('week: van maandag tot zondag', () => {
    const r = ranges('week', TODAY);
    expect(r).toHaveLength(8);
    expect(r[7].from).toBe('2026-11-23');
    expect(r[7].to).toBe('2026-11-29');
    expect(r[7].label).toBe(`wk ${weekNumber('2026-11-23')}`);
    expect(weekNumber('2026-11-23')).toBe(48);
  });
  it('maand: hele kalendermaanden', () => {
    const r = ranges('maand', TODAY);
    expect(r[5]).toMatchObject({ from: '2026-11-01', to: '2026-11-30', label: 'nov' });
    expect(r[0].from).toBe('2026-06-01');
    expect(ranges('maand', '2026-03-31')[4]).toMatchObject({ from: '2026-02-01', to: '2026-02-28' });
  });
});

describe('statistieken', () => {
  const days: Record<string, DayLog> = {
    '2026-11-23': withFood(400, { waterMl: 3000, steps: 8000 }), // 200 kcal
    '2026-11-24': withFood(800, { waterMl: 1000 }), // 400 kcal
    '2026-11-25': day({ waterMl: 500, activities: [{ id: 'a', name: 'Hardlopen', emoji: '🏃', minutes: 30, kcal: 300 }] }),
  };
  it('gemiddelden alleen over dagen die je bijhield', () => {
    const [w] = buckets('week', days, [], c, TODAY, 0, 1);
    expect(w.loggedDays).toBe(2);
    expect(w.kcal).toBeCloseTo(300);
    expect(w.p).toBeCloseTo(54); // (36 + 72) / 2
    expect(w.water).toBeCloseTo(1500);
    expect(w.waterDays).toBe(3);
    expect(w.elapsed).toBe(4); // ma t/m do
    expect(w.activeMin).toBe(30);
    expect(w.trainings).toBe(1);
    expect(w.burnedLogged).toBe(300);
    expect(w.future).toBe(true);
  });
  it('waterdoel is hoger op trainingsdagen, behalve met een eigen doel', () => {
    expect(waterTargetFor(profile, t, '2026-11-23') - waterTargetFor(profile, t, '2026-11-24')).toBe(500); // ma traint, di niet
    expect(waterTargetFor({ ...profile, custom: { waterMl: 2000 } }, { waterMl: 2000 }, '2026-11-23')).toBe(2000);
  });
  it('verbrand: geregistreerd en geschat apart', () => {
    const d = day({ steps: 10000, activities: [{ id: 'a', name: 'Fietsen', emoji: '🚴', minutes: 40, kcal: 250 }] });
    const b = burnedOn(d, 70, 170);
    expect(b.logged).toBe(250);
    expect(b.fromSteps).toBe(stepsKcal(10000, 70, 170));
    expect(b.total).toBe(b.logged + b.fromSteps);
  });
  it('lichte activiteiten tellen niet als training', () => {
    expect(trainingsOn(day({ activities: [{ id: 'a', name: 'Wandelen · rustig', emoji: '🚶', minutes: 60, kcal: 150 }] }))).toBe(0);
    expect(trainingsOn(day({ activities: [{ id: 'a', name: 'Push', emoji: '💪', minutes: 10, kcal: 50, workout: 'push' }] }))).toBe(1);
  });
  it('actieve dagen tellen vergevingsgezind (geen reeks die breekt)', () => {
    expect(activeDaysIn(days, TODAY, 7)).toBe(3);
    expect(logStreak(days, TODAY)).toBe(0); // gisteren niets gegeten
    expect(logStreak(days, '2026-11-24')).toBe(2);
    const grid = activeGrid(days, c, TODAY, 2);
    expect(grid[1][0].level).toBeGreaterThanOrEqual(2); // ma: gegeten + water + stappen
    expect(grid[1][6].level).toBe(-1); // zondag ligt in de toekomst
  });
  it('recente activiteit: nieuwste eerst', () => {
    const feed = recentFeed(days, [{ date: '2026-11-25', kg: 70 }], TODAY);
    expect(feed[0].date).toBe('2026-11-25');
    expect(feed.some((f) => f.kind === 'weight')).toBe(true);
    expect(feed.some((f) => f.kind === 'activity')).toBe(true);
  });
});

describe('motivatie', () => {
  it('elke dag een uitdaging die bij de dag past', () => {
    const ch = challengeFor(TODAY, c);
    expect(ch.title.length).toBeGreaterThan(3);
    expect(challengeFor(TODAY, c).id).toBe(ch.id); // vast per dag
    // op een rustdag geen trainingsuitdaging
    for (let i = 0; i < 60; i++) {
      const d = addDays('2026-11-24', i * 7); // dinsdagen
      expect(challengeFor(d, c).id).not.toBe('train');
    }
  });
  it('handmatige uitdagingen kun je zelf afvinken', () => {
    const s = challengeStatus(TODAY, c, undefined, true);
    expect(s.done).toBe(true);
  });
  it('weekdoelen tellen dagen deze week', () => {
    const days = { '2026-11-23': withFood(400, { waterMl: 5000, steps: 20000 }), '2026-11-24': withFood(400) };
    const g = weekGoals(defaultGoals(profile), days, c, TODAY);
    expect(g.find((x) => x.id === 'logDays')!.value).toBe(2);
    expect(g.find((x) => x.id === 'waterDays')!.value).toBe(1);
    expect(g.find((x) => x.id === 'stepDays')!.value).toBe(1);
    expect(g.find((x) => x.id === 'trainings')!.target).toBe(3);
  });
  it('badges en mijlpalen blijven staan als je een dag overslaat', () => {
    const days: Record<string, DayLog> = {};
    for (let i = 0; i < 10; i++) if (i !== 4) days[addDays('2026-11-01', i)] = withFood(300);
    const b = badges({ days, cooked: { a: 2 }, habitLog: {}, challengeDays: 0, workouts: 0, c, today: TODAY });
    const logger = b.find((x) => x.id === 'logger')!;
    expect(logger.value).toBe(9);
    expect(logger.level).toBe(2); // 3 en 7 gehaald
    expect(logger.next).toBe(30);
    expect(b.find((x) => x.id === 'chef')!.level).toBe(1);
    const m = milestones(days, c, TODAY);
    expect(m.map((x) => x.id)).toContain('log-7');
    expect(m.map((x) => x.id)).toContain('first-log');
  });
  it('feedback is nooit verwijtend', () => {
    const g = weekGoals(defaultGoals(profile), {}, c, TODAY);
    const f = weekFeedback(g, 0, 3, false, 15);
    expect(f.text).toMatch(/geen probleem|niets uit/i);
  });
});

describe('export en back-up', () => {
  const days = { '2026-11-24': withFood(250, { waterMl: 1500, steps: 4000, note: 'Lekker; "druk" gehad' }) };
  it('CSV in Nederlandse Excel-opmaak', () => {
    const f = foodCsv(days);
    expect(f.startsWith('﻿Datum;Maaltijd;Product')).toBe(true);
    expect(f).toContain('2026-11-24;Ontbijt;Magere kwark;;250;g;;125;22,5;10;0,3;0');
    const d = daysCsv({ days, weights: [{ date: '2026-11-25', kg: 69.5 }], profile });
    expect(d).toContain('"Lekker; ""druk"" gehad"');
    expect(d).toContain('2026-11-25;;;;;;;;;;;69,5;');
    const w = workoutsCsv({ days: { '2026-11-24': day({ activities: [{ id: 'a', name: 'Hardlopen', emoji: '🏃', minutes: 30, kcal: 300, km: 5.2 }] }) }, workoutLog: [{ date: '2026-11-23', id: 'push', name: 'Push', emoji: '', minutes: 50, kcal: 300, volume: 1000, sets: 1, ex: [{ id: 'bench', sets: [{ kg: 50, reps: 10 }] }] }] });
    expect(w).toContain('2026-11-23;Push;Bankdrukken;1;50;10;50;300');
    expect(w).toContain('5,2 km');
  });
  it('back-up terugzetten met controle', () => {
    const data = { ...useStore.getState(), days };
    const ok = parseBackup(backupJson(data as never));
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.days).toBe(1);
    // ook de ruwe opslag van de app werkt
    expect(parseBackup(JSON.stringify({ state: { days, weights: [] }, version: 5 })).ok).toBe(true);
    expect(parseBackup('hallo').ok).toBe(false);
    expect(parseBackup('{"app":"puls","data":{"days":{"gisteren":{}},"weights":[]}}').ok).toBe(false);
  });
});

describe('opslag', () => {
  beforeEach(() => useStore.getState().reset());
  it('water per keer, met tijd, en ongedaan maken', () => {
    const s = useStore.getState();
    s.addWater(TODAY, 250);
    s.addWater(TODAY, 500);
    let d = useStore.getState().days[TODAY];
    expect(d.waterMl).toBe(750);
    expect(d.sips).toHaveLength(2);
    useStore.getState().removeSip(TODAY, 0);
    d = useStore.getState().days[TODAY];
    expect(d.waterMl).toBe(500);
    useStore.getState().setWater(TODAY, 0);
    d = useStore.getState().days[TODAY];
    expect(d.sips).toHaveLength(0);
    useStore.getState().addWater(TODAY, 9000);
    expect(useStore.getState().days[TODAY].waterMl).toBe(8000);
  });
  it('maaltijd en hele dag kopiëren naar een andere dag', () => {
    const s = useStore.getState();
    s.addFood('2026-11-20', 'lunch', kwark, 200, '200 g');
    s.addFood('2026-11-20', 'diner', kwark, 100, '100 g');
    expect(useStore.getState().copyMeal('2026-11-20', TODAY, 'lunch', 'snacks')).toBe(1);
    expect(useStore.getState().days[TODAY].meals.snacks).toHaveLength(1);
    expect(useStore.getState().copyDay('2026-11-20', '2026-11-27')).toBe(2);
    const copied = useStore.getState().days['2026-11-27'];
    expect(copied.meals.lunch[0].id).not.toBe(useStore.getState().days['2026-11-20'].meals.lunch[0].id);
  });
  it('dubbele tik registreert maar één keer', () => {
    const a = { name: 'Zwemmen', emoji: '🏊', minutes: 30, kcal: 240 };
    useStore.getState().addActivity(TODAY, a);
    useStore.getState().addActivity(TODAY, a);
    expect(useStore.getState().days[TODAY].activities).toHaveLength(1);
    const log = { date: TODAY, id: 'push', name: 'Push', emoji: '', minutes: 40, kcal: 200, volume: 0, sets: 3, ex: [] };
    useStore.getState().completeWorkout(TODAY, 'push', { name: 'Push', emoji: '', minutes: 40, kcal: 200 }, {}, log);
    useStore.getState().completeWorkout(TODAY, 'push', { name: 'Push', emoji: '', minutes: 40, kcal: 200 }, {}, log);
    expect(useStore.getState().workoutLog).toHaveLength(1);
    expect(useStore.getState().days[TODAY].activities).toHaveLength(2);
  });
  it('doelen blijven binnen gezonde grenzen', () => {
    useStore.getState().setGoals({ trainings: 7, activeMin: 5000, logDays: 0 });
    const g = useStore.getState().goals;
    expect(g.trainings).toBe(6);
    expect(g.activeMin).toBe(600);
    expect(g.logDays).toBe(1);
  });
  it('gewicht verwijderen werkt het profielgewicht bij', () => {
    useStore.getState().setProfile(profile);
    useStore.getState().logWeight('2030-01-01', 71);
    useStore.getState().logWeight('2030-01-05', 69);
    useStore.getState().deleteWeight('2030-01-05');
    expect(useStore.getState().profile!.weightKg).toBe(71);
  });
  it('gewoontes en eigen trainingen', () => {
    const s = useStore.getState();
    s.toggleHabit(TODAY, 'groente');
    expect(useStore.getState().habitLog[TODAY]).toEqual(['groente']);
    s.addHabit('Mediteren', '🧠');
    expect(useStore.getState().goals.habits.at(-1)!.name).toBe('Mediteren');
    s.removeHabit('groente'); // standaardgewoonte: blijft staan
    expect(useStore.getState().goals.habits.some((h) => h.id === 'groente')).toBe(true);
    const ex = s.addCustomExercise({ name: 'Kettlebell swing', muscles: ['Billen', 'Hamstrings'], equip: [], weighted: true });
    const tpl = useStore.getState().saveTemplate({ name: 'Snel thuis', items: [{ ex, sets: 3, reps: '15', restSec: 45 }], fav: true });
    expect(useStore.getState().templates[0].id).toBe(tpl);
    useStore.getState().deleteCustomExercise(ex);
    expect(useStore.getState().templates[0].items).toHaveLength(0);
  });
});

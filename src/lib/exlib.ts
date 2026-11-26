// Oefeningen opzoeken, ook je eigen oefeningen, en eigen trainingen (sjablonen) omzetten naar een trainingsdag.
import { EXERCISES, type Equip, type Exercise, type Muscle } from '../data/exercises';
import type { PlannedExercise, WorkoutDay } from './workout';

export const MUSCLES: Muscle[] = ['Borst', 'Rug', 'Schouders', 'Biceps', 'Triceps', 'Benen', 'Billen', 'Hamstrings', 'Kuiten', 'Core', 'Conditie'];

/** Een oefening die je zelf hebt toegevoegd. */
export interface CustomExercise {
  id: string;
  name: string;
  muscles: Muscle[];
  equip: Equip[];
  /** met gewicht (kg bijhouden) */
  weighted: boolean;
  /** op tijd in plaats van herhalingen */
  timed?: boolean;
  note?: string;
}

/** Eén oefening in een eigen training. */
export interface TemplateItem {
  ex: string;
  sets: number;
  reps: string;
  restSec: number;
}

/** Een eigen training die je opslaat en steeds opnieuw kunt doen. */
export interface WorkoutTemplate {
  id: string;
  name: string;
  items: TemplateItem[];
  fav: boolean;
  /** hoe vaak gedaan */
  used: number;
  created: string;
}

/** Voor eigen oefeningen lenen we het plaatje van een bekende oefening voor dezelfde spieren. */
const LOOK: Record<Muscle, string> = {
  Borst: 'dbbench', Rug: 'dbrow', Schouders: 'dbohp', Biceps: 'curl', Triceps: 'ohtriceps', Benen: 'gobletsquat',
  Billen: 'glutebridge', Hamstrings: 'dbrdl', Kuiten: 'calf', Core: 'plank', Conditie: 'mountain',
};

export function toExercise(c: CustomExercise): Exercise {
  const look = EXERCISES[LOOK[c.muscles[0] ?? 'Core']] ?? EXERCISES.plank;
  return {
    id: c.id, name: c.name, muscles: c.muscles.length ? c.muscles : ['Core'], equip: c.equip, diff: 1, compound: c.muscles.length > 1,
    weighted: c.weighted, timed: c.timed, steps: c.note ? [c.note] : [], tip: 'Dit is je eigen oefening. Let op een rustige, gecontroleerde uitvoering.',
    anim: look.anim,
  };
}

let custom: Record<string, Exercise> = {};

/** Wordt door de opslag aangeroepen zodra je eigen oefeningen veranderen. */
export function setCustomExercises(list: CustomExercise[]) {
  custom = Object.fromEntries(list.map((c) => [c.id, toExercise(c)]));
}

export const isCustomExercise = (id: string) => id in custom && !(id in EXERCISES);

export const getExercise = (id: string): Exercise | undefined => EXERCISES[id] ?? custom[id];

/** Naam van een oefening, ook als hij intussen is verwijderd. */
export const exerciseName = (id: string) => getExercise(id)?.name ?? 'Verwijderde oefening';

export const allExercises = (): Exercise[] => [...Object.values(custom), ...Object.values(EXERCISES)];

/** Standaard sets en herhalingen voor een oefening in een eigen training. */
export function defaultItem(e: Exercise): TemplateItem {
  if (e.timed) return { ex: e.id, sets: 3, reps: '30 sec', restSec: 45 };
  return e.compound ? { ex: e.id, sets: 3, reps: '8–10', restSec: 90 } : { ex: e.id, sets: 3, reps: '10–12', restSec: 60 };
}

export const TEMPLATE_PREFIX = 'tpl:';

/** Een eigen training als trainingsdag, zodat de gewone trainingssessie hem kan draaien. */
export function templateDay(t: WorkoutTemplate): WorkoutDay {
  const exercises: PlannedExercise[] = t.items
    .map((it) => ({ it, exercise: getExercise(it.ex) }))
    .filter((x): x is { it: TemplateItem; exercise: Exercise } => !!x.exercise)
    .map(({ it, exercise }) => ({ exercise, sets: Math.max(1, it.sets), reps: it.reps, restSec: it.restSec, slotKey: '', alternatives: [] }));
  const work = exercises.reduce((s, e) => s + e.sets * (45 + e.restSec), 0) / 60;
  return { id: t.id, name: t.name, subtitle: 'Eigen training', emoji: '⭐', weekday: -1, exercises, estMinutes: Math.max(10, Math.round((5 + work) / 5) * 5) };
}

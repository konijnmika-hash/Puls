import { EXERCISES, canDo, type Exercise } from '../data/exercises';
import { LIBRARY_BY_ID, GROUPS, mixSlots, type CustomWorkout, type LibWorkout } from '../data/workouts';
import type { Experience, Focus, Profile } from './types';
import { C, slotCands, type SlotSpec } from './slots';

export interface PlannedExercise {
  exercise: Exercise;
  sets: number;
  reps: string;
  restSec: number;
  /** sleutel van de plek in het schema, voor wisselen */
  slotKey: string;
  /** andere oefeningen die op deze plek passen (en die je kunt doen) */
  alternatives: Exercise[];
}

export interface WorkoutDay {
  id: string;
  name: string;
  subtitle: string;
  emoji: string;
  weekday: number;
  exercises: PlannedExercise[];
  cardio?: { label: string; minutes: number };
  estMinutes: number;
  /** workouts op tijd: de hele tijdlijn, de sessie loopt dan vanzelf */
  timer?: Segment[];
  /** zwaarte (MET) van een workout op tijd, voor de kcal */
  met?: number;
  /** waar hij vandaan komt: je vaste schema, de bibliotheek of een eigen combinatie */
  source?: 'schema' | 'lib' | 'mix';
  desc?: string;
  /** oefening op het plaatje */
  cover?: string;
}

/** Een stukje van een workout op tijd. Bij rust is `exercise` de oefening die hierna komt. */
export interface Segment {
  exercise: Exercise;
  sec: number;
  kind: 'work' | 'easy' | 'rest';
  note?: string;
  round?: number;
  rounds?: number;
}

interface Template {
  id: string;
  name: string;
  subtitle: string;
  emoji: string;
  /** per plek: kandidaten van zwaar/technisch naar makkelijk */
  slots: SlotSpec[];
  /** null = geen cardio, leeg = volgens je focus */
  cardio?: { label: string; minutes: number } | null;
}

const T = (id: string, name: string, subtitle: string, emoji: string, slots: SlotSpec[]): Template => ({ id, name, subtitle, emoji, slots });

const FB_A = T('fullbody-a', 'Full body A', 'Hele lichaam', '⚡', [C.squat, C.chest, C.hpull, C.hinge, C.shoulder, C.core2, C.bicep]);
const FB_B = T('fullbody-b', 'Full body B', 'Hele lichaam', '🔥', [C.hinge2, C.chest2, C.vpull, C.single, C.lateral, C.core, C.tricep]);
const PUSH = T('push', 'Borst, schouders & triceps', 'Push-dag', '💪', [C.chest, C.chest2, C.shoulder, C.lateral, C.tricep, C.tricep2, C.chest3]);
const PULL = T('pull', 'Rug & biceps', 'Pull-dag', '🧗', [C.vpull, C.hpull, C.hpull2, C.rearDelt, C.bicep, C.bicep2, C.core]);
const LEGS = T('legs', 'Benen & billen', 'Beendag', '🦵', [C.squat, C.hinge, C.single, C.hams, C.quads, C.calf, C.core2]);
const CHEST_TRI = T('borst-triceps', 'Borst & triceps', 'Spiergroepdag', '💪', [C.chest, C.chest2, C.chest3, C.tricep, C.tricep2, ['chairdip', 'kneepushup'], C.core2]);
const BACK_BI = T('rug-biceps', 'Rug & biceps', 'Spiergroepdag', '🧗', [C.vpull, C.hpull, C.hpull2, C.rearDelt, C.bicep, C.bicep2, C.core]);
const SHOULDERS_ARMS = T('schouders-armen', 'Schouders & armen', 'Spiergroepdag', '🏋️', [C.shoulder, C.lateral, C.rearDelt, C.bicep, C.tricep, C.bicep2, C.tricep2]);
const CHEST = T('borst', 'Borst', 'Spiergroepdag', '💪', [C.chest, C.chest2, C.chest3, ['chestpress', 'pushup', 'kneepushup'], ['dips', 'declinepushup', 'pushup'], C.core2]);
const BACK = T('rug', 'Rug', 'Spiergroepdag', '🧗', [C.vpull, C.hpull, C.hpull2, ['pulldown', 'tablerow', 'superman'], C.rearDelt, ['superman', 'reversefly'], C.core2]);
const SHOULDERS = T('schouders', 'Schouders', 'Spiergroepdag', '🏋️', [C.shoulder, C.lateral, C.rearDelt, ['cablelateral', 'lateral'], ['dbohp', 'machinepress', 'pikepushup'], C.cond]);
const ARMS = T('armen', 'Armen & core', 'Spiergroepdag', '💥', [C.bicep, C.tricep2, C.bicep2, C.tricep, ['cablecurl', 'backpackcurl'], C.core]);
const PUSH_B = T('push-b', 'Schouders, borst & triceps', 'Push-dag B', '💥', [C.shoulder, C.chest2, C.chest3, C.lateral, C.tricep2, C.tricep, C.core2]);
const PULL_B = T('pull-b', 'Rug & biceps B', 'Pull-dag B', '🪢', [C.hpull2, C.vpull, C.hpull, C.rearDelt, C.bicep2, C.bicep, C.core]);
const LEGS_B = T('legs-b', 'Billen & hamstrings', 'Beendag B', '🍑', [C.hinge2, C.squat2, C.glute, C.single, C.hams, C.calf, C.cond]);
const RECOVERY = T('herstel', 'Actief herstel', 'Mobiliteit & core', '🧘', [['deadbug'], ['sideplank'], ['glutebridge'], ['superman']]);

/** Welke dagen je krijgt bij hoeveel trainingen per week. */
export function splitFor(days: number): Template[] {
  switch (days) {
    case 0: return [];
    case 1: return [FB_A];
    case 2: return [FB_A, FB_B];
    case 3: return [PUSH, PULL, LEGS];
    case 4: return [CHEST_TRI, BACK_BI, LEGS, SHOULDERS_ARMS];
    case 5: return [CHEST, BACK, LEGS, SHOULDERS, ARMS];
    case 6: return [PUSH, PULL, LEGS, PUSH_B, PULL_B, LEGS_B];
    default: return [PUSH, PULL, LEGS, PUSH_B, PULL_B, LEGS_B, RECOVERY];
  }
}

export const SPLIT_NAME = (days: number) =>
  days <= 2 ? 'Full body' : days === 3 ? 'Push · pull · benen' : days === 4 ? 'Spiergroepen (4 dagen)' : days === 5 ? 'Eén spiergroep per dag' : 'Push · pull · benen 2×';

export const EXPERIENCE: Record<Experience, { t: string; s: string; maxDiff: 1 | 2 | 3; maxEx: number; extraSet: boolean }> = {
  nieuw: { t: 'Nog nooit getraind', s: 'Ik wil het rustig leren', maxDiff: 1, maxEx: 4, extraSet: false },
  beginner: { t: 'Minder dan 1 jaar', s: 'Ik ken de basis', maxDiff: 2, maxEx: 5, extraSet: false },
  gemiddeld: { t: '1 tot 3 jaar', s: 'Ik train regelmatig', maxDiff: 3, maxEx: 6, extraSet: false },
  ervaren: { t: 'Meer dan 3 jaar', s: 'Zware compound lifts zijn geen probleem', maxDiff: 3, maxEx: 7, extraSet: true },
};

function scheme(e: Exercise, focus: Focus, exp: Experience): { sets: number; reps: string; restSec: number } {
  const x = EXPERIENCE[exp];
  if (e.timed) return { sets: 3, reps: exp === 'nieuw' ? '20 sec' : exp === 'beginner' ? '30 sec' : '45 sec', restSec: 45 };
  let s: { sets: number; reps: string; restSec: number };
  switch (focus) {
    case 'kracht':
      s = e.compound ? { sets: 4, reps: '5', restSec: 150 } : { sets: 3, reps: '8–10', restSec: 90 };
      if (!e.weighted) s = { sets: 3, reps: '8–12 langzaam', restSec: 90 };
      break;
    case 'spiermassa':
      s = e.compound ? { sets: 3, reps: '8–10', restSec: 120 } : { sets: 3, reps: '10–12', restSec: 75 };
      break;
    case 'afvallen':
      s = e.compound ? { sets: 3, reps: '12–15', restSec: 60 } : { sets: 3, reps: '15', restSec: 45 };
      break;
    default:
      s = e.compound ? { sets: 3, reps: '10–12', restSec: 75 } : { sets: 3, reps: '12–15', restSec: 60 };
  }
  if (x.extraSet && e.compound) s = { ...s, sets: s.sets + 1 };
  if (exp === 'nieuw') s = { ...s, sets: 2, reps: e.weighted ? '10–12' : s.reps, restSec: Math.max(s.restSec, 75) };
  return s;
}

type PlanInput = Pick<Profile, 'trainDays' | 'focus' | 'experience' | 'place' | 'equipment' | 'excluded' | 'swaps' | 'dayPlan' | 'customWorkouts'>;

/** Je weekschema: de standaardindeling, met per dag eventueel een zelf gekozen workout. */
export function buildPlan(p: PlanInput): WorkoutDay[] {
  const days = [...p.trainDays].sort((a, b) => a - b);
  const split = splitFor(days.length);
  const plan = days.map((d, i) => {
    const own = p.dayPlan?.[d];
    return (own && buildWorkout(own, p, d)) || buildDay(split[i], d, p);
  });
  // een workout op een extra dag (buiten je vaste trainingsdagen) komt erbij, de rest van je schema blijft gelijk
  for (const [k, id] of Object.entries(p.dayPlan ?? {})) {
    const d = Number(k);
    if (days.includes(d)) continue;
    const w = buildWorkout(id, p, d);
    if (w) plan.push(w);
  }
  return plan.sort((a, b) => a.weekday - b.weekday);
}

/** Een workout uit de bibliotheek of een eigen combinatie, klaar voor jouw apparatuur en niveau. */
export function buildWorkout(id: string, p: PlanInput, weekday = -1): WorkoutDay | null {
  const lib = LIBRARY_BY_ID[id];
  if (lib) {
    const day = lib.interval || lib.timeline ? buildTimer(lib, weekday, p) : buildDay({ ...lib, cardio: lib.cardio ?? null }, weekday, p);
    return { ...day, source: 'lib', desc: lib.desc, cover: lib.cover };
  }
  const mix = p.customWorkouts?.find((c) => c.id === id);
  return mix ? buildDay(mixTemplate(mix), weekday, p) : null;
}

export function mixTemplate(cw: CustomWorkout): Template {
  const fin = cw.finisher ? LIBRARY_BY_ID[cw.finisher] : undefined;
  return {
    id: cw.id,
    name: cw.name,
    subtitle: 'Eigen combinatie',
    emoji: GROUPS[cw.groups[0]]?.em ?? '✨',
    slots: mixSlots(cw.groups, cw.size),
    cardio: fin ? { label: `Afsluiter: ${fin.name}`, minutes: libMinutes(fin) } : null,
  };
}

const canUse = (p: PlanInput) => (id: string) => {
  const e = EXERCISES[id];
  return !!e && canDo(e, p.equipment) && !p.excluded.includes(id);
};

function buildDay(t: Template, weekday: number, p: PlanInput): WorkoutDay {
  const x = EXPERIENCE[p.experience];
  const ok = canUse(p);
  const used = new Set<string>();
  const chosen = new Map<number, { id: string; usable: string[] }>();
  const pick = (allowHarder: boolean) => {
    t.slots.forEach((spec, i) => {
      if (chosen.has(i) || chosen.size >= x.maxEx) return;
      const slotKey = `${t.id}:${i}`;
      const usable = slotCands(spec).filter((id) => ok(id) && !used.has(id));
      const swap = p.swaps[slotKey];
      const fitting = usable.filter((id) => EXERCISES[id].diff <= x.maxDiff);
      const easiest = [...usable].sort((a, b) => EXERCISES[a].diff - EXERCISES[b].diff)[0];
      const choice = swap && usable.includes(swap) ? swap : fitting[0] ?? (allowHarder ? easiest : undefined);
      if (!choice) return;
      used.add(choice);
      chosen.set(i, { id: choice, usable });
    });
  };
  pick(false);
  // te weinig oefeningen die bij je niveau passen? Vul aan met de makkelijkste die overblijven.
  if (chosen.size < Math.min(4, x.maxEx, t.slots.length)) pick(true);
  const picked: PlannedExercise[] = [...chosen.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([i, { id, usable }]) => {
      const exercise = EXERCISES[id];
      const spec = t.slots[i];
      let s = scheme(exercise, p.focus, p.experience);
      // vaste sets/herhalingen uit de workout (bijv. 5×5), voor starters wat minder sets
      if (!Array.isArray(spec)) {
        s = { sets: spec.sets ?? s.sets, reps: spec.reps ?? s.reps, restSec: spec.rest ?? s.restSec };
        if (p.experience === 'nieuw') s.sets = Math.min(s.sets, 3);
      }
      return { exercise, ...s, slotKey: `${t.id}:${i}`, alternatives: usable.filter((u) => u !== id).map((u) => EXERCISES[u]) };
    });
  // alternatieven mogen niet al elders op deze dag staan
  for (const pe of picked) pe.alternatives = pe.alternatives.filter((a) => !used.has(a.id));

  const cardio =
    t.cardio !== undefined
      ? t.cardio ?? undefined
      : t.id === 'herstel'
        ? { label: 'Rustige wandeling of fietstocht', minutes: 30 }
        : p.focus === 'afvallen'
          ? { label: p.place === 'gym' ? 'Intervallen op fiets of loopband' : 'Intervallen: 30 sec hard, 30 sec rustig', minutes: 15 }
          : p.focus === 'fit'
            ? { label: 'Cardio naar keuze', minutes: 10 }
            : undefined;
  const work = picked.reduce((sum, e) => sum + e.sets * (45 + e.restSec), 0) / 60;
  const estMinutes = Math.round((5 + work + (cardio?.minutes ?? 0)) / 5) * 5;
  return { id: t.id, name: t.name, subtitle: t.subtitle, emoji: t.emoji, weekday, exercises: picked, cardio, estMinutes, source: LIBRARY_BY_ID[t.id] ? 'lib' : t.id.startsWith('mix-') ? 'mix' : 'schema' };
}

/** Werk, rust en rondes van een intervalworkout, aangepast aan je ervaring. */
export function intervalFor(lib: LibWorkout, exp: Experience) {
  const iv = lib.interval!;
  let { work, rest, rounds } = iv;
  let roundRest = iv.roundRest ?? 0;
  if (!iv.fixed) {
    if (exp === 'nieuw') {
      rounds = Math.max(1, rounds - 1);
      work = Math.max(20, Math.round((work * 0.75) / 5) * 5);
      rest += 10;
      roundRest = roundRest ? roundRest + 15 : 0;
    } else if (exp === 'beginner') rest += 5;
    else if (exp === 'ervaren' && rounds > 1) rounds += 1;
  }
  return { work, rest, rounds, roundRest };
}

const fmtSec = (s: number) => (s >= 60 && s % 60 === 0 ? `${s / 60} min` : s > 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} min` : `${s} sec`);

function buildTimer(lib: LibWorkout, weekday: number, p: PlanInput): WorkoutDay {
  const x = EXPERIENCE[p.experience];
  const ok = canUse(p);
  // per plek een oefening; dezelfde oefening mag vaker terugkomen
  const slots = lib.slots.map((spec, i) => {
    const cands = slotCands(spec);
    const usable = cands.filter(ok);
    const swap = p.swaps[`${lib.id}:${i}`];
    const fitting = usable.filter((id) => EXERCISES[id].diff <= x.maxDiff);
    const easiest = [...usable].sort((a, b) => EXERCISES[a].diff - EXERCISES[b].diff)[0];
    // niets bruikbaars (bijv. geen hometrainer)? Dan toch de eerste: buiten fietsen of lopen kan ook
    const id = swap && usable.includes(swap) ? swap : fitting[0] ?? easiest ?? cands[0];
    return { id, usable, secs: 0 };
  });
  const segs: Segment[] = [];
  if (lib.timeline) {
    lib.timeline.forEach(([slot, sec, note, kind]) => {
      if (slot < 0) segs.push({ exercise: EXERCISES[slots[0].id], sec, kind: 'rest', note: note ?? 'Rust' });
      else {
        segs.push({ exercise: EXERCISES[slots[slot].id], sec, kind: kind ?? 'work', note });
        slots[slot].secs += sec;
      }
    });
  } else {
    const { work, rest, rounds, roundRest } = intervalFor(lib, p.experience);
    for (let r = 1; r <= rounds; r++) {
      slots.forEach((s, i) => {
        segs.push({ exercise: EXERCISES[s.id], sec: work, kind: 'work', round: r, rounds });
        s.secs += work;
        const last = i === slots.length - 1;
        if (!last && rest > 0) segs.push({ exercise: EXERCISES[s.id], sec: rest, kind: 'rest', note: 'Rust', round: r, rounds });
        if (last && r < rounds) segs.push({ exercise: EXERCISES[s.id], sec: roundRest || rest || 15, kind: 'rest', note: roundRest ? 'Rust tussen de rondes' : 'Rust', round: r, rounds });
      });
    }
  }
  // rust laat zien wat er hierna komt
  for (let i = segs.length - 1, next = segs[segs.length - 1]?.exercise; i >= 0; i--) {
    if (segs[i].kind === 'rest') segs[i] = { ...segs[i], exercise: next };
    else next = segs[i].exercise;
  }
  const iv = lib.interval ? intervalFor(lib, p.experience) : null;
  const seen = new Set<string>();
  const exercises: PlannedExercise[] = [];
  slots.forEach((s, i) => {
    if (seen.has(s.id)) return;
    seen.add(s.id);
    const total = slots.filter((o) => o.id === s.id).reduce((t, o) => t + o.secs, 0);
    exercises.push({
      exercise: EXERCISES[s.id],
      sets: iv ? iv.rounds : 1,
      reps: iv ? `${iv.work} sec` : fmtSec(total),
      restSec: iv ? iv.rest : 0,
      slotKey: `${lib.id}:${i}`,
      alternatives: s.usable.filter((u) => u !== s.id).map((u) => EXERCISES[u]),
    });
  });
  const totalSec = segs.reduce((t, s) => t + s.sec, 0);
  return { id: lib.id, name: lib.name, subtitle: lib.subtitle, emoji: lib.emoji, weekday, exercises, estMinutes: Math.max(1, Math.round(totalSec / 60)), timer: segs, met: lib.met ?? 7, source: 'lib', desc: lib.desc, cover: lib.cover };
}

/** Duur in minuten van een workout op tijd zoals hij in de bibliotheek staat (gemiddeld niveau). */
export function libMinutes(lib: LibWorkout) {
  if (lib.timeline) return Math.round(lib.timeline.reduce((t, s) => t + s[1], 0) / 60);
  if (lib.interval) {
    const { work, rest, rounds, roundRest = 0 } = lib.interval;
    const n = lib.slots.length;
    return Math.round((rounds * (n * work + (n - 1) * rest) + (rounds - 1) * (roundRest || rest)) / 60);
  }
  return 0;
}

export const timerSeconds = (day: WorkoutDay) => day.timer?.reduce((t, s) => t + s.sec, 0) ?? 0;

export function workoutKcal(day: WorkoutDay, kg: number, fraction = 1) {
  if (day.timer) {
    // rust telt als licht bewegen
    const work = day.timer.reduce((t, s) => t + (s.kind === 'rest' ? 0 : s.sec), 0) / 3600;
    const rest = day.timer.reduce((t, s) => t + (s.kind === 'rest' ? s.sec : 0), 0) / 3600;
    return Math.round(((day.met ?? 7) * work + 2.5 * rest) * kg * fraction);
  }
  const cardioMin = day.cardio?.minutes ?? 0;
  const strengthMin = Math.max(0, day.estMinutes - cardioMin);
  return Math.round((5 * kg * (strengthMin / 60) + 8 * kg * (cardioMin / 60)) * fraction);
}

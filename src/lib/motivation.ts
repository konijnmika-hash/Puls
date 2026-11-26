// Motivatie: een kleine uitdaging per dag, weekdoelen, badges en mijlpalen.
// Uitgangspunt: positief blijven. Een dag overslaan kost je niets: badges en mijlpalen blijven staan
// en weekdoelen tellen dagen, geen reeksen.
import { sumNutrients } from './calc';
import { addDays, weekday } from './date';
import { foodCount, mondayOf, trainingsOn, waterTargetFor, type StatCtx } from './stats';
import { MEALS, type DayLog, type Goals } from './types';

/* ---------- Uitdaging van de dag ---------- */

export interface Challenge {
  id: string;
  title: string;
  text: string;
  em: string;
  /** Puls meet het zelf (true) of je vinkt hem af (false) */
  auto: boolean;
}

interface ChallengeDef extends Challenge {
  /** voor gemeten uitdagingen: is hij gehaald? */
  check?: (d: DayLog | undefined, c: StatCtx, date: string) => boolean;
  /** alleen op dagen dat dit past */
  when?: (c: StatCtx, date: string, d: DayLog | undefined) => boolean;
}

const sum = (d: DayLog | undefined) => (d ? sumNutrients(MEALS.flatMap((m) => d.meals[m])) : null);
const before = (d: DayLog | undefined, hour: number) =>
  (d?.sips ?? []).filter((s) => new Date(s.t).getHours() < hour).reduce((t, s) => t + s.ml, 0);

const CHALLENGES: ChallengeDef[] = [
  { id: 'water-noon', em: '💧', title: 'Een halve liter vóór 12 uur', text: 'Drink vanochtend al 500 ml water. Dan kom je makkelijker aan je dagdoel.', auto: true, check: (d) => before(d, 12) >= 500 },
  { id: 'breakfast-protein', em: '🥚', title: 'Eiwitrijk ontbijt', text: 'Eet een ontbijt met minstens 20 g eiwit, bijvoorbeeld kwark, eieren of skyr.', auto: true, check: (d) => !!d && sumNutrients(d.meals.ontbijt).p >= 20, when: (c) => (c.t.split.ontbijt[1] ?? 0) > 0 },
  { id: 'log-all', em: '📝', title: 'Alles bijhouden', text: 'Vul vandaag al je maaltijden in, ook de tussendoortjes.', auto: true, check: (d, c) => !!d && MEALS.filter((m) => c.t.split[m][1] > 0 && m !== 'snacks').every((m) => d.meals[m].length > 0) },
  { id: 'steps', em: '👟', title: 'Haal je stappendoel', text: 'Een wandeling na het eten telt al flink mee.', auto: true, check: (d, c) => (d?.steps ?? 0) >= c.t.steps },
  { id: 'fiber', em: '🌾', title: 'Vezelrijke dag', text: 'Kies volkoren, peulvruchten en groente. Haal je vezeldoel.', auto: true, check: (d, c) => (sum(d)?.fib ?? 0) >= c.t.fib * 0.95 },
  { id: 'water-goal', em: '🥤', title: 'Waterdoel halen', text: 'Zet een fles water binnen handbereik en drink regelmatig een paar slokken.', auto: true, check: (d, c, date) => (d?.waterMl ?? 0) >= waterTargetFor(c.profile, c.t, date) },
  { id: 'protein', em: '💪', title: 'Eiwitdoel halen', text: 'Verdeel je eiwit over de dag: bij elke maaltijd een portie.', auto: true, check: (d, c) => (sum(d)?.p ?? 0) >= c.t.p * 0.95 },
  { id: 'recipe', em: '👩‍🍳', title: 'Kook een recept van Puls', text: 'Kies een recept dat bij je dag past en log het in één tik.', auto: true, check: (d) => !!d && MEALS.some((m) => d.meals[m].some((e) => e.food.cat === 'recept')) },
  { id: 'fruit', em: '🍎', title: 'Twee stuks fruit', text: 'Een appel bij de lunch en een mandarijn als tussendoortje: zo heb je ze al.', auto: false },
  { id: 'veg', em: '🥦', title: 'Halve bord groente', text: 'Vul bij het avondeten de helft van je bord met groente.', auto: false },
  { id: 'stretch', em: '🧘', title: '10 minuten bewegen of stretchen', text: 'Rustig rekken, yoga of een korte wandeling. Je lichaam zal je dankbaar zijn.', auto: false },
  { id: 'stairs', em: '🪜', title: 'Neem de trap', text: 'Kies vandaag overal de trap in plaats van de lift of roltrap.', auto: false },
  { id: 'mindful', em: '🍽️', title: 'Eén maaltijd zonder scherm', text: 'Eet rustig en proef wat je eet. Je merkt sneller dat je vol zit.', auto: false },
  { id: 'sleep', em: '🌙', title: 'Op tijd naar bed', text: 'Ga een halfuur eerder slapen dan normaal. Goed slapen helpt tegen trek.', auto: false },
  { id: 'train', em: '🏋️', title: 'Je training afvinken', text: 'Vandaag staat er een training op je schema. Ook een korte versie telt.', auto: true, check: (d) => trainingsOn(d) > 0, when: (c, date) => c.profile.trainDays.includes(weekday(date)) },
];

const hash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

/** De uitdaging voor een dag: elke dag een andere, en altijd een die bij die dag past. */
export function challengeFor(date: string, c: StatCtx, d?: DayLog): ChallengeDef {
  const fitting = CHALLENGES.filter((x) => !x.when || x.when(c, date, d));
  return fitting[hash(date) % fitting.length];
}

export function challengeStatus(date: string, c: StatCtx, d: DayLog | undefined, manual: boolean) {
  const ch = challengeFor(date, c, d);
  const measured = ch.check ? ch.check(d, c, date) : false;
  return { challenge: ch as Challenge, done: measured || manual, measured };
}

/* ---------- Weekdoelen ---------- */

export interface WeekGoal {
  id: keyof Omit<Goals, 'habits'>;
  label: string;
  em: string;
  value: number;
  target: number;
  unit: string;
}

export function weekGoals(goals: Goals, days: Record<string, DayLog>, c: StatCtx, today: string): WeekGoal[] {
  const mon = mondayOf(today);
  const keys = Array.from({ length: 7 }, (_, i) => addDays(mon, i)).filter((k) => k <= today);
  const ds = keys.map((k) => [k, days[k]] as const);
  return [
    { id: 'logDays', em: '📝', label: 'Dagen eten bijgehouden', value: ds.filter(([, d]) => foodCount(d) > 0).length, target: goals.logDays, unit: 'dagen' },
    { id: 'waterDays', em: '💧', label: 'Dagen waterdoel gehaald', value: ds.filter(([k, d]) => (d?.waterMl ?? 0) >= waterTargetFor(c.profile, c.t, k)).length, target: goals.waterDays, unit: 'dagen' },
    { id: 'stepDays', em: '👟', label: 'Dagen stappendoel gehaald', value: ds.filter(([, d]) => (d?.steps ?? 0) >= c.t.steps).length, target: goals.stepDays, unit: 'dagen' },
    { id: 'activeMin', em: '⏱️', label: 'Actieve minuten', value: ds.reduce((s, [, d]) => s + (d?.activities.reduce((t, a) => t + a.minutes, 0) ?? 0), 0), target: goals.activeMin, unit: 'min' },
    { id: 'trainings', em: '🏋️', label: 'Trainingen', value: ds.reduce((s, [, d]) => s + trainingsOn(d), 0), target: goals.trainings, unit: '×' },
  ];
}

/* ---------- Badges ---------- */

export interface Badge {
  id: string;
  name: string;
  em: string;
  text: string;
  /** behaalde treden (0 = nog niet) */
  level: number;
  tiers: number[];
  value: number;
  /** volgende drempel, of null als alles gehaald is */
  next: number | null;
}

export interface BadgeInput {
  days: Record<string, DayLog>;
  cooked: Record<string, number>;
  habitLog: Record<string, string[]>;
  challengeDays: number;
  workouts: number;
  c: StatCtx;
  today: string;
}

const badge = (id: string, name: string, em: string, text: string, tiers: number[], value: number): Badge => {
  const level = tiers.filter((t) => value >= t).length;
  return { id, name, em, text, tiers, value, level, next: tiers[level] ?? null };
};

export function badges(b: BadgeInput): Badge[] {
  const entries = Object.entries(b.days).filter(([k]) => k <= b.today);
  const logged = entries.filter(([, d]) => foodCount(d) > 0).length;
  const water = entries.filter(([k, d]) => d.waterMl >= waterTargetFor(b.c.profile, b.c.t, k)).length;
  const protein = entries.filter(([, d]) => foodCount(d) > 0 && (sum(d)?.p ?? 0) >= b.c.t.p * 0.95).length;
  const steps = entries.reduce((s, [, d]) => s + d.steps, 0);
  const trainings = Math.max(b.workouts, entries.reduce((s, [, d]) => s + trainingsOn(d), 0));
  const cooked = Object.values(b.cooked).reduce((s, n) => s + n, 0);
  const habits = Object.values(b.habitLog).reduce((s, l) => s + l.length, 0);
  return [
    badge('logger', 'Bijhouder', '📝', 'Dagen waarop je je eten bijhield', [3, 7, 30, 100], logged),
    badge('water', 'Waterheld', '💧', 'Dagen waterdoel gehaald', [3, 14, 50, 150], water),
    badge('protein', 'Eiwitpro', '🥚', 'Dagen eiwitdoel gehaald', [3, 14, 50], protein),
    badge('steps', 'Wandelaar', '👟', 'Stappen in totaal', [50_000, 250_000, 1_000_000, 3_000_000], steps),
    badge('training', 'Doorzetter', '🏋️', 'Trainingen gedaan', [1, 10, 50, 100], trainings),
    badge('chef', 'Thuiskok', '👩‍🍳', 'Recepten gekookt en gelogd', [1, 10, 25, 50], cooked),
    badge('habits', 'Gewoontebouwer', '🌱', 'Gewoontes afgevinkt', [10, 50, 200, 500], habits),
    badge('challenge', 'Uitdager', '🎯', 'Uitdagingen van de dag gehaald', [1, 10, 30, 100], b.challengeDays),
  ];
}

/* ---------- Mijlpalen ---------- */

export interface Milestone {
  id: string;
  title: string;
  em: string;
  date: string;
}

/** Persoonlijke mijlpalen met de datum waarop je ze haalde. Bewust niets over gewicht: het gaat om gewoontes. */
export function milestones(days: Record<string, DayLog>, c: StatCtx, today: string): Milestone[] {
  const keys = Object.keys(days).filter((k) => k <= today).sort();
  const out: Milestone[] = [];
  let logged = 0;
  let trainings = 0;
  let steps = 0;
  const hit = new Set<string>();
  const add = (id: string, title: string, em: string, date: string) => {
    if (hit.has(id)) return;
    hit.add(id);
    out.push({ id, title, em, date });
  };
  for (const k of keys) {
    const d = days[k];
    if (foodCount(d) > 0) {
      logged++;
      if (logged === 1) add('first-log', 'Eerste dag bijgehouden', '🌱', k);
      if (logged === 7) add('log-7', '7 dagen bijgehouden', '📅', k);
      if (logged === 30) add('log-30', '30 dagen bijgehouden', '🗓️', k);
      if (logged === 100) add('log-100', '100 dagen bijgehouden', '🏆', k);
    }
    if (d.waterMl >= waterTargetFor(c.profile, c.t, k)) add('first-water', 'Eerste keer waterdoel gehaald', '💧', k);
    if (d.steps >= 10_000) add('steps-10k', 'Eerste dag met 10.000 stappen', '👟', k);
    steps += d.steps;
    if (steps >= 100_000) add('steps-100k', '100.000 stappen gezet', '🚶', k);
    const t = trainingsOn(d);
    if (t) {
      trainings += t;
      add('first-train', 'Eerste training', '💪', k);
      if (trainings >= 10) add('train-10', '10 trainingen gedaan', '🔥', k);
      if (trainings >= 50) add('train-50', '50 trainingen gedaan', '🏅', k);
    }
    if (d.activities.some((a) => a.minutes >= 60)) add('hour', 'Een uur achter elkaar actief', '⏱️', k);
  }
  return out.reverse();
}

/* ---------- Positieve feedback ---------- */

/** Een vriendelijk zinnetje over je week. Nooit verwijtend: een dag overslaan is geen probleem. */
export function weekFeedback(goals: WeekGoal[], activeThisWeek: number, activeLastWeek: number, loggedToday: boolean, hour: number) {
  const met = goals.filter((g) => g.value >= g.target).length;
  if (met === goals.length) return { title: 'Alle weekdoelen gehaald', text: 'Wat een week. Geniet ervan, je hebt het verdiend.' };
  if (met >= 3) return { title: `${met} van de ${goals.length} weekdoelen al binnen`, text: 'Je zit lekker in je ritme. Ga zo door.' };
  if (activeThisWeek > activeLastWeek && activeLastWeek > 0) return { title: 'Actiever dan vorige week', text: `Al ${activeThisWeek} actieve dagen deze week. Elke dag telt.` };
  if (!loggedToday && hour >= 12) return { title: 'Even een rustige dag?', text: 'Geen probleem. Een dag overslaan maakt niets uit; je kunt altijd gewoon weer verder.' };
  if (activeThisWeek > 0) return { title: `${activeThisWeek} ${activeThisWeek === 1 ? 'actieve dag' : 'actieve dagen'} deze week`, text: 'Kleine stappen maken het verschil. Je bent goed bezig.' };
  return { title: 'Een nieuwe week, een nieuwe start', text: 'Begin klein: een glas water en je ontbijt invullen is al een mooie eerste stap.' };
}

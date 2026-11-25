// Gezondheidschecks: waarschuwt als je plan of je gedrag niet gezond is,
// zoals elke dag trainen zonder rust of dagenlang veel te weinig eten.
import { bmi, bodyFat, kcalFloor, leanBodyFat, MAX_LOSS_PCT_PER_WEEK, PACE } from './calc';
import { addDays, fmt } from './date';
import { dayTotals } from './hooks';
import type { DayLog, Profile, Targets, WeightEntry } from './types';

export interface HealthNote {
  id: string;
  /** 'stop' = echt ongezond, 'let-op' = goed om op te letten */
  level: 'stop' | 'let-op';
  title: string;
  text: string;
}

/** Langste reeks trainingsdagen achter elkaar, ook over het weekend heen (zo → ma). */
export function longestRun(days: number[]) {
  if (days.length >= 7) return 7;
  let best = 0;
  for (let start = 0; start < 7; start++) {
    let n = 0;
    while (n < 7 && days.includes((start + n) % 7)) n++;
    best = Math.max(best, n);
  }
  return best;
}

/** Checks op het trainingsschema zelf. */
export function trainingPlanNotes(trainDays: number[], experience?: Profile['experience']): HealthNote[] {
  const n = trainDays.length;
  const run = longestRun(trainDays);
  if (n >= 7) {
    return [{ id: 'plan-7', level: 'stop', title: 'Elke dag trainen is niet gezond', text: 'Je spieren groeien juist als je rust. Zonder rustdagen raak je eerder geblesseerd, slaap je slechter en word je minder sterk. Kies minstens 1, liefst 2 rustdagen per week.' }];
  }
  if (n === 6) {
    return [{ id: 'plan-6', level: 'let-op', title: '6 dagen per week is veel', text: 'Dat kan alleen als je al lang traint, goed slaapt en genoeg eet. Houd je ene rustdag echt rustig en voel je je moe of stijf, schrap dan een training.' }];
  }
  if (run >= 5 || (run >= 4 && (experience === 'nieuw' || experience === 'beginner'))) {
    return [{ id: 'plan-run', level: 'let-op', title: `${run} dagen achter elkaar trainen`, text: 'Zet liever een rustdag tussen je trainingen. Je spieren hebben ongeveer 48 uur nodig om te herstellen.' }];
  }
  return [];
}

/** Checks op je doelen: tempo, streefgewicht, eigen calorieën. */
export function planNotes(p: Profile, t: Targets): HealthNote[] {
  const out: HealthNote[] = [...trainingPlanNotes(p.trainDays, p.experience)];
  const goalBmi = bmi(p.goalWeightKg, p.heightCm);
  const nowBmi = bmi(p.weightKg, p.heightCm);
  const losing = p.goal === 'afvallen' || p.goal === 'recomp';

  if (losing && nowBmi < 18.5) {
    out.push({ id: 'underweight', level: 'stop', title: 'Afvallen is voor jou niet gezond', text: `Je BMI is ${fmt(nowBmi, 1)}, dat is al ondergewicht. Kies liever "Gewicht behouden" of "Aankomen" en praat erover met je huisarts.` });
  } else if (losing && goalBmi < 18.5) {
    const healthy = Math.ceil(18.5 * (p.heightCm / 100) ** 2);
    out.push({ id: 'goal-low', level: 'stop', title: 'Je streefgewicht is te laag', text: `Met ${fmt(p.goalWeightKg, 1)} kg zit je onder een gezond gewicht (BMI ${fmt(goalBmi, 1)}). Voor jouw lengte begint gezond bij ongeveer ${healthy} kg.` });
  }

  if (p.age < 18 && losing) {
    out.push({ id: 'young', level: 'let-op', title: 'Je groeit nog', text: 'Onder de 18 heeft je lichaam extra energie nodig. Daarom houden we je tekort klein. Overleg bij twijfel met je huisarts of een diëtist.' });
  }

  if (p.goal === 'afvallen' && !p.custom?.kcal) {
    const wanted = PACE[p.pace].kgPerWeek;
    const got = -t.kgPerWeek;
    if (got < wanted - 0.05) {
      const why = p.weightKg * MAX_LOSS_PCT_PER_WEEK < wanted
        ? `meer dan 1% van je gewicht per week kost vooral spieren`
        : bodyFat(p) < leanBodyFat(p.sex)
          ? 'je bent al vrij slank, dan verlies je bij een groot tekort vooral spieren'
          : t.kcal <= t.minKcal
            ? `we gaan niet onder ${fmt(t.minKcal)} kcal, dat heeft je lichaam minstens nodig`
            : 'een groter tekort houd je niet vol en kost spieren';
      out.push({ id: 'pace-capped', level: 'let-op', title: `We rekenen met ${fmt(Math.max(0, got), 2)} kg per week`, text: `Je koos ${fmt(wanted, 2)} kg per week, maar ${why}. Zo val je af zonder dat je energie en spieren inleveren.` });
    }
  }

  if (p.custom?.kcal) {
    const floor = Math.max(kcalFloor(p.sex), t.minKcal);
    if (p.custom.kcal < floor) {
      out.push({ id: 'custom-low', level: 'stop', title: 'Je eigen caloriedoel is te laag', text: `${fmt(p.custom.kcal)} kcal is minder dan je lichaam minstens nodig heeft (± ${fmt(floor)} kcal). Zo lang volhouden kost spieren, energie en kan je gezondheid schaden.` });
    } else if (p.custom.kcal > t.tdee * 1.25 && p.goal !== 'aankomen') {
      out.push({ id: 'custom-high', level: 'let-op', title: 'Je eigen caloriedoel is hoog', text: `Je verbruikt ongeveer ${fmt(t.tdee)} kcal per dag. Met ${fmt(p.custom.kcal)} kcal kom je flink aan.` });
    }
  }
  return out;
}

const LIGHT = ['Wandelen', 'Yoga'];
const trained = (d?: DayLog) => !!d && (d.workoutsDone.length > 0 || d.activities.some((a) => !LIGHT.includes(a.name) && a.minutes >= 20));

/** Hoeveel dagen achter elkaar je hebt getraind, tot en met vandaag (of gisteren als je vandaag nog niet trainde). */
export function trainStreak(days: Record<string, DayLog>, today: string) {
  let k = trained(days[today]) ? today : addDays(today, -1);
  let n = 0;
  while (trained(days[k]) && n < 60) {
    n++;
    k = addDays(k, -1);
  }
  return { days: n, includesToday: trained(days[today]) };
}

/** Een dag telt als "echt ingevuld" bij minstens 3 dingen in minstens 2 maaltijden. */
const fullyLogged = (d?: DayLog) => {
  if (!d) return false;
  const meals = Object.values(d.meals).filter((m) => m.length > 0).length;
  return meals >= 2 && dayTotals(d).count >= 3;
};

/** Checks op wat je de afgelopen dagen echt deed. */
export function behaviorNotes(c: { profile: Profile; t: Targets; days: Record<string, DayLog>; today: string; hour: number; weights: WeightEntry[] }): HealthNote[] {
  const out: HealthNote[] = [];
  const { days, today, t } = c;

  // Te veel dagen achter elkaar trainen
  const run = trainStreak(days, today);
  if (run.days >= 7) {
    out.push({ id: 'rest-now', level: 'stop', title: `Al ${run.days} dagen achter elkaar getraind`, text: 'Dat is te veel. Je lichaam heeft rust nodig om sterker te worden en blessures te voorkomen. Neem vandaag en morgen echt rust: wandelen of rustig stretchen mag.' });
  } else if (run.days >= 5) {
    out.push({ id: 'rest-soon', level: 'let-op', title: `${run.days} dagen op rij getraind`, text: run.includesToday ? 'Goed bezig, maar plan morgen een rustdag. Spieren groeien in je rust, niet tijdens de training.' : 'Neem vandaag een rustdag. Spieren groeien in je rust, niet tijdens de training.' });
  }

  // Dagenlang veel te weinig eten (alleen dagen die je goed hebt ingevuld)
  const low = Math.round(Math.max(kcalFloor(c.profile.sex), t.minKcal) * 0.85);
  const past = [1, 2, 3, 4].map((i) => days[addDays(today, -i)]).filter(fullyLogged) as DayLog[];
  const lowDays = past.filter((d) => dayTotals(d).eaten.kcal < low);
  if (lowDays.length >= 3) {
    const avg = lowDays.reduce((s, d) => s + dayTotals(d).eaten.kcal, 0) / lowDays.length;
    out.push({ id: 'eat-more', level: 'stop', title: 'Je eet al dagen veel te weinig', text: `Gemiddeld ${fmt(avg)} kcal, terwijl je lichaam minstens ${fmt(t.minKcal)} kcal nodig heeft. Zo verlies je spieren, word je moe en vertraagt je verbranding. Eet vandaag minstens ${fmt(t.kcal)} kcal. Lukt eten niet goed? Praat erover met je huisarts.` });
  } else if (lowDays.length === 2) {
    out.push({ id: 'eat-more-soft', level: 'let-op', title: 'Twee dagen erg weinig gegeten', text: `Onder de ${fmt(low)} kcal per dag is te weinig voor jou. Minder eten maakt afvallen niet sneller, wel zwaarder.` });
  }

  // Vandaag 's avonds nog heel weinig binnen
  const todayDay = days[today];
  if (c.hour >= 20 && todayDay && dayTotals(todayDay).count >= 2) {
    const eaten = dayTotals(todayDay).eaten.kcal;
    if (eaten < t.kcal * 0.6) {
      out.push({ id: 'eat-today', level: 'let-op', title: 'Nog maar weinig gegeten vandaag', text: `${fmt(eaten)} van ${fmt(t.kcal)} kcal. Een flinke snack met eiwit, zoals kwark met fruit en noten, helpt je herstel en voorkomt een hongeraanval morgen.` });
    }
  }

  // Gewicht daalt te snel
  const ws = c.weights;
  const last = ws[ws.length - 1];
  const ref = last && [...ws].reverse().find((w) => w.date <= addDays(last.date, -14) && w.date >= addDays(last.date, -42));
  if (last && ref && last.date >= addDays(today, -10)) {
    const weeks = (new Date(last.date).getTime() - new Date(ref.date).getTime()) / (7 * 864e5);
    const perWeek = (ref.kg - last.kg) / weeks;
    if (perWeek > ref.kg * 0.012) {
      out.push({ id: 'fast-loss', level: 'let-op', title: 'Je valt erg snel af', text: `Ongeveer ${fmt(perWeek, 1)} kg per week. Meer dan 1% van je gewicht per week kost vaak spieren. Eet wat meer, vooral eiwit, en houd je rustdagen aan.` });
    }
  }
  return out;
}

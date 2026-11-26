// De workout-bibliotheek: tientallen kant-en-klare workouts, van rugdag tot tabata.
// Krachtworkouts ('sets') werken met sets, herhalingen en rust; workouts op tijd ('timer')
// lopen vanzelf met een intervaltimer. Puls kiest per plek de oefening die past bij jouw
// apparatuur en ervaring.
import { C, type SlotSpec } from '../lib/slots';

export type WorkoutCat = 'spiergroep' | 'combi' | 'split' | 'kracht' | 'hiit' | 'cardio' | 'conditie' | 'core' | 'uitdaging' | 'thuis' | 'mobiliteit';

export const CAT_META: Record<WorkoutCat, { t: string; s: string; em: string; from: string; to: string }> = {
  spiergroep: { t: 'Per spiergroep', s: 'Eén spiergroep, helemaal leeg', em: '🎯', from: '#123326', to: '#2f7a52' },
  combi: { t: 'Gecombineerde dagen', s: 'Twee spiergroepen in één training', em: '🔗', from: '#0f2c40', to: '#2a7196' },
  split: { t: 'Schemadagen', s: 'Push, pull, benen, boven, onder, full body', em: '📅', from: '#241d48', to: '#5c4ba6' },
  kracht: { t: 'Kracht', s: 'Zwaar, weinig herhalingen, lange rust', em: '🏋️', from: '#2a1a12', to: '#8a4420' },
  hiit: { t: 'HIIT & vetverbranding', s: 'Kort, hard en op tijd', em: '🔥', from: '#4f140d', to: '#e0542a' },
  cardio: { t: 'Cardio', s: 'Fiets, loopband, roeien en wandelen', em: '🚴', from: '#0c2a47', to: '#2f86cc' },
  conditie: { t: 'Conditie', s: 'Circuits, bootcamp en boksen', em: '🫀', from: '#43280a', to: '#cf8f1c' },
  core: { t: 'Core & buikspieren', s: 'Sterke buik en onderrug', em: '🧱', from: '#3a1036', to: '#ad3d91' },
  uitdaging: { t: 'Push-ups & uitdagingen', s: 'Push-ups, planks, burpees', em: '🏆', from: '#3a0c18', to: '#c0263f' },
  thuis: { t: 'Thuis, zonder apparatuur', s: 'Alleen je eigen lichaam', em: '🏠', from: '#1c3a26', to: '#6f9e35' },
  mobiliteit: { t: 'Mobiliteit & herstel', s: 'Stretchen, soepel en ontspannen', em: '🧘', from: '#163838', to: '#4fa69b' },
};
export const CATS = Object.keys(CAT_META) as WorkoutCat[];

/** Eén stuk van een vaste tijdlijn: [plek, seconden, uitleg, soort]. Plek -1 = rust. */
export type TimelineStep = [slot: number, sec: number, note?: string, kind?: 'work' | 'easy' | 'rest'];

export interface LibWorkout {
  id: string;
  name: string;
  /** kort, bijv. "Rugdag" */
  subtitle: string;
  emoji: string;
  cat: WorkoutCat;
  desc: string;
  /** 1 = voor iedereen, 3 = pittig */
  level: 1 | 2 | 3;
  slots: SlotSpec[];
  /** op tijd: elke ronde alle oefeningen, met werk en rust in seconden */
  interval?: { work: number; rest: number; rounds: number; roundRest?: number; fixed?: boolean };
  /** op tijd met een vaste volgorde (cardio, piramides, uitdagingen) */
  timeline?: TimelineStep[];
  /** zwaarte voor de kcal-schatting van workouts op tijd */
  met?: number;
  /** extra blok aan het eind van een krachtworkout */
  cardio?: { label: string; minutes: number };
  /** oefening op het plaatje */
  cover: string;
}

const W = (o: LibWorkout) => o;
const x = (c: string[], sets: number, reps: string, rest: number): SlotSpec => ({ c, sets, reps, rest });

/** Tabata-blokken: per oefening 8× 20 sec werk en 10 sec rust, een minuut rust tussen de blokken. */
const tabata = (n: number): TimelineStep[] =>
  Array.from({ length: n }, (_, b) => [
    ...Array.from({ length: 8 }, (_, r): TimelineStep[] => [[b, 20, `Ronde ${r + 1} van 8`], ...(r < 7 ? [[-1, 10] as TimelineStep] : [])]).flat(),
    ...(b < n - 1 ? [[-1, 60, 'Even op adem komen'] as TimelineStep] : []),
  ]).flat();

/** Elke minuut een vast aantal herhalingen; wat over is van de minuut is rust. */
const emom = (slot: number, reps: number[], what: string): TimelineStep[] =>
  reps.flatMap((n, i): TimelineStep[] => [[slot, 40, `Minuut ${i + 1}: ${n} ${what}`], [-1, 20, 'Rest van de minuut rust']]);

export const LIBRARY: LibWorkout[] = [
  /* ===== Per spiergroep ===== */
  W({ id: 'borstdag', name: 'Borstdag', subtitle: 'Borst', emoji: '💪', cat: 'spiergroep', level: 2, cover: 'bench',
    desc: 'Drukken onder drie hoeken (plat, schuin en van boven) voor een volle borst, afgesloten met een fly en push-ups tot je niet meer kunt.',
    slots: [C.chest, C.chest2, C.chest3, ['chestpress', 'dbbench', 'pushup', 'kneepushup'], ['dips', 'declinepushup', 'widepushup'], x(['pushup', 'kneepushup'], 2, '10–20', 60)] }),
  W({ id: 'rugdag', name: 'Rugdag', subtitle: 'Rug', emoji: '🧗', cat: 'spiergroep', level: 2, cover: 'pulldown',
    desc: 'Breedte door verticaal trekken, dikte door roeien, en je achterste schouders voor een sterke houding.',
    slots: [C.vpull, C.hpull, C.hpull2, ['pulldown', 'tablerow', 'superman'], C.rearDelt, ['superman', 'reversefly'], C.core2] }),
  W({ id: 'schouderdag', name: 'Schouderdag', subtitle: 'Schouders', emoji: '🏔️', cat: 'spiergroep', level: 2, cover: 'dbohp',
    desc: 'Alle drie de koppen van je schouder: drukken voor de voorkant, zijwaartse heffingen voor breedte en face pulls voor de achterkant.',
    slots: [C.shoulder, C.lateral, C.rearDelt, ['cablelateral', 'lateral'], ['dbohp', 'machinepress', 'pikepushup'], ['armcircles']] }),
  W({ id: 'armdag', name: 'Armdag', subtitle: 'Biceps & triceps', emoji: '💥', cat: 'spiergroep', level: 1, cover: 'curl',
    desc: 'Biceps en triceps om en om, zodat de een rust terwijl de ander werkt. Kort, intens en een flinke pump.',
    slots: [C.bicep, C.tricep2, C.bicep2, C.tricep, ['cablecurl', 'backpackcurl', 'curl'], C.tricepHome] }),
  W({ id: 'bicepsdag', name: 'Biceps', subtitle: 'Biceps & onderarmen', emoji: '💪', cat: 'spiergroep', level: 1, cover: 'hammer',
    desc: 'Vier curl-varianten die je biceps vanuit verschillende hoeken raken, plus hammer curls voor je onderarmen.',
    slots: [C.bicep, C.bicep2, ['cablecurl', 'curl', 'backpackcurl'], ['curl', 'backpackcurl'], C.core] }),
  W({ id: 'tricepsdag', name: 'Triceps', subtitle: 'Achterkant arm', emoji: '🔱', cat: 'spiergroep', level: 2, cover: 'pushdown',
    desc: 'Je triceps is tweederde van je bovenarm. Zware drukoefeningen eerst, isolatie daarna.',
    slots: [['dips', 'diamondpushup', 'chairdip'], C.tricep, ['skullcrusher', 'ohtriceps', 'chairdip'], ['ohtriceps', 'pushdown', 'chairdip'], x(['diamondpushup', 'kneepushup'], 2, '8–15', 60)] }),
  W({ id: 'beendag', name: 'Beendag', subtitle: 'Benen', emoji: '🦵', cat: 'spiergroep', level: 2, cover: 'squat',
    desc: 'Squat, hinge en eenbenig werk: de complete beendag voor kracht, vorm en balans.',
    slots: [C.squat, C.hinge, C.single, C.quads, C.hams, C.calf] }),
  W({ id: 'billendag', name: 'Billendag', subtitle: 'Billen', emoji: '🍑', cat: 'spiergroep', level: 1, cover: 'hipthrust',
    desc: 'Alles voor sterke, ronde billen: hip thrusts, bulgarian split squats, sumo squats en kickbacks.',
    slots: [C.glute, C.single, C.sumo, ['rdl', 'dbrdl', 'slrdl'], C.glute2, C.step] }),
  W({ id: 'hamstringdag', name: 'Hamstrings & billen', subtitle: 'Achterkant benen', emoji: '🔙', cat: 'spiergroep', level: 2, cover: 'rdl',
    desc: 'De achterkant van je benen, vaak vergeten maar belangrijk voor kracht, sprint en een gezonde onderrug.',
    slots: [C.hinge2, C.hams, C.glute, ['slrdl', 'dbrdl', 'glutebridge'], ['legcurl', 'glutebridge'], C.calf] }),
  W({ id: 'kuitendag', name: 'Kuiten & onderbenen', subtitle: 'Kuiten', emoji: '🦶', cat: 'spiergroep', level: 1, cover: 'calf',
    desc: 'Kuitheffen in hoge en lage herhalingen, springtouw en wall sits. Kort, maar je voelt het.',
    slots: [x(['calf'], 4, '12–15', 60), x(['jumprope', 'jumpingjack'], 3, '45 sec', 30), x(['calf'], 3, '20–25', 45), C.quads, ['skater', 'stepup']] }),

  /* ===== Gecombineerd ===== */
  W({ id: 'borst-en-triceps', name: 'Borst & triceps', subtitle: 'Combi', emoji: '💪', cat: 'combi', level: 2, cover: 'dbbench',
    desc: 'De klassieker: je triceps is al warm van het drukken, dus je maakt hem daarna helemaal af.',
    slots: [C.chest, C.chest2, C.chest3, C.tricep, C.tricep2, ['chairdip', 'kneepushup'], C.core2] }),
  W({ id: 'rug-en-biceps', name: 'Rug & biceps', subtitle: 'Combi', emoji: '🧗', cat: 'combi', level: 2, cover: 'cablerow',
    desc: 'Alles wat trekt: rug eerst, biceps erachteraan.',
    slots: [C.vpull, C.hpull, C.hpull2, C.rearDelt, C.bicep, C.bicep2, C.core] }),
  W({ id: 'borst-rug', name: 'Borst & rug', subtitle: 'Combi', emoji: '🔄', cat: 'combi', level: 2, cover: 'row',
    desc: 'Duwen en trekken om en om. Tegengestelde spieren, dus je herstelt sneller tussen de oefeningen.',
    slots: [C.chest, C.hpull, C.chest2, C.vpull, C.chest3, C.hpull2, C.core] }),
  W({ id: 'schouders-en-armen', name: 'Schouders & armen', subtitle: 'Combi', emoji: '🏋️', cat: 'combi', level: 2, cover: 'lateral',
    desc: 'Bovenlichaam afmaken: brede schouders en volle armen in één training.',
    slots: [C.shoulder, C.lateral, C.rearDelt, C.bicep, C.tricep, C.bicep2, C.tricep2] }),
  W({ id: 'borst-schouders', name: 'Borst & schouders', subtitle: 'Combi', emoji: '🛡️', cat: 'combi', level: 2, cover: 'inclinedb',
    desc: 'Alle drukoefeningen voor je bovenlichaam, met schuin drukken als brug tussen borst en schouders.',
    slots: [C.chest, C.shoulder, C.chest2, C.lateral, C.chest3, C.rearDelt, C.tricep] }),
  W({ id: 'rug-schouders', name: 'Rug & schouders', subtitle: 'Combi', emoji: '🦅', cat: 'combi', level: 2, cover: 'facepull',
    desc: 'Voor een V-vorm en een rechte houding: brede rug, brede schouders.',
    slots: [C.vpull, C.shoulder, C.hpull, C.lateral, C.rearDelt, C.hpull2, ['reversefly', 'superman']] }),
  W({ id: 'borst-biceps', name: 'Borst & biceps', subtitle: 'Combi', emoji: '🤜', cat: 'combi', level: 2, cover: 'bench',
    desc: 'De klassieke “beach day”: borst en biceps, met de nadruk op volume en een flinke pump.',
    slots: [C.chest, C.bicep, C.chest2, C.bicep2, C.chest3, ['cablecurl', 'backpackcurl']] }),
  W({ id: 'rug-triceps', name: 'Rug & triceps', subtitle: 'Combi', emoji: '🔁', cat: 'combi', level: 2, cover: 'pullup',
    desc: 'Een slimme combinatie: rug en triceps zitten elkaar niet in de weg, dus je kunt beide zwaar trainen.',
    slots: [C.vpull, C.hpull, C.tricep2, C.hpull2, C.tricep, C.rearDelt] }),
  W({ id: 'benen-schouders', name: 'Benen & schouders', subtitle: 'Combi', emoji: '⚡', cat: 'combi', level: 2, cover: 'gobletsquat',
    desc: 'Benen zwaar, schouders erbij. Handig als je met weinig dagen toch alles wilt raken.',
    slots: [C.squat, C.shoulder, C.hinge, C.lateral, C.single, C.rearDelt, C.calf] }),
  W({ id: 'benen-core', name: 'Benen & core', subtitle: 'Combi', emoji: '🦵', cat: 'combi', level: 2, cover: 'bulgarian',
    desc: 'Een sterke basis: benen en billen, afgesloten met een stevig coreblok.',
    slots: [C.squat, C.hinge, C.single, C.core, C.core3, C.core2] }),
  W({ id: 'billen-core', name: 'Billen & core', subtitle: 'Combi', emoji: '🍑', cat: 'combi', level: 1, cover: 'glutebridge',
    desc: 'Billen en buik in één training. Kan in de gym en thuis.',
    slots: [C.glute, C.single, C.glute2, C.core3, C.core4, C.core2] }),
  W({ id: 'armen-core', name: 'Armen & core', subtitle: 'Combi', emoji: '💥', cat: 'combi', level: 1, cover: 'hammer',
    desc: 'Biceps, triceps en buik in supersets. Kort en effectief.',
    slots: [C.bicep, C.tricep, C.core, C.bicep2, C.tricep2, C.core3] }),

  /* ===== Schemadagen ===== */
  W({ id: 'pushdag', name: 'Push-dag', subtitle: 'Borst, schouders & triceps', emoji: '👐', cat: 'split', level: 2, cover: 'dbohp',
    desc: 'Alles wat duwt: borst, schouders en triceps. Dag 1 van een push-pull-benen-schema.',
    slots: [C.chest, C.shoulder, C.chest2, C.lateral, C.tricep, C.tricep2, C.chest3] }),
  W({ id: 'pulldag', name: 'Pull-dag', subtitle: 'Rug, achterste schouders & biceps', emoji: '🪢', cat: 'split', level: 2, cover: 'pulldown',
    desc: 'Alles wat trekt: rug, achterkant schouders en biceps. Dag 2 van push-pull-benen.',
    slots: [C.vpull, C.hpull, C.hpull2, C.rearDelt, C.bicep, C.bicep2, C.core] }),
  W({ id: 'benendag', name: 'Benen-dag', subtitle: 'Benen, billen & kuiten', emoji: '🦵', cat: 'split', level: 2, cover: 'legpress',
    desc: 'Dag 3 van push-pull-benen: voorkant, achterkant en kuiten.',
    slots: [C.squat, C.hinge, C.single, C.hams, C.quads, C.calf, C.core2] }),
  W({ id: 'upper', name: 'Bovenlichaam', subtitle: 'Upper', emoji: '🙌', cat: 'split', level: 2, cover: 'row',
    desc: 'Borst, rug, schouders en armen in één training. Ideaal in een boven-onder-schema van 4 dagen.',
    slots: [C.chest, C.hpull, C.shoulder, C.vpull, C.lateral, C.bicep, C.tricep] }),
  W({ id: 'lower', name: 'Onderlichaam', subtitle: 'Lower', emoji: '🦿', cat: 'split', level: 2, cover: 'squat',
    desc: 'Benen, billen, kuiten en core. De andere helft van boven-onder.',
    slots: [C.squat, C.hinge, C.single, C.glute, C.calf, C.core] }),
  W({ id: 'upper-b', name: 'Bovenlichaam B', subtitle: 'Upper, nadruk op trekken', emoji: '🙆', cat: 'split', level: 2, cover: 'pullup',
    desc: 'Tweede bovenlichaamdag met eerst trekken, dan duwen. Wissel hem af met Bovenlichaam.',
    slots: [C.vpull, C.chest2, C.hpull2, C.shoulder, C.rearDelt, C.bicep2, C.tricep2] }),
  W({ id: 'lower-b', name: 'Onderlichaam B', subtitle: 'Lower, nadruk op billen', emoji: '🍑', cat: 'split', level: 2, cover: 'hipthrust',
    desc: 'Tweede beendag met deadlifts en hip thrusts voorop.',
    slots: [C.hinge2, C.squat2, C.glute, C.single, C.hams, C.core2] }),
  W({ id: 'fullbody', name: 'Full body', subtitle: 'Hele lichaam', emoji: '⚡', cat: 'split', level: 1, cover: 'gobletsquat',
    desc: 'Elke grote spiergroep in één training. Perfect als je 2 of 3 keer per week traint.',
    slots: [C.squat, C.chest, C.hpull, C.hinge, C.shoulder, C.core2, C.bicep] }),
  W({ id: 'fullbody-db', name: 'Full body met dumbbells', subtitle: 'Alleen dumbbells', emoji: '🔥', cat: 'split', level: 1, cover: 'thruster',
    desc: 'Alleen een paar dumbbells nodig. Ideaal in een drukke gym of thuis.',
    slots: [['gobletsquat', 'bwsquat'], ['dbbench', 'pushup', 'kneepushup'], ['dbrow', 'tablerow'], ['dbrdl', 'glutebridge'], ['dbohp', 'pikepushup'], ['lunge', 'bwlunge'], ['curl', 'backpackcurl']] }),
  W({ id: 'fullbody-circuit', name: 'Full body circuit', subtitle: 'Kracht + conditie', emoji: '🌀', cat: 'split', level: 2, cover: 'dbswing',
    desc: 'Kracht én conditie: korte rust, hoge herhalingen en een cardio-finisher.',
    slots: [x(C.squat2, 3, '12–15', 45), x(C.chest, 3, '12–15', 45), x(C.hpull, 3, '12–15', 45), x(['dbswing', 'glutebridge'], 3, '15', 45), x(C.cond, 3, '30 sec', 30)],
    cardio: { label: 'Finisher: 10 min intervallen', minutes: 10 } }),

  /* ===== Kracht ===== */
  W({ id: 'grote-drie', name: 'De grote drie', subtitle: 'Squat, bankdrukken, deadlift', emoji: '🏋️', cat: 'kracht', level: 3, cover: 'deadlift',
    desc: 'Pure kracht: de drie grote lifts in 5 sets van 5, met lange rust. Neem een gewicht waarmee de laatste herhaling zwaar maar netjes is.',
    slots: [x(['squat', 'legpress', 'gobletsquat', 'chairsplit'], 5, '5', 180), x(['bench', 'dbbench', 'chestpress', 'declinepushup', 'pushup'], 5, '5', 180), x(['deadlift', 'rdl', 'dbrdl', 'slrdl'], 3, '5', 180)] }),
  W({ id: 'kracht-boven', name: 'Kracht bovenlichaam', subtitle: '5×5 duwen en trekken', emoji: '🦍', cat: 'kracht', level: 3, cover: 'ohp',
    desc: 'Zwaar drukken en trekken in lage herhalingen. Bouwt echte kracht in borst, rug en schouders.',
    slots: [x(['bench', 'dbbench', 'declinepushup', 'pushup'], 5, '5', 180), x(['row', 'dbrow', 'cablerow', 'tablerow'], 5, '5', 150), x(['ohp', 'dbohp', 'pikepushup'], 4, '6', 150), x(['pullup', 'pulldown', 'diamondpushup', 'superman'], 4, '6', 150)] }),
  W({ id: 'kracht-benen', name: 'Kracht benen', subtitle: 'Zware squats en deadlifts', emoji: '🗿', cat: 'kracht', level: 3, cover: 'squat',
    desc: 'Lage herhalingen, zware gewichten en volle rust voor maximale beenkracht.',
    slots: [x(['squat', 'legpress', 'chairsplit'], 5, '5', 180), x(['rdl', 'dbrdl', 'slrdl'], 4, '6', 150), x(['bulgarian', 'lunge', 'bwlunge'], 3, '6', 120), x(['hipthrust', 'glutebridge'], 3, '8', 120)] }),

  /* ===== HIIT & vetverbranding ===== */
  W({ id: 'hiit-20', name: 'HIIT vetverbrander', subtitle: '20 minuten', emoji: '🔥', cat: 'hiit', level: 2, cover: 'burpee', met: 8.5,
    desc: '40 seconden vol gas, 20 seconden rust. Drie rondes van zes oefeningen. Je verbrandt ook na de training nog extra.',
    slots: [['burpee', 'squatjump', 'jumpingjack'], ['mountain'], ['squatjump', 'bwsquat'], ['highknees'], ['lungejump', 'bwlunge'], ['planktap', 'plank']],
    interval: { work: 40, rest: 20, rounds: 3, roundRest: 60 } }),
  W({ id: 'snel-10', name: 'Snelle verbranding', subtitle: '10 minuten', emoji: '⏱️', cat: 'hiit', level: 1, cover: 'jumpingjack', met: 8,
    desc: 'Geen tijd? Tien minuten is genoeg om je hartslag flink omhoog te krijgen. Twee rondes van vijf oefeningen.',
    slots: [['jumpingjack'], ['squatjump', 'bwsquat'], ['mountain'], ['highknees'], ['burpee', 'inchworm']],
    interval: { work: 40, rest: 20, rounds: 2 } }),
  W({ id: 'tabata', name: 'Tabata', subtitle: '4 minuten all-out', emoji: '💣', cat: 'hiit', level: 3, cover: 'squatjump', met: 10,
    desc: 'Het originele protocol: 8 keer 20 seconden alles geven met 10 seconden rust. Vier minuten, maar wat voor vier minuten.',
    slots: [['squatjump', 'bwsquat'], ['mountain']],
    interval: { work: 20, rest: 10, rounds: 4, fixed: true } }),
  W({ id: 'tabata-16', name: 'Tabata-blokken', subtitle: '4 × 4 minuten', emoji: '🧨', cat: 'hiit', level: 3, cover: 'burpee', met: 9.5,
    desc: 'Vier tabata-blokken achter elkaar: per oefening 8 × 20 seconden werk en 10 seconden rust, met een minuut rust tussen de blokken.',
    slots: [['burpee', 'squatjump', 'jumpingjack'], ['mountain', 'planktap'], ['skater', 'highknees'], ['squatjump', 'bwsquat']],
    timeline: tabata(4) }),
  W({ id: 'cardio-blast', name: 'Cardio blast', subtitle: '15 minuten', emoji: '🚀', cat: 'hiit', level: 2, cover: 'skater', met: 8.5,
    desc: 'Zes snelle cardio-oefeningen, 30 seconden werk en 15 seconden rust. Drie rondes en je bent klaar.',
    slots: [['jumpingjack'], ['skater'], ['highknees'], ['squatjump', 'bwsquat'], ['buttkick'], ['mountain']],
    interval: { work: 30, rest: 15, rounds: 3, roundRest: 45 } }),
  W({ id: 'low-impact', name: 'Low impact cardio', subtitle: 'Zonder springen', emoji: '🤫', cat: 'hiit', level: 1, cover: 'stepup', met: 5.5,
    desc: 'Hartslag omhoog zonder één sprong. Fijn voor je knieën, je buren en als je net begint.',
    slots: [['stepup'], ['bwsquat'], ['shadowbox'], ['inchworm'], ['bwlunge'], ['planktap', 'plank']],
    interval: { work: 45, rest: 15, rounds: 3, roundRest: 45 } }),
  W({ id: 'db-hiit', name: 'Dumbbell HIIT', subtitle: 'Kracht + cardio', emoji: '🏋️', cat: 'hiit', level: 2, cover: 'thruster', met: 8,
    desc: 'Met dumbbells wordt HIIT ook krachttraining: thrusters, swings en rows in een hoog tempo.',
    slots: [['thruster', 'squatjump', 'bwsquat'], ['dbswing', 'glutebridge'], ['dbrow', 'tablerow', 'superman'], ['mountain'], ['lunge', 'bwlunge']],
    interval: { work: 40, rest: 20, rounds: 3, roundRest: 60 } }),
  W({ id: 'buik-weg', name: 'Buik & vet', subtitle: 'Cardio + core', emoji: '🔥', cat: 'hiit', level: 2, cover: 'mountain', met: 7.5,
    desc: 'Cardio en buikspieren om en om. Puur buikvet wegtrainen kan niet, maar dit verbrandt veel én maakt je core sterk.',
    slots: [['highknees'], ['bicycle', 'crunch'], ['mountain'], ['legraise', 'deadbug'], ['jumpingjack'], ['planktap', 'plank']],
    interval: { work: 40, rest: 20, rounds: 3, roundRest: 45 } }),

  /* ===== Cardio ===== */
  W({ id: 'fiets-zone2', name: 'Zone 2 fietsen', subtitle: '30 minuten rustig', emoji: '🚴', cat: 'cardio', level: 1, cover: 'bike', met: 6,
    desc: 'Rustige duurtraining waarbij je nog kunt praten. Bouwt je conditie en vetverbranding op, zonder dat je er kapot van bent. Buiten fietsen mag ook.',
    slots: [['bike']],
    timeline: [[0, 300, 'Inrijden: lage weerstand, rustig tempo', 'easy'], [0, 1200, 'Zone 2: je kunt nog net praten', 'work'], [0, 300, 'Uitrijden', 'easy']] }),
  W({ id: 'fiets-sprints', name: 'Fietssprints', subtitle: '8 × 30 seconden', emoji: '⚡', cat: 'cardio', level: 2, cover: 'bike', met: 8.5,
    desc: 'Korte, keiharde sprints met rustig trappen ertussen. Weinig tijd, groot effect op je conditie.',
    slots: [['bike']],
    timeline: [[0, 300, 'Inrijden: rustig opbouwen', 'easy'], ...Array.from({ length: 8 }, (_, i): TimelineStep[] => [[0, 30, `Sprint ${i + 1} van 8: zware weerstand, alles geven`, 'work'], [0, 90, 'Rustig doortrappen', 'easy']]).flat(), [0, 180, 'Uitrijden', 'easy']] }),
  W({ id: 'loopband-heuvel', name: 'Heuvelwandeling', subtitle: 'Loopband met helling', emoji: '⛰️', cat: 'cardio', level: 1, cover: 'treadmill', met: 6.5,
    desc: 'Stevig wandelen op een flinke helling. Je hartslag gaat omhoog zonder te rennen. Laat de leuning los!',
    slots: [['treadmill', 'stepup']],
    timeline: [[0, 300, 'Wandelen, 5 km/u, 0 % helling', 'easy'], [0, 1200, 'Wandelen, 5 km/u, helling 10–12 %', 'work'], [0, 300, 'Afbouwen naar 0 % helling', 'easy']] }),
  W({ id: 'loopband-intervals', name: 'Hardloopintervallen', subtitle: 'Loopband', emoji: '🏃', cat: 'cardio', level: 2, cover: 'treadmill', met: 9,
    desc: 'Wisselen tussen hardlopen en wandelen. Ideaal om sneller te worden of naar je eerste 5 km toe te werken.',
    slots: [['treadmill', 'highknees']],
    timeline: [[0, 300, 'Warm wandelen, 6 km/u', 'easy'], ...Array.from({ length: 6 }, (_, i): TimelineStep[] => [[0, 60, `Interval ${i + 1} van 6: hardlopen, 10–13 km/u`, 'work'], [0, 120, 'Wandelen, 6 km/u', 'easy']]).flat(), [0, 240, 'Uitwandelen', 'easy']] }),
  W({ id: 'roei-piramide', name: 'Roei-piramide', subtitle: '1-2-3-2-1 minuten', emoji: '🚣', cat: 'cardio', level: 2, cover: 'rower', met: 8,
    desc: 'Roeien traint 85 % van je spieren. De blokken worden langer en daarna weer korter, met steeds een minuut rustig roeien.',
    slots: [['rower', 'bike']],
    timeline: [[0, 180, 'Inroeien, rustig', 'easy'], ...[1, 2, 3, 2, 1].flatMap((m, i, all): TimelineStep[] => [[0, m * 60, `${m} min stevig: ongeveer 26 halen per minuut`, 'work'], ...(i < all.length - 1 ? [[0, 60, 'Rustig roeien', 'easy'] as TimelineStep] : [])]), [0, 180, 'Uitroeien', 'easy']] }),
  W({ id: 'roeien-20', name: 'Roeien 20 minuten', subtitle: 'Duur', emoji: '🌊', cat: 'cardio', level: 1, cover: 'rower', met: 7,
    desc: 'Twintig minuten in een vast, prettig tempo. Let op je techniek: benen, romp, armen.',
    slots: [['rower', 'bike']],
    timeline: [[0, 180, 'Inroeien', 'easy'], [0, 840, 'Vast tempo: ongeveer 22 halen per minuut', 'work'], [0, 180, 'Uitroeien', 'easy']] }),
  W({ id: 'wandel-cardio', name: 'Wandel-cardio thuis', subtitle: '20 minuten', emoji: '🚶', cat: 'cardio', level: 1, cover: 'highknees', met: 4.5,
    desc: 'Rustige cardio in de woonkamer: marcheren, step-ups en boksen. Perfect op een regenachtige dag of als je net begint.',
    slots: [['highknees'], ['stepup', 'bwsquat'], ['shadowbox'], ['buttkick', 'highknees'], ['armcircles']],
    timeline: [0, 1, 2, 3, 4].flatMap((): TimelineStep[] => [[0, 60, 'Marcheer stevig op de plaats', 'easy'], [1, 60, 'Rustig tempo', 'work'], [2, 60, 'Licht en snel', 'work'], [3, 60, 'Rustig tempo', 'work']]).slice(0, 19).concat([[4, 60, 'Afbouwen', 'easy']]) }),

  /* ===== Conditie ===== */
  W({ id: 'conditie-circuit', name: 'Conditiecircuit', subtitle: '35 minuten', emoji: '🫀', cat: 'conditie', level: 2, cover: 'burpee', met: 7.5,
    desc: 'Acht stations, 45 seconden werk en 15 seconden wisselen. Vier rondes. Kracht en conditie in één.',
    slots: [['burpee', 'squatjump', 'bwsquat'], ['stepup'], ['pushup', 'kneepushup'], ['skater', 'bwlunge'], ['bwlunge'], ['mountain'], ['jumprope', 'jumpingjack'], ['plank']],
    interval: { work: 45, rest: 15, rounds: 4, roundRest: 60 } }),
  W({ id: 'bootcamp', name: 'Bootcamp', subtitle: 'Buiten of binnen', emoji: '🪖', cat: 'conditie', level: 2, cover: 'bearcrawl', met: 8,
    desc: 'Kruipen, springen en duwen zoals bij bootcamp in het park. Werkt ook prima in de woonkamer.',
    slots: [['bearcrawl'], ['squatjump', 'bwsquat'], ['pushup', 'kneepushup'], ['skater'], ['burpee', 'inchworm'], ['lungejump', 'bwlunge'], ['planktap']],
    interval: { work: 45, rest: 15, rounds: 3, roundRest: 60 } }),
  W({ id: 'boksen', name: 'Bokstraining', subtitle: '6 rondes', emoji: '🥊', cat: 'conditie', level: 1, cover: 'shadowbox', met: 7.5,
    desc: 'Schaduwboksen in rondes zoals in de ring, met korte sprints tussendoor. Geen zak nodig.',
    slots: [['shadowbox'], ['highknees', 'jumpingjack'], ['mountain', 'plank']],
    timeline: [...Array.from({ length: 6 }, (_, i): TimelineStep[] => [
      [0, 150, ['Jab, jab, cross', 'Jab, cross, hoek', 'Uppercuts afwisselen', 'Snelle stoten, blijf bewegen', 'Combinaties naar keuze', 'Laatste ronde: alles eruit'][i], 'work'],
      [1, 30, 'Sprint op de plaats', 'work'],
      ...(i < 5 ? [[-1, 45, 'Rust tussen de rondes'] as TimelineStep] : []),
    ]).flat(), [2, 60, 'Core finisher', 'work']] }),
  W({ id: 'springtouw', name: 'Springtouw-conditie', subtitle: '20 minuten', emoji: '🪢', cat: 'conditie', level: 2, cover: 'jumprope', met: 9,
    desc: 'Touwtjespringen afgewisseld met kracht. Geen touw? Spring zonder touw, het werkt net zo goed.',
    slots: [['jumprope', 'jumpingjack'], ['bwsquat'], ['pushup', 'kneepushup'], ['planktap', 'plank']],
    interval: { work: 45, rest: 15, rounds: 5, roundRest: 30 } }),
  W({ id: 'atletisch', name: 'Atletische conditie', subtitle: 'Explosief', emoji: '🏅', cat: 'conditie', level: 3, cover: 'lungejump', met: 9,
    desc: 'Explosieve sprongen en snelle richtingswissels zoals bij voetbal, hockey of tennis.',
    slots: [['skater'], ['squatjump'], ['lungejump', 'bwlunge'], ['highknees'], ['burpee'], ['bearcrawl']],
    interval: { work: 30, rest: 30, rounds: 4, roundRest: 60 } }),

  /* ===== Core ===== */
  W({ id: 'core-10', name: 'Sixpack in 10 minuten', subtitle: 'Buikspieren', emoji: '🧱', cat: 'core', level: 2, cover: 'vup', met: 4.5,
    desc: 'Tien buikoefeningen, 45 seconden per stuk. Voor je rechte, schuine en diepe buikspieren.',
    slots: [['crunch'], ['legraise'], ['bicycle'], ['planktap', 'plank'], ['russiantwist'], ['vup', 'deadbug'], ['flutter'], ['hollowhold', 'plank'], ['sideplank'], ['mountain']],
    interval: { work: 45, rest: 15, rounds: 1 } }),
  W({ id: 'core-stabiel', name: 'Core-stabiliteit', subtitle: 'Sterke onderrug', emoji: '🛡️', cat: 'core', level: 1, cover: 'deadbug', met: 3.5,
    desc: 'Rustige oefeningen die je romp leren stilhouden. Goed tegen rugklachten en voor zwaarder tillen.',
    slots: [['plank'], ['deadbug'], ['sideplank'], ['superman'], ['glutebridge'], ['hollowhold', 'deadbug']],
    interval: { work: 40, rest: 20, rounds: 3, roundRest: 30 } }),
  W({ id: 'core-gym', name: 'Buikspieren in de gym', subtitle: 'Met gewicht', emoji: '🎯', cat: 'core', level: 2, cover: 'hangingknee',
    desc: 'Buikspieren trainen zoals de rest: met gewicht, sets en herhalingen.',
    slots: [['hangingknee', 'legraise'], ['cablecrunch', 'crunch'], ['russiantwist', 'bicycle'], ['plank'], ['sideplank'], ['vup', 'deadbug']] }),

  /* ===== Push-ups & uitdagingen ===== */
  W({ id: 'pushup-workout', name: 'Push-up workout', subtitle: '6 varianten', emoji: '🤸', cat: 'uitdaging', level: 2, cover: 'pushup',
    desc: 'Alleen push-ups, in zes varianten: breed, normaal, diamond, voeten hoog, pike en een plank-finisher. Borst, schouders en triceps, overal te doen.',
    slots: [x(['widepushup', 'kneepushup'], 3, '10–15', 60), x(['pushup', 'kneepushup'], 3, '8–15', 60), x(['diamondpushup', 'kneepushup'], 3, '6–12', 60), x(['declinepushup', 'pushup'], 3, '6–10', 60), x(['pikepushup'], 3, '6–10', 60), x(['planktap', 'plank'], 2, '40 sec', 30)] }),
  W({ id: 'pushup-ladder', name: 'Push-up ladder', subtitle: '10 minuten', emoji: '🪜', cat: 'uitdaging', level: 2, cover: 'pushup', met: 6,
    desc: 'Elke minuut één push-up meer: van 1 tot 10. Haal je het niet meer binnen 40 seconden, ga dan op je knieën verder.',
    slots: [['pushup', 'kneepushup']],
    timeline: emom(0, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'push-ups') }),
  W({ id: 'burpee-emom', name: 'Burpee-uitdaging', subtitle: '10 minuten', emoji: '🥵', cat: 'uitdaging', level: 3, cover: 'burpee', met: 9,
    desc: 'Elke minuut 6 burpees, tien minuten lang. Hoe sneller je ze doet, hoe meer rust je hebt.',
    slots: [['burpee', 'squatjump']],
    timeline: emom(0, Array(10).fill(6), 'burpees') }),
  W({ id: 'squat-100', name: '100 squats', subtitle: 'Uitdaging', emoji: '💯', cat: 'uitdaging', level: 1, cover: 'bwsquat', met: 5,
    desc: 'Honderd squats in vijf blokken van twintig. Met elke week een beetje minder rust word je zichtbaar sterker.',
    slots: [['bwsquat'], ['wallsit']],
    timeline: [...[1, 2, 3, 4, 5].flatMap((n): TimelineStep[] => [[0, 60, `Blok ${n}: 20 squats`, 'work'], [-1, 30]]), [1, 45, 'Finale: wall sit', 'work']] }),
  W({ id: 'plank-uitdaging', name: 'Plank-uitdaging', subtitle: '6 minuten', emoji: '🧊', cat: 'uitdaging', level: 2, cover: 'plank', met: 4,
    desc: 'Zes minuten plank in alle varianten. Houd vol tot de laatste seconde!',
    slots: [['plank'], ['sideplank'], ['planktap'], ['hollowhold', 'deadbug']],
    timeline: [[0, 45, 'Plank'], [-1, 15], [1, 30, 'Zijplank links'], [-1, 10], [1, 30, 'Zijplank rechts'], [-1, 15], [2, 45, 'Shoulder taps'], [-1, 15], [3, 30, 'Hollow hold'], [-1, 15], [1, 30, 'Zijplank links'], [-1, 10], [1, 30, 'Zijplank rechts'], [-1, 15], [0, 60, 'Finale: houd vol!']] }),

  /* ===== Thuis ===== */
  W({ id: 'thuis-fullbody', name: 'Full body thuis', subtitle: 'Zonder apparatuur', emoji: '🏠', cat: 'thuis', level: 1, cover: 'bwsquat',
    desc: 'Het hele lichaam met alleen een stoel en een tafel. Geen gym nodig.',
    slots: [['bwsquat'], ['pushup', 'kneepushup'], ['tablerow', 'superman'], ['glutebridge'], ['chairsplit', 'bwlunge'], ['pikepushup'], ['plank']] }),
  W({ id: 'thuis-boven', name: 'Bovenlichaam thuis', subtitle: 'Zonder apparatuur', emoji: '🙌', cat: 'thuis', level: 1, cover: 'pikepushup',
    desc: 'Borst, rug, schouders en armen met push-ups, tafelroeien en stoeldips.',
    slots: [['pushup', 'kneepushup'], ['tablerow', 'bottlerow', 'superman'], ['pikepushup'], ['chairdip'], ['backpackcurl', 'tablerow'], ['diamondpushup', 'kneepushup'], ['superman']] }),
  W({ id: 'thuis-benen', name: 'Benen & billen thuis', subtitle: 'Zonder apparatuur', emoji: '🍑', cat: 'thuis', level: 1, cover: 'sumosquat',
    desc: 'Squats, lunges, bruggen en kickbacks. Voel je billen morgen nog.',
    slots: [['bwsquat'], ['chairsplit', 'bwlunge'], ['glutebridge'], ['sumosquat'], ['donkeykick'], ['stepup'], ['wallsit'], ['calf']] }),
  W({ id: 'hotel-15', name: 'Hotelkamer-workout', subtitle: '15 minuten', emoji: '🧳', cat: 'thuis', level: 1, cover: 'pushup', met: 6,
    desc: 'Op reis of weinig ruimte: één vierkante meter is genoeg. Geen sprongen, dus ook stil.',
    slots: [['bwsquat'], ['pushup', 'kneepushup'], ['bwlunge'], ['planktap', 'plank'], ['glutebridge'], ['inchworm']],
    interval: { work: 40, rest: 20, rounds: 2, roundRest: 60 } }),

  /* ===== Mobiliteit & herstel ===== */
  W({ id: 'ochtendstretch', name: 'Ochtendstretch', subtitle: '8 minuten', emoji: '🌅', cat: 'mobiliteit', level: 1, cover: 'catcow', met: 2.5,
    desc: 'Wakker worden en loskomen: rug, heupen, hamstrings en schouders in acht rustige minuten.',
    slots: [['catcow'], ['childpose'], ['cobra'], ['hipflexor'], ['hamstretch'], ['deepsquat'], ['armcircles'], ['inchworm']],
    interval: { work: 50, rest: 10, rounds: 1, fixed: true } }),
  W({ id: 'mobiliteit-heupen', name: 'Heupen & rug los', subtitle: '15 minuten', emoji: '🧘', cat: 'mobiliteit', level: 1, cover: 'hipflexor', met: 2.5,
    desc: 'Voor wie veel zit: open je heupen, maak je rug soepel en activeer je billen.',
    slots: [['catcow'], ['hipflexor'], ['deepsquat'], ['cobra'], ['childpose'], ['hamstretch'], ['glutebridge'], ['deadbug']],
    interval: { work: 45, rest: 15, rounds: 2, fixed: true } }),
  W({ id: 'cooldown', name: 'Cool-down', subtitle: 'Na het sporten', emoji: '❄️', cat: 'mobiliteit', level: 1, cover: 'childpose', met: 2,
    desc: 'Zes minuten rustig stretchen na je training. Hartslag omlaag en je spieren ontspannen.',
    slots: [['hamstretch'], ['hipflexor'], ['childpose'], ['cobra'], ['armcircles'], ['deepsquat']],
    interval: { work: 50, rest: 10, rounds: 1, fixed: true } }),
  W({ id: 'flow', name: 'Rustige flow', subtitle: 'Yoga-geïnspireerd', emoji: '🌿', cat: 'mobiliteit', level: 1, cover: 'cobra', met: 3,
    desc: 'Een rustige flow van houding naar houding, met aandacht voor je ademhaling. Ook fijn op een rustdag.',
    slots: [['catcow'], ['cobra'], ['childpose'], ['inchworm'], ['deepsquat'], ['hipflexor'], ['hamstretch'], ['sideplank']],
    interval: { work: 45, rest: 10, rounds: 2, fixed: true } }),
];

export const LIBRARY_BY_ID: Record<string, LibWorkout> = Object.fromEntries(LIBRARY.map((w) => [w.id, w]));

/* ---------- Zelf combineren ---------- */

export type GroupKey = 'borst' | 'rug' | 'schouders' | 'biceps' | 'triceps' | 'benen' | 'billen' | 'hamstrings' | 'kuiten' | 'core';

/** Per spiergroep de plekken, belangrijkste eerst. */
export const GROUPS: Record<GroupKey, { t: string; day: string; em: string; slots: SlotSpec[] }> = {
  borst: { t: 'Borst', day: 'Borstdag', em: '💪', slots: [C.chest, C.chest2, C.chest3, ['dips', 'declinepushup', 'widepushup']] },
  rug: { t: 'Rug', day: 'Rugdag', em: '🧗', slots: [C.vpull, C.hpull, C.hpull2, ['superman', 'reversefly']] },
  schouders: { t: 'Schouders', day: 'Schouderdag', em: '🏔️', slots: [C.shoulder, C.lateral, C.rearDelt, ['cablelateral', 'lateral']] },
  biceps: { t: 'Biceps', day: 'Bicepsdag', em: '💪', slots: [C.bicep, C.bicep2, ['cablecurl', 'backpackcurl']] },
  triceps: { t: 'Triceps', day: 'Tricepsdag', em: '🔱', slots: [C.tricep, C.tricep2, C.tricepHome] },
  benen: { t: 'Benen', day: 'Beendag', em: '🦵', slots: [C.squat, C.single, C.quads, C.squat2] },
  billen: { t: 'Billen', day: 'Billendag', em: '🍑', slots: [C.glute, C.sumo, C.glute2, C.step] },
  hamstrings: { t: 'Hamstrings', day: 'Hamstringdag', em: '🔙', slots: [C.hinge, C.hams, ['slrdl', 'dbrdl', 'glutebridge']] },
  kuiten: { t: 'Kuiten', day: 'Kuitendag', em: '🦶', slots: [C.calf, x(['calf'], 3, '20–25', 45)] },
  core: { t: 'Core', day: 'Coredag', em: '🧱', slots: [C.core, C.core3, C.core2, C.core4] },
};
export const GROUP_KEYS = Object.keys(GROUPS) as GroupKey[];

export type MixSize = 'kort' | 'normaal' | 'lang';
export const MIX_SIZE: Record<MixSize, { t: string; s: string; n: number }> = {
  kort: { t: 'Kort', s: '± 30 min', n: 4 },
  normaal: { t: 'Normaal', s: '± 45 min', n: 6 },
  lang: { t: 'Lang', s: '± 60 min', n: 8 },
};

/** Afsluiters voor een eigen combinatie: een workout op tijd uit de bibliotheek. */
export const FINISHERS = ['snel-10', 'tabata', 'core-10', 'cooldown', 'fiets-zone2', 'loopband-heuvel'];

export interface CustomWorkout {
  id: string;
  name: string;
  groups: GroupKey[];
  size: MixSize;
  /** id van een workout op tijd die erachteraan komt */
  finisher?: string;
}

export const mixName = (groups: GroupKey[]) => {
  const t = groups.map((g) => GROUPS[g].t);
  return t.length <= 1 ? (groups[0] ? GROUPS[groups[0]].day : 'Eigen workout') : `${t.slice(0, -1).join(', ')} & ${t[t.length - 1].toLowerCase()}`;
};

/** Plekken voor een eigen combinatie: om en om uit elke gekozen spiergroep. */
export function mixSlots(groups: GroupKey[], size: MixSize): SlotSpec[] {
  const n = MIX_SIZE[size].n;
  const out: SlotSpec[] = [];
  for (let round = 0; out.length < n; round++) {
    let added = false;
    for (const g of groups) {
      const s = GROUPS[g].slots[round];
      if (s && out.length < n) {
        out.push(s);
        added = true;
      }
    }
    if (!added) break;
  }
  return out;
}

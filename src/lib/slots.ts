// Kandidatenlijsten per plek in een workout: van zwaar/technisch naar makkelijk.
// Puls kiest de eerste die past bij jouw apparatuur en ervaring.

/** Een plek in een workout: alleen kandidaten, of met vaste sets/herhalingen/rust. */
export type SlotSpec = string[] | { c: string[]; sets?: number; reps?: string; rest?: number };

export const slotCands = (s: SlotSpec) => (Array.isArray(s) ? s : s.c);

export const C = {
  chest: ['bench', 'dbbench', 'chestpress', 'pushup', 'kneepushup'],
  chest2: ['inclinebench', 'inclinedb', 'declinepushup', 'pushup', 'kneepushup'],
  chest3: ['cablefly', 'dips', 'chestpress', 'declinepushup', 'kneepushup'],
  chestHome: ['widepushup', 'pushup', 'kneepushup'],
  shoulder: ['ohp', 'dbohp', 'machinepress', 'pikepushup'],
  lateral: ['lateral', 'cablelateral'],
  rearDelt: ['facepull', 'reversefly', 'superman'],
  vpull: ['pullup', 'pulldown', 'tablerow'],
  hpull: ['row', 'cablerow', 'dbrow', 'tablerow', 'bottlerow', 'superman'],
  hpull2: ['dbrow', 'cablerow', 'row', 'bottlerow', 'tablerow', 'superman'],
  bicep: ['barbellcurl', 'curl', 'cablecurl', 'backpackcurl'],
  bicep2: ['hammer', 'cablecurl', 'curl', 'backpackcurl'],
  tricep: ['pushdown', 'ohtriceps', 'chairdip'],
  tricep2: ['skullcrusher', 'ohtriceps', 'dips', 'diamondpushup', 'chairdip'],
  tricepHome: ['diamondpushup', 'chairdip', 'kneepushup'],
  squat: ['squat', 'legpress', 'gobletsquat', 'bwsquat'],
  squat2: ['legpress', 'gobletsquat', 'squat', 'bwsquat'],
  hinge: ['rdl', 'dbrdl', 'hipthrust', 'slrdl', 'glutebridge'],
  hinge2: ['deadlift', 'rdl', 'dbrdl', 'slrdl', 'glutebridge'],
  glute: ['hipthrust', 'glutebridge'],
  glute2: ['donkeykick', 'glutebridge'],
  single: ['bulgarian', 'lunge', 'chairsplit', 'bwlunge'],
  hams: ['legcurl', 'glutebridge', 'slrdl'],
  quads: ['legext', 'wallsit'],
  sumo: ['sumosquat', 'gobletsquat', 'bwsquat'],
  step: ['stepup', 'bwlunge'],
  calf: ['calf'],
  core: ['hangingknee', 'cablecrunch', 'deadbug', 'crunch', 'plank'],
  core2: ['plank', 'sideplank', 'deadbug'],
  core3: ['legraise', 'bicycle', 'crunch', 'deadbug'],
  core4: ['russiantwist', 'bicycle', 'crunch'],
  cond: ['mountain', 'burpee'],
} satisfies Record<string, string[]>;

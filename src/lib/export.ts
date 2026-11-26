// Je gegevens exporteren (CSV voor Excel/Numbers, JSON als back-up) en een back-up terugzetten.
import { entryNutrients } from './calc';
import { exerciseName } from './exlib';
import type { PersistedData } from './store';
import { burnedOn } from './stats';
import { MEALS, type DayLog, type MealKey } from './types';

const MEAL_NL: Record<MealKey, string> = { ontbijt: 'Ontbijt', lunch: 'Lunch', diner: 'Avondeten', snacks: 'Snacks' };

/** Nederlandse Excel: puntkomma als scheidingsteken, komma als decimaalteken. */
const num = (n: number | undefined, digits = 1) => (n === undefined || !Number.isFinite(n) ? '' : (Math.round(n * 10 ** digits) / 10 ** digits).toString().replace('.', ','));
const cell = (v: string | number | undefined) => {
  const s = typeof v === 'number' ? num(v) : (v ?? '');
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: (string | number | undefined)[][]) => '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n';

const sortedDays = (days: Record<string, DayLog>) => Object.keys(days).sort();

export function foodCsv(days: Record<string, DayLog>) {
  const rows: (string | number | undefined)[][] = [['Datum', 'Maaltijd', 'Product', 'Merk', 'Hoeveelheid', 'Eenheid', 'Portie', 'kcal', 'Eiwit (g)', 'Koolhydraten (g)', 'Vet (g)', 'Vezels (g)']];
  for (const k of sortedDays(days)) {
    for (const m of MEALS) {
      for (const e of days[k].meals[m]) {
        const n = entryNutrients(e);
        rows.push([k, MEAL_NL[m], e.food.name, e.food.brand, e.grams, e.food.unit, e.label, Math.round(n.kcal), n.p, n.c, n.f, e.food.fib === undefined ? undefined : n.fib]);
      }
    }
  }
  return csv(rows);
}

export function daysCsv(data: Pick<PersistedData, 'days' | 'weights' | 'profile'>) {
  const kg = data.profile?.weightKg ?? 70;
  const h = data.profile?.heightCm ?? 175;
  const weight = new Map(data.weights.map((w) => [w.date, w.kg]));
  const keys = [...new Set([...Object.keys(data.days), ...weight.keys()])].sort();
  const rows: (string | number | undefined)[][] = [['Datum', 'kcal gegeten', 'Eiwit (g)', 'Koolhydraten (g)', 'Vet (g)', 'Vezels (g)', 'Water (ml)', 'Stappen', 'Actieve minuten', 'Verbrand geregistreerd (kcal)', 'Verbrand geschat uit stappen (kcal)', 'Gewicht (kg)', 'Notitie']];
  for (const k of keys) {
    const d = data.days[k];
    const n = d ? MEALS.flatMap((m) => d.meals[m]).map(entryNutrients).reduce((a, b) => ({ kcal: a.kcal + b.kcal, p: a.p + b.p, c: a.c + b.c, f: a.f + b.f, fib: a.fib + b.fib }), { kcal: 0, p: 0, c: 0, f: 0, fib: 0 }) : undefined;
    const b = burnedOn(d, kg, h);
    rows.push([k, n ? Math.round(n.kcal) : undefined, n?.p, n?.c, n?.f, n?.fib, d?.waterMl, d?.steps, d ? d.activities.reduce((s, a) => s + a.minutes, 0) : undefined, d ? b.logged : undefined, d ? b.fromSteps : undefined, weight.get(k), d?.note]);
  }
  return csv(rows);
}

export function workoutsCsv(data: Pick<PersistedData, 'days' | 'workoutLog'>) {
  const rows: (string | number | undefined)[][] = [['Datum', 'Training', 'Oefening', 'Set', 'Gewicht (kg)', 'Herhalingen of seconden', 'Duur (min)', 'kcal']];
  for (const l of data.workoutLog) {
    for (const x of l.ex) x.sets.forEach((s, i) => rows.push([l.date, l.name, exerciseName(x.id), i + 1, s.kg, s.reps, l.minutes, l.kcal]));
  }
  // overige sport (hardlopen, fietsen …) uit het dagboek
  for (const k of sortedDays(data.days)) {
    for (const a of data.days[k].activities) if (!a.workout) rows.push([k, a.name, a.km ? `${num(a.km)} km` : '', '', '', '', a.minutes, a.kcal]);
  }
  return csv(rows);
}

/* ---------- Back-up ---------- */

export interface Backup {
  app: 'puls';
  version: number;
  exported: string;
  data: PersistedData;
}

export const backupJson = (data: PersistedData): string => JSON.stringify({ app: 'puls', version: 6, exported: new Date().toISOString(), data } satisfies Backup);

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Leest een back-up van Puls (of de ruwe opslag van de app). Controleert de vorm, zodat een verkeerd
 * bestand nooit je gegevens kapot maakt. Geeft een foutmelding in gewone taal terug.
 */
export function parseBackup(text: string): { ok: true; data: PersistedData; days: number } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Dit bestand is geen back-up van Puls (geen geldige JSON).' };
  }
  const data = isObj(raw) && raw.app === 'puls' && isObj(raw.data) ? raw.data : isObj(raw) && isObj(raw.state) ? raw.state : null;
  if (!data) return { ok: false, error: 'Dit bestand is geen back-up van Puls.' };
  if (!isObj(data.days) || !Array.isArray(data.weights)) return { ok: false, error: 'De back-up mist het dagboek of de gewichten.' };
  for (const [k, d] of Object.entries(data.days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !isObj(d) || !isObj(d.meals) || typeof d.waterMl !== 'number' || !Array.isArray(d.activities)) {
      return { ok: false, error: `De back-up is beschadigd (dag ${k}).` };
    }
  }
  if (data.profile !== null && data.profile !== undefined && !isObj(data.profile)) return { ok: false, error: 'Het profiel in de back-up klopt niet.' };
  return { ok: true, data: data as unknown as PersistedData, days: Object.keys(data.days).length };
}

/** Bestand laten downloaden (werkt in de browser en als app op je beginscherm). */
export function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Account, proefperiode en abonnement.
//
// Met een server (zie backend.ts) staan accounts, abonnementen en codes centraal. Zonder server
// werkt alles lokaal op dit apparaat. Betalen is in beide gevallen nog een demo.

export const TRIAL_DAYS = 14;

export type Plan = 'maand' | 'jaar';
/** 'vriend' = gratis voor altijd via een code */
export type SubPlan = Plan | 'vriend';

export const planLabel = (p: SubPlan) => (p === 'vriend' ? 'Gratis voor altijd' : PLANS[p].label);

export const PLANS: Record<Plan, { price: number; label: string; per: string; months: number }> = {
  maand: { price: 2.99, label: 'Maandelijks', per: 'per maand', months: 1 },
  jaar: { price: 30, label: 'Jaarlijks', per: 'per jaar', months: 12 },
};

/** Hoeveel je met een jaar bespaart t.o.v. 12 maanden los, in procent. */
export const YEAR_SAVING = Math.round((1 - PLANS.jaar.price / (PLANS.maand.price * 12)) * 100);

export const euro = (n: number) => '€ ' + n.toLocaleString('nl-NL', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

export interface Account {
  email: string;
  /** gehashte wachtwoord, nooit het wachtwoord zelf (alleen zonder server) */
  passHash?: string;
  createdAt: string;
}

export interface Subscription {
  plan: SubPlan;
  since: string;
  /** toegang tot en met dit moment */
  until: string;
  /** verlengt automatisch; uit na opzeggen */
  renews: boolean;
}

export type Access = { kind: 'abo'; sub: Subscription } | { kind: 'trial'; daysLeft: number; ends: Date } | { kind: 'none'; ends: Date };

const DAY = 864e5;

export function trialEnd(installedAt: string) {
  return new Date(new Date(installedAt).getTime() + TRIAL_DAYS * DAY);
}

/** Mag je de app gebruiken, en waarom. */
export function accessOf(installedAt: string, sub: Subscription | null, now = new Date()): Access {
  if (sub && new Date(sub.until) > now) return { kind: 'abo', sub };
  const ends = trialEnd(installedAt);
  if (ends > now) return { kind: 'trial', daysLeft: Math.max(1, Math.ceil((ends.getTime() - now.getTime()) / DAY)), ends };
  return { kind: 'none', ends };
}

export function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const normEmail = (e: string) => e.trim().toLowerCase();

export function checkSignup(email: string, pass: string): string | null {
  if (!EMAIL_RE.test(normEmail(email))) return 'Vul een geldig e-mailadres in.';
  if (pass.length < 8) return 'Kies een wachtwoord van minstens 8 tekens.';
  return null;
}

/** SHA-256 van e-mail + wachtwoord. */
export async function hashPassword(email: string, pass: string) {
  const data = new TextEncoder().encode(`puls:${normEmail(email)}:${pass}`);
  if (globalThis.crypto?.subtle) {
    const buf = await globalThis.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // reserve als de browser geen crypto.subtle heeft (bijv. via http)
  let h = 2166136261;
  for (const b of data) h = Math.imul(h ^ b, 16777619);
  return 'f' + (h >>> 0).toString(16);
}

/**
 * Betalen. DEMO: er wordt niets afgeschreven, het abonnement staat direct aan.
 * Vervang dit door een echte checkout (bijv. Mollie of Stripe) die pas na betaling het abonnement teruggeeft.
 */
export async function checkout(plan: Plan, current: Subscription | null, installedAt: string, now = new Date()): Promise<Subscription> {
  // sluit aan op een lopend abonnement of op het einde van je proefperiode, zodat je geen dagen kwijtraakt
  const running = current && new Date(current.until) > now ? new Date(current.until) : null;
  const trial = trialEnd(installedAt);
  if (current?.plan === 'vriend') return current;
  const start = running ?? (trial > now ? trial : now);
  return { plan, since: running ? current!.since : now.toISOString(), until: addMonths(start, PLANS[plan].months).toISOString(), renews: true };
}

/** Code die een vriend krijgt, bijv. PULS-7KX4-M2QD (zonder 0/O en 1/I, om verwarring te voorkomen). */
export function makeCode(rand: () => number = Math.random) {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => Array.from({ length: 4 }, () => abc[Math.floor(rand() * abc.length)]).join('');
  return `PULS-${part()}-${part()}`;
}

export const normCode = (c: string) => c.trim().toUpperCase().replace(/\s+/g, '');

export const longDate = (iso: string | Date) => new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });

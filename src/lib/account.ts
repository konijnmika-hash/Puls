// Account, proefperiode en abonnement.
//
// Let op: alles staat nu op dit apparaat. Betalen gaat via `checkout`, die nu een demo is.
// Koppel hier later een echte betaalprovider (Mollie/Stripe of de App Store en Google Play)
// en een server voor accounts, zodat je ook op een ander apparaat kunt inloggen.

export const TRIAL_DAYS = 14;

export type Plan = 'maand' | 'jaar';

export const PLANS: Record<Plan, { price: number; label: string; per: string; months: number }> = {
  maand: { price: 2.99, label: 'Maandelijks', per: 'per maand', months: 1 },
  jaar: { price: 30, label: 'Jaarlijks', per: 'per jaar', months: 12 },
};

/** Hoeveel je met een jaar bespaart t.o.v. 12 maanden los, in procent. */
export const YEAR_SAVING = Math.round((1 - PLANS.jaar.price / (PLANS.maand.price * 12)) * 100);

export const euro = (n: number) => '€ ' + n.toLocaleString('nl-NL', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

export interface Account {
  email: string;
  /** gehashte wachtwoord, nooit het wachtwoord zelf */
  passHash: string;
  createdAt: string;
}

export interface Subscription {
  plan: Plan;
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
  const start = running ?? (trial > now ? trial : now);
  return { plan, since: running ? current!.since : now.toISOString(), until: addMonths(start, PLANS[plan].months).toISOString(), renews: true };
}

export const longDate = (iso: string | Date) => new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });

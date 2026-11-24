// Verbinding met de server (Supabase). Zonder instellingen werkt Puls helemaal lokaal, zoals eerst.
// Zet VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY (zie README) om echte accounts, codes en het
// beheeroverzicht aan te zetten. De anon key is bedoeld voor in de app en mag openbaar zijn.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Subscription, SubPlan } from './account';

const URL = (import.meta.env?.VITE_SUPABASE_URL as string | undefined) ?? '';
const KEY = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';

export const online = Boolean(URL && KEY);

let client: SupabaseClient | null = null;
export function sb() {
  if (!online) throw new Error('Geen server ingesteld.');
  return (client ??= createClient(URL, KEY, { auth: { persistSession: true, storageKey: 'puls-auth' } }));
}

interface SubRow {
  plan: SubPlan;
  since: string;
  until: string;
  renews: boolean;
}

export const toSub = (r: SubRow | null | undefined): Subscription | null =>
  r && r.plan ? { plan: r.plan, since: r.since, until: r.until, renews: r.renews } : null;

/** Nette Nederlandse foutmelding van de server. */
export function nlError(e: unknown): string {
  const m = (e as { message?: string })?.message ?? String(e);
  if (/invalid login credentials/i.test(m)) return 'E-mailadres of wachtwoord klopt niet.';
  if (/already registered|already been registered/i.test(m)) return 'Er bestaat al een account met dit e-mailadres. Log in.';
  if (/email not confirmed/i.test(m)) return 'Bevestig eerst je e-mailadres via de link in je mail.';
  if (/password should be/i.test(m)) return 'Kies een wachtwoord van minstens 8 tekens.';
  if (/failed to fetch|network/i.test(m)) return 'Geen verbinding. Probeer het zo nog eens.';
  return m;
}

export interface Remote {
  email: string;
  trialEnds: string;
  sub: Subscription | null;
}

/** Account, proefperiode en abonnement van wie ingelogd is. */
export async function loadRemote(): Promise<Remote | null> {
  const { data: u } = await sb().auth.getUser();
  if (!u.user) return null;
  const [acc, sub] = await Promise.all([
    sb().from('accounts').select('email, trial_ends').eq('id', u.user.id).maybeSingle(),
    sb().from('subscriptions').select('plan, since, until, renews').eq('user_id', u.user.id).maybeSingle(),
  ]);
  if (acc.error) throw acc.error;
  return {
    email: acc.data?.email ?? u.user.email ?? '',
    trialEnds: acc.data?.trial_ends ?? new Date(Date.now() + 14 * 864e5).toISOString(),
    sub: toSub(sub.data as SubRow | null),
  };
}

export async function signUp(email: string, password: string) {
  const { data, error } = await sb().auth.signUp({ email, password });
  if (error) throw error;
  // Staat "Confirm email" aan in Supabase, dan is er nog geen sessie
  return { needsConfirm: !data.session };
}

export async function signIn(email: string, password: string) {
  const { error } = await sb().auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  await sb().auth.signOut();
}

async function rpcSub(fn: string, args?: Record<string, unknown>) {
  const { data, error } = await sb().rpc(fn, args);
  if (error) throw error;
  return toSub(data as SubRow);
}

export const remoteCheckout = (plan: 'maand' | 'jaar') => rpcSub('demo_checkout', { p_plan: plan });
export const remoteCancel = () => rpcSub('cancel_subscription');
export const remoteRedeem = (code: string) => rpcSub('redeem_code', { p_code: code });

/* ---------- Beheer ---------- */

export interface Stats {
  accounts: number;
  inTrial: number;
  monthly: number;
  yearly: number;
  friends: number;
  cancelled: number;
  expired: number;
  buyers: number;
  purchases: number;
  revenue: number;
  revenue30: number;
  weeks: { week: string; maand: number; jaar: number; amount: number }[];
  signups: { week: string; n: number }[];
  recent: { created_at: string; plan: 'maand' | 'jaar'; amount: number; email: string | null }[];
}

export interface CodeRow {
  code: string;
  note: string;
  created_at: string;
  active: boolean;
  redeemed_email: string | null;
  redeemed_at: string | null;
}

export async function isAdmin() {
  const { data, error } = await sb().rpc('is_admin');
  if (error) throw error;
  return Boolean(data);
}

export async function adminStats(): Promise<Stats> {
  const { data, error } = await sb().rpc('admin_stats');
  if (error) throw error;
  const s = data as Stats;
  return { ...s, revenue: Number(s.revenue), revenue30: Number(s.revenue30) };
}

export async function listCodes(): Promise<CodeRow[]> {
  const { data, error } = await sb().from('codes').select('code, note, created_at, active, redeemed_email, redeemed_at').order('created_at', { ascending: false });
  if (error) throw error;
  return data as CodeRow[];
}

export async function createCode(code: string, note: string) {
  const { error } = await sb().from('codes').insert({ code, note });
  if (error) throw error;
}

export async function setCodeActive(code: string, active: boolean) {
  const { error } = await sb().from('codes').update({ active }).eq('code', code);
  if (error) throw error;
}

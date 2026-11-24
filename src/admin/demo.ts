// Voorbeeldcijfers om het beheeroverzicht te bekijken voordat de server gekoppeld is.
// Deze zijn verzonnen en worden in het scherm ook zo genoemd.
import type { CodeRow, Stats } from '../lib/backend';

const week = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1 - n * 7);
  return d.toISOString().slice(0, 10);
};

export function demoStats(): Stats {
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const n = 11 - i;
    const maand = Math.round(3 + i * 1.4 + (i % 3));
    const jaar = Math.round(1 + i * 0.6 + ((i + 1) % 2));
    return { week: week(n), maand, jaar, amount: maand * 2.99 + jaar * 30 };
  });
  const recent = Array.from({ length: 8 }, (_, i) => ({
    created_at: new Date(Date.now() - i * 7.3 * 36e5).toISOString(),
    plan: (i % 3 === 0 ? 'jaar' : 'maand') as 'maand' | 'jaar',
    amount: i % 3 === 0 ? 30 : 2.99,
    email: `voorbeeld${i + 1}@mail.nl`,
  }));
  const monthly = 86;
  const yearly = 31;
  const revenue = weeks.reduce((s, w) => s + w.amount, 0);
  return {
    accounts: 412, inTrial: 58, monthly, yearly, friends: 6, cancelled: 9, expired: 231,
    buyers: 129, purchases: weeks.reduce((s, w) => s + w.maand + w.jaar, 0), revenue, revenue30: weeks.slice(-4).reduce((s, w) => s + w.amount, 0),
    weeks, signups: weeks.map((w, i) => ({ week: w.week, n: 18 + i * 3 })), recent,
  };
}

export const demoCodes = (): CodeRow[] => [
  { code: 'PULS-7KX4-M2QD', note: 'Voorbeeld: Sam', created_at: new Date(Date.now() - 9 * 864e5).toISOString(), active: true, redeemed_email: 'sam@mail.nl', redeemed_at: new Date(Date.now() - 8 * 864e5).toISOString() },
  { code: 'PULS-R9TB-4HWZ', note: 'Voorbeeld: Noor', created_at: new Date(Date.now() - 2 * 864e5).toISOString(), active: true, redeemed_email: null, redeemed_at: null },
];

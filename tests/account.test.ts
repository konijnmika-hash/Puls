import { describe, expect, it } from 'vitest';
import { accessOf, checkout, checkSignup, hashPassword, PLANS, YEAR_SAVING } from '../src/lib/account';

const day = 864e5;
const installed = '2026-01-01T10:00:00.000Z';
const at = (days: number) => new Date(new Date(installed).getTime() + days * day);

describe('trial and subscription', () => {
  it('gives 14 free days, then nothing', () => {
    expect(accessOf(installed, null, at(0))).toMatchObject({ kind: 'trial', daysLeft: 14 });
    expect(accessOf(installed, null, at(13.5))).toMatchObject({ kind: 'trial', daysLeft: 1 });
    expect(accessOf(installed, null, at(14.01)).kind).toBe('none');
  });
  it('prices: 2,99 a month or 30 a year', () => {
    expect(PLANS.maand.price).toBe(2.99);
    expect(PLANS.jaar.price).toBe(30);
    expect(YEAR_SAVING).toBe(16);
  });
  it('a subscription unlocks the app and starts after the trial', async () => {
    const sub = await checkout('maand', null, installed, at(3));
    expect(new Date(sub.until).getTime()).toBeGreaterThan(at(14 + 27).getTime());
    expect(accessOf(installed, sub, at(30)).kind).toBe('abo');
    const year = await checkout('jaar', null, installed, at(20));
    expect(accessOf(installed, year, at(20 + 360)).kind).toBe('abo');
    expect(accessOf(installed, year, at(20 + 370)).kind).toBe('none');
  });
  it('extending adds onto the running period', async () => {
    const a = await checkout('maand', null, installed, at(20));
    const b = await checkout('maand', a, installed, at(25));
    expect(new Date(b.until).getTime()).toBeGreaterThan(new Date(a.until).getTime() + 27 * day);
  });
});

describe('account', () => {
  it('checks email and password', () => {
    expect(checkSignup('geen-mail', 'wachtwoord123')).toMatch(/e-mail/);
    expect(checkSignup('a@b.nl', 'kort')).toMatch(/8 tekens/);
    expect(checkSignup(' Jij@Voorbeeld.nl ', 'wachtwoord123')).toBeNull();
  });
  it('never stores the password itself', async () => {
    const h = await hashPassword('Jij@voorbeeld.nl', 'geheim123');
    expect(h).not.toContain('geheim');
    expect(h).toBe(await hashPassword('jij@voorbeeld.nl ', 'geheim123'));
    expect(h).not.toBe(await hashPassword('jij@voorbeeld.nl', 'geheim124'));
  });
});

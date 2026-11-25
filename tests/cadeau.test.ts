import { describe, expect, it } from 'vitest';
import { controleerCode, maakCode, vindCode } from '../src/lib/cadeau';

const sleutels = () => crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);

describe('cadeaucodes', () => {
  it('een ondertekende code wordt geaccepteerd, ook als link', async () => {
    const k = await sleutels();
    const pub = await crypto.subtle.exportKey('jwk', k.publicKey);
    const code = await maakCode({ n: 'Sanne', i: 'abc123', t: 1_700_000_000_000 }, k.privateKey);
    expect(await controleerCode(code, pub)).toEqual({ n: 'Sanne', i: 'abc123', t: 1_700_000_000_000 });
    expect(await controleerCode(`https://x.github.io/puls/#cadeau=${code}`, pub)).toMatchObject({ n: 'Sanne' });
    expect(vindCode(`#cadeau=${code}`)).toBe(code);
  });

  it('een aangepaste of vreemde code wordt geweigerd', async () => {
    const k = await sleutels();
    const ander = await sleutels();
    const pub = await crypto.subtle.exportKey('jwk', k.publicKey);
    const code = await maakCode({ n: 'Sanne', i: 'abc123', t: 1 }, k.privateKey);
    const [, sig] = code.split('.');
    const vals = Buffer.from(JSON.stringify({ n: 'Iemand', i: 'x', t: 1 })).toString('base64url') + '.' + sig;
    expect(await controleerCode(vals, pub)).toBeNull();
    expect(await controleerCode(await maakCode({ n: 'A', i: 'b', t: 1 }, ander.privateKey), pub)).toBeNull();
    expect(await controleerCode('onzin', pub)).toBeNull();
  });

  it('het meegeleverde sleutelbestand past bij Puls', async () => {
    const fs = await import('node:fs');
    const pad = process.env.PULS_SLEUTEL;
    if (!pad || !fs.existsSync(pad)) return;
    const { sleutel } = JSON.parse(fs.readFileSync(pad, 'utf8'));
    const priv = await crypto.subtle.importKey('jwk', sleutel, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    expect(await controleerCode(await maakCode({ n: 'Test', i: 'id', t: 2 }, priv))).toMatchObject({ n: 'Test' });
  });
});

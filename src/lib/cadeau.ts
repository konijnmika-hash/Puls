// Cadeaucodes: "Puls Premium voor altijd".
// De beheer-app ondertekent een code met de geheime sleutel van de eigenaar; Puls controleert hem
// met de openbare sleutel hieronder. Zo werkt het zonder server en kan niemand zelf codes maken.
import { CADEAU_SLEUTEL } from './cadeau-sleutel';

export interface Cadeau {
  /** voor wie */
  n: string;
  /** unieke id */
  i: string;
  /** gemaakt op (ms) */
  t: number;
}

const ALG = { name: 'ECDSA', hash: 'SHA-256' } as const;
const enc = new TextEncoder();

export function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function unb64url(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function nieuweId(): string {
  const b = crypto.getRandomValues(new Uint8Array(6));
  return b64url(b);
}

/** Maakt een ondertekende code: <gegevens>.<handtekening> */
export async function maakCode(c: Cadeau, geheim: CryptoKey): Promise<string> {
  const data = b64url(enc.encode(JSON.stringify({ n: c.n, i: c.i, t: c.t })));
  const sig = new Uint8Array(await crypto.subtle.sign(ALG, geheim, enc.encode(data)));
  return `${data}.${b64url(sig)}`;
}

let pubKey: Promise<CryptoKey> | null = null;
const openbaar = (jwk: JsonWebKey = CADEAU_SLEUTEL) =>
  jwk === CADEAU_SLEUTEL
    ? (pubKey ??= crypto.subtle.importKey('jwk', CADEAU_SLEUTEL, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']))
    : crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);

/** Haalt de code uit een link, een #cadeau=… of de losse code. */
export function vindCode(tekst: string): string | null {
  const m = tekst.trim().match(/(?:cadeau=)?([A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{40,})/);
  return m ? m[1] : null;
}

/** Controleert een code; geeft het cadeau terug als hij echt is. */
export async function controleerCode(tekst: string, jwk?: JsonWebKey): Promise<Cadeau | null> {
  const code = vindCode(tekst);
  if (!code) return null;
  const [data, sig] = code.split('.');
  try {
    const ok = await crypto.subtle.verify(ALG, await openbaar(jwk), unb64url(sig), enc.encode(data));
    if (!ok) return null;
    const c = JSON.parse(new TextDecoder().decode(unb64url(data))) as Cadeau;
    if (typeof c.n !== 'string' || typeof c.i !== 'string' || typeof c.t !== 'number') return null;
    return c;
  } catch {
    return null;
  }
}

/** Past deze geheime sleutel bij de openbare sleutel van Puls? */
export function hoortBijPuls(jwk: JsonWebKey): boolean {
  return jwk.x === CADEAU_SLEUTEL.x && jwk.y === CADEAU_SLEUTEL.y;
}

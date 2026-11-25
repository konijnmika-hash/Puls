// Bewaart de geheime sleutel versleuteld met jouw beheercode (PBKDF2 + AES-GCM), alleen op dit toestel.
import { b64url, unb64url, type Cadeau } from '../lib/cadeau';

export interface Kluis { salt: string; iv: string; data: string }
export interface Gegeven extends Cadeau { code: string; notitie?: string }
export interface BeheerData { kluis: Kluis | null; cadeaus: Gegeven[] }

const KEY = 'puls-beheer-v1';
const enc = new TextEncoder();

export function laad(): BeheerData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as BeheerData;
      return { kluis: d.kluis ?? null, cadeaus: Array.isArray(d.cadeaus) ? d.cadeaus : [] };
    }
  } catch {
    /* geen opslag */
  }
  return { kluis: null, cadeaus: [] };
}

export function bewaar(d: BeheerData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}

async function afgeleid(code: string, salt: Uint8Array<ArrayBuffer>) {
  const basis = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 310_000, hash: 'SHA-256' },
    basis, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
}

export async function sluitIn(jwk: JsonWebKey, code: string): Promise<Kluis> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await afgeleid(code, salt);
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc.encode(JSON.stringify(jwk))));
  return { salt: b64url(salt), iv: b64url(iv), data: b64url(data) };
}

/** Geeft de ondertekensleutel terug, of null bij een verkeerde code. */
export async function open(kluis: Kluis, code: string): Promise<CryptoKey | null> {
  try {
    const k = await afgeleid(code, unb64url(kluis.salt));
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64url(kluis.iv) }, k, unb64url(kluis.data));
    return importeer(JSON.parse(new TextDecoder().decode(plain)) as JsonWebKey);
  } catch {
    return null;
  }
}

export function importeer(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', { ...jwk, key_ops: ['sign'], ext: false }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

import { sha256Base64Url } from './sha256';

const NONCE_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function createAppleNonce(): { rawNonce: string; hashedNonce: string } {
  const rawNonce = randomNonce(32);
  const hashedNonce = sha256Base64Url(rawNonce);
  return { rawNonce, hashedNonce };
}

function randomNonce(length: number): string {
  const buf = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < length; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  let out = '';
  for (let i = 0; i < length; i++) {
    out += NONCE_CHARS[buf[i] % NONCE_CHARS.length];
  }
  return out;
}

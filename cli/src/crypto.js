// AES-256-GCM, in the exact format the web app and the API use:
// base64(IV ‖ ciphertext ‖ 16-byte tag), key as base64url without padding.

import { webcrypto } from 'node:crypto';

const { subtle } = webcrypto;
const getRandomValues = (a) => webcrypto.getRandomValues(a);

export function generateKey() {
    return Buffer.from(getRandomValues(new Uint8Array(32))).toString('base64url');
}

function importKey(keyB64url, usage) {
    const raw = Buffer.from(keyB64url, 'base64url');
    if (raw.length !== 32) throw new Error('Invalid key: expected 256 bits');
    return subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [usage]);
}

// A fresh IV on every call: reusing one with the same key breaks GCM.
export async function encrypt(markdown, keyB64url) {
    const key = await importKey(keyB64url, 'encrypt');
    const iv = getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(markdown)));
    return Buffer.concat([iv, ct]).toString('base64');
}

export async function decrypt(body, keyB64url) {
    const key = await importKey(keyB64url, 'decrypt');
    const all = Buffer.from(body, 'base64');
    const plain = await subtle.decrypt({ name: 'AES-GCM', iv: all.subarray(0, 12) }, key, all.subarray(12));
    return new TextDecoder().decode(plain);
}

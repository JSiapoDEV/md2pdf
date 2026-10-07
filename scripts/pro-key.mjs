#!/usr/bin/env node
// Issues a Pro API key. Give the user the key; add only the hash to the
// PRO_KEY_HASHES secret (comma-separated). The key cannot be recovered from it.

import { createHash, randomBytes } from 'node:crypto';

const key = 'md2pdf_' + randomBytes(24).toString('base64url');
const hash = createHash('sha256').update(key).digest('hex');

console.log('API key (give to the user, shown once):\n  ' + key);
console.log('\nHash (add to PRO_KEY_HASHES):\n  ' + hash);
console.log('\nSet the secret with every active hash, comma-separated:\n  npx wrangler secret put PRO_KEY_HASHES');

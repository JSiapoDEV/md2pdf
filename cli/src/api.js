// Thin client for the share API. Only ciphertext and the edit key travel.

import { VERSION } from './version.js';

export const DEFAULT_API = 'https://md2pdf.studio';
export const FREE_MAX_BYTES = 512000;
export const PRO_MAX_BYTES = 5 * 1024 * 1024;

export function apiBase(value) {
    const base = new URL(value || process.env.MD2PDF_API || DEFAULT_API);
    const local = base.hostname === 'localhost' || base.hostname === '127.0.0.1';
    if (base.protocol !== 'https:' && !(local && base.protocol === 'http:')) {
        throw new Error('The API must be served over https');
    }
    return base.origin;
}

export function apiKeyOf(value) {
    return value || process.env.MD2PDF_API_KEY || undefined;
}

// The server enforces the real limit for the plan; this only avoids uploading
// something that cannot be accepted. A key means the larger Pro ceiling.
export function checkSize(markdown, apiKey) {
    if (!markdown || !markdown.trim()) throw new Error('Nothing to share: the document is empty');
    const limit = apiKey ? PRO_MAX_BYTES : FREE_MAX_BYTES;
    if (Buffer.byteLength(markdown, 'utf8') > limit) {
        throw new Error('Document too large (max ' + Math.round(limit / 1000) + ' KB)');
    }
}

// "90m", "12h", "7d", or plain seconds. The server sets the allowed range.
export function parseDuration(text) {
    const match = String(text).trim().match(/^(\d+)\s*([smhd]?)$/i);
    if (!match) throw new Error('Not a duration: ' + text + ' (use 90m, 12h, 7d or seconds)');
    const unit = { s: 1, m: 60, h: 3600, d: 86400 }[(match[2] || 's').toLowerCase()];
    return Number(match[1]) * unit;
}

// Everything optional travels in headers so the body stays pure ciphertext.
function optionHeaders({ apiKey, expiresInSec, burn, title, description }) {
    const headers = {};
    if (apiKey) headers.authorization = 'Bearer ' + apiKey;
    if (expiresInSec !== undefined) headers['x-expires-in'] = String(expiresInSec);
    if (burn) headers['x-burn'] = '1';
    if (title !== undefined) headers['x-doc-title'] = encodeURIComponent(title);
    if (description !== undefined) headers['x-doc-description'] = encodeURIComponent(description);
    return headers;
}

// Chat sandboxes (claude.ai, Claude Desktop chat) often allow only package
// registries, so npx works but the upload is blocked.
const SANDBOX_HINT = 'In a sandbox such as a claude.ai or Claude Desktop chat, code execution needs network access to md2pdf.studio (Settings → Capabilities).';

async function call(base, method, path, { body, editKey, options = {} } = {}) {
    // The User-Agent names the client and its version, nothing about the user.
    const headers = { 'content-type': 'text/plain', 'user-agent': 'md2pdf-studio/' + VERSION, ...optionHeaders(options) };
    if (body !== undefined) headers['x-encrypted'] = 'aes-256-gcm';
    if (editKey) headers['x-edit-key'] = editKey;
    let res;
    try {
        res = await fetch(base + path, { method, headers, body });
    } catch (err) {
        throw new Error('Could not reach ' + new URL(base).host + ' (' + (err.cause && err.cause.code || err.message) + '). ' + SANDBOX_HINT);
    }
    let data = null;
    try { data = await res.json(); } catch (_) { /* not an answer from md2pdf.studio */ }
    if (res.ok && data) return data;
    // The API always answers JSON. Anything else came from something in
    // between, typically a sandbox's network proxy refusing the host.
    if (!data) throw new Error('The network did not let the request reach ' + new URL(base).host + ' (HTTP ' + res.status + '). ' + SANDBOX_HINT);
    // The server explains these in plain words.
    if (['pro_required', 'daily_quota', 'invalid_api_key', 'bad_expiry', 'bad_option', 'too_large'].includes(data.code)) {
        const wait = res.status === 429 && res.headers.get('retry-after') ? ' Try again in ' + Math.ceil(Number(res.headers.get('retry-after')) / 60) + ' min.' : '';
        throw new Error(data.error + wait);
    }
    if (res.status === 429) throw new Error('Too many writes; retry in ' + (res.headers.get('retry-after') || '60') + ' s');
    if (res.status === 403) throw new Error('The edit key was rejected');
    if (res.status === 404) throw new Error('Document not found or expired');
    throw new Error(data.error || 'Request failed (' + res.status + ')');
}

export const save = (base, body, options) => call(base, 'POST', '/api/save', { body, options });
export const update = (base, id, body, editKey, options) => call(base, 'PUT', '/api/update/' + id, { body, editKey, options });
export const remove = (base, id, editKey) => call(base, 'DELETE', '/api/delete/' + id, { editKey });

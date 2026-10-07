// Share, update and delete: the three things the CLI and the MCP server do.

import { apiBase, apiKeyOf, checkSize, parseDuration, remove, save, update } from './api.js';
import { encrypt, generateKey } from './crypto.js';
import { findLink, forgetLink, rememberLink } from './store.js';

const ID_RE = /^[A-Za-z0-9]{8}$/;

// Accepts a bare ID or a full link; the key is only present in a full one.
export function parseTarget(input) {
    const text = String(input || '').trim();
    if (ID_RE.test(text)) return { id: text, key: null };
    let url;
    try { url = new URL(text); } catch (_) { throw new Error('Not a document ID or link: ' + text); }
    const id = url.pathname.match(/^\/s\/([A-Za-z0-9]{8})\/?$/)?.[1];
    if (!id) throw new Error('Not a document link: ' + text);
    return { id, key: url.hash.match(/[#&]k=([A-Za-z0-9_-]+)/)?.[1] || null };
}

// Turns user-facing options into what the API takes. Unset stays unset: an
// empty title on update clears it, no title leaves it alone.
function apiOptions({ apiKey, expires, burn, title, description }) {
    return {
        apiKey: apiKeyOf(apiKey),
        expiresInSec: expires === undefined || expires === null ? undefined : parseDuration(expires),
        burn: burn || undefined,
        title,
        description,
    };
}

export async function shareDocument({ markdown, api, name, ...rest }) {
    const options = apiOptions(rest);
    checkSize(markdown, options.apiKey);
    const base = apiBase(api);
    const key = generateKey();
    const res = await save(base, await encrypt(markdown, key), options);
    const entry = { id: res.id, editKey: res.editKey, key, url: res.url, expiresAt: res.expiresAt, created: new Date().toISOString() };
    if (name) entry.name = name;
    if (res.burn) entry.burn = true;
    if (res.title) entry.title = res.title;
    let warning;
    try {
        await rememberLink(entry);
    } catch (err) {
        warning = 'The link was created, but its edit key could not be saved (' + err.message + '). You cannot update or delete it later.';
    }
    return { id: res.id, link: res.url + '#k=' + key, expiresAt: res.expiresAt, plan: res.plan, burn: res.burn || false, title: res.title, description: res.description, warning };
}

async function resolve(targetInput) {
    const target = parseTarget(targetInput);
    const stored = await findLink(target.id);
    if (!stored) throw new Error('No edit key for ' + target.id + ' on this machine: only links made here can be changed');
    return { id: target.id, key: target.key || stored.key, editKey: stored.editKey };
}

export async function updateDocument({ target, markdown, api, ...rest }) {
    const options = apiOptions(rest);
    checkSize(markdown, options.apiKey);
    const base = apiBase(api);
    const doc = await resolve(target);
    const res = await update(base, doc.id, await encrypt(markdown, doc.key), doc.editKey, options);
    return { id: doc.id, link: res.url + '#k=' + doc.key, expiresAt: res.expiresAt, plan: res.plan, title: res.title };
}

export async function deleteDocument({ target, api }) {
    const base = apiBase(api);
    const doc = await resolve(target);
    try {
        await remove(base, doc.id, doc.editKey);
    } catch (err) {
        // Expired on the server: nothing left to delete, so just drop our copy.
        if (!/not found/i.test(err.message)) throw err;
    }
    await forgetLink(doc.id);
    return { id: doc.id, deleted: true };
}

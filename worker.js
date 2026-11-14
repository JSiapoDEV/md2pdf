// Cloudflare Worker for md2pdf.studio: the share-link API (save, update, delete),
// shared-document pages (/s/:id), and static assets. Every document is encrypted
// in the client before it reaches this Worker: it never sees a key or plaintext.

// --- Helpers ---

function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- Rate Limiting ---
// Writes (save, update, delete) go through the Workers rate-limiting binding,
// which costs no KV writes. The old KV counter spent one of the Free plan's
// 1,000 daily KV writes per request. Without the binding (a fork that removed
// it from wrangler.toml), writes are not rate limited.

function ipv6Prefix64(ip) {
    var halves = ip.split('::');
    var head = halves[0] ? halves[0].split(':') : [];
    var tail = halves.length > 1 && halves[1] ? halves[1].split(':') : [];
    var zeros = new Array(Math.max(0, 8 - head.length - tail.length)).fill('0');
    return head.concat(zeros, tail).slice(0, 4).join(':') + '::/64';
}

function clientKey(request) {
    var ip = request.headers.get('cf-connecting-ip') || 'unknown';
    // An IPv6 client usually controls a whole /64: count the prefix, not the address.
    return ip.indexOf(':') !== -1 && ip.indexOf('.') === -1 ? ipv6Prefix64(ip) : ip;
}

async function allowWrite(request, env) {
    if (!env.WRITE_LIMITER) return true;
    var outcome = await env.WRITE_LIMITER.limit({ key: clientKey(request) });
    return outcome.success;
}

// --- Plans ---
// Every limit that differs between the free service and a paid key lives here.
// Pro keys are checked by planOf(); until billing exists they are issued by hand
// (see scripts/pro-key.mjs), and only their SHA-256 hashes are configured.

var DAY_SEC = 86400;
var MB = 1024 * 1024;

var PLANS = {
    free: {
        name: 'free',
        maxBytes: 512000,
        maxExpirySec: 30 * DAY_SEC,
        defaultExpirySec: 30 * DAY_SEC,
        dailyWrites: 100,
        dailyBytes: 25 * MB,
        customPreview: false,
    },
    pro: {
        name: 'pro',
        maxBytes: 5 * MB,
        maxExpirySec: 365 * DAY_SEC,
        defaultExpirySec: 365 * DAY_SEC,
        dailyWrites: 2000,
        dailyBytes: 500 * MB,
        customPreview: true,
    },
};

var MIN_EXPIRY_SEC = 3600;
var MAX_TITLE_BYTES = 100;
var MAX_DESCRIPTION_BYTES = 300;
// KV metadata may not exceed 1,024 bytes; keep a margin.
var MAX_METADATA_BYTES = 1000;

async function sha256Hex(text) {
    var digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}

// Returns { plan, owner } where owner identifies a paid key without revealing it,
// or { error } when a key is sent but unknown: silently treating a mistyped key as
// the free plan would hide the mistake until a limit is hit.
async function planOf(request, env) {
    var header = request.headers.get('authorization');
    if (!header) return { plan: PLANS.free, owner: null };
    var match = header.match(/^Bearer\s+(\S+)$/i);
    var hash = match ? await sha256Hex(match[1]) : null;
    var known = String(env.PRO_KEY_HASHES || '').split(',').map(function (h) { return h.trim().toLowerCase(); });
    if (!hash || known.indexOf(hash) === -1) {
        return { error: jsonResponse({ error: 'Unknown API key.', code: 'invalid_api_key' }, 401) };
    }
    return { plan: PLANS.pro, owner: hash.slice(0, 32) };
}

// Options of a paid plan that is not offered yet. The message names the limit
// only; `feature` lets the counter see which one people asked for. The code
// stays pro_required because published CLIs already show its message.
function proRequired(message, feature) {
    return jsonResponse({ error: message, code: 'pro_required', feature: feature }, 403);
}

// --- Anonymous counts (Workers Analytics Engine) ---
// Each data point is an event name, the kind of client (read from the
// User-Agent) and, for Pro signals, which limit was hit. Never an IP address,
// an identifier or any content. Without the EVENTS binding nothing is written.
// Anyone can inflate these counts, so they guide decisions; they bill nobody.

var BEACON_EVENTS = [
    'copy_skill', 'download_skill', 'open_skill', 'open_about',
    'export_pdf', 'export_html', 'export_image', 'copy_formatted', 'copy_formatted_big',
    'new_document', 'template_cv', 'template_report', 'template_docs', 'template_changelog', 'template_meeting',
    // Asks: how often one is shown, and how often its link is opened.
    'open_star', 'open_star_share', 'star_ask_shown', 'star_ask_open',
];

function clientKind(request) {
    var ua = request.headers.get('user-agent') || '';
    if (/^md2pdf-studio\//.test(ua)) return 'cli';
    if (/Mozilla\//.test(ua)) return 'browser';
    return 'other';
}

function countEvent(env, request, name, detail) {
    if (!env.EVENTS) return;
    try {
        env.EVENTS.writeDataPoint({ indexes: [name], blobs: [name, clientKind(request), detail || ''], doubles: [1] });
    } catch (_) { /* counting never breaks a request */ }
}

// What a free user ran into, as a short tag: the demand a Pro plan would meet.
function proSignal(body) {
    if (!body) return null;
    if (body.code === 'pro_required') return body.feature || 'other';
    if (body.code === 'too_large' && body.feature === 'size') return 'size';
    if (body.code === 'daily_quota' && /address/.test(body.error)) return 'quota';
    return null;
}

async function countOutcome(request, env, response) {
    var path = new URL(request.url).pathname;
    var status = response.status;
    if (path === '/api/save' && request.method === 'POST' && status === 200) return countEvent(env, request, 'link_created');
    if (path === '/md2pdf-skill.zip' && request.method === 'GET' && status === 200) return countEvent(env, request, 'download_skill_zip');
    if (path === '/skill.md' && request.method === 'GET' && status === 200) return countEvent(env, request, 'skill_md');
    var writing = (path === '/api/save' && request.method === 'POST') || (path.startsWith('/api/update/') && request.method === 'PUT');
    if (writing && (status === 403 || status === 413 || status === 429)) {
        try {
            var signal = proSignal(await response.clone().json());
            if (signal) countEvent(env, request, 'pro_required', signal);
        } catch (_) { /* not JSON: nothing to count */ }
    }
}

// --- Daily quota ---
// A Durable Object counts each client's writes and bytes for the current UTC
// day. The Workers rate limiter only reaches 60-second windows. The object keeps
// counters only (no IP address) and wipes itself when the day ends.

async function takeQuota(env, request, planInfo, bytes) {
    if (!env.QUOTA) return null;
    var who = planInfo.owner ? 'key:' + planInfo.owner : 'ip:' + clientKey(request);
    var stub = env.QUOTA.get(env.QUOTA.idFromName(await sha256Hex(who)));
    var res = await stub.fetch('https://quota/take', {
        method: 'POST',
        body: JSON.stringify({ writes: 1, bytes: bytes, maxWrites: planInfo.plan.dailyWrites, maxBytes: planInfo.plan.dailyBytes }),
    });
    var out = await res.json();
    if (out.ok) return null;
    return jsonResponse({ error: 'Daily limit reached for this ' + (planInfo.owner ? 'key' : 'address') + '. It resets at 00:00 UTC.', code: 'daily_quota' }, 429, {
        'retry-after': String(out.retryAfter),
    });
}

function secondsToUtcMidnight() {
    var now = new Date();
    var next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    return Math.max(1, Math.ceil((next - now.getTime()) / 1000));
}

export class QuotaCounter {
    constructor(state) {
        this.state = state;
    }

    async fetch(request) {
        var url = new URL(request.url);
        var storage = this.state.storage;

        if (url.pathname === '/take') {
            var want = await request.json();
            var today = new Date().toISOString().slice(0, 10);
            var used = await storage.get('used');
            if (!used || used.day !== today) used = { day: today, writes: 0, bytes: 0 };
            var ok = used.writes + want.writes <= want.maxWrites && used.bytes + want.bytes <= want.maxBytes;
            if (ok) {
                used.writes += want.writes;
                used.bytes += want.bytes;
                await storage.put('used', used);
                if ((await storage.getAlarm()) === null) await storage.setAlarm(Date.now() + secondsToUtcMidnight() * 1000);
            }
            return Response.json({ ok: ok, retryAfter: secondsToUtcMidnight() });
        }

        // One-time reads: the first caller claims the document, everyone after is
        // refused. KV is eventually consistent, so deleting the key alone would
        // let a second reader at another location still get it for up to a minute.
        if (url.pathname === '/claim') {
            if (await storage.get('claimed')) return Response.json({ ok: false });
            await storage.put('claimed', true);
            await storage.setAlarm(Date.now() + 31 * DAY_SEC * 1000);
            return Response.json({ ok: true });
        }

        return new Response('Not found', { status: 404 });
    }

    async alarm() {
        await this.state.storage.deleteAll();
    }
}

// --- Request options ---
// Expiry, one-time reads and the preview card travel in headers so the body stays
// pure ciphertext. The preview text is the one thing the server reads: it must
// be, because link unfurlers (WhatsApp, Slack) never see the key.

function utf8Length(text) {
    return new TextEncoder().encode(text).length;
}

function cleanText(raw) {
    // Headers cannot carry line breaks; collapse whitespace and drop control characters.
    return raw.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function readOptionHeader(request, name, limit) {
    var raw = request.headers.get(name);
    if (raw === null) return { present: false };
    var text;
    try { text = cleanText(decodeURIComponent(raw)); } catch (e) {
        return { error: jsonResponse({ error: name + ' must be percent-encoded UTF-8.', code: 'bad_option' }, 400) };
    }
    if (utf8Length(text) > limit) {
        return { error: jsonResponse({ error: name + ' is too long (max ' + limit + ' bytes).', code: 'bad_option' }, 400) };
    }
    return { present: true, value: text };
}

// Returns { expiresInSec, burn, title, description } (each undefined when not
// sent; title and description are '' to clear) or { error }.
function readOptions(request, plan) {
    var out = {};

    var expires = request.headers.get('x-expires-in');
    if (expires !== null) {
        if (!/^\d{1,9}$/.test(expires) || Number(expires) < MIN_EXPIRY_SEC) {
            return { error: jsonResponse({ error: 'X-Expires-In is a number of seconds, at least ' + MIN_EXPIRY_SEC + '.', code: 'bad_expiry' }, 400) };
        }
        if (Number(expires) > plan.maxExpirySec) {
            if (plan.name === 'free' && Number(expires) <= PLANS.pro.maxExpirySec) return { error: proRequired('Links last at most 30 days.', 'expiry') };
            return { error: jsonResponse({ error: 'X-Expires-In is above the ' + (plan.maxExpirySec / DAY_SEC) + '-day maximum.', code: 'bad_expiry' }, 400) };
        }
        out.expiresInSec = Number(expires);
    }

    var burn = request.headers.get('x-burn');
    if (burn !== null) out.burn = burn === '1' || burn.toLowerCase() === 'true';

    var title = readOptionHeader(request, 'x-doc-title', MAX_TITLE_BYTES);
    if (title.error) return { error: title.error };
    var description = readOptionHeader(request, 'x-doc-description', MAX_DESCRIPTION_BYTES);
    if (description.error) return { error: description.error };
    if ((title.present && title.value) || (description.present && description.value)) {
        if (!plan.customPreview) return { error: proRequired('A custom title and description are not available.', 'preview') };
    }
    if (title.present) out.title = title.value;
    if (description.present) out.description = description.value;
    return out;
}

// Metadata is rebuilt from scratch on every write so empty values never linger.
function withPreview(meta, title, description) {
    if (title) meta.title = title; else delete meta.title;
    if (description) meta.description = description; else delete meta.description;
    return meta;
}

function metadataFits(meta) {
    return utf8Length(JSON.stringify(meta)) <= MAX_METADATA_BYTES;
}

function expiryOptions(metadata) {
    if (metadata && metadata.expiresAt) {
        return { expiration: Math.floor(metadata.expiresAt / 1000) };
    }
    return { expirationTtl: LEGACY_TTL_SECONDS };
}

function expiresAtOf(metadata) {
    return metadata && metadata.expiresAt ? metadata.expiresAt : Date.now() + LEGACY_TTL_SECONDS * 1000;
}

// --- Document lifetime ---
// New documents live from creation until the expiry the plan allows; updates do
// not extend it. Documents created before expiry was stored carry no `expiresAt`
// in their metadata and keep the terms they were created under (90 days, reset
// on every update).

var LEGACY_TTL_SECONDS = DAY_SEC * 90;

// IDs come from generateId(): 8 base62 characters. Anything else never reaches KV.
var DOC_ID_RE = /^[A-Za-z0-9]{8}$/;

// --- Security headers ---
// Static pages get the same policy from public/_headers — keep both in sync.

var CSP = [
    "default-src 'self'",
    // Every library is served from this origin, so no CDN can inject a script.
    // static.cloudflareinsights.com is Cloudflare's cookieless page-view counter.
    "script-src 'self' https://static.cloudflareinsights.com",
    // Custom CSS may @import any HTTPS stylesheet or font; inline styles are
    // already allowed, so this adds no script capability.
    "style-src 'self' 'unsafe-inline' https:",
    "font-src 'self' https: data:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "connect-src 'self' https://cloudflareinsights.com",
    "frame-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
].join('; ');

function htmlHeaders(noindex) {
    var h = {
        'content-type': 'text/html;charset=UTF-8',
        'content-security-policy': CSP,
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    };
    // Shared documents are private by default: keep them out of search results.
    if (noindex) h['x-robots-tag'] = 'noindex, nofollow, noarchive';
    return h;
}

function jsonResponse(body, status, extraHeaders) {
    return new Response(JSON.stringify(body), {
        status: status || 200,
        // No CORS headers: only md2pdf.studio's own pages (same origin), the CLI
        // and other non-browser clients can use the API. Another website can
        // no longer call it from its visitors' browsers.
        headers: Object.assign({
            'content-type': 'application/json',
            'x-content-type-options': 'nosniff',
        }, extraHeaders || {}),
    });
}

function tooManyRequests() {
    return jsonResponse({ error: 'Too many requests. Try again in a minute.' }, 429, {
        'retry-after': '60',
    });
}

// --- Write validation ---
// Every write is end-to-end encrypted: the client sends base64(IV ‖ AES-256-GCM
// ciphertext ‖ tag) and keeps the key in the link's #k= fragment. The limit
// applies to the Markdown, not to its encoding: the plan's size limit of UTF-8
// becomes at most the base64 of that much ciphertext plus the 12-byte IV and
// 16-byte tag.

function maxCiphertextChars(plan) {
    return Math.ceil((plan.maxBytes + 28) / 3) * 4;
}

var BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

// Tools like `base64` and `openssl enc -base64` wrap lines; accept that and
// store the compact form. Only line breaks: stripping spaces too would let
// plain prose pass as base64.
function stripBase64Whitespace(body) {
    return body.replace(/[\r\n]+/g, '');
}

// Returns { body } with the compact ciphertext, or { error } with the response
// to send back. Plaintext is never accepted, and neither is a key in a header:
// it would reach proxy and CDN logs.
async function readCiphertext(request, plan) {
    if (request.headers.get('x-enc-key')) {
        return { error: jsonResponse({
            error: 'Never send the encryption key to the server. It stays in the link fragment (#k=).',
            code: 'key_leak_blocked',
        }, 400) };
    }
    if (request.headers.get('x-encrypted') !== 'aes-256-gcm') {
        return { error: jsonResponse({
            error: 'End-to-end encryption is required. Encrypt with AES-256-GCM locally and send header `X-Encrypted: aes-256-gcm`. Or let the CLI do it: npx -y md2pdf-studio share <file>. How links work: https://md2pdf.studio/api.',
            code: 'e2ee_required',
        }, 400) };
    }
    var body = stripBase64Whitespace(await request.text());
    if (!body.trim()) return { error: jsonResponse({ error: 'Empty content' }, 400) };
    if (body.length > maxCiphertextChars(plan)) {
        return { error: jsonResponse({ error: 'Document too large (max ' + Math.round(plan.maxBytes / 1000) + ' KB)', code: 'too_large', feature: plan.name === 'free' ? 'size' : undefined }, 413) };
    }
    // X-Encrypted promises ciphertext. Plain Markdown sent with it would be
    // stored in clear while everything says it is encrypted.
    if (body.length < 40 || body.length % 4 !== 0 || !BASE64_RE.test(body)) {
        return { error: jsonResponse({
            error: 'With X-Encrypted the body must be base64(IV ‖ AES-256-GCM ciphertext ‖ tag).',
            code: 'not_ciphertext',
        }, 400) };
    }
    return { body: body };
}

// --- Helpers ---

function generateId() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    return Array.from(arr, function (b) { return chars[b % chars.length]; }).join('');
}

function generateEditKey() {
    var arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return Array.from(arr, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}

// --- A ZIP with one stored (uncompressed) file: what claude.ai's skill upload takes ---

function crc32(bytes) {
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) {
        var c = (crc ^ bytes[i]) & 0xFF;
        for (var k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1;
        crc = (crc >>> 8) ^ c;
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function zipOneFile(path, text) {
    var name = new TextEncoder().encode(path);
    var data = new TextEncoder().encode(text);
    var crc = crc32(data);
    var DOS_DATE = 0x21; // 1980-01-01, so the same skill always gives the same bytes
    var out = new Uint8Array(30 + name.length + data.length + 46 + name.length + 22);
    var view = new DataView(out.buffer);
    var at = 0;
    // Local file header
    view.setUint32(at, 0x04034b50, true);
    view.setUint16(at + 4, 20, true);
    view.setUint16(at + 6, 0x0800, true); // names are UTF-8
    view.setUint16(at + 12, DOS_DATE, true);
    view.setUint32(at + 14, crc, true);
    view.setUint32(at + 18, data.length, true);
    view.setUint32(at + 22, data.length, true);
    view.setUint16(at + 26, name.length, true);
    out.set(name, at + 30);
    out.set(data, at + 30 + name.length);
    var central = at + 30 + name.length + data.length;
    // Central directory entry
    view.setUint32(central, 0x02014b50, true);
    view.setUint16(central + 4, 20, true);
    view.setUint16(central + 6, 20, true);
    view.setUint16(central + 8, 0x0800, true);
    view.setUint16(central + 14, DOS_DATE, true);
    view.setUint32(central + 16, crc, true);
    view.setUint32(central + 20, data.length, true);
    view.setUint32(central + 24, data.length, true);
    view.setUint16(central + 28, name.length, true);
    out.set(name, central + 46);
    // End of central directory
    var end = central + 46 + name.length;
    view.setUint32(end, 0x06054b50, true);
    view.setUint16(end + 8, 1, true);
    view.setUint16(end + 10, 1, true);
    view.setUint32(end + 12, 46 + name.length, true);
    view.setUint32(end + 16, central, true);
    return out;
}

// The server never reads shared documents, so links get the same generic preview
// unless the author set a title and description (Pro): those are stored in clear.
var SHARED_META = {
    title: 'Shared document — MD2PDF',
    description: 'Open the full link to view this document in MD2PDF.',
};

function injectContent(html, content, preview) {
    var title = (preview && preview.title) || SHARED_META.title;
    var description = (preview && preview.description) || SHARED_META.description;
    var safeTitle = escapeHtml(title);
    var safeDesc = escapeHtml(description);
    // Escape for safe JSON inside <script>
    var safeJson = JSON.stringify(content).replace(/</g, '\\u003c');

    // Replacer functions keep the inserted text literal: a string replacement
    // would expand $&, $' and $` found in the document.
    html = html.replace('</head>', function () {
        return '<script id="shared-content" type="application/json">' + safeJson + '</script>\n</head>';
    });
    if (preview && preview.title) {
        html = html.replace(/<title>[^<]*<\/title>/, function () { return '<title>' + safeTitle + ' — MD2PDF</title>'; });
    }
    html = html.replace(/<meta property="og:title"[^>]*>/, function () { return '<meta property="og:title" content="' + safeTitle + '">'; });
    html = html.replace(/<meta property="og:description"[^>]*>/, function () { return '<meta property="og:description" content="' + safeDesc + '">'; });
    html = html.replace(/<meta name="twitter:title"[^>]*>/, function () { return '<meta name="twitter:title" content="' + safeTitle + '">'; });
    html = html.replace(/<meta name="twitter:description"[^>]*>/, function () { return '<meta name="twitter:description" content="' + safeDesc + '">'; });
    html = html.replace(/<meta name="description"[^>]*>/, function () { return '<meta name="description" content="' + safeDesc + '">'; });

    return html;
}

async function getIndexHtml(env, request) {
    var assetReq = new Request(new URL('/', request.url).toString());
    var response = await env.ASSETS.fetch(assetReq);
    return response.text();
}

// What the API tells the caller about a stored document.
function describeDocument(url, id, meta, editKey) {
    var out = { id: id, url: url.origin + '/s/' + id, expiresAt: new Date(expiresAtOf(meta)).toISOString(), plan: meta.plan || 'free' };
    if (editKey) out.editKey = editKey;
    if (meta.burn) out.burn = true;
    if (meta.title) out.title = meta.title;
    if (meta.description) out.description = meta.description;
    return out;
}

// --- Worker entry point ---

export default {
    async fetch(request, env, ctx) {
        var response = await route(request, env);
        var counting = countOutcome(request, env, response);
        if (ctx && ctx.waitUntil) ctx.waitUntil(counting);
        return response;
    },
};

async function route(request, env) {
        var url = new URL(request.url);

        // --- POST /api/event — a click the page reports (skill, About, export, copy, new document, template) ---
        if (url.pathname === '/api/event' && request.method === 'POST') {
            if (Number(request.headers.get('content-length') || 0) > 64) return new Response(null, { status: 413 });
            var eventName = (await request.text()).trim();
            if (eventName.length > 64) return new Response(null, { status: 413 });
            if (BEACON_EVENTS.indexOf(eventName) !== -1) countEvent(env, request, eventName);
            return new Response(null, { status: 204 });
        }

        // --- POST /api/save — store a client-encrypted document, return short URL ---
        if (url.pathname === '/api/save' && request.method === 'POST') {
            try {
                var saver = await planOf(request, env);
                if (saver.error) return saver.error;
                var written = await readCiphertext(request, saver.plan);
                if (written.error) return written.error;
                var wanted = readOptions(request, saver.plan);
                if (wanted.error) return wanted.error;
                if (!(await allowWrite(request, env))) return tooManyRequests();
                var overQuota = await takeQuota(env, request, saver, written.body.length);
                if (overQuota) return overQuota;

                var id = generateId();
                var created = Date.now();
                var lifetime = wanted.expiresInSec || saver.plan.defaultExpirySec;
                var saveMeta = {
                    editKey: generateEditKey(), created: created, expiresAt: created + lifetime * 1000,
                    encrypted: true, plan: saver.plan.name,
                };
                if (wanted.burn) saveMeta.burn = true;
                withPreview(saveMeta, wanted.title, wanted.description);
                if (!metadataFits(saveMeta)) return jsonResponse({ error: 'Title and description are too long together.', code: 'bad_option' }, 400);
                await env.DOCS.put(id, written.body, Object.assign({ metadata: saveMeta }, expiryOptions(saveMeta)));

                return jsonResponse(describeDocument(url, id, saveMeta, saveMeta.editKey));
            } catch (e) {
                return jsonResponse({ error: 'Save failed' }, 500);
            }
        }

        // --- PUT /api/update/:id — replace a document with new ciphertext ---
        if (url.pathname.startsWith('/api/update/') && request.method === 'PUT') {
            try {
                var updateId = url.pathname.slice(12);
                if (!DOC_ID_RE.test(updateId)) return jsonResponse({ error: 'Document not found' }, 404);

                var updater = await planOf(request, env);
                if (updater.error) return updater.error;
                var updated = await readCiphertext(request, updater.plan);
                if (updated.error) return updated.error;
                var changes = readOptions(request, updater.plan);
                if (changes.error) return changes.error;
                if (changes.burn !== undefined) return jsonResponse({ error: 'One-time reads can only be chosen when the link is created.', code: 'bad_option' }, 400);
                if (!(await allowWrite(request, env))) return tooManyRequests();

                var existing = await env.DOCS.getWithMetadata(updateId);
                var existingMeta = existing.metadata || {};
                // KV rejects expirations less than 60 s away, and an expired key can
                // still be served for a while: treat both as gone.
                if (!existing.value || (existingMeta.expiresAt && existingMeta.expiresAt - Date.now() < 61000)) {
                    return jsonResponse({ error: 'Document not found' }, 404);
                }
                if (!existingMeta.editKey || existingMeta.editKey !== request.headers.get('x-edit-key')) {
                    return jsonResponse({ error: 'Unauthorized' }, 403);
                }
                var overUpdateQuota = await takeQuota(env, request, updater, updated.body.length);
                if (overUpdateQuota) return overUpdateQuota;

                var updatedMeta = Object.assign({}, existingMeta, { encrypted: true });
                if (changes.expiresInSec) {
                    var newExpiry = Date.now() + changes.expiresInSec * 1000;
                    // Only a paid key can push the end date out; anyone may shorten it.
                    if (newExpiry > expiresAtOf(existingMeta) && updater.plan.name !== 'pro') {
                        return proRequired('A link\'s expiry can only be shortened.', 'extend');
                    }
                    updatedMeta.expiresAt = newExpiry;
                }
                if (changes.title !== undefined || changes.description !== undefined) {
                    withPreview(updatedMeta,
                        changes.title !== undefined ? changes.title : existingMeta.title,
                        changes.description !== undefined ? changes.description : existingMeta.description);
                }
                if (!metadataFits(updatedMeta)) return jsonResponse({ error: 'Title and description are too long together.', code: 'bad_option' }, 400);
                await env.DOCS.put(updateId, updated.body, Object.assign({ metadata: updatedMeta }, expiryOptions(updatedMeta)));

                return jsonResponse(describeDocument(url, updateId, updatedMeta));
            } catch (e) {
                return jsonResponse({ error: 'Update failed' }, 500);
            }
        }

        // --- DELETE /api/delete/:id — remove a document (requires its editKey) ---
        if (url.pathname.startsWith('/api/delete/') && request.method === 'DELETE') {
            try {
                var deleteId = url.pathname.slice(12);
                if (!DOC_ID_RE.test(deleteId)) return jsonResponse({ error: 'Document not found' }, 404);
                if (!(await allowWrite(request, env))) return tooManyRequests();

                var target = await env.DOCS.getWithMetadata(deleteId);
                if (!target.value) return jsonResponse({ error: 'Document not found' }, 404);

                var deleteKey = target.metadata && target.metadata.editKey;
                if (!deleteKey || deleteKey !== request.headers.get('x-edit-key')) {
                    return jsonResponse({ error: 'Unauthorized' }, 403);
                }

                await env.DOCS.delete(deleteId);
                return jsonResponse({ id: deleteId, deleted: true });
            } catch (e) {
                return jsonResponse({ error: 'Delete failed' }, 500);
            }
        }

        // --- POST /api/open/:id — read a one-time document, once ---
        if (url.pathname.startsWith('/api/open/') && request.method === 'POST') {
            try {
                var openId = url.pathname.slice(10);
                var gone = jsonResponse({ error: 'Document not found, expired, or already opened.' }, 404);
                if (!DOC_ID_RE.test(openId)) return gone;
                var burnDoc = await env.DOCS.getWithMetadata(openId);
                var burnMeta = burnDoc.metadata || {};
                if (!burnDoc.value || !burnMeta.burn || (burnMeta.expiresAt && burnMeta.expiresAt < Date.now())) return gone;
                if (env.QUOTA) {
                    var claim = await env.QUOTA.get(env.QUOTA.idFromName('burn:' + openId)).fetch('https://quota/claim', { method: 'POST' });
                    if (!(await claim.json()).ok) return gone;
                }
                await env.DOCS.delete(openId);
                return jsonResponse({ content: burnDoc.value }, 200, { 'cache-control': 'no-store' });
            } catch (e) {
                return jsonResponse({ error: 'Open failed' }, 500);
            }
        }

        // --- Cross-origin preflight for /api/*: refused, so browsers on other sites cannot write ---
        if (url.pathname.startsWith('/api/') && request.method === 'OPTIONS') {
            return new Response(null, { status: 403 });
        }

        // --- GET /s/:id — load document from KV ---
        if (url.pathname.startsWith('/s/') && url.pathname.length > 3) {
            try {
                var id = url.pathname.slice(3);
                var result = DOC_ID_RE.test(id) ? await env.DOCS.getWithMetadata(id) : { value: null };

                if (!result.value) {
                    return new Response('Document not found or expired.', {
                        status: 404,
                        headers: { 'content-type': 'text/plain', 'x-robots-tag': 'noindex' },
                    });
                }

                var html = await getIndexHtml(env, request);
                // A one-time document is not sent with the page: link unfurlers
                // fetch every link, and would use it up before the recipient. The
                // page asks the reader to open it, which calls /api/open.
                var served = (result.metadata && result.metadata.burn) ? { burn: true } : result.value;
                html = injectContent(html, served, result.metadata);

                return new Response(html, {
                    headers: Object.assign(htmlHeaders(true), { 'cache-control': 'no-store' }),
                });
            } catch (e) {
                return new Response('Error loading document.', {
                    status: 500,
                    headers: { 'content-type': 'text/plain' },
                });
            }
        }

        // --- /share?doc= — retired links that carried the whole document in the address ---
        if (url.pathname === '/share' && url.searchParams.has('doc')) {
            return new Response('This link format was retired: it carried the document unencrypted in the address. Ask the sender for a new link.', {
                status: 410,
                headers: { 'content-type': 'text/plain', 'x-robots-tag': 'noindex' },
            });
        }

        // --- The skill as a ZIP for claude.ai, built from /skill.md so the two never differ ---
        if (url.pathname === '/md2pdf-skill.zip' && (request.method === 'GET' || request.method === 'HEAD')) {
            var skillRes = await env.ASSETS.fetch(new Request(new URL('/skill.md', url)));
            if (!skillRes.ok) return new Response('Not found', { status: 404 });
            return new Response(request.method === 'HEAD' ? null : zipOneFile('md2pdf/SKILL.md', await skillRes.text()), {
                headers: {
                    'content-type': 'application/zip',
                    'content-disposition': 'attachment; filename="md2pdf-skill.zip"',
                    'cache-control': 'public, max-age=3600',
                },
            });
        }

        // --- Serve llms.txt / llms-full.txt with correct Content-Type ---
        if (url.pathname === '/llms.txt' || url.pathname === '/llms-full.txt' || url.pathname === '/skill.md') {
            var llmsRes = await env.ASSETS.fetch(request);
            return new Response(llmsRes.body, {
                status: llmsRes.status,
                headers: {
                    'content-type': 'text/markdown; charset=UTF-8',
                    'cache-control': 'public, max-age=86400',
                },
            });
        }

        // --- Serve static assets for everything else ---
        return env.ASSETS.fetch(request);
}

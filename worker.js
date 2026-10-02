// Cloudflare Worker for md2pdf.studio: the share-link API (save, update, delete),
// shared-document pages (/s/:id and legacy /share?doc=), and static assets.

// --- LZ-String decompressFromEncodedURIComponent (inlined) ---

function _decompress(length, resetValue, getNextValue) {
    var dictionary = [], enlargeIn = 4, dictSize = 4, numBits = 3,
        entry = '', result = [], i, w, bits, resb, maxpower, power, c,
        data = { val: getNextValue(0), position: resetValue, index: 1 };

    for (i = 0; i < 3; i++) dictionary[i] = i;

    bits = 0; maxpower = Math.pow(2, 2); power = 1;
    while (power != maxpower) {
        resb = data.val & data.position; data.position >>= 1;
        if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); }
        bits |= (resb > 0 ? 1 : 0) * power; power <<= 1;
    }

    var next = bits;
    switch (next) {
        case 0:
            bits = 0; maxpower = Math.pow(2, 8); power = 1;
            while (power != maxpower) {
                resb = data.val & data.position; data.position >>= 1;
                if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); }
                bits |= (resb > 0 ? 1 : 0) * power; power <<= 1;
            }
            c = String.fromCharCode(bits); break;
        case 1:
            bits = 0; maxpower = Math.pow(2, 16); power = 1;
            while (power != maxpower) {
                resb = data.val & data.position; data.position >>= 1;
                if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); }
                bits |= (resb > 0 ? 1 : 0) * power; power <<= 1;
            }
            c = String.fromCharCode(bits); break;
        case 2: return '';
    }

    dictionary[3] = c; w = c; result.push(c);

    while (true) {
        if (data.index > length) return '';

        bits = 0; maxpower = Math.pow(2, numBits); power = 1;
        while (power != maxpower) {
            resb = data.val & data.position; data.position >>= 1;
            if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); }
            bits |= (resb > 0 ? 1 : 0) * power; power <<= 1;
        }

        switch (c = bits) {
            case 0:
                bits = 0; maxpower = Math.pow(2, 8); power = 1;
                while (power != maxpower) {
                    resb = data.val & data.position; data.position >>= 1;
                    if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); }
                    bits |= (resb > 0 ? 1 : 0) * power; power <<= 1;
                }
                dictionary[dictSize++] = String.fromCharCode(bits);
                c = dictSize - 1; enlargeIn--; break;
            case 1:
                bits = 0; maxpower = Math.pow(2, 16); power = 1;
                while (power != maxpower) {
                    resb = data.val & data.position; data.position >>= 1;
                    if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); }
                    bits |= (resb > 0 ? 1 : 0) * power; power <<= 1;
                }
                dictionary[dictSize++] = String.fromCharCode(bits);
                c = dictSize - 1; enlargeIn--; break;
            case 2: return result.join('');
        }

        if (enlargeIn == 0) { enlargeIn = Math.pow(2, numBits); numBits++; }

        if (dictionary[c]) {
            entry = dictionary[c];
        } else if (c === dictSize) {
            entry = w + w.charAt(0);
        } else {
            return null;
        }

        result.push(entry);
        dictionary[dictSize++] = w + entry.charAt(0);
        enlargeIn--;
        w = entry;

        if (enlargeIn == 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
    }
}

function decompressFromEncodedURIComponent(input) {
    if (input == null) return '';
    if (input == '') return null;
    input = input.replace(/ /g, '+');

    var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$';
    var baseReverseDic = {};
    for (var i = 0; i < keyStr.length; i++) baseReverseDic[keyStr.charAt(i)] = i;

    return _decompress(input.length, 32, function (index) {
        return baseReverseDic[input.charAt(index)];
    });
}

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

// --- Document lifetime ---
// New documents live a fixed 30 days from creation; updates do not extend it.
// Documents created before this rule carry no `expiresAt` in their metadata and
// keep the terms they were created under (90 days, reset on every update).

var FREE_TTL_MS = 86400 * 1000 * 30;
var LEGACY_TTL_SECONDS = 86400 * 90;

function expiryOptions(metadata) {
    if (metadata && metadata.expiresAt) {
        return { expiration: Math.floor(metadata.expiresAt / 1000) };
    }
    return { expirationTtl: LEGACY_TTL_SECONDS };
}

function expiresAtOf(metadata) {
    return metadata && metadata.expiresAt ? metadata.expiresAt : Date.now() + LEGACY_TTL_SECONDS * 1000;
}

// IDs come from generateId(): 8 base62 characters. Anything else never reaches KV.
var DOC_ID_RE = /^[A-Za-z0-9]{8}$/;

// --- Security headers ---
// Static pages get the same policy from public/_headers — keep both in sync.

var CSP = [
    "default-src 'self'",
    // Exact library paths, not whole CDNs: anyone can publish a script to
    // jsDelivr (any npm package) or find a gadget among cdnjs's libraries.
    "script-src 'self' https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.1/ https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/ " +
        "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/ https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.5.0/ " +
        "https://cdn.jsdelivr.net/npm/mermaid@11/ https://static.cloudflareinsights.com",
    // Custom CSS may @import any HTTPS stylesheet or font; inline styles are
    // already allowed, so this adds no script capability.
    "style-src 'self' 'unsafe-inline' https:",
    "font-src 'self' https: data:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "connect-src 'self' https://cdnjs.cloudflare.com https://cloudflareinsights.com https://api.github.com",
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
        headers: Object.assign({
            'content-type': 'application/json',
            'access-control-allow-origin': '*',
            'x-content-type-options': 'nosniff',
        }, extraHeaders || {}),
    });
}

function tooManyRequests() {
    return jsonResponse({ error: 'Too many requests. Try again in a minute.' }, 429, {
        'retry-after': '60',
        'access-control-expose-headers': 'retry-after',
    });
}

// --- Write validation ---
// The limit applies to the Markdown, not to its encoding: 500 KB of UTF-8, or
// the base64 of that much AES-GCM output (12-byte IV + ciphertext + 16-byte tag).

var MAX_DOC_BYTES = 512000;
var MAX_CIPHERTEXT_CHARS = Math.ceil((MAX_DOC_BYTES + 28) / 3) * 4;
var BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

// Tools like `base64` and `openssl enc -base64` wrap lines; atob() ignores the
// whitespace, so accept it and store the compact form.
function stripBase64Whitespace(body) {
    return body.replace(/[\t\n\f\r ]+/g, '');
}

// Returns an error response, or null when the body can be stored.
function checkWriteBody(body, clientEncrypted, strictE2EE) {
    if (!body || !body.trim()) return jsonResponse({ error: 'Empty content' }, 400);
    if (strictE2EE && !clientEncrypted) {
        return jsonResponse({
            error: 'This deployment requires end-to-end encryption. Encrypt with AES-256-GCM locally and send header `X-Encrypted: aes-256-gcm` (never X-Enc-Key). See https://md2pdf.studio/skill.md for worked examples.',
            code: 'e2ee_required',
        }, 400);
    }
    if (clientEncrypted) {
        if (body.length > MAX_CIPHERTEXT_CHARS) return jsonResponse({ error: 'Document too large (max 500KB)' }, 413);
        // X-Encrypted promises ciphertext. Plain Markdown sent with it would be
        // stored in clear while everything says it is encrypted.
        if (body.length < 40 || body.length % 4 !== 0 || !BASE64_RE.test(body)) {
            return jsonResponse({
                error: 'With X-Encrypted the body must be base64(IV ‖ AES-256-GCM ciphertext ‖ tag).',
                code: 'not_ciphertext',
            }, 400);
        }
    } else if (new TextEncoder().encode(body).length > MAX_DOC_BYTES) {
        return jsonResponse({ error: 'Document too large (max 500KB)' }, 413);
    }
    return null;
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

// ── Server-side E2EE (AES-256-GCM) ──────────────────

// String.fromCharCode.apply() throws on large arrays (documents over ~100 KB
// failed with a 500), so encode in chunks.
function bytesToBase64(bytes) {
    var binary = '';
    for (var i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
}

function toBase64url(buf) {
    return bytesToBase64(new Uint8Array(buf))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(b64) {
    var str = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
    var arr = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i);
    return arr;
}

async function serverEncrypt(plaintext) {
    var key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var encoded = new TextEncoder().encode(plaintext);
    var ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, encoded);
    // Combine IV + ciphertext, then base64
    var combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    var encData = bytesToBase64(combined);
    // Export key as base64url
    var rawKey = await crypto.subtle.exportKey('raw', key);
    var encKey = toBase64url(rawKey);
    return { encData: encData, encKey: encKey };
}

async function serverReencrypt(plaintext, encKeyB64) {
    var rawKey = fromBase64url(encKeyB64);
    var key = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var encoded = new TextEncoder().encode(plaintext);
    var ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, encoded);
    var combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return bytesToBase64(combined);
}

// The server never reads shared documents, so every link gets the same preview.
var SHARED_META = {
    title: 'Shared document — MD2PDF',
    description: 'Open the full link to view this document in MD2PDF.',
};

function injectContent(html, content) {
    var safeTitle = escapeHtml(SHARED_META.title);
    var safeDesc = escapeHtml(SHARED_META.description);
    // Escape for safe JSON inside <script>
    var safeJson = JSON.stringify(content).replace(/</g, '\\u003c');

    // Replacer functions keep the inserted text literal: a string replacement
    // would expand $&, $' and $` found in the document.
    html = html.replace('</head>', function () {
        return '<script id="shared-content" type="application/json">' + safeJson + '</script>\n</head>';
    });
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

// --- Worker entry point ---

export default {
    async fetch(request, env) {
        var url = new URL(request.url);
        // Strict mode: reject plaintext writes and disable the legacy unencrypted
        // read path. Enable per deployment with wrangler var STRICT_E2EE="true".
        var strictE2EE = env.STRICT_E2EE === 'true';

        // --- POST /api/save — save markdown to KV, return short URL ---
        if (url.pathname === '/api/save' && request.method === 'POST') {
            try {
                var body = await request.text();
                var clientEncrypted = request.headers.get('x-encrypted') === 'aes-256-gcm';
                if (clientEncrypted) body = stripBase64Whitespace(body);
                var invalid = checkWriteBody(body, clientEncrypted, strictE2EE);
                if (invalid) return invalid;
                if (!(await allowWrite(request, env))) return tooManyRequests();

                var id = generateId();
                var editKey = generateEditKey();
                var storedBody, encKey;

                if (clientEncrypted) {
                    // Client already encrypted — store as-is
                    storedBody = body;
                    encKey = null; // key is in the client's URL hash
                } else {
                    // Server-side encryption for API consumers
                    var enc = await serverEncrypt(body);
                    storedBody = enc.encData;
                    encKey = enc.encKey;
                }

                var created = Date.now();
                var saveMeta = { editKey: editKey, created: created, expiresAt: created + FREE_TTL_MS, encrypted: true };
                await env.DOCS.put(id, storedBody, Object.assign({ metadata: saveMeta }, expiryOptions(saveMeta)));

                var responseBody = {
                    id: id,
                    editKey: editKey,
                    url: url.origin + '/s/' + id,
                    expiresAt: new Date(saveMeta.expiresAt).toISOString(),
                };
                if (encKey) responseBody.key = encKey;
                return jsonResponse(responseBody);
            } catch (e) {
                return jsonResponse({ error: 'Save failed' }, 500);
            }
        }

        // --- PUT /api/update/:id — update existing document ---
        if (url.pathname.startsWith('/api/update/') && request.method === 'PUT') {
            try {
                var updateId = url.pathname.slice(12);
                if (!DOC_ID_RE.test(updateId)) return jsonResponse({ error: 'Document not found' }, 404);

                var updateBody = await request.text();
                var clientEncrypted = request.headers.get('x-encrypted') === 'aes-256-gcm';
                if (clientEncrypted) updateBody = stripBase64Whitespace(updateBody);
                var encKeyHeader = request.headers.get('x-enc-key');
                var invalid = checkWriteBody(updateBody, clientEncrypted, strictE2EE);
                if (invalid) return invalid;
                if (strictE2EE && encKeyHeader) {
                    // Fail loud: the key must never cross the wire in strict mode,
                    // even if accompanied by X-Encrypted — it may leak to proxy/CDN logs.
                    return jsonResponse({
                        error: 'X-Enc-Key must not be sent on this deployment. The encryption key must stay client-side.',
                        code: 'key_leak_blocked',
                    }, 400);
                }
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

                var updatedBody;
                if (clientEncrypted) {
                    // Client already encrypted
                    updatedBody = updateBody;
                } else if (encKeyHeader) {
                    // API consumer sent the encryption key — re-encrypt server-side
                    try {
                        updatedBody = await serverReencrypt(updateBody, encKeyHeader);
                    } catch (e) {
                        return jsonResponse({ error: 'Invalid X-Enc-Key', code: 'invalid_key' }, 400);
                    }
                } else {
                    // No key provided: encrypt with a new one. Links shared with the
                    // old #k= stop working; the response carries the new key.
                    var enc = await serverEncrypt(updateBody);
                    updatedBody = enc.encData;
                    encKeyHeader = enc.encKey;
                }

                var updatedMeta = Object.assign({}, existingMeta, { encrypted: true });
                await env.DOCS.put(updateId, updatedBody, Object.assign({ metadata: updatedMeta }, expiryOptions(updatedMeta)));

                var updateResponse = {
                    id: updateId,
                    url: url.origin + '/s/' + updateId,
                    expiresAt: new Date(expiresAtOf(updatedMeta)).toISOString(),
                };
                if (encKeyHeader && !clientEncrypted) updateResponse.key = encKeyHeader;
                return jsonResponse(updateResponse);
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

        // --- CORS preflight for /api/* ---
        if (url.pathname.startsWith('/api/') && request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'access-control-allow-origin': '*',
                    'access-control-allow-methods': 'POST, PUT, DELETE, OPTIONS',
                    'access-control-allow-headers': 'Content-Type, X-Edit-Key, X-Encrypted, X-Enc-Key',
                },
            });
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
                html = injectContent(html, result.value);

                return new Response(html, {
                    headers: htmlHeaders(true),
                });
            } catch (e) {
                return new Response('Error loading document.', {
                    status: 500,
                    headers: { 'content-type': 'text/plain' },
                });
            }
        }

        // --- GET /share?doc= — legacy LZ-string compressed sharing ---
        var docParam = url.searchParams.get('doc');
        if (url.pathname === '/share' && docParam) {
            if (strictE2EE) {
                return new Response('Legacy unencrypted share links are disabled on this deployment.', {
                    status: 410,
                    headers: { 'content-type': 'text/plain' },
                });
            }
            try {
                var lzContent = decompressFromEncodedURIComponent(docParam);

                if (lzContent) {
                    var lzHtml = await getIndexHtml(env, request);
                    lzHtml = injectContent(lzHtml, lzContent);

                    return new Response(lzHtml, {
                        headers: htmlHeaders(true),
                    });
                }
            } catch (e) {
                // Fall through to static
            }
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
    },
};

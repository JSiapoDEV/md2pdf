// Cloudflare Worker — Dynamic OG meta tags for shared documents
// When ?doc= is present, decompress the markdown and inject title + description
// so WhatsApp, Teams, and Slack show a real preview of the content.

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

function extractMeta(markdown) {
    var lines = markdown.split('\n');
    var title = 'MD2PDF — Shared Document';
    var desc = '';

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.startsWith('# ')) {
            title = line.replace(/^#+\s*/, '').replace(/\*\*/g, '');
            break;
        }
    }

    var descLines = [];
    for (var j = 0; j < lines.length; j++) {
        var l = lines[j].trim();
        if (!l) continue;
        if (l.startsWith('#')) continue;
        if (l.startsWith('```')) continue;
        if (l.startsWith('|') && l.endsWith('|')) continue;
        if (l.startsWith('---') || l.startsWith('***')) continue;
        var clean = l.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        descLines.push(clean);
        if (descLines.join(' ').length > 200) break;
    }
    desc = descLines.join(' ').substring(0, 200);
    if (desc.length === 200) desc += '...';

    return { title: title, description: desc };
}

// --- Rate Limiting ---

var RATE_LIMIT = 10;       // max saves
var RATE_WINDOW = 60;      // per 60 seconds

async function checkRateLimit(ip, env) {
    var key = 'rl:' + ip;
    var data = await env.DOCS.get(key);
    var count = data ? parseInt(data, 10) : 0;

    if (count >= RATE_LIMIT) return false; // blocked

    await env.DOCS.put(key, String(count + 1), { expirationTtl: RATE_WINDOW });
    return true; // allowed
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

function toBase64url(buf) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(buf)))
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
    var encData = btoa(String.fromCharCode.apply(null, combined));
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
    return btoa(String.fromCharCode.apply(null, combined));
}

function injectContent(html, content, meta) {
    var safeTitle = escapeHtml(meta.title);
    var safeDesc = escapeHtml(meta.description);
    // Escape for safe JSON inside <script>
    var safeJson = JSON.stringify(content).replace(/</g, '\\u003c');

    // Inject markdown content as embedded data
    html = html.replace('</head>', '<script id="shared-content" type="application/json">' + safeJson + '</script>\n</head>');

    // Replace OG tags
    html = html.replace(/<meta property="og:title"[^>]*>/, '<meta property="og:title" content="' + safeTitle + '">');
    html = html.replace(/<meta property="og:description"[^>]*>/, '<meta property="og:description" content="' + safeDesc + '">');
    html = html.replace(/<meta name="twitter:title"[^>]*>/, '<meta name="twitter:title" content="' + safeTitle + '">');
    html = html.replace(/<meta name="twitter:description"[^>]*>/, '<meta name="twitter:description" content="' + safeDesc + '">');
    html = html.replace(/<meta name="description"[^>]*>/, '<meta name="description" content="' + safeDesc + '">');

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

        // --- POST /api/save — save markdown to KV, return short URL ---
        if (url.pathname === '/api/save' && request.method === 'POST') {
            try {
                // Rate limit by IP
                var ip = request.headers.get('cf-connecting-ip') || 'unknown';
                var allowed = await checkRateLimit(ip, env);
                if (!allowed) {
                    return new Response(JSON.stringify({ error: 'Too many requests. Try again in a minute.' }), {
                        status: 429,
                        headers: { 'content-type': 'application/json', 'retry-after': '60' },
                    });
                }

                var body = await request.text();
                if (!body || !body.trim()) {
                    return new Response(JSON.stringify({ error: 'Empty content' }), {
                        status: 400,
                        headers: { 'content-type': 'application/json' },
                    });
                }

                // Limit: 500KB max
                if (body.length > 512000) {
                    return new Response(JSON.stringify({ error: 'Document too large (max 500KB)' }), {
                        status: 413,
                        headers: { 'content-type': 'application/json' },
                    });
                }

                var id = generateId();
                var editKey = generateEditKey();
                var clientEncrypted = request.headers.get('x-encrypted') === 'aes-256-gcm';

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

                await env.DOCS.put(id, storedBody, {
                    expirationTtl: 86400 * 90,
                    metadata: { editKey: editKey, created: Date.now(), encrypted: true },
                });

                var responseBody = {
                    id: id,
                    editKey: editKey,
                    url: url.origin + '/s/' + id,
                };
                if (encKey) responseBody.key = encKey;

                return new Response(JSON.stringify(responseBody), {
                    headers: {
                        'content-type': 'application/json',
                        'access-control-allow-origin': '*',
                    },
                });
            } catch (e) {
                return new Response(JSON.stringify({ error: 'Save failed' }), {
                    status: 500,
                    headers: { 'content-type': 'application/json' },
                });
            }
        }

        // --- PUT /api/update/:id — update existing document ---
        if (url.pathname.startsWith('/api/update/') && request.method === 'PUT') {
            try {
                var updateId = url.pathname.slice(12);
                var updateBody = await request.text();
                var editKeyHeader = request.headers.get('x-edit-key');

                if (!updateBody || !updateBody.trim()) {
                    return new Response(JSON.stringify({ error: 'Empty content' }), {
                        status: 400, headers: { 'content-type': 'application/json' },
                    });
                }

                if (updateBody.length > 512000) {
                    return new Response(JSON.stringify({ error: 'Document too large' }), {
                        status: 413, headers: { 'content-type': 'application/json' },
                    });
                }

                // Verify editKey
                var existing = await env.DOCS.getWithMetadata(updateId);
                if (!existing.value) {
                    return new Response(JSON.stringify({ error: 'Document not found' }), {
                        status: 404, headers: { 'content-type': 'application/json' },
                    });
                }

                var storedKey = existing.metadata?.editKey;
                if (!storedKey || storedKey !== editKeyHeader) {
                    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                        status: 403, headers: { 'content-type': 'application/json' },
                    });
                }

                var clientEncrypted = request.headers.get('x-encrypted') === 'aes-256-gcm';
                var encKeyHeader = request.headers.get('x-enc-key');
                var updatedBody;

                if (clientEncrypted) {
                    // Client already encrypted
                    updatedBody = updateBody;
                } else if (encKeyHeader) {
                    // API consumer sent the encryption key — re-encrypt server-side
                    updatedBody = await serverReencrypt(updateBody, encKeyHeader);
                } else {
                    // No encryption key provided — encrypt with a new key
                    var enc = await serverEncrypt(updateBody);
                    updatedBody = enc.encData;
                    encKeyHeader = enc.encKey;
                }

                var updatedMeta = Object.assign({}, existing.metadata, { encrypted: true });
                await env.DOCS.put(updateId, updatedBody, {
                    expirationTtl: 86400 * 90,
                    metadata: updatedMeta,
                });

                var updateResponse = { id: updateId, url: url.origin + '/s/' + updateId };
                if (encKeyHeader && !clientEncrypted) updateResponse.key = encKeyHeader;

                return new Response(JSON.stringify(updateResponse), {
                    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
                });
            } catch (e) {
                return new Response(JSON.stringify({ error: 'Update failed' }), {
                    status: 500, headers: { 'content-type': 'application/json' },
                });
            }
        }

        // --- CORS preflight for /api/* ---
        if (url.pathname.startsWith('/api/') && request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'access-control-allow-origin': '*',
                    'access-control-allow-methods': 'POST, PUT, OPTIONS',
                    'access-control-allow-headers': 'Content-Type, X-Edit-Key, X-Encrypted, X-Enc-Key',
                },
            });
        }

        // --- GET /s/:id — load document from KV ---
        if (url.pathname.startsWith('/s/') && url.pathname.length > 3) {
            try {
                var id = url.pathname.slice(3);
                var result = await env.DOCS.getWithMetadata(id);

                if (!result.value) {
                    return new Response('Document not found or expired.', {
                        status: 404,
                        headers: { 'content-type': 'text/plain' },
                    });
                }

                var content = result.value;
                var isEncrypted = result.metadata && result.metadata.encrypted;
                var meta;

                if (isEncrypted) {
                    // Encrypted doc — use generic OG tags (server cannot read content)
                    meta = {
                        title: 'Encrypted Document — MD2PDF',
                        description: 'This document is end-to-end encrypted. Open the full link to decrypt and view it.',
                    };
                } else {
                    meta = extractMeta(content);
                }

                var html = await getIndexHtml(env, request);
                html = injectContent(html, content, meta);

                return new Response(html, {
                    headers: { 'content-type': 'text/html;charset=UTF-8' },
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
            try {
                var lzContent = decompressFromEncodedURIComponent(docParam);

                if (lzContent) {
                    var lzMeta = extractMeta(lzContent);
                    var lzHtml = await getIndexHtml(env, request);
                    lzHtml = injectContent(lzHtml, lzContent, lzMeta);

                    return new Response(lzHtml, {
                        headers: { 'content-type': 'text/html;charset=UTF-8' },
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

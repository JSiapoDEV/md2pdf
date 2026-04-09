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

// --- Worker entry point ---

export default {
    async fetch(request, env) {
        var url = new URL(request.url);
        var docParam = url.searchParams.get('doc');

        // Intercept /share?doc= — this path has no static asset, so the Worker handles it
        if (url.pathname === '/share' && docParam) {
            try {
                var content = decompressFromEncodedURIComponent(docParam);

                if (content) {
                    var meta = extractMeta(content);
                    var safeTitle = escapeHtml(meta.title);
                    var safeDesc = escapeHtml(meta.description);

                    // Fetch index.html from static assets
                    var assetReq = new Request(new URL('/', request.url).toString());
                    var response = await env.ASSETS.fetch(assetReq);
                    var html = await response.text();

                    // Replace OG tags with dynamic content
                    html = html.replace(/<meta property="og:title"[^>]*>/, '<meta property="og:title" content="' + safeTitle + '">');
                    html = html.replace(/<meta property="og:description"[^>]*>/, '<meta property="og:description" content="' + safeDesc + '">');
                    html = html.replace(/<meta name="twitter:title"[^>]*>/, '<meta name="twitter:title" content="' + safeTitle + '">');
                    html = html.replace(/<meta name="twitter:description"[^>]*>/, '<meta name="twitter:description" content="' + safeDesc + '">');
                    html = html.replace(/<meta name="description"[^>]*>/, '<meta name="description" content="' + safeDesc + '">');

                    return new Response(html, {
                        headers: { 'content-type': 'text/html;charset=UTF-8' },
                    });
                }
            } catch (e) {
                // Fall through to static
            }
        }

        // Serve static assets for everything else
        return env.ASSETS.fetch(request);
    },
};

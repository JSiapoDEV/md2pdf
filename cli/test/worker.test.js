// Pro keys in worker.js: a Polar license key unlocks the Pro limits, and only
// a hash of the key and the verdict are kept.

import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, beforeEach, test } from 'node:test';
import { pathToFileURL } from 'node:url';

const ORG = '70a0d0a3-ab23-4a01-b3af-400efc6d05c1';
const BENEFIT = '11111111-2222-4333-8444-555555555555';
const DAY_MS = 86400 * 1000;
const inDays = (n) => new Date(Date.now() + n * DAY_MS).toISOString();

let worker, polar, polarBase;
let polarCalls = [];
// What the stand-in for Polar answers: (requestBody) => { status, body }.
let polarAnswer;

const granted = (over = {}) => ({
    status: 200,
    body: {
        id: 'lk_1', organization_id: ORG, benefit_id: BENEFIT, status: 'granted', expires_at: inDays(200),
        customer: { email: 'buyer@example.com', name: 'A Buyer', billing_address: { country: 'PE' } },
        ...over,
    },
});

before(async () => {
    // worker.js is an ES module in a folder without "type": "module": load a copy as .mjs.
    const dir = await mkdtemp(join(tmpdir(), 'md2pdf-worker-'));
    const copy = join(dir, 'worker.mjs');
    await writeFile(copy, await readFile(new URL('../../worker.js', import.meta.url)));
    worker = (await import(pathToFileURL(copy).href)).default;

    polar = createServer(async (req, res) => {
        let text = '';
        for await (const chunk of req) text += chunk;
        const body = JSON.parse(text || '{}');
        polarCalls.push({ url: req.url, body });
        const answer = polarAnswer(body);
        res.writeHead(answer.status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(answer.body || {}));
    });
    await new Promise((resolve) => polar.listen(0, '127.0.0.1', resolve));
    polarBase = 'http://127.0.0.1:' + polar.address().port;
});

after(() => new Promise((resolve) => polar.close(resolve)));

beforeEach(() => {
    polarCalls = [];
    polarAnswer = () => granted();
});

// The parts of KV the Worker uses.
function kv() {
    const map = new Map();
    return {
        map,
        async get(key, type) {
            const entry = map.get(key);
            if (!entry) return null;
            return type === 'json' ? JSON.parse(entry.value) : entry.value;
        },
        async getWithMetadata(key) {
            const entry = map.get(key);
            return entry ? { value: entry.value, metadata: entry.options.metadata || null } : { value: null, metadata: null };
        },
        async put(key, value, options = {}) { map.set(key, { value, options }); },
        async delete(key) { map.delete(key); },
    };
}

function environment(over = {}) {
    return {
        DOCS: kv(),
        ASSETS: { fetch: async () => new Response('not found', { status: 404 }) },
        POLAR_ORG_ID: ORG,
        POLAR_BENEFIT_ID: BENEFIT,
        POLAR_API_BASE: polarBase,
        POLAR_CHECKOUT_URL: 'https://buy.polar.sh/polar_cl_example',
        ...over,
    };
}

const call = (env, path, init = {}) => worker.fetch(new Request('https://md2pdf.studio' + path, init), env, { waitUntil() {} });
const withKey = (key) => ({ headers: { authorization: 'Bearer ' + key } });
const plan = (env, key) => call(env, '/api/plan', key ? withKey(key) : {});
const save = (env, key, headers = {}) => call(env, '/api/save', {
    method: 'POST',
    headers: { 'x-encrypted': 'aes-256-gcm', ...(key ? { authorization: 'Bearer ' + key } : {}), ...headers },
    body: randomBytes(60).toString('base64'),
});
const sha256 = (text) => createHash('sha256').update(text).digest('hex');

test('without a key the plan is free, and the offer is shown when the checkout link is set', async () => {
    const res = await plan(environment());
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
        plan: 'free', expiresAt: null, maxBytes: 512000, maxDays: 30, checkoutUrl: 'https://buy.polar.sh/polar_cl_example',
    });
    assert.equal(polarCalls.length, 0);
});

test('a Polar key that is granted gives Pro until the end of its year', async () => {
    const env = environment();
    const ends = inDays(200);
    polarAnswer = () => granted({ expires_at: ends });
    const res = await plan(env, 'MD2PDF-AAAA-BBBB');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.plan, 'pro');
    assert.equal(body.expiresAt, new Date(ends).toISOString());
    assert.equal(body.maxBytes, 5 * 1024 * 1024);
    assert.equal(body.maxDays, 365);
    // Polar is asked about this organization's benefit only.
    assert.equal(polarCalls.length, 1);
    assert.equal(polarCalls[0].url, '/v1/customer-portal/license-keys/validate');
    assert.deepEqual(polarCalls[0].body, { key: 'MD2PDF-AAAA-BBBB', organization_id: ORG, benefit_id: BENEFIT });
});

test('a verdict is cached under a hash of the key, without the key or the buyer', async () => {
    const env = environment();
    await plan(env, 'MD2PDF-AAAA-BBBB');
    await plan(env, 'MD2PDF-AAAA-BBBB');
    assert.equal(polarCalls.length, 1, 'the second check must not reach Polar');

    const keys = [...env.DOCS.map.keys()];
    assert.deepEqual(keys, ['lic:' + sha256('MD2PDF-AAAA-BBBB')]);
    const stored = env.DOCS.map.get(keys[0]);
    assert.deepEqual(Object.keys(JSON.parse(stored.value)).sort(), ['checkedAt', 'expiresAt', 'valid']);
    assert.doesNotMatch(stored.value, /MD2PDF-AAAA|buyer@example\.com|A Buyer/);
    assert.equal(stored.options.expirationTtl, 7 * 86400);
});

test('a link made with a Pro key lasts a year and may carry a title; a free one lasts 30 days', async () => {
    const env = environment();
    const pro = await (await save(env, 'MD2PDF-AAAA-BBBB', { 'x-doc-title': 'Report' })).json();
    assert.equal(pro.plan, 'pro');
    assert.equal(pro.title, 'Report');
    assert.ok(Math.abs(Date.parse(pro.expiresAt) - Date.now() - 365 * DAY_MS) < 60000);

    const free = await (await save(env)).json();
    assert.equal(free.plan, 'free');
    assert.ok(Math.abs(Date.parse(free.expiresAt) - Date.now() - 30 * DAY_MS) < 60000);

    const refused = await save(env, null, { 'x-doc-title': 'Report' });
    assert.equal(refused.status, 403);
    assert.equal((await refused.json()).code, 'pro_required');
});

test('a key that is unknown, expired, without an end date or of another product is refused', async () => {
    const cases = [
        ['unknown', () => ({ status: 404, body: { detail: 'Not found' } })],
        ['expired', () => granted({ expires_at: inDays(-1) })],
        ['no end date', () => granted({ expires_at: null })],
        ['another product', () => granted({ benefit_id: '99999999-2222-4333-8444-555555555555' })],
        ['another organization', () => granted({ organization_id: '99999999-ab23-4a01-b3af-400efc6d05c1' })],
        ['revoked', () => granted({ status: 'revoked' })],
    ];
    for (const [name, answer] of cases) {
        const env = environment();
        polarAnswer = answer;
        const res = await plan(env, 'MD2PDF-CCCC-DDDD');
        assert.equal(res.status, 401, name);
        assert.equal((await res.json()).code, 'invalid_api_key', name);
        // A bad verdict is remembered for ten minutes, so guesses do not reach Polar.
        const stored = env.DOCS.map.get('lic:' + sha256('MD2PDF-CCCC-DDDD'));
        assert.equal(stored.options.expirationTtl, 600, name);
        const refusedSave = await save(env, 'MD2PDF-CCCC-DDDD');
        assert.equal(refusedSave.status, 401, name + ': a bad key must not fall back to the free plan');
    }
});

test('when Polar cannot be reached, a pass that was good keeps working and a new key waits', async () => {
    const env = environment();
    await plan(env, 'MD2PDF-AAAA-BBBB');
    // Make the stored verdict two hours old, then take Polar down.
    const cacheKey = 'lic:' + sha256('MD2PDF-AAAA-BBBB');
    const entry = env.DOCS.map.get(cacheKey);
    entry.value = JSON.stringify({ ...JSON.parse(entry.value), checkedAt: Date.now() - 2 * 3600 * 1000 });
    polarAnswer = () => ({ status: 500, body: { error: 'down' } });

    const known = await plan(env, 'MD2PDF-AAAA-BBBB');
    assert.equal(known.status, 200);
    assert.equal((await known.json()).plan, 'pro');

    const fresh = await plan(env, 'MD2PDF-EEEE-FFFF');
    assert.equal(fresh.status, 503);
    assert.equal((await fresh.json()).code, 'license_unavailable');
});

test('a stale good verdict is checked again, and a refund ends the pass', async () => {
    const env = environment();
    await plan(env, 'MD2PDF-AAAA-BBBB');
    const cacheKey = 'lic:' + sha256('MD2PDF-AAAA-BBBB');
    const entry = env.DOCS.map.get(cacheKey);
    entry.value = JSON.stringify({ ...JSON.parse(entry.value), checkedAt: Date.now() - 2 * 3600 * 1000 });
    polarAnswer = () => ({ status: 404, body: {} });

    const res = await plan(env, 'MD2PDF-AAAA-BBBB');
    assert.equal(res.status, 401);
    assert.equal(polarCalls.length, 2);
});

test('until the benefit is configured no Polar key is accepted and nothing is offered', async () => {
    const env = environment({ POLAR_BENEFIT_ID: '00000000-0000-0000-0000-000000000000' });
    const res = await plan(env, 'MD2PDF-AAAA-BBBB');
    assert.equal(res.status, 401);
    assert.equal(polarCalls.length, 0);
    assert.equal((await (await plan(env)).json()).checkoutUrl, null);

    // A checkout link that is not Polar's is never shown.
    const odd = environment({ POLAR_CHECKOUT_URL: 'https://example.com/buy' });
    assert.equal((await (await plan(odd)).json()).checkoutUrl, null);
});

test('a hand-issued key still gives Pro, without asking Polar', async () => {
    const env = environment({ PRO_KEY_HASHES: sha256('md2pdf_handmade') });
    const res = await plan(env, 'md2pdf_handmade');
    assert.equal((await res.json()).plan, 'pro');
    assert.equal(polarCalls.length, 0);
});

test('key checks that reach Polar are rate limited apart from writes', async () => {
    const limited = [];
    const env = environment({
        WRITE_LIMITER: { limit: async ({ key }) => { limited.push(key); return { success: !key.startsWith('lic:') }; } },
    });
    const res = await call(env, '/api/plan', { headers: { authorization: 'Bearer MD2PDF-AAAA-BBBB', 'cf-connecting-ip': '203.0.113.9' } });
    assert.equal(res.status, 429);
    assert.deepEqual(limited, ['lic:203.0.113.9']);
    assert.equal(polarCalls.length, 0);
});

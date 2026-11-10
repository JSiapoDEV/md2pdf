// Tells the user when a newer md2pdf-studio exists, at most once a day.
//
// Only a version number is read from npm, and it must look like 1.2.3. The
// message around it is fixed text written here, so the registry can never put
// words in an agent's mouth. Nothing is downloaded or installed: the user
// decides. MD2PDF_NO_UPDATE_CHECK=1 turns the check off.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { storePath } from './store.js';
import { VERSION } from './version.js';

const REGISTRY = 'https://registry.npmjs.org/md2pdf-studio/latest';
const DAY_MS = 24 * 60 * 60 * 1000;
const SEMVER = /^(\d{1,5})\.(\d{1,5})\.(\d{1,5})$/;

function parts(version) {
    const match = SEMVER.exec(String(version));
    return match ? match.slice(1).map(Number) : null;
}

export function isNewer(candidate, current) {
    const a = parts(candidate);
    const b = parts(current);
    if (!a || !b) return false;
    for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
    return false;
}

function cachePath() {
    return join(dirname(storePath()), 'update-check.json');
}

async function readCache(now) {
    try {
        const cached = JSON.parse(await readFile(cachePath(), 'utf8'));
        const age = now - cached.checkedAt;
        if (!(age >= 0 && age < DAY_MS)) return undefined;
        return parts(cached.latest) ? cached.latest : null;
    } catch (_) {
        return undefined;
    }
}

async function writeCache(now, latest) {
    try {
        await mkdir(dirname(cachePath()), { recursive: true, mode: 0o700 });
        await writeFile(cachePath(), JSON.stringify({ checkedAt: now, latest }) + '\n', { mode: 0o600 });
    } catch (_) { /* a read-only home only means checking again next time */ }
}

// The latest version npm reports, as { current, latest, newer }, or null when it
// is unknown: offline, turned off, or not a plain version number. `fresh`
// skips the day's cached answer (for `upgrade`, which the user asked for).
export async function checkForUpdate({
    now = Date.now(),
    fetchImpl = globalThis.fetch,
    current = VERSION,
    enabled = !process.env.MD2PDF_NO_UPDATE_CHECK,
    fresh = false,
} = {}) {
    if (!enabled) return null;
    let latest = fresh ? undefined : await readCache(now);
    if (latest === undefined) {
        latest = null;
        try {
            const res = await fetchImpl(REGISTRY, {
                headers: { accept: 'application/json', 'user-agent': 'md2pdf-studio/' + current },
                signal: AbortSignal.timeout(fresh ? 10000 : 2000),
            });
            if (res.ok) {
                const version = (await res.json()).version;
                if (parts(version)) latest = version;
            }
        } catch (_) { /* offline or slow: not worth delaying the user */ }
        // Recorded even when it failed, so an offline machine is not slowed down on every run.
        await writeCache(now, latest);
    }
    return latest ? { current, latest, newer: isNewer(latest, current) } : null;
}

// npx runs packages from an _npx cache folder; anything else was installed
// (globally or in a project). That decides which command updates this copy.
export function runMode(moduleUrl = import.meta.url) {
    return /[\\/]_npx[\\/]/.test(fileURLToPath(moduleUrl)) ? 'npx' : 'installed';
}

// Fixed text around a version number: no links, only commands to run.
export function updateMessage({ current, latest }, where = runMode()) {
    const how = {
        mcp: 'To update, change md2pdf-studio@' + current + ' to md2pdf-studio@' + latest + ' in the MCP configuration.',
        npx: 'To update the skill, run: npx -y md2pdf-studio@' + latest + ' upgrade',
        installed: 'To update, run: npm install -g md2pdf-studio@' + latest,
    }[where] || '';
    return 'md2pdf-studio ' + latest + ' is available (this is ' + current + '). See what changed: npx -y md2pdf-studio@' + latest + ' changelog. ' + how;
}

export function versionReport(found, where = runMode()) {
    if (!found) return '';
    return found.newer ? updateMessage(found, where) : 'md2pdf-studio ' + found.current + ' is the latest version.';
}

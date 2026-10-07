// The edit key and encryption key of every link made from this machine, so a
// later session (or another agent) can update or delete it. They never leave
// the machine; the file is readable by the current user only.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export function storePath() {
    if (process.env.MD2PDF_HOME) return join(process.env.MD2PDF_HOME, 'links.json');
    const config = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
    return join(config, 'md2pdf-studio', 'links.json');
}

export async function readLinks() {
    try {
        const links = JSON.parse(await readFile(storePath(), 'utf8'));
        return Array.isArray(links) ? links : [];
    } catch (_) {
        return [];
    }
}

async function writeLinks(links) {
    const file = storePath();
    await mkdir(dirname(file), { recursive: true, mode: 0o700 });
    const tmp = file + '.' + process.pid + '.tmp';
    await writeFile(tmp, JSON.stringify(links, null, 2) + '\n', { mode: 0o600 });
    await rename(tmp, file);
}

export async function rememberLink(entry) {
    const now = Date.now();
    const links = (await readLinks()).filter((l) => l.id !== entry.id && (!l.expiresAt || Date.parse(l.expiresAt) > now));
    links.push(entry);
    await writeLinks(links);
}

export async function forgetLink(id) {
    await writeLinks((await readLinks()).filter((l) => l.id !== id));
}

export async function findLink(id) {
    return (await readLinks()).find((l) => l.id === id) || null;
}

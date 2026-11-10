import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { deleteDocument, shareDocument, updateDocument } from './ops.js';
import { serve } from './mcp.js';
import { readLinks } from './store.js';
import { checkForUpdate, updateMessage, versionReport } from './update.js';
import { DEFAULT_SKILL_DIR, upgrade } from './upgrade.js';
import { VERSION } from './version.js';

const HELP = `md2pdf-studio ${VERSION}: share Markdown as an end-to-end encrypted link

Usage:
  md2pdf-studio share <file|->        Encrypt locally, upload, print the link
  md2pdf-studio update <link|id> <file|->   Replace the content behind a link
  md2pdf-studio delete <link|id>      Delete a link
  md2pdf-studio list                  Links created on this machine
  md2pdf-studio mcp                   Run as an MCP server over stdio
  md2pdf-studio skill [--install]     Print or install the agent skill
  md2pdf-studio upgrade               Update the installed skill to the latest version
  md2pdf-studio changelog             What changed in each version

Reads Markdown from a file, or from stdin when the file is "-" or omitted.
The key stays in the link (#k=): the server never sees it or the content.
Share the whole link. Links expire 30 days after creation.

Options for share and update:
  --expires <t>        Shorter lifetime, e.g. 1h, 7d (free: 1 hour to 30 days)
  --burn               share only: the link can be opened a single time

Options:
  --json         Machine-readable output
  --api <url>    Another deployment (or MD2PDF_API)
  --dir <path>   skill --install and upgrade: the skill's directory
  -h, --help     Show this help
  -v, --version  Show the version

Use it through npx with an exact version (npx -y md2pdf-studio@${VERSION} ...).
Once a day this help, --version, share, update and list ask npm for the latest
version number and say whether a newer one exists. Nothing is installed unless
you run upgrade. MD2PDF_NO_UPDATE_CHECK=1 turns the check off.
`;

async function readInput(arg) {
    if (arg && arg !== '-') return readFile(arg, 'utf8');
    if (!arg && process.stdin.isTTY) throw new UsageError('Give a file, or pipe Markdown into stdin');
    let text = '';
    process.stdin.setEncoding('utf8');
    for await (const chunk of process.stdin) text += chunk;
    return text;
}

class UsageError extends Error {}

// Files that ship next to the code; in the repository the skill lives in public/.
async function readPackageFile(name, ...elsewhere) {
    const here = dirname(fileURLToPath(import.meta.url));
    for (const file of [join(here, '..', name), ...elsewhere.map((path) => join(here, '..', ...path))]) {
        try { return await readFile(file, 'utf8'); } catch (_) { /* try the next location */ }
    }
    throw new Error(name + ' is missing from this install');
}

const readSkill = () => readPackageFile('skill.md', ['..', 'public', 'skill.md']);

function optionsOf(values) {
    return { expires: values.expires, burn: values.burn, title: values.title, description: values.description, apiKey: values['api-key'] };
}

function print(values, human, data) {
    process.stdout.write(values.json ? JSON.stringify(data) + '\n' : human + '\n');
}

// The notice goes to stderr, so stdout stays exactly the link (or the JSON).
async function noteUpdate(pending) {
    const update = await pending;
    if (update && update.newer) process.stderr.write('Note: ' + updateMessage(update) + '\n');
}

export async function main(argv) {
    let parsed;
    try {
        parsed = parseArgs({
            args: argv,
            allowPositionals: true,
            options: {
                json: { type: 'boolean' },
                api: { type: 'string' },
                expires: { type: 'string' },
                burn: { type: 'boolean' },
                title: { type: 'string' },
                description: { type: 'string' },
                'api-key': { type: 'string' },
                dir: { type: 'string' },
                install: { type: 'boolean' },
                help: { type: 'boolean', short: 'h' },
                version: { type: 'boolean', short: 'v' },
            },
        });
    } catch (err) {
        process.stderr.write('md2pdf-studio: ' + err.message + '\n');
        return 2;
    }
    const { values, positionals: [command, first, second] } = parsed;
    const wantsHelp = values.help || !command || command === 'help';

    // Started now so it runs alongside the upload; it never throws.
    const pendingUpdate = values.version || wantsHelp || ['share', 'update', 'list'].includes(command) ? checkForUpdate() : null;

    // stdout keeps only the number, for scripts; the report goes to stderr.
    if (values.version) {
        process.stdout.write(VERSION + '\n');
        const report = versionReport(await pendingUpdate);
        if (report) process.stderr.write(report + '\n');
        return 0;
    }
    // The help says whether this is the latest version, so an agent that reads it knows.
    if (wantsHelp) {
        const report = versionReport(await pendingUpdate);
        process.stdout.write(HELP + (report ? '\n' + report + '\n' : ''));
        return command || values.help ? 0 : 2;
    }

    try {
        if (command === 'share') {
            const r = await shareDocument({ markdown: await readInput(first), api: values.api, name: first && first !== '-' ? basename(first) : undefined, ...optionsOf(values) });
            if (r.warning) process.stderr.write('Warning: ' + r.warning + '\n');
            print(values, r.link, r);
            await noteUpdate(pendingUpdate);
            return 0;
        }
        if (command === 'update') {
            if (!first) throw new UsageError('Usage: md2pdf-studio update <link|id> <file|->');
            if (values.burn) throw new UsageError('--burn can only be chosen when the link is created');
            const r = await updateDocument({ target: first, markdown: await readInput(second), api: values.api, ...optionsOf(values) });
            print(values, r.link, r);
            await noteUpdate(pendingUpdate);
            return 0;
        }
        if (command === 'delete') {
            if (!first) throw new UsageError('Usage: md2pdf-studio delete <link|id>');
            const r = await deleteDocument({ target: first, api: values.api });
            print(values, 'Deleted ' + r.id, r);
            return 0;
        }
        if (command === 'list') {
            const now = Date.now();
            const live = (await readLinks()).filter((l) => !l.expiresAt || Date.parse(l.expiresAt) > now);
            // Without keys: a listing pasted into a chat must not leak the documents.
            const rows = live.map(({ id, url, expiresAt, name }) => ({ id, url, expiresAt, name }));
            print(values, rows.length ? rows.map((l) => l.id + '  ' + l.url + '  expires ' + l.expiresAt + (l.name ? '  ' + l.name : '')).join('\n') : 'No links', rows);
            await noteUpdate(pendingUpdate);
            return 0;
        }
        if (command === 'mcp') {
            await serve({ api: values.api });
            return 0;
        }
        if (command === 'skill') {
            const skill = await readSkill();
            if (!values.install) { process.stdout.write(skill); return 0; }
            const dir = values.dir || DEFAULT_SKILL_DIR;
            await mkdir(dir, { recursive: true });
            await writeFile(join(dir, 'SKILL.md'), skill);
            print(values, 'Installed ' + join(dir, 'SKILL.md'), { installed: join(dir, 'SKILL.md') });
            return 0;
        }
        if (command === 'upgrade') {
            const r = await upgrade({ dir: values.dir || DEFAULT_SKILL_DIR });
            print(values, r.text, r);
            return 0;
        }
        if (command === 'changelog') {
            process.stdout.write(await readPackageFile('CHANGELOG.md'));
            return 0;
        }
        throw new UsageError('Unknown command: ' + command);
    } catch (err) {
        process.stderr.write('md2pdf-studio: ' + err.message + '\n');
        return err instanceof UsageError ? 2 : 1;
    }
}

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { deleteDocument, shareDocument, updateDocument } from './ops.js';
import { serve } from './mcp.js';
import { readLinks } from './store.js';

const VERSION = '0.1.0';

const HELP = `md2pdf-studio ${VERSION}: share Markdown as an end-to-end encrypted link

Usage:
  md2pdf-studio share <file|->        Encrypt locally, upload, print the link
  md2pdf-studio update <link|id> <file|->   Replace the content behind a link
  md2pdf-studio delete <link|id>      Delete a link
  md2pdf-studio list                  Links created on this machine
  md2pdf-studio mcp                   Run as an MCP server over stdio
  md2pdf-studio skill [--install]     Print or install the agent skill

Reads Markdown from a file, or from stdin when the file is "-" or omitted.
The key stays in the link (#k=): the server never sees it or the content.
Share the whole link. Links expire 30 days after creation.

Options for share and update:
  --expires <t>        Shorter lifetime, e.g. 1h, 7d (free: 1 hour to 30 days)
  --burn               share only: the link can be opened a single time
  --title <text>       Preview title in chats (Pro)
  --description <text> Preview description in chats (Pro)
  --api-key <key>      Pro API key (or MD2PDF_API_KEY)

Options:
  --json         Machine-readable output
  --api <url>    Another deployment (or MD2PDF_API)
  --dir <path>   skill --install: target directory
  -h, --help     Show this help
  -v, --version  Show the version
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

async function readSkill() {
    const here = dirname(fileURLToPath(import.meta.url));
    for (const file of [join(here, '..', 'skill.md'), join(here, '..', '..', 'public', 'skill.md')]) {
        try { return await readFile(file, 'utf8'); } catch (_) { /* try the next location */ }
    }
    throw new Error('skill.md is missing from this install');
}

function optionsOf(values) {
    return { expires: values.expires, burn: values.burn, title: values.title, description: values.description, apiKey: values['api-key'] };
}

function print(values, human, data) {
    process.stdout.write(values.json ? JSON.stringify(data) + '\n' : human + '\n');
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
    if (values.version) { process.stdout.write(VERSION + '\n'); return 0; }
    if (values.help || !command || command === 'help') { process.stdout.write(HELP); return command || values.help ? 0 : 2; }

    try {
        if (command === 'share') {
            const r = await shareDocument({ markdown: await readInput(first), api: values.api, name: first && first !== '-' ? basename(first) : undefined, ...optionsOf(values) });
            if (r.warning) process.stderr.write('Warning: ' + r.warning + '\n');
            print(values, r.link, r);
            return 0;
        }
        if (command === 'update') {
            if (!first) throw new UsageError('Usage: md2pdf-studio update <link|id> <file|->');
            if (values.burn) throw new UsageError('--burn can only be chosen when the link is created');
            const r = await updateDocument({ target: first, markdown: await readInput(second), api: values.api, ...optionsOf(values) });
            print(values, r.link, r);
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
            return 0;
        }
        if (command === 'mcp') {
            await serve({ api: values.api });
            return 0;
        }
        if (command === 'skill') {
            const skill = await readSkill();
            if (!values.install) { process.stdout.write(skill); return 0; }
            const dir = values.dir || join(homedir(), '.claude', 'skills', 'md2pdf');
            await mkdir(dir, { recursive: true });
            await writeFile(join(dir, 'SKILL.md'), skill);
            print(values, 'Installed ' + join(dir, 'SKILL.md'), { installed: join(dir, 'SKILL.md') });
            return 0;
        }
        throw new UsageError('Unknown command: ' + command);
    } catch (err) {
        process.stderr.write('md2pdf-studio: ' + err.message + '\n');
        return err instanceof UsageError ? 2 : 1;
    }
}

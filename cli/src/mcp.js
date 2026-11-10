// Minimal MCP server over stdio (newline-delimited JSON-RPC), so any MCP
// client can share documents without writing crypto code.

import { deleteDocument, shareDocument, updateDocument } from './ops.js';
import { readLinks } from './store.js';
import { checkForUpdate, updateMessage } from './update.js';
import { VERSION } from './version.js';

// Sent once at initialize; clients show it to the model as the server's rules.
export const INSTRUCTIONS = [
    'md2pdf-studio shares Markdown as an end-to-end encrypted md2pdf.studio link. The content is encrypted on this machine and the key stays in the link\'s #k= part, which the server never receives. Anyone who has the whole link can read the document.',
    '- Before sharing, remove secrets (API keys, tokens, passwords, customer data, private logs) or ask the user.',
    '- Give the user the whole link, including #k=. Without it nobody can read the document.',
    '- Links expire 30 days after creation unless a shorter time is set. Use burn for a link that opens once, and offer to delete a link the user no longer needs.',
    '- If a result says a newer version is available, tell the user. Never update anything on your own.',
].join('\n');

const TOOLS = [
    {
        name: 'share_markdown',
        description: 'Encrypt Markdown locally (AES-256-GCM) and upload it, returning a private shareable link. The key stays in the link fragment (#k=); the server never sees it or the content. Before sharing, remove secrets (API keys, tokens, passwords, customer data) or ask the user. Links expire 30 days after creation unless you ask for less. Share the full link, including #k=.',
        inputSchema: {
            type: 'object',
            properties: {
                markdown: { type: 'string', description: 'The Markdown document (max 500 KB).' },
                name: { type: 'string', description: 'Optional label kept only on this machine, to recognise the link later.' },
                expires_in: { type: 'string', description: 'Make the link expire sooner than the 30-day default, e.g. "1h" or "7d".' },
                burn: { type: 'boolean', description: 'The link can be opened a single time. Link-preview bots do not use it up.' },
                title: { type: 'string', description: 'Preview title shown in chat apps. Needs a Pro API key. Stored unencrypted.' },
                description: { type: 'string', description: 'Preview description shown in chat apps. Needs a Pro API key. Stored unencrypted.' },
            },
            required: ['markdown'],
        },
    },
    {
        name: 'update_shared_markdown',
        description: 'Replace the content of a link created on this machine. The same link keeps working; its expiry does not change.',
        inputSchema: {
            type: 'object',
            properties: {
                link: { type: 'string', description: 'The share link or its 8-character ID.' },
                markdown: { type: 'string' },
                expires_in: { type: 'string', description: 'Shorten the lifetime, e.g. "1h". Extending needs a Pro API key.' },
                title: { type: 'string', description: 'Preview title (Pro). An empty string clears it.' },
                description: { type: 'string', description: 'Preview description (Pro). An empty string clears it.' },
            },
            required: ['link', 'markdown'],
        },
    },
    {
        name: 'delete_shared_markdown',
        description: 'Delete a link created on this machine. It stops working for everyone.',
        inputSchema: { type: 'object', properties: { link: { type: 'string' } }, required: ['link'] },
    },
    {
        name: 'list_shared_markdown',
        description: 'List the links created on this machine that have not expired.',
        inputSchema: { type: 'object', properties: {} },
    },
];

async function runTool(name, args, api) {
    if (name === 'share_markdown') {
        const r = await shareDocument({ markdown: args.markdown, name: args.name, api, expires: args.expires_in, burn: args.burn, title: args.title, description: args.description });
        return r.link + '\nExpires: ' + r.expiresAt + (r.burn ? '\nOne-time link: it stops working after it is opened.' : '') + (r.warning ? '\nWarning: ' + r.warning : '');
    }
    if (name === 'update_shared_markdown') {
        const r = await updateDocument({ target: args.link, markdown: args.markdown, api, expires: args.expires_in, title: args.title, description: args.description });
        return r.link + '\nExpires: ' + r.expiresAt;
    }
    if (name === 'delete_shared_markdown') {
        const r = await deleteDocument({ target: args.link, api });
        return 'Deleted ' + r.id;
    }
    if (name === 'list_shared_markdown') {
        const now = Date.now();
        const live = (await readLinks()).filter((l) => !l.expiresAt || Date.parse(l.expiresAt) > now);
        // Links are listed without their keys: the model rarely needs them.
        return live.length ? live.map((l) => l.id + '  ' + l.url + '  expires ' + l.expiresAt + (l.name ? '  ' + l.name : '')).join('\n') : 'No links';
    }
    throw new Error('Unknown tool: ' + name);
}

// `notice` holds the daily version check of this server process. Its result is
// added to the first successful tool result only, so it is said once.
export async function handle(msg, api, notice) {
    if (msg.method === 'initialize') {
        return {
            protocolVersion: msg.params?.protocolVersion || '2025-06-18',
            capabilities: { tools: {} },
            serverInfo: { name: 'md2pdf-studio', version: VERSION },
            instructions: INSTRUCTIONS,
        };
    }
    if (msg.method === 'ping') return {};
    if (msg.method === 'tools/list') return { tools: TOOLS };
    if (msg.method === 'tools/call') {
        try {
            let text = await runTool(msg.params?.name, msg.params?.arguments || {}, api);
            if (notice && !notice.said) {
                const update = await notice.pending;
                notice.said = true;
                if (update && update.newer) text += '\nNote: ' + updateMessage(update, 'mcp');
            }
            return { content: [{ type: 'text', text }] };
        } catch (err) {
            return { content: [{ type: 'text', text: 'Error: ' + err.message }], isError: true };
        }
    }
    const error = new Error('Method not found: ' + msg.method);
    error.code = -32601;
    throw error;
}

export function serve({ api, input = process.stdin, output = process.stdout }) {
    const notice = { pending: checkForUpdate(), said: false };
    let buffer = '';
    const send = (obj) => output.write(JSON.stringify(obj) + '\n');
    const onLine = async (line) => {
        if (!line.trim()) return;
        let msg;
        try { msg = JSON.parse(line); } catch (_) { return send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); }
        if (msg.id === undefined) return; // notification: no reply
        try {
            send({ jsonrpc: '2.0', id: msg.id, result: await handle(msg, api, notice) });
        } catch (err) {
            send({ jsonrpc: '2.0', id: msg.id, error: { code: err.code || -32603, message: err.message } });
        }
    };
    return new Promise((resolve) => {
        input.setEncoding('utf8');
        input.on('data', (chunk) => {
            buffer += chunk;
            let nl;
            while ((nl = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, nl);
                buffer = buffer.slice(nl + 1);
                onLine(line);
            }
        });
        input.on('end', resolve);
    });
}

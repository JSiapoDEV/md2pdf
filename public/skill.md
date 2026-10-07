---
name: md2pdf
description: Create and share styled PDF, HTML, and image documents from Markdown via md2pdf.studio. Use when the user wants to export, share, or create a visually styled document from markdown content.
---

# MD2PDF Skill

Use this skill when the user asks you to:
- Create a document or report from their request
- Save or export markdown as a PDF, HTML, or image
- Share a styled version of written content
- Generate a shareable link for a document

Example user prompts that trigger this skill:
- "Export this as a PDF"
- "Make this into a shareable document"
- "Create a styled report from this markdown"
- "Generate a shareable link for this content"
- "Turn my notes into a nice PDF"

## Before you share anything

Every link is end-to-end encrypted: the content is encrypted on this machine, and the key lives only in the link's `#k=` fragment, which the server never receives. That protects the content in transit and at rest, but **anyone who holds the full link can read it**.

- If the content may hold secrets (API keys, tokens, passwords, customer data, private logs), remove them or ask the user before sharing.
- Tell the user the link expires 30 days after creation (sooner if you set `--expires`) and that they can ask you to delete it.
- For something very sensitive, make the link one-time with `--burn`: it stops working after the first open. Link-preview bots do not use it up, because the page only asks the reader to confirm.
- Give the user the **whole** link, including `#k=...`. Without it nobody can read the document.

## Preferred: the CLI (no crypto code to write)

`md2pdf-studio` encrypts locally, uploads the ciphertext and prints the link. It needs Node 18.3 or later and has no dependencies.

```bash
# Share a file, or pipe Markdown into stdin
npx -y md2pdf-studio share report.md
cat notes.md | npx -y md2pdf-studio share

# Change what an existing link shows (same link, same key, same expiry)
npx -y md2pdf-studio update https://md2pdf.studio/s/AbCd1234#k=... report.md

# Stop sharing
npx -y md2pdf-studio delete https://md2pdf.studio/s/AbCd1234#k=...

# Links made on this machine (listed without their keys)
npx -y md2pdf-studio list

# Options when sharing
npx -y md2pdf-studio share report.md --expires 7d      # shorter life: 1h to 30d (free)
npx -y md2pdf-studio share report.md --burn            # opens a single time
npx -y md2pdf-studio share report.md --title "Q3 report" --description "For the board" --api-key $MD2PDF_API_KEY
```

`--title` and `--description` set the preview card chat apps show. Chat apps cannot read an encrypted document, so these two fields are stored **unencrypted**: never put anything private in them. They, longer lifetimes (up to 365 days) and a larger size limit need a Pro API key (`--api-key` or the `MD2PDF_API_KEY` environment variable). Never ask the user to paste an API key into the chat.

Add `--json` for machine-readable output. The edit key and encryption key of every link are kept in `~/.config/md2pdf-studio/links.json` (readable by the current user only), so you can update or delete a link in a later session. Only links made on this machine can be changed.

### As an MCP server

Clients that speak MCP can run `npx -y md2pdf-studio mcp` and call `share_markdown`, `update_shared_markdown`, `delete_shared_markdown` and `list_shared_markdown`.

### Installing this skill

`npx -y md2pdf-studio skill --install` writes this file to `~/.claude/skills/md2pdf/SKILL.md`. For other agents (Codex, Cursor, Gemini CLI, ...), add a line to their instructions file such as `AGENTS.md`: "To share Markdown as a private link, run `npx -y md2pdf-studio share <file>` and give the user the full link."

## Without npm: the API, end-to-end encrypted

Plaintext is **not accepted**. A request without `X-Encrypted: aes-256-gcm` is rejected with 400 `e2ee_required`, and the key must never be sent to the server (`X-Enc-Key` is rejected with 400 `key_leak_blocked`). Use this path only when you cannot run the CLI.

### Create

1. Generate a random 256-bit key and a random 12-byte IV.
2. Encrypt the markdown with AES-256-GCM. The output is `IV ‖ ciphertext ‖ 16-byte GCM tag`.
3. Base64-encode the output. That is the request body.
4. POST to `/api/save` with header `X-Encrypted: aes-256-gcm`.
5. Base64url-encode the key (no padding). That is the URL fragment.
6. The shareable link is `{url}#k={key_base64url}`. Share the full link.

#### Python

```python
import os, json, base64, urllib.request
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

markdown = """# Hello World

This is my first document.
"""

key = AESGCM.generate_key(bit_length=256)
iv  = os.urandom(12)
ct  = AESGCM(key).encrypt(iv, markdown.encode(), None)   # 16-byte GCM tag appended
body = base64.b64encode(iv + ct).decode()
key_b64url = base64.urlsafe_b64encode(key).rstrip(b'=').decode()

req = urllib.request.Request(
    'https://md2pdf.studio/api/save',
    data=body.encode(),
    headers={'Content-Type': 'text/plain', 'X-Encrypted': 'aes-256-gcm'},
    method='POST',
)
data = json.loads(urllib.request.urlopen(req).read())
print(f"{data['url']}#k={key_b64url}")
# -> https://md2pdf.studio/s/BrOrr0N3#k=xY9kL2m...
```

#### Node

```javascript
const { subtle, getRandomValues } = globalThis.crypto;

const markdown = `# Hello World

This is my first document.
`;

const key = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
const iv  = getRandomValues(new Uint8Array(12));
const ct  = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(markdown)));

const combined = new Uint8Array(iv.length + ct.length);
combined.set(iv); combined.set(ct, iv.length);
const body   = Buffer.from(combined).toString('base64');
const raw    = new Uint8Array(await subtle.exportKey('raw', key));
const keyB64 = Buffer.from(raw).toString('base64url');

const res  = await fetch('https://md2pdf.studio/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain', 'X-Encrypted': 'aes-256-gcm' },
    body,
});
const data = await res.json();
console.log(`${data.url}#k=${keyB64}`);
```

#### Response

```json
{
  "id": "BrOrr0N3",
  "editKey": "a1b2c3...64chars",
  "url": "https://md2pdf.studio/s/BrOrr0N3"
}
```

No `key` field. The server does not have it. Build the share link yourself: `{url}#k={your base64url key}`. Save `id`, `editKey`, and the key in your context if the user may want to update the document later.

### Update

Reuse the same key; generate a fresh IV every time.

```python
new_markdown = "# Updated content"
iv  = os.urandom(12)
ct  = AESGCM(key).encrypt(iv, new_markdown.encode(), None)
body = base64.b64encode(iv + ct).decode()

req = urllib.request.Request(
    f'https://md2pdf.studio/api/update/{doc_id}',
    data=body.encode(),
    headers={
        'Content-Type': 'text/plain',
        'X-Edit-Key': edit_key,
        'X-Encrypted': 'aes-256-gcm',
    },
    method='PUT',
)
urllib.request.urlopen(req)
```

The key must never leave your process.

## Available visual styles

The recipient can choose from 11 styles when viewing the document:

- **notion** (default) — Clean modern sans-serif
- **github** — Classic GitHub markdown
- **minimal** — Elegant serif, no decorations
- **academic** — Formal justified, scholarly feel
- **corporate** — Professional with blue accents
- **latex** — Academic paper typography
- **dracula** — Vibrant purple/pink/green dark theme
- **newspaper** — Editorial typography
- **handwritten** — Cursive with notebook lines
- **terminal** — Green-on-black monospace
- **pastel** — Soft rounded colors

## Limits

- **Max document size:** 500 KB of Markdown (UTF-8) (5 MB with a Pro key); the limit applies to the plaintext, not the base64 ciphertext
- **Rate limit:** 10 writes/minute per IP (save, update and delete combined); a 429 carries `Retry-After: 60`
- **Daily quota (free):** 100 writes and 25 MB per address per UTC day; a 429 with code `daily_quota` carries `Retry-After` until 00:00 UTC. Deleting is never limited. A Pro API key has its own, larger quota
- **Body check:** the body must be base64 of `IV ‖ ciphertext ‖ tag`, otherwise 400 `not_ciphertext`
- **Expiration:** 30 days after creation by default; updates do not extend it. Save/update responses include `expiresAt`. Send `X-Expires-In: <seconds>` (3600 to 2592000) for a shorter life, or `X-Burn: 1` on create for a one-time link. Pro: `Authorization: Bearer <key>`, up to 365 days, 5 MB, `X-Doc-Title` and `X-Doc-Description` (percent-encoded UTF-8, max 100 and 300 bytes, stored unencrypted)

## Deleting a document

```
DELETE https://md2pdf.studio/api/delete/{id}
X-Edit-Key: {editKey}
```

Returns `{ "id": "...", "deleted": true }`. Offer this when the user asks to unshare or remove a link.

## Supported content

- Full GitHub-Flavored Markdown (GFM): headings, tables, task lists, blockquotes, images, links
- **Mermaid diagrams**: use ` ```mermaid ` code blocks for flowcharts, sequence diagrams, Gantt charts, etc.
- **Table of contents**: write `[TOC]` on its own line to auto-generate a linked TOC
- Syntax highlighting for 180+ programming languages

## Notes

- No authentication required.
- Every document is encrypted with AES-256-GCM before it leaves the client. The server stores ciphertext only and cannot read, search or moderate it.
- Hash fragments are not sent to the server; keys stay entirely client-side.
- Every shared link shows the same generic preview card in WhatsApp, Teams and Slack; the server does not read document titles or content.
- The full URL — including `#k=` — is a bearer token. Never paste it in channels that may log or cache URLs (browser history on shared machines, URL-based analytics, open chat transcripts indexed by third parties).

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

## Trust model — read before sending anything

The API exposes two paths. They produce the same shareable URL shape but have very different threat models.

**Path 1 — End-to-end encrypted (recommended, default).** Encrypt the markdown locally with AES-256-GCM, then POST the ciphertext with header `X-Encrypted: aes-256-gcm`. The server stores the blob as-is and never sees the key or the plaintext. Use this for anything non-public: logs, internal notes, customer data, drafts, CloudWatch output, anything you would not paste in a public channel.

**Path 2 — Server-side encryption (legacy).** POST plaintext; the server generates a key, encrypts, returns the key in the response. **The server sees the plaintext during the request.** Only use this for content that is already public (marketing copy, open-source READMEs, public release notes).

**If in doubt, use path 1.** It is a few extra lines and the safety floor is much higher.

## Path 1 — End-to-end encrypted (recommended)

1. Generate a random 256-bit key and a random 12-byte IV.
2. Encrypt the markdown with AES-256-GCM. The output is `IV ‖ ciphertext ‖ 16-byte GCM tag`.
3. Base64-encode the output. That is the request body.
4. POST to `/api/save` with header `X-Encrypted: aes-256-gcm`.
5. Base64url-encode the key (no padding). That is the URL fragment.
6. The shareable link is `{url}#k={key_base64url}`. Share the full link.

### Python

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

### Node

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

### Response

```json
{
  "id": "BrOrr0N3",
  "editKey": "a1b2c3...64chars",
  "url": "https://md2pdf.studio/s/BrOrr0N3"
}
```

No `key` field. The server does not have it. Build the share link yourself: `{url}#k={your base64url key}`. Save `id`, `editKey`, and the key in your context if the user may want to update the document later.

### Updating an encrypted document

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

Do **not** send `X-Enc-Key` in path 1. The key must never leave your process.

## Path 2 — Server-side encryption (public content only)

```bash
curl -X POST https://md2pdf.studio/api/save \
  -H "Content-Type: text/plain" \
  -d "# Public release notes"
# Response: {"id":"abc","editKey":"...","url":"...","key":"xY9..."}
# Share: {url}#k={key}
```

The response includes `key` because the server generated it after reading your plaintext. Update with the same plaintext-exposing shape:

```bash
curl -X PUT https://md2pdf.studio/api/update/{id} \
  -H "Content-Type: text/plain" \
  -H "X-Edit-Key: {editKey}" \
  -H "X-Enc-Key: {key}" \
  -d "# Updated public content"
```

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

- **Max document size:** 500 KB of Markdown (UTF-8) on either path; for path 1 the limit applies to the plaintext, not the base64 ciphertext
- **Rate limit:** 10 writes/minute per IP (save, update and delete combined); a 429 carries `Retry-After: 60`
- **Path 1 body check:** with `X-Encrypted` the body must be base64 of `IV ‖ ciphertext ‖ tag`, otherwise 400 `not_ciphertext`
- **Expiration:** 30 days after creation; updates do not extend it. Save/update responses include `expiresAt`.

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
- AES-256-GCM encryption at rest for every document, regardless of path.
- Hash fragments are not sent to the server; path-1 keys stay entirely client-side.
- Every shared link shows the same generic preview card in WhatsApp, Teams and Slack; the server does not read document titles or content.
- The full URL — including `#k=` — is a bearer token. Never paste it in channels that may log or cache URLs (browser history on shared machines, URL-based analytics, open chat transcripts indexed by third parties).

---
name: md2pdf
description: Share Markdown as a private, end-to-end encrypted md2pdf.studio link that opens as a styled document the reader can download as PDF, HTML or image. Use when the user wants to share or send a document, report or notes written in Markdown, or wants a link to a styled, PDF-ready version of it.
---

# md2pdf (skill 0.1.0)

This skill turns Markdown into a link on md2pdf.studio. The reader sees a styled document, can switch between 11 styles and can download it as PDF, HTML or PNG. Everything you need is in this file: it does not tell you to fetch instructions from anywhere.

## Before you share

The document is encrypted on this machine and the key stays in the link's `#k=` part, which the server never receives. **Anyone who has the whole link can read it.**

- If the content may hold secrets (API keys, tokens, passwords, customer data, private logs), remove them or ask the user first.
- Give the user the **whole** link, including `#k=...`. Without it nobody can read the document.
- Tell the user the link expires 30 days after creation (or when you set it to) and that you can delete it.
- For something very sensitive, use `--burn`: the link opens a single time.

## Share with the CLI

`md2pdf-studio` encrypts locally, uploads only the ciphertext and prints the link. It needs Node 18.3 or later and has no dependencies. The version is pinned to the one this skill was written for.

```bash
npx -y md2pdf-studio@0.1.0 share report.md                # prints the link
cat notes.md | npx -y md2pdf-studio@0.1.0 share           # from stdin
npx -y md2pdf-studio@0.1.0 share report.md --expires 7d   # shorter life: 1h to 30d
npx -y md2pdf-studio@0.1.0 share report.md --burn         # opens a single time
npx -y md2pdf-studio@0.1.0 update <link> report.md        # same link, new content
npx -y md2pdf-studio@0.1.0 delete <link>                  # stops working for everyone
npx -y md2pdf-studio@0.1.0 list                           # links made here, without keys
```

- Add `--json` for machine-readable output.
- The edit key of each link is kept in `~/.config/md2pdf-studio/links.json`, readable by the current user only, so only links made on this machine can be updated or deleted.
- If the CLI says a newer version is available, tell the user. Do not update on your own.

**Pro (optional).** Links up to 365 days, 5 MB documents, and `--title` / `--description` for the preview card chat apps show. The preview fields are stored **unencrypted**: never put anything private in them. Pro reads its key from the `MD2PDF_API_KEY` environment variable. Never ask the user to paste a key into the chat.

## Without Node

Encrypt in Python and send only the ciphertext. The server rejects plaintext (400 `e2ee_required`) and any request that carries the key.

```python
import os, json, base64, urllib.request
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

markdown = open("report.md", encoding="utf-8").read()

key = AESGCM.generate_key(bit_length=256)
iv = os.urandom(12)
body = base64.b64encode(iv + AESGCM(key).encrypt(iv, markdown.encode(), None)).decode()

req = urllib.request.Request(
    "https://md2pdf.studio/api/save",
    data=body.encode(),
    headers={"Content-Type": "text/plain", "X-Encrypted": "aes-256-gcm"},
    method="POST",
)
data = json.loads(urllib.request.urlopen(req).read())
print(data["url"] + "#k=" + base64.urlsafe_b64encode(key).rstrip(b"=").decode())
```

The response also has `id` and `editKey`: keep them, with the key, if the user may want to update or delete the link. Updating and deleting are described in the API reference at https://md2pdf.studio/api.

## What renders

GitHub-Flavored Markdown (tables, task lists, images, links), Mermaid diagrams in ` ```mermaid ` blocks, a table of contents from `[TOC]` on its own line, and syntax highlighting for 180+ languages.

## Limits

- 500 KB of Markdown per document (5 MB with Pro).
- 10 writes a minute, and 100 writes a day per address on the free plan. Deleting is never limited.
- Links expire 30 days after creation; updating does not extend them.

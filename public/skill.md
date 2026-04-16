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

## How to create a document

1. Write the content in Markdown format (GitHub-Flavored Markdown supported: headings, tables, task lists, code blocks with syntax highlighting, blockquotes, images, links).

2. POST the markdown to the API:
   ```
   POST https://md2pdf.studio/api/save
   Content-Type: text/plain

   # Your markdown content here
   ```

3. You will receive a JSON response:
   ```json
   {
     "id": "BrOrr0N3",
     "editKey": "a1b2c3...",
     "url": "https://md2pdf.studio/s/BrOrr0N3",
     "key": "xY9kL2m..."
   }
   ```

4. **IMPORTANT:** The document is encrypted at rest (AES-256-GCM). Build the shareable link by appending the `key` to the URL hash:
   ```
   {url}#k={key}
   ```
   Example: `https://md2pdf.studio/s/BrOrr0N3#k=xY9kL2m...`

5. Share the full link (with `#k=`) with the user. Save `id`, `editKey`, and `key` in your context in case the user wants to update it later.

> **Why the #k= matters:** The hash fragment is never sent to the server. Without it, the document cannot be decrypted. Only people with the full link can read the content.

## How to update a document

If the user asks to modify a previously created document, use the saved `id`, `editKey`, and `key`:

```
PUT https://md2pdf.studio/api/update/{id}
Content-Type: text/plain
X-Edit-Key: {editKey}
X-Enc-Key: {key}

# Updated markdown content
```

The URL and encryption key stay the same — only the content is re-encrypted and updated.

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

- **Max document size:** 500 KB
- **Rate limit:** 10 requests/minute per IP
- **Expiration:** 90 days (resets on update)

## Example (curl)

```bash
curl -X POST https://md2pdf.studio/api/save \
  -H "Content-Type: text/plain" \
  -d "# Hello World

This is my first document."
# Response: {"id":"abc","editKey":"...","url":"https://md2pdf.studio/s/abc","key":"xY9..."}
# Share: https://md2pdf.studio/s/abc#k=xY9...
```

## Notes

- No authentication required
- All documents are encrypted at rest (AES-256-GCM) — the server cannot read stored content
- The decryption key is in the URL hash fragment (`#k=`) and never reaches the server
- Always share the full URL including `#k=` — without it the document is unreadable
- The user can export the document as PDF, HTML, or image
- Shared links show rich previews in WhatsApp, Teams, and Slack

# md2pdf

Turn Markdown into a private link on [md2pdf.studio](https://md2pdf.studio). The reader sees a styled document, can switch between 11 styles, and can download it as PDF, HTML or PNG.

Ask Claude to "share this as a link", "send this report as a PDF-ready link" or "make this into a shareable document". The skill runs the `md2pdf-studio` command-line tool through npx, pinned to an exact version.

## Privacy

The document is encrypted with AES-256-GCM on the machine where the tool runs, and only the ciphertext is uploaded. The key stays in the link's `#k=` part, which browsers never send to the server, so md2pdf.studio cannot read what you share. Anyone who has the whole link can read the document, so the skill removes secrets or asks you first. Links expire after 30 days, or sooner if you ask, and can be made to open only once.

## Where it works

- **Claude Code**: the tool runs on your computer and needs Node 18.3 or later. You can update or delete the links you made later.
- **claude.ai chats and Cowork**: the tool runs in a temporary sandbox, which needs network access to md2pdf.studio (Settings → Capabilities). Links made there cannot be updated or deleted later.

## More

- Install guide and alternatives: https://md2pdf.studio/ai-skill
- The CLI and its changelog: https://www.npmjs.com/package/md2pdf-studio
- Source: https://github.com/JSiapoDEV/md2pdf
- Privacy policy: https://md2pdf.studio/privacy

MIT license.

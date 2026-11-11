# md2pdf

Turn Markdown into a private link on [md2pdf.studio](https://md2pdf.studio). The reader sees a styled document, can switch between 11 styles, and can download it as PDF, HTML or PNG.

Ask Claude to "share this as a link", "send this report as a PDF-ready link" or "make this into a shareable document". The skill runs the `md2pdf-studio` command-line tool through npx, pinned to an exact version.

## What it runs and sends

- npx downloads `md2pdf-studio` at the pinned version from the npm registry and runs it on your computer. It has no dependencies.
- The document is encrypted with AES-256-GCM on your computer. Only the ciphertext goes to md2pdf.studio, with the link's lifetime and whether it opens only once. The key stays in the link's `#k=` part, which browsers never send to the server, so md2pdf.studio cannot read what you share.
- md2pdf.studio counts the links created and the kind of client, without the content, an identifier or your IP address. It uses your IP address for a minute to limit writes, and keeps a daily write count under an irreversible hash of it.
- The keys of the links you make are saved in `~/.config/md2pdf-studio/links.json`, readable only by your user, so you can update or delete those links later.
- Once a day the tool asks the npm registry for the latest version number of `md2pdf-studio`. `MD2PDF_NO_UPDATE_CHECK=1` turns that off.

Anyone who has the whole link can read the document, so the skill removes secrets or asks you first. Links expire after 30 days, or sooner if you ask, and can be made to open only once. The privacy policy has the details.

## Claude Code only

This plugin is for Claude Code, where the tool runs on your computer: it needs Node 18.3 or later, and you can update or delete the links you made later. It also puts the `md2pdf-studio` command, pinned to the same version, on the agent's PATH.

claude.ai and Cowork do not install it. Their chats run code in a sandbox that usually cannot reach md2pdf.studio; to use md2pdf there, see https://md2pdf.studio/ai-skill.

## More

- Install guide and alternatives: https://md2pdf.studio/ai-skill
- The CLI and its changelog: https://www.npmjs.com/package/md2pdf-studio
- Source: https://github.com/JSiapoDEV/md2pdf
- Privacy policy: https://md2pdf.studio/privacy

MIT license.

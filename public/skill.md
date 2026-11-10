---
name: md2pdf
description: Share Markdown as a private, end-to-end encrypted md2pdf.studio link that opens as a styled document the reader can download as PDF, HTML or image. Use when the user wants to share or send a document, report or notes written in Markdown, or wants a link to a styled, PDF-ready version of it.
metadata:
  version: "0.1.3"
---

# md2pdf (skill 0.1.3)

This skill turns Markdown into a private link on md2pdf.studio with the `md2pdf-studio` command-line tool. The reader sees a styled document, can switch between 11 styles and can download it as PDF, HTML or PNG. Everything you need is in this file and in the tool's own help; neither sends you to a web page.

## Before you share

The document is encrypted on this machine and the key stays in the link's `#k=` part, which the server never receives. **Anyone who has the whole link can read it.**

- If the content may hold secrets (API keys, tokens, passwords, customer data, private logs), remove them or ask the user first.
- Give the user the **whole** link, including `#k=...`. Without it nobody can read the document.
- Tell the user the link expires 30 days after creation (or when you set it to) and that you can delete it.
- For something very sensitive, use `--burn`: the link opens a single time.

## Run the tool with npx

Always run it through `npx` with the exact version below. Do not install it globally. It needs Node 18.3 or later and has no dependencies. If Node is not available, tell the user that this skill needs it.

```bash
npx -y md2pdf-studio@0.1.3 share report.md                # prints the link
cat notes.md | npx -y md2pdf-studio@0.1.3 share           # from stdin
npx -y md2pdf-studio@0.1.3 share report.md --expires 7d   # shorter life: 1h to 30d
npx -y md2pdf-studio@0.1.3 share report.md --burn         # opens a single time
npx -y md2pdf-studio@0.1.3 update <link> report.md        # same link, new content
npx -y md2pdf-studio@0.1.3 delete <link>                  # stops working for everyone
npx -y md2pdf-studio@0.1.3 list                           # links made here, without keys
npx -y md2pdf-studio@0.1.3 -h                             # every command and option
```

- For anything not listed here, read `npx -y md2pdf-studio@0.1.3 -h`.
- Add `--json` for machine-readable output.
- The edit key of each link is kept in `~/.config/md2pdf-studio/links.json`, readable by the current user only. Only links made on this machine can be updated or deleted.

## In a chat sandbox

In a claude.ai or Claude Desktop chat, code runs in a temporary environment, not on the user's computer:

- If sharing fails because the network blocks md2pdf.studio, tell the user that code execution needs network access to md2pdf.studio (Settings → Capabilities).
- The link works, but its edit key does not outlive the environment. Tell the user to keep the link, and that it cannot be updated or deleted from a later conversation; it expires on its own.

## Newer versions

The help, `--version`, `share`, `update` and `list` say when a newer version exists. If one does, tell the user. Update only if they agree, with `npx -y md2pdf-studio@0.1.3 upgrade`, which reinstalls this skill with the new version. Never update on your own.

## What renders

GitHub-Flavored Markdown (tables, task lists, images, links), Mermaid diagrams in ` ```mermaid ` blocks, a table of contents from `[TOC]` on its own line, and syntax highlighting for 180+ languages.

## Limits

- 500 KB of Markdown per document.
- 10 writes a minute, and 100 writes a day per address. Deleting is never limited.
- Links expire 30 days after creation; updating does not extend them.

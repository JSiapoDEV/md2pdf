# Changelog

What changed on md2pdf.studio. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the site has no version numbers, so each release is the date it went live. The `md2pdf-studio` command-line tool has [its own changelog](https://github.com/JSiapoDEV/md2pdf/blob/main/cli/CHANGELOG.md).

## 2026-11-10

### Added

- A **New** button, and **Undo** whenever New, a template or an opened file replaces the document.
- **Copy** in the preview copies the formatted document, ready to paste into Teams or an email. Very long documents get a warning, because chat apps cut them.
- About opens as a full page over the editor (`/#info`), and About, Terms and Privacy can be read in Spanish.
- One-time links, and links that expire sooner than 30 days. Chat apps show a generic preview card, because the server cannot read the document.
- `md2pdf-studio`, a command-line tool on npm that shares a Markdown file as an encrypted link, with an MCP server for coding agents.
- A Claude Code plugin: `claude plugin marketplace add jsiapo-dev/plugins`, then `claude plugin install md2pdf-studio`.
- An anonymous count of what people use (exports, templates, links created), with no cookies and no identifiers. The privacy policy lists every event.

### Changed

- Every shared document is encrypted end to end: the browser encrypts it before upload, and the key stays in the link.
- The AI skill is one fixed text, pinned to a version of the command-line tool, and never tells an agent to fetch instructions from the web. The AI Skill dialog now focuses on Claude Code.
- Libraries and fonts are served from md2pdf.studio, so the editor makes no third-party requests.
- The editor's tools for browser agents (WebMCP) follow the current draft of the standard.

### Removed

- The API tab. Other websites can no longer call the share service: people share from the editor or the command-line tool. `/api` now explains how share links work.
- Links in the old `/share?doc=…` format, which carried the whole document unencrypted in the address. They no longer open.

### Security

- The server refuses unencrypted documents and any request that carries a decryption key.

## 2026-10-02

### Fixed

- A reload, a broken link or a failed save no longer replaces the stored draft, and each draft keeps its own share links.
- The table of contents follows edits to the headings.

### Security

- Rendering no longer runs scripts hidden in a document, and share links are encrypted in the browser.

## 2026-04-18

### Added

- Mermaid diagrams, and a table of contents from `[TOC]` on its own line.
- Share links that can be updated in place, and shared documents that open read-only, with a button to edit a copy.
- Pages for each of the 11 styles, five templates, and comparisons with other tools.
- An English and Spanish interface, an Apply button for custom CSS, copy buttons on code blocks and an editable title.
- `llms.txt` and an installable AI skill for agents.

### Fixed

- Switching between dark and light themes left stale colors.
- The toolbar and footer on phones.

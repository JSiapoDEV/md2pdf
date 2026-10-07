# md2pdf-studio

Share Markdown as a private link from your terminal or AI agent.

The document is encrypted on your machine with AES-256-GCM before it is uploaded. The key lives only in the link's `#k=` fragment, which is never sent to the server, so [md2pdf.studio](https://md2pdf.studio) stores ciphertext it cannot read. Anyone with the whole link can open it in a styled, read-only view; the page is `noindex`, so search engines don't list it.

No dependencies. Node 18.3 or later.

```bash
npx -y md2pdf-studio share report.md
# https://md2pdf.studio/s/AbCd1234#k=...      <- give people the whole link

cat notes.md | npx -y md2pdf-studio share       # from stdin
```

## Commands

| Command | What it does |
|---|---|
| `share <file\|->` | Encrypt, upload, print the link. Reads stdin when the file is `-` or omitted |
| `update <link\|id> <file\|->` | Replace the content behind a link. Same link, same key, same expiry |
| `delete <link\|id>` | Delete a link; it stops working for everyone |
| `list` | Links made on this machine that have not expired (printed without their keys) |
| `mcp` | Run as an [MCP](https://modelcontextprotocol.io) server over stdio |
| `skill [--install]` | Print the agent skill, or install it to `~/.claude/skills/md2pdf` (`--dir` to choose another folder) |

### Options

| Option | For | What it does |
|---|---|---|
| `--expires <t>` | share, update | A shorter life than the 30-day default: `1h`, `7d`, or seconds (1 hour minimum). Updating can only shorten it |
| `--burn` | share | The link can be opened a single time. Link-preview bots in chat apps do not use it up: the page only asks the reader to confirm |
| `--title <text>`, `--description <text>` | share, update | The preview card chat apps show. Needs a Pro API key. **Stored unencrypted**, so never put anything private there |
| `--api-key <key>` | share, update | A Pro API key (or `MD2PDF_API_KEY`). Allows links up to 365 days, 5 MB documents and a larger daily quota |
| `--json` | all | Machine-readable output |
| `--api <url>` | all | Use your own deployment (or `MD2PDF_API`) |

The key is never an MCP tool argument, so a model cannot see it: set `MD2PDF_API_KEY` in the server's environment instead.

## For AI agents

Install the skill for Claude:

```bash
npx -y md2pdf-studio skill --install
```

For Codex, Cursor, Gemini CLI and others, add a line to the agent's instructions file (`AGENTS.md` or equivalent):

> To share Markdown as a private link, run `npx -y md2pdf-studio share <file>` and give the user the full link. Before sharing, remove secrets or ask the user.

For MCP clients, register the server:

```json
{ "mcpServers": { "md2pdf-studio": { "command": "npx", "args": ["-y", "md2pdf-studio", "mcp"] } } }
```

Tools: `share_markdown`, `update_shared_markdown`, `delete_shared_markdown`, `list_shared_markdown`.

## What is kept on your machine

The edit key and encryption key of every link you create are saved in `~/.config/md2pdf-studio/links.json` (or `$XDG_CONFIG_HOME`, or `$MD2PDF_HOME`), readable by your user only. That is what lets you update or delete a link later, including from another agent session. Only links made on this machine can be changed, and `list` never prints the keys. Delete the file and you can no longer change those links; they still expire on their own.

## Limits

- Free: 500 KB per document, 10 writes per minute and 100 writes (25 MB) per day per address. Deleting is never limited
- Pro API key: 5 MB per document and a larger daily quota
- Links expire 30 days after creation by default (updating does not extend it); up to 365 days with a Pro key

## Privacy

The server receives ciphertext, your IP address (for the per-minute limit, held about a minute, and counted by hash for the daily limit until 00:00 UTC) and the edit key. With `--title` or `--description` it also receives those two fields. It never receives the encryption key or your text. See the [privacy policy](https://md2pdf.studio/privacy) and the [API reference](https://md2pdf.studio/api).

MIT license.

# md2pdf-studio

Share Markdown as a private link from your terminal or AI agent.

The document is encrypted on your machine with AES-256-GCM before it is uploaded. The key lives only in the link's `#k=` fragment, which is never sent to the server, so [md2pdf.studio](https://md2pdf.studio) stores ciphertext it cannot read. Anyone with the whole link can open it in a styled, read-only view; the page is `noindex`, so search engines don't list it.

No dependencies. Node 18.3 or later.

```bash
npx -y md2pdf-studio@0.1.3 share report.md
# https://md2pdf.studio/s/AbCd1234#k=...      <- give people the whole link

cat notes.md | npx -y md2pdf-studio@0.1.3 share       # from stdin
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
| `upgrade` | Update the installed skill to the latest version, and say what else to change (MCP configuration, a global install) |
| `changelog` | What changed in each version |

### Options

| Option | For | What it does |
|---|---|---|
| `--expires <t>` | share, update | A shorter life than the 30-day default: `1h`, `7d`, or seconds (1 hour minimum). Updating can only shorten it |
| `--burn` | share | The link can be opened a single time. Link-preview bots in chat apps do not use it up: the page only asks the reader to confirm |
| `--json` | all | Machine-readable output |
| `--api <url>` | all | Use your own deployment (or `MD2PDF_API`) |

## For AI agents

Every command here names an exact version, so what an agent runs does not change until you choose to update. The skill is a fixed file inside the package (read it with `skill`); it never tells the agent to fetch instructions from the web.

For Claude Code, the plugin ships the skill and updates on its own:

```bash
claude plugin marketplace add jsiapo-dev/plugins
claude plugin install md2pdf-studio
```

Or install only the skill:

```bash
npx -y md2pdf-studio@0.1.3 skill --install
```

For Claude Desktop or claude.ai, paste the skill (`npx -y md2pdf-studio@0.1.3 skill` prints it) into a chat and ask Claude to install it. There the CLI runs in a temporary sandbox: code execution needs network access to md2pdf.studio (Settings → Capabilities), and links made there cannot be updated or deleted later.

For Codex, Cursor, Gemini CLI and others, add a line to the agent's instructions file (`AGENTS.md` or equivalent):

> To share Markdown as a private link, run `npx -y md2pdf-studio@0.1.3 share <file>` and give the user the full link. Before sharing, remove secrets or ask the user.

For MCP clients, register the server:

```json
{ "mcpServers": { "md2pdf-studio": { "command": "npx", "args": ["-y", "md2pdf-studio@0.1.3", "mcp"] } } }
```

Tools: `share_markdown`, `update_shared_markdown`, `delete_shared_markdown`, `list_shared_markdown`. The server also sends the sharing rules (remove secrets, give the whole link) as its MCP instructions.

## Updates

Use the CLI through `npx` with an exact version rather than installing it globally: what runs then never changes until you choose.

Once a day, `-h`, `--version`, `share`, `update`, `list` and the MCP server ask the npm registry for the latest version number. They say whether a newer one exists (in the help, on stderr, or in the first MCP tool result) and how to update:

```bash
npx -y md2pdf-studio@<new version> changelog    # what changed
npx -y md2pdf-studio@<new version> upgrade      # reinstall the skill with it
```

Nothing is downloaded or installed unless you run `upgrade`. Only the version number is read; set `MD2PDF_NO_UPDATE_CHECK=1` to turn the check off. Changes are listed in [CHANGELOG.md](CHANGELOG.md).

## What is kept on your machine

The edit key and encryption key of every link you create are saved in `~/.config/md2pdf-studio/links.json` (or `$XDG_CONFIG_HOME`, or `$MD2PDF_HOME`), readable by your user only. That is what lets you update or delete a link later, including from another agent session. Only links made on this machine can be changed, and `list` never prints the keys. Delete the file and you can no longer change those links; they still expire on their own.

## Limits

- Free: 500 KB per document, 10 writes per minute and 100 writes (25 MB) per day per address. Deleting is never limited
- Links expire 30 days after creation by default (updating does not extend it)

## Privacy

The server receives ciphertext, your IP address (for the per-minute limit, held about a minute, and counted by hash for the daily limit until 00:00 UTC) and the edit key. It never receives the encryption key or your text. Requests carry the User-Agent `md2pdf-studio/<version>`. The daily update check sends npm only that same User-Agent. See the [privacy policy](https://md2pdf.studio/privacy) and [how links work](https://md2pdf.studio/api).

If md2pdf-studio is useful to you, a star on [GitHub](https://github.com/JSiapoDEV/md2pdf) helps other people find it.

MIT license.

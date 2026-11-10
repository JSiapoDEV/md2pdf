# Changelog

All notable changes to md2pdf-studio are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.2] - 2026-11-10

### Removed

- Options that md2pdf.studio does not offer, from the help, the README, the skill and the MCP tools.

## [0.1.1] - 2026-11-10

### Added

- `upgrade` command: checks npm for a newer version and, when there is one, reinstalls the skill with it and says what else to update (MCP configuration, a global install). It runs only when you ask for it.
- `changelog` command: prints this file, so `npx -y md2pdf-studio@<version> changelog` shows what a version changed before you update.
- `-h`, `--version` and running without a command now also report whether a newer version exists, using the same once-a-day check.

### Changed

- The update notice names the commands to see the changes and to update, matched to how the CLI runs (npx, a global install or MCP). It no longer points to a web page.
- The skill no longer links anywhere. It covers the CLI through npx with a pinned version and sends the agent to `-h` for everything else. The Python example and the link to the API reference were removed.

## [0.1.0] - 2026-11-10

### Added

- First release: `share`, `update`, `delete` and `list` end-to-end encrypted md2pdf.studio links from a terminal. The document is encrypted with AES-256-GCM on your machine; the key stays in the link's `#k=` part.
- `--expires` and `--burn` options.
- `mcp`: an MCP server over stdio with `share_markdown`, `update_shared_markdown`, `delete_shared_markdown` and `list_shared_markdown`, which sends its sharing rules as server instructions.
- `skill [--install]`: prints the agent skill, or installs it for Claude Code.
- A once-a-day check for a newer version on npm that never installs anything. `MD2PDF_NO_UPDATE_CHECK=1` turns it off.

[unreleased]: https://github.com/JSiapoDEV/md2pdf/compare/md2pdf-studio-v0.1.2...HEAD
[0.1.2]: https://github.com/JSiapoDEV/md2pdf/compare/md2pdf-studio-v0.1.1...md2pdf-studio-v0.1.2
[0.1.1]: https://github.com/JSiapoDEV/md2pdf/compare/md2pdf-studio-v0.1.0...md2pdf-studio-v0.1.1
[0.1.0]: https://github.com/JSiapoDEV/md2pdf/releases/tag/md2pdf-studio-v0.1.0

# MD2PDF

**Convert Markdown to beautifully styled PDFs, HTML, and images — right in your browser.**

[md2pdf.studio](https://md2pdf.studio)

---

## Features

- **Live Preview** — Split editor with real-time rendering
- **11 Visual Styles** — Notion, GitHub, Minimal, Academic, Corporate, LaTeX, Dracula, Newspaper, Handwritten, Terminal, Pastel
- **Export to PDF** — Continuous single-page PDF, no page breaks cutting content
- **Export to HTML** — Standalone file with all styles inlined
- **Export to Image** — PNG screenshot of your document
- **Custom CSS** — Inject your own styles, applied to preview and exports
- **5 Templates** — CV/Resume, Report, Documentation, Changelog, Meeting Notes
- **Dark & Light Mode** — Toggle your preferred theme
- **Drag & Drop** — Drop `.md` files directly into the editor
- **Find & Replace** — Search and replace text in the editor (`Ctrl+F`, `Ctrl+H`)
- **Share by URL** — Compress your document into a shareable link, no server needed
- **Scroll Sync** — Editor and preview scroll together
- **Fullscreen Mode** — Distraction-free editing (`F11`)
- **Word Count** — Words and estimated reading time
- **Auto-Save** — Drafts saved to localStorage automatically
- **AI Skill** — Installable Skill (Claude Skills format) and public REST API so AI agents can create, update, and share documents programmatically
- **WebMCP** — AI agents can also interact with MD2PDF directly via WebMCP
- **AI Discoverable** — `llms.txt`, `robots.txt`, JSON-LD, Open Graph, `ai-plugin.json`

## Tech Stack

- Pure **HTML**, **CSS**, **JavaScript** — no framework, no build step
- [marked.js](https://github.com/markedjs/marked) — Markdown parsing
- [highlight.js](https://github.com/highlightjs/highlight.js) — Syntax highlighting
- [html2canvas](https://github.com/niklasvh/html2canvas) — Image export
- [LZ-String](https://github.com/pieroxy/lz-string) — URL sharing compression
- [GitHub Markdown CSS](https://github.com/sindresorhus/github-markdown-css) — Base styling

## Quick Start

No install required. Just open `index.html` in your browser.

```bash
git clone https://github.com/JSiapoDEV/MD2PDF.git
cd MD2PDF
open index.html
```

Or visit [md2pdf.studio](https://md2pdf.studio)

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + S` | Export to PDF |
| `Ctrl + F` | Find |
| `Ctrl + H` | Find & Replace |
| `Ctrl + Shift + L` | Toggle dark/light theme |
| `F11` | Toggle fullscreen |
| `Tab` | Insert tab in editor |

## Available Styles

| Style | Description |
|-------|-------------|
| **Notion** | Clean, modern sans-serif (default) |
| **GitHub** | Classic GitHub markdown rendering |
| **Minimal** | Elegant serif, no decorations |
| **Academic** | Formal justified text, scholarly feel |
| **Corporate** | Professional with blue accents |
| **LaTeX** | Simulates academic papers |
| **Dracula** | Vibrant purple/pink/green palette |
| **Newspaper** | Editorial typography |
| **Handwritten** | Cursive font with notebook lines |
| **Terminal** | Green-on-black monospace |
| **Pastel** | Soft colors with rounded elements |

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before getting started.

## License

[MIT](LICENSE) — Built by [JSiapoDev](https://jsiapo.dev)

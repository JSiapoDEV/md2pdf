(() => {
    'use strict';

    // ── DOM ──────────────────────────────────────────

    const $ = (s) => document.querySelector(s);
    const editor          = $('#editor');
    const preview         = $('#preview');
    const fileNameEl      = $('#fileName');
    const themeToggle     = $('#themeToggle');
    const exportBtn       = $('#exportBtn');
    const exportDropdown  = $('#exportDropdown');
    const exportPDFBtn    = $('#exportPDFBtn');
    const exportHTMLBtn   = $('#exportHTMLBtn');
    const uploadBtn       = $('#uploadBtn');
    const fileInput       = $('#fileInput');
    const dropOverlay     = $('#dropOverlay');
    const exportOverlay   = $('#exportOverlay');
    const resizeHandle    = $('#resizeHandle');
    const editorPane      = $('#editorPane');
    const previewPane     = $('#previewPane');
    const styleSelect     = $('#styleSelect');
    const customCSSToggle = $('#customCSSToggle');
    const customCSSPanel  = $('#customCSSPanel');
    const customCSSInput  = $('#customCSS');
    const styleOverride   = $('#style-override');
    const customOverride  = $('#custom-css-override');
    const counterEl       = $('#counter');
    const toastEl         = $('#toast');
    const toastMsg        = $('#toastMessage');
    const viewToggle      = $('#viewToggle');
    const workspace       = $('.workspace');
    const fullscreenBtn   = $('#fullscreenBtn');
    const exportImageBtn  = $('#exportImageBtn');
    const shareBtn        = $('#shareBtn');
    const findPanel       = $('#findPanel');
    const findInput       = $('#findInput');
    const findCount       = $('#findCount');
    const findPrevBtn     = $('#findPrevBtn');
    const findNextBtn     = $('#findNextBtn');
    const findCloseBtn    = $('#findCloseBtn');
    const replaceToggleBtn= $('#replaceToggleBtn');
    const replaceRow      = $('#replaceRow');
    const replaceInput    = $('#replaceInput');
    const replaceBtn      = $('#replaceBtn');
    const replaceAllBtn   = $('#replaceAllBtn');
    const previewContainer= $('.preview-container');

    // ── State ────────────────────────────────────────

    let currentFileName = 'untitled.md';
    let currentStyle    = 'github';
    let renderTimer     = null;
    let saveTimer       = null;

    // ── Styles ───────────────────────────────────────

    const STYLES = {
        github: { name: 'GitHub', dark: false, bg: '#fff', css: '' },

        minimal: { name: 'Minimal', dark: false, bg: '#fff', css: `
.markdown-body {
  font-family: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif !important;
  line-height: 1.85;
}
.markdown-body h1, .markdown-body h2 {
  border-bottom: none;
  font-weight: 600;
}
.markdown-body h1 { font-size: 2em; letter-spacing: -0.02em; }
.markdown-body blockquote {
  border-left-width: 3px;
  font-style: italic;
}
.markdown-body a { text-decoration: underline; text-underline-offset: 3px; }
.markdown-body hr { border: none; border-top: 1px solid var(--border, #e5e7eb); }
.markdown-body pre { border-radius: 8px; }
`},

        academic: { name: 'Academic', dark: false, bg: '#fff', css: `
.markdown-body {
  font-family: Cambria, Georgia, 'Times New Roman', serif !important;
  font-size: 16px;
  line-height: 1.9;
  text-align: justify;
  hyphens: auto;
}
.markdown-body h1 {
  text-align: center;
  font-size: 1.7em;
  border-bottom: 2px solid currentColor;
  padding-bottom: 0.4em;
}
.markdown-body h2 {
  font-size: 1.4em;
  border-bottom: 1px solid currentColor;
  padding-bottom: 0.2em;
}
.markdown-body h3 { font-size: 1.15em; border-bottom: none; }
.markdown-body blockquote {
  font-style: italic;
  border-left-width: 4px;
}
.markdown-body pre { border-radius: 4px; }
.markdown-body table { font-size: 14px; }
`},

        corporate: { name: 'Corporate', dark: false, bg: '#fff', css: `
.markdown-body {
  font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif !important;
  font-size: 15px;
  line-height: 1.7;
}
.markdown-body h1, .markdown-body h2, .markdown-body h3 { color: #2563eb; }
[data-theme="dark"] .markdown-body h1,
[data-theme="dark"] .markdown-body h2,
[data-theme="dark"] .markdown-body h3 { color: #60a5fa; }
.markdown-body h1 { border-bottom: 2px solid currentColor; }
.markdown-body h2 { border-bottom: 1px solid currentColor; }
.markdown-body h3 { border-bottom: none; }
.markdown-body blockquote {
  border-left: 4px solid #2563eb;
  border-radius: 0 8px 8px 0;
}
[data-theme="dark"] .markdown-body blockquote { border-left-color: #60a5fa; }
.markdown-body pre { border-radius: 8px; }
.markdown-body table th {
  background: #2563eb !important;
  color: #fff !important;
}
[data-theme="dark"] .markdown-body table th {
  background: #1e40af !important;
}
`},

        notion: { name: 'Notion', dark: false, bg: '#fff', css: `
.markdown-body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
  font-size: 15px;
  line-height: 1.75;
}
.markdown-body h1 {
  font-size: 1.875em;
  border-bottom: none;
  font-weight: 700;
}
.markdown-body h2 {
  font-size: 1.5em;
  border-bottom: none;
  font-weight: 600;
  margin-top: 2em;
}
.markdown-body h3 {
  font-size: 1.25em;
  border-bottom: none;
}
.markdown-body code:not(pre code) {
  background: rgba(135,131,120,.15) !important;
  color: #eb5757 !important;
  border-radius: 4px;
  padding: 0.15em 0.4em;
  font-size: 0.88em;
}
[data-theme="dark"] .markdown-body code:not(pre code) {
  background: rgba(135,131,120,.3) !important;
  color: #ff7b72 !important;
}
.markdown-body pre { border-radius: 6px; border: none !important; }
.markdown-body blockquote { border-left: 3px solid currentColor; }
.markdown-body hr { border: none; border-top: 1px solid var(--border, #e5e7eb); }
`},

        latex: { name: 'LaTeX', dark: false, bg: '#fff', css: `
@import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Inconsolata:wght@400;500&display=swap');
.markdown-body {
  font-family: 'Libre Baskerville', 'Computer Modern', Georgia, serif !important;
  font-size: 15px;
  line-height: 1.9;
  text-align: justify;
  hyphens: auto;
  color: #1a1a1a !important;
}
[data-theme="dark"] .markdown-body { color: #e0ddd5 !important; }
.markdown-body h1 {
  text-align: center;
  font-size: 1.8em;
  border-bottom: none;
  font-weight: 700;
  margin-bottom: 0.2em;
}
.markdown-body h2 {
  font-size: 1.35em;
  border-bottom: none;
  font-weight: 700;
  margin-top: 2em;
}
.markdown-body h3 {
  font-size: 1.1em;
  border-bottom: none;
  font-style: italic;
  font-weight: 400;
}
.markdown-body code, .markdown-body pre code {
  font-family: 'Inconsolata', 'Courier New', monospace !important;
}
.markdown-body pre {
  border-radius: 2px;
  border: 1px solid #ccc !important;
}
[data-theme="dark"] .markdown-body pre { border-color: #444 !important; }
.markdown-body blockquote {
  border-left: 2px solid #666;
  font-style: italic;
  padding-left: 1.5em;
}
.markdown-body hr {
  border: none;
  text-align: center;
  margin: 2em 0;
}
.markdown-body hr::after {
  content: '* * *';
  color: #999;
  letter-spacing: 1em;
}
.markdown-body table {
  font-size: 14px;
}
.markdown-body table th {
  border-bottom: 2px solid currentColor !important;
  font-weight: 700;
}
.markdown-body a { color: inherit; text-decoration: underline; }
`},

        dracula: { name: 'Dracula', dark: true, bg: '#282a36', css: `
.markdown-body {
  font-family: 'Segoe UI', system-ui, sans-serif !important;
  font-size: 15px;
  line-height: 1.75;
  color: #f8f8f2 !important;
  background: #282a36 !important;
}
.markdown-body h1, .markdown-body h2 {
  color: #bd93f9 !important;
  border-bottom: 1px solid #44475a;
}
.markdown-body h3, .markdown-body h4 { color: #ff79c6 !important; }
.markdown-body a { color: #8be9fd !important; }
.markdown-body strong { color: #ffb86c !important; }
.markdown-body em { color: #f1fa8c !important; }
.markdown-body code:not(pre code) {
  background: #44475a !important;
  color: #50fa7b !important;
  border-radius: 4px;
  padding: 0.15em 0.4em;
}
.markdown-body pre {
  background: #1e1f29 !important;
  border: 1px solid #44475a !important;
  border-radius: 8px;
}
.markdown-body blockquote {
  border-left: 4px solid #bd93f9;
  color: #ccc !important;
}
.markdown-body table th {
  background: #44475a !important;
  color: #f8f8f2 !important;
}
.markdown-body table td {
  background: #282a36 !important;
  color: #f8f8f2 !important;
  border-color: #44475a !important;
}
.markdown-body table tr {
  background: #282a36 !important;
  border-color: #44475a !important;
}
.markdown-body table tr:nth-child(2n) {
  background: #2e303e !important;
}
.markdown-body hr { border-color: #44475a !important; }
.markdown-body li::marker { color: #bd93f9; }
`},

        newspaper: { name: 'Newspaper', dark: false, bg: '#fff', css: `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap');
.markdown-body {
  font-family: 'Source Serif 4', Georgia, serif !important;
  font-size: 15.5px;
  line-height: 1.8;
  text-align: justify;
  hyphens: auto;
}
.markdown-body h1 {
  font-family: 'Playfair Display', Georgia, serif !important;
  font-size: 2.4em;
  font-weight: 700;
  text-align: center;
  border-bottom: 3px double currentColor;
  padding-bottom: 0.3em;
  letter-spacing: -0.02em;
  line-height: 1.2;
}
.markdown-body h2 {
  font-family: 'Playfair Display', Georgia, serif !important;
  font-size: 1.5em;
  font-weight: 700;
  border-bottom: 1px solid currentColor;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 1.1em;
}
.markdown-body h3 {
  font-family: 'Playfair Display', Georgia, serif !important;
  font-style: italic;
  border-bottom: none;
  font-weight: 400;
  font-size: 1.2em;
}
.markdown-body blockquote {
  border-left: 3px solid currentColor;
  font-style: italic;
  font-size: 1.1em;
  padding: 0.5em 1em;
}
.markdown-body hr {
  border: none;
  border-top: 1px solid currentColor;
  margin: 2em auto;
  width: 40%;
}
.markdown-body a { color: inherit; text-decoration: underline; }
.markdown-body pre { border-radius: 0; border: 1px solid #999 !important; }
[data-theme="dark"] .markdown-body pre { border-color: #555 !important; }
.markdown-body table { font-size: 14px; }
.markdown-body table th {
  text-transform: uppercase;
  font-size: 0.85em;
  letter-spacing: 0.05em;
}
`},

        handwritten: { name: 'Handwritten', dark: false, bg: '#fff', css: `
@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&display=swap');
.markdown-body {
  font-family: 'Caveat', cursive !important;
  font-size: 20px;
  line-height: 1.9;
  background-image: repeating-linear-gradient(transparent, transparent 39px, #e8e4df 39px, #e8e4df 40px) !important;
  background-size: 100% 40px;
  padding-top: 8px !important;
}
[data-theme="dark"] .markdown-body {
  background-image: repeating-linear-gradient(transparent, transparent 39px, #2a2520 39px, #2a2520 40px) !important;
}
.markdown-body h1 {
  font-size: 2em;
  border-bottom: none;
  font-weight: 700;
  text-decoration: underline;
  text-decoration-style: wavy;
  text-underline-offset: 6px;
}
.markdown-body h2 {
  font-size: 1.6em;
  border-bottom: none;
  font-weight: 700;
}
.markdown-body h3 {
  font-size: 1.3em;
  border-bottom: none;
  font-weight: 600;
}
.markdown-body code, .markdown-body pre code {
  font-family: 'Caveat', cursive !important;
  font-size: 0.9em;
}
.markdown-body pre {
  border-radius: 0;
  border: 2px dashed #bbb !important;
  background: rgba(0,0,0,0.02) !important;
}
[data-theme="dark"] .markdown-body pre {
  border-color: #555 !important;
  background: rgba(255,255,255,0.03) !important;
}
.markdown-body blockquote {
  border-left: 3px solid #e88;
  font-style: italic;
}
.markdown-body a { color: #4477cc; }
[data-theme="dark"] .markdown-body a { color: #6699ee; }
.markdown-body hr {
  border: none;
  border-top: 2px dashed #ccc;
}
[data-theme="dark"] .markdown-body hr { border-top-color: #444; }
.markdown-body table { font-size: 18px; }
`},

        terminal: { name: 'Terminal', dark: true, bg: '#0a0a0a', css: `
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&display=swap');
.markdown-body {
  font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace !important;
  font-size: 14px;
  line-height: 1.7;
  color: #00ff41 !important;
  background: #0a0a0a !important;
}
.markdown-body h1, .markdown-body h2, .markdown-body h3 {
  color: #00ff41 !important;
  border-bottom: 1px solid #00ff4133;
  font-weight: 600;
}
.markdown-body h1::before { content: '# '; opacity: 0.4; }
.markdown-body h2::before { content: '## '; opacity: 0.4; }
.markdown-body h3::before { content: '### '; opacity: 0.4; }
.markdown-body a { color: #00bcd4 !important; }
.markdown-body strong { color: #ffeb3b !important; }
.markdown-body code:not(pre code) {
  background: #1a1a1a !important;
  color: #ff6b6b !important;
  border: 1px solid #333 !important;
  border-radius: 2px;
  padding: 0.1em 0.4em;
}
.markdown-body pre {
  background: #111 !important;
  border: 1px solid #333 !important;
  border-radius: 0;
}
.markdown-body blockquote {
  border-left: 3px solid #00ff41;
  color: #aaa !important;
}
.markdown-body table th {
  background: #1a1a1a !important;
  color: #00ff41 !important;
}
.markdown-body table td {
  background: #0a0a0a !important;
  color: #00ff41 !important;
  border-color: #333 !important;
}
.markdown-body table tr {
  background: #0a0a0a !important;
  border-color: #333 !important;
}
.markdown-body table tr:nth-child(2n) {
  background: #111 !important;
}
.markdown-body hr { border-color: #333 !important; }
.markdown-body li::marker { color: #00ff41; }
`},

        pastel: { name: 'Pastel', dark: false, bg: '#fff', css: `
@import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,400;0,600;0,700;1,400&display=swap');
.markdown-body {
  font-family: 'Nunito', 'Rounded Mplus 1c', system-ui, sans-serif !important;
  font-size: 15px;
  line-height: 1.8;
}
.markdown-body h1 {
  color: #e879a8 !important;
  border-bottom: 2px solid #f0c4d8;
  font-weight: 700;
  font-size: 2em;
}
[data-theme="dark"] .markdown-body h1 {
  border-bottom-color: #5a3045;
}
.markdown-body h2 {
  color: #7c6dd8 !important;
  border-bottom: 1px solid #c4bef0;
  font-weight: 700;
}
[data-theme="dark"] .markdown-body h2 { border-bottom-color: #3d3570; }
.markdown-body h3 {
  color: #4db8a8 !important;
  border-bottom: none;
  font-weight: 700;
}
.markdown-body a { color: #6ba3e8 !important; }
.markdown-body code:not(pre code) {
  background: #fce4ec !important;
  color: #c0456e !important;
  border-radius: 12px;
  padding: 0.15em 0.5em;
  font-size: 0.88em;
}
[data-theme="dark"] .markdown-body code:not(pre code) {
  background: #3d1a28 !important;
  color: #f48fb1 !important;
}
.markdown-body pre {
  border-radius: 16px;
  border: 2px solid #e8d4f0 !important;
}
[data-theme="dark"] .markdown-body pre {
  border-color: #3d2850 !important;
}
.markdown-body blockquote {
  border-left: 4px solid #b8a9e8;
  border-radius: 0 12px 12px 0;
  background: rgba(184,169,232,0.08);
  padding: 0.8em 1em;
}
[data-theme="dark"] .markdown-body blockquote {
  background: rgba(184,169,232,0.05);
}
.markdown-body table th {
  background: #e8d4f0 !important;
  color: #5a3878 !important;
  border-radius: 0;
}
[data-theme="dark"] .markdown-body table th {
  background: #3d2850 !important;
  color: #d4b8e8 !important;
}
.markdown-body hr {
  border: none;
  height: 2px;
  background: linear-gradient(90deg, #f0c4d8, #c4bef0, #a8e0d8);
}
.markdown-body img { border-radius: 12px; }
`},
    };

    // ── Templates ────────────────────────────────────

    const TEMPLATES = {
        blank: '',

        cv: `# Your Name

**Full Stack Developer** | City, Country
your@email.com | [LinkedIn](https://linkedin.com/in/yourprofile) | [GitHub](https://github.com/youruser)

---

## Experience

### Senior Developer — Company Name
*Jan 2024 – Present*

- Led development of the main platform serving 50k+ users
- Implemented CI/CD pipelines reducing deploy time by 60%
- Mentored a team of 4 junior developers

### Developer — Previous Company
*Mar 2021 – Dec 2023*

- Built RESTful APIs with Node.js and PostgreSQL
- Developed responsive interfaces with React and Tailwind CSS
- Optimized database queries improving response time by 40%

---

## Education

### University Name
**Bachelor in Computer Science** — 2017–2021

---

## Skills

| Category | Technologies |
|----------|-------------|
| Frontend | React, TypeScript, Next.js, Tailwind CSS |
| Backend  | Node.js, Python, Django, Express |
| Database | PostgreSQL, MongoDB, Redis |
| DevOps   | Docker, AWS, GitHub Actions |

---

## Languages

- Spanish — Native
- English — Professional proficiency
`,

        report: `# Monthly Report — April 2026

**Author:** Your Name
**Department:** Engineering
**Date:** April 8, 2026

---

## Executive Summary

Brief overview of the month's progress, key achievements, and challenges encountered.

## Key Metrics

| Metric | Previous | Current | Change |
|--------|----------|---------|--------|
| Active Users | 12,500 | 14,800 | +18.4% |
| Uptime | 99.2% | 99.8% | +0.6% |
| Avg Response | 245ms | 180ms | -26.5% |
| Tickets Resolved | 89 | 112 | +25.8% |

## Highlights

- Successfully launched the new dashboard feature
- Migrated database to new cluster with zero downtime
- Reduced infrastructure costs by 15%

## Challenges

- Third-party API rate limits affected data sync
- Need additional resources for Q2 roadmap

## Action Items

- [ ] Finalize Q2 roadmap by April 15
- [ ] Schedule performance review meetings
- [ ] Complete security audit for new modules

## Next Month Goals

1. Launch mobile app beta
2. Implement automated testing pipeline
3. Onboard 2 new team members
`,

        docs: `# Project Name

> A brief description of what this project does and who it's for.

## Installation

\`\`\`bash
npm install project-name
\`\`\`

## Quick Start

\`\`\`javascript
import { createApp } from 'project-name';

const app = createApp({
  port: 3000,
  debug: true,
});

app.start();
\`\`\`

## API Reference

### \`createApp(options)\`

Creates a new application instance.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| \`port\` | \`number\` | \`3000\` | Server port |
| \`debug\` | \`boolean\` | \`false\` | Enable debug mode |
| \`env\` | \`string\` | \`"production"\` | Environment name |

**Returns:** \`App\` instance

### \`app.start()\`

Starts the application server.

\`\`\`javascript
await app.start();
console.log('Server running');
\`\`\`

## Configuration

Create a \`config.json\` file in the root directory:

\`\`\`json
{
  "database": {
    "host": "localhost",
    "port": 5432,
    "name": "myapp"
  }
}
\`\`\`

## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing\`)
5. Open a Pull Request

## License

MIT
`,

        changelog: `# Changelog

All notable changes to this project will be documented in this file.

## [2.1.0] — 2026-04-08

### Added
- Dark mode support across all components
- Export to PDF functionality
- Drag and drop file upload

### Changed
- Improved table rendering performance
- Updated dependencies to latest versions

### Fixed
- Fixed scroll position reset on theme toggle
- Resolved memory leak in preview renderer

---

## [2.0.0] — 2026-03-15

### Added
- Complete UI redesign with new design system
- Multi-language support (EN, ES)
- Keyboard shortcuts

### Changed
- **BREAKING:** Renamed \`config.init()\` to \`config.setup()\`
- Migrated from Webpack to Vite

### Removed
- Removed deprecated \`legacy\` mode
- Dropped support for IE11

---

## [1.5.2] — 2026-02-28

### Fixed
- Fixed crash when opening empty files
- Corrected date formatting in reports

---

## [1.5.0] — 2026-02-10

### Added
- Auto-save feature
- Template gallery

### Changed
- Improved search performance by 3x
`,

        meeting: `# Meeting Notes — April 8, 2026

**Project:** Project Name
**Attendees:** Alice, Bob, Carol, Dave
**Duration:** 45 minutes
**Facilitator:** Alice

---

## Agenda

1. Sprint review & demo
2. Deployment timeline
3. Open issues
4. Next steps

## Discussion

### 1. Sprint Review

- Completed 14 out of 16 story points
- Demo of the new dashboard was well received
- Two items moved to next sprint due to dependency blockers

### 2. Deployment Timeline

- Staging deploy scheduled for **April 10**
- Production release targeted for **April 14** pending QA signoff
- Rollback plan documented in Confluence

### 3. Open Issues

- API rate limiting needs investigation — assigned to Bob
- CSS rendering issue on Safari — assigned to Carol
- Documentation needs updating for v2.1 — assigned to Dave

## Decisions

- Agreed to adopt bi-weekly release cadence starting May
- Will use feature flags for gradual rollout

## Action Items

- [ ] **Bob** — Investigate API rate limiting (Due: Apr 10)
- [ ] **Carol** — Fix Safari rendering bug (Due: Apr 11)
- [ ] **Dave** — Update v2.1 documentation (Due: Apr 12)
- [ ] **Alice** — Send stakeholder update email (Due: Apr 9)

## Next Meeting

**April 15, 2026** at 10:00 AM
`,
    };

    // ── Default sample ───────────────────────────────

    const SAMPLE = `# Welcome to MD2PDF

Convert your Markdown documents to beautifully styled PDFs with GitHub-flavored rendering.

## Features

- **Live Preview** — See changes as you type
- **Multiple Styles** — GitHub, Minimal, Academic, Corporate, Notion
- **PDF & HTML Export** — Download your document in either format
- **Dark & Light Mode** — Toggle your preferred theme
- **Drag & Drop** — Drop \`.md\` files into the editor
- **Templates** — Start with pre-made document templates
- **Custom CSS** — Inject your own styles

## Code Example

\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const seq = Array.from({ length: 10 }, (_, i) => fibonacci(i));
console.log(seq); // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
\`\`\`

\`\`\`python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left  = [x for x in arr if x < pivot]
    mid   = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + mid + quicksort(right)
\`\`\`

## Table

| Shortcut | Action |
|---|---|
| \`Ctrl + S\` | Export to PDF |
| \`Ctrl + Shift + L\` | Toggle theme |
| \`Tab\` | Insert tab |

## Task List

- [x] Markdown parsing with GFM
- [x] Syntax highlighting
- [x] Multiple export styles
- [x] Custom CSS support
- [ ] Your next document starts here

> *"The art of writing is the art of discovering what you believe."*
> — Gustave Flaubert

---

Start writing on the left, or drag and drop a \`.md\` file.
`;

    // ── Markdown setup ───────────────────────────────

    function initMarked() {
        marked.setOptions({ breaks: true, gfm: true });
    }

    // ── Render ───────────────────────────────────────

    function render() {
        const src = editor.value.trim();
        if (!src) {
            preview.innerHTML = '<div class="preview-empty"><p>Start typing to see the preview...</p></div>';
        } else {
            preview.innerHTML = marked.parse(src);
            preview.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
            });
        }
        updateCounter();
    }

    function scheduleRender() {
        clearTimeout(renderTimer);
        renderTimer = setTimeout(render, 100);
        scheduleSave();
    }

    // ── Counter ──────────────────────────────────────

    function updateCounter() {
        const text = editor.value.trim();
        if (!text) { counterEl.textContent = '0 words'; return; }
        const words = text.split(/\s+/).filter(Boolean).length;
        const mins  = Math.max(1, Math.ceil(words / 200));
        counterEl.textContent = `${words} words · ~${mins} min`;
    }

    // ── Theme ────────────────────────────────────────

    function getTheme() {
        return localStorage.getItem('md2pdf-theme') ||
            (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    }

    function applyTheme(t) {
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('md2pdf-theme', t);

        const forceDark = STYLES[currentStyle]?.dark;

        $('#md-css-dark').disabled    = forceDark ? false : t !== 'dark';
        $('#md-css-light').disabled   = forceDark ? true  : t !== 'light';
        $('#hljs-css-dark').disabled  = forceDark ? false : t !== 'dark';
        $('#hljs-css-light').disabled = forceDark ? true  : t !== 'light';

        render();
    }

    function toggleTheme() {
        applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
    }

    // ── Styles ───────────────────────────────────────

    function applyStyle(key) {
        currentStyle = key;
        styleSelect.value = key;
        styleOverride.textContent = STYLES[key]?.css || '';
        localStorage.setItem('md2pdf-style', key);

        // Re-apply theme CSS to toggle dark/light base for the preview
        applyTheme(getTheme());
    }

    // ── Custom CSS ───────────────────────────────────

    function applyCustomCSS() {
        customOverride.textContent = customCSSInput.value;
        localStorage.setItem('md2pdf-custom-css', customCSSInput.value);
    }

    // ── Templates ────────────────────────────────────

    function loadTemplate(key) {
        const tpl = TEMPLATES[key];
        if (tpl === undefined) return;
        editor.value = tpl;
        currentFileName = key === 'blank' ? 'untitled.md' : `${key}.md`;
        fileNameEl.textContent = currentFileName;
        render();
        saveDraft();
        showToast(key === 'blank' ? 'New document' : 'Template loaded');
    }

    // ── File handling ────────────────────────────────

    function loadFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            editor.value = e.target.result;
            currentFileName = file.name;
            fileNameEl.textContent = file.name;
            render();
            saveDraft();
        };
        reader.readAsText(file);
    }

    function initDragDrop() {
        let counter = 0;
        document.addEventListener('dragenter', (e) => { e.preventDefault(); if (++counter === 1) dropOverlay.classList.add('active'); });
        document.addEventListener('dragleave', (e) => { e.preventDefault(); if (--counter === 0) dropOverlay.classList.remove('active'); });
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => {
            e.preventDefault(); counter = 0; dropOverlay.classList.remove('active');
            const f = e.dataTransfer.files[0];
            if (f) loadFile(f);
        });
    }

    // ── localStorage ─────────────────────────────────

    function saveDraft() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            localStorage.setItem('md2pdf-draft', editor.value);
            localStorage.setItem('md2pdf-filename', currentFileName);
        }, 800);
    }

    function restoreDraft() {
        const draft = localStorage.getItem('md2pdf-draft');
        if (draft !== null && draft !== '') {
            editor.value = draft;
            currentFileName = localStorage.getItem('md2pdf-filename') || 'untitled.md';
            fileNameEl.textContent = currentFileName;
            showToast('Draft restored');
            return true;
        }
        return false;
    }

    // ── Toast ────────────────────────────────────────

    function showToast(msg) {
        toastMsg.textContent = msg;
        toastEl.classList.add('show');
        setTimeout(() => toastEl.classList.remove('show'), 2500);
    }

    // ── PDF Export ───────────────────────────────────

    let _printCSSLight = null;
    let _printCSSDark  = null;

    async function fetchPrintCSS(dark) {
        if (dark && _printCSSDark) return _printCSSDark;
        if (!dark && _printCSSLight) return _printCSSLight;

        const mdURL   = dark
            ? 'https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown-dark.min.css'
            : 'https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown-light.min.css';
        const hljsURL = dark
            ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css'
            : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';

        const [mdCSS, hljsCSS] = await Promise.all([
            fetch(mdURL).then(r => r.text()).catch(() => ''),
            fetch(hljsURL).then(r => r.text()).catch(() => ''),
        ]);
        const result = mdCSS + '\n' + hljsCSS;
        if (dark) _printCSSDark = result; else _printCSSLight = result;
        return result;
    }

    function getStyleCSSForPrint() {
        const style = STYLES[currentStyle];
        let css = style?.css || '';
        // Strip theme-specific selectors — use the raw rules directly
        if (style?.dark) {
            // Dark style: remove [data-theme="light"] rules, keep dark rules unwrapped
            css = css.replace(/\[data-theme="light"\][^\{]*\{[^}]*\}/g, '');
            css = css.replace(/\[data-theme="dark"\]\s*/g, '');
        } else {
            // Light style: remove [data-theme="dark"] rules, keep light rules unwrapped
            css = css.replace(/\[data-theme="dark"\][^\{]*\{[^}]*\}/g, '');
            css = css.replace(/\[data-theme="light"\]\s*/g, '');
        }
        return css;
    }

    function isCurrentStyleDark() {
        return STYLES[currentStyle]?.dark === true;
    }

    async function exportPDF() {
        const btnLabel = exportBtn.querySelector('span');
        exportBtn.classList.add('loading');
        if (btnLabel) btnLabel.textContent = 'Preparing...';
        exportOverlay.classList.add('active');

        try {
            const style    = STYLES[currentStyle] || STYLES.notion;
            const dark     = style.dark;
            const css      = await fetchPrintCSS(dark);
            const styleCSS = getStyleCSSForPrint();
            const userCSS  = customCSSInput.value || '';
            const content  = preview.innerHTML;

            const bodyBg = style.bg;
            const bodyFg = dark ? '#e6edf3' : '#1f2328';

            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed;inset:0;width:210mm;height:0;border:none;opacity:0;pointer-events:none;';
            document.body.appendChild(iframe);

            const doc = iframe.contentDocument;
            doc.open();
            doc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title> </title>
<style>${css}</style>
<style>${styleCSS}</style>
<style>${userCSS}</style>
<style>
@page { margin: 0; size: 210mm 297mm; }
html {
  background: ${bodyBg} !important;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  color-adjust: exact;
}
body {
  margin: 0; padding: 18mm 16mm;
  background: ${bodyBg} !important;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  color-adjust: exact;
}
.markdown-body {
  max-width: 100%; padding: 0;
  font-size: 15px; line-height: 1.7;
  color: ${bodyFg};
}
.markdown-body p, .markdown-body li, .markdown-body pre,
.markdown-body blockquote, .markdown-body table, .markdown-body tr,
.markdown-body img { break-inside: avoid; page-break-inside: avoid; }
.markdown-body h1,.markdown-body h2,.markdown-body h3,
.markdown-body h4,.markdown-body h5,.markdown-body h6 {
  break-inside: avoid; page-break-inside: avoid;
  break-after: avoid;  page-break-after: avoid;
}
.markdown-body pre { white-space: pre-wrap; word-wrap: break-word; overflow-x: hidden; }
.markdown-body code {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.9em;
}
.markdown-body img { max-width: 100%; }
.markdown-body table {
  width: 100%; max-width: 100%;
  table-layout: fixed; font-size: 13px;
}
.markdown-body th, .markdown-body td {
  overflow-wrap: break-word; word-break: break-word;
}
</style>
</head>
<body>
<article class="markdown-body">${content}</article>
</body>
</html>`);
            doc.close();

            await new Promise(resolve => { iframe.onload = resolve; setTimeout(resolve, 1500); });
            await new Promise(r => setTimeout(r, 300));

            // Measure and set continuous page height
            const bodyH = doc.body.scrollHeight;
            const pageSizeEl = doc.createElement('style');
            pageSizeEl.textContent = `@page { margin: 0; size: 210mm ${bodyH + 1}px; }`;
            doc.head.appendChild(pageSizeEl);
            await new Promise(r => setTimeout(r, 100));

            exportOverlay.classList.remove('active');
            exportBtn.classList.remove('loading');
            if (btnLabel) btnLabel.textContent = 'Export';

            iframe.contentWindow.focus();
            iframe.contentWindow.print();

            const cleanup = () => { if (iframe.parentNode) document.body.removeChild(iframe); };
            iframe.contentWindow.onafterprint = cleanup;
            setTimeout(cleanup, 120_000);

        } catch (err) {
            console.error('Export failed', err);
            exportOverlay.classList.remove('active');
            exportBtn.classList.remove('loading');
            if (btnLabel) btnLabel.textContent = 'Export';
            alert('Export failed.');
        }
    }

    // ── HTML Export ──────────────────────────────────

    async function exportHTML() {
        const style    = STYLES[currentStyle] || STYLES.notion;
        const dark     = style.dark;
        const css      = await fetchPrintCSS(dark);
        const styleCSS = getStyleCSSForPrint();
        const userCSS  = customCSSInput.value || '';
        const content  = preview.innerHTML;
        const title    = currentFileName.replace(/\.(md|markdown|txt|mdx)$/i, '');

        const bodyBg = style.bg;
        const bodyFg = dark ? '#e6edf3' : '#1f2328';

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>${css}</style>
<style>${styleCSS}</style>
<style>${userCSS}</style>
<style>
body {
  margin: 0; padding: 40px 20px;
  background: ${bodyBg};
  display: flex; justify-content: center;
}
.markdown-body {
  max-width: 960px; width: 100%;
  padding: 32px;
  font-size: 15px; line-height: 1.7;
  color: ${bodyFg};
}
</style>
</head>
<body>
<article class="markdown-body">${content}</article>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = title + '.html';
        a.click();
        URL.revokeObjectURL(url);
        showToast('HTML downloaded');
    }

    // ── Dropdowns ────────────────────────────────────

    function initDropdowns() {
        document.querySelectorAll('.dropdown').forEach(dd => {
            const trigger = dd.querySelector('.btn, button:first-child');
            if (trigger) {
                trigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Close others
                    document.querySelectorAll('.dropdown.open').forEach(d => {
                        if (d !== dd) d.classList.remove('open');
                    });
                    dd.classList.toggle('open');
                });
            }
        });

        document.addEventListener('click', () => {
            document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
        });

        // Prevent menu clicks from closing immediately
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.addEventListener('click', (e) => e.stopPropagation());
        });
    }

    // ── Scroll Sync ──────────────────────────────────

    function initScrollSync() {
        let syncing = false;

        editor.addEventListener('scroll', () => {
            if (syncing) return;
            syncing = true;
            const pct = editor.scrollTop / Math.max(1, editor.scrollHeight - editor.clientHeight);
            previewContainer.scrollTop = pct * (previewContainer.scrollHeight - previewContainer.clientHeight);
            requestAnimationFrame(() => { syncing = false; });
        });

        previewContainer.addEventListener('scroll', () => {
            if (syncing) return;
            syncing = true;
            const pct = previewContainer.scrollTop / Math.max(1, previewContainer.scrollHeight - previewContainer.clientHeight);
            editor.scrollTop = pct * (editor.scrollHeight - editor.clientHeight);
            requestAnimationFrame(() => { syncing = false; });
        });
    }

    // ── Export Image ─────────────────────────────────

    async function exportImage() {
        exportOverlay.classList.add('active');

        try {
            const style = STYLES[currentStyle] || STYLES.notion;
            const canvas = await html2canvas(preview, {
                scale: 2,
                useCORS: true,
                backgroundColor: style.bg,
                logging: false,
            });

            const link = document.createElement('a');
            link.download = currentFileName.replace(/\.(md|markdown|txt|mdx)$/i, '') + '.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            showToast('Image downloaded');
        } catch (err) {
            console.error('Image export failed', err);
            alert('Image export failed.');
        } finally {
            exportOverlay.classList.remove('active');
        }
    }

    // ── Share by URL ─────────────────────────────────

    const shareOverlay  = $('#shareOverlay');
    const shareUrlInput = $('#shareUrlInput');
    const shareCopyBtn  = $('#shareCopyBtn');
    const shareCloseBtn = $('#shareCloseBtn');

    function showShareModal(url) {
        shareUrlInput.value = url;
        shareOverlay.classList.add('active');
        shareUrlInput.focus();
        shareUrlInput.select();
    }

    function closeShareModal() {
        shareOverlay.classList.remove('active');
    }

    function copyShareUrl() {
        navigator.clipboard.writeText(shareUrlInput.value).then(() => {
            shareCopyBtn.textContent = 'Copied!';
            setTimeout(() => { shareCopyBtn.textContent = 'Copy'; }, 2000);
        }).catch(() => {
            shareUrlInput.select();
            document.execCommand('copy');
            shareCopyBtn.textContent = 'Copied!';
            setTimeout(() => { shareCopyBtn.textContent = 'Copy'; }, 2000);
        });
    }

    // Share state: map of content hash → { id, editKey }
    function getShareMap() {
        try { return JSON.parse(localStorage.getItem('md2pdf-shares') || '{}'); } catch (_) { return {}; }
    }
    function saveShareMap(map) {
        localStorage.setItem('md2pdf-shares', JSON.stringify(map));
    }

    // Simple hash for change detection
    async function contentHash(text) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return Array.from(new Uint8Array(buf).slice(0, 8), b => b.toString(16).padStart(2, '0')).join('');
    }

    async function shareByURL() {
        const text = editor.value;
        if (!text.trim()) { showToast('Nothing to share'); return; }

        exportOverlay.classList.add('active');

        try {
            const shares = getShareMap();
            const docKey = currentFileName; // use filename as document identity

            // Check if we have an existing share for this document
            if (shares[docKey]) {
                const { id, editKey } = shares[docKey];

                // Try to update existing document
                const updateRes = await fetch('/api/update/' + id, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'text/plain', 'X-Edit-Key': editKey },
                    body: text,
                });

                if (updateRes.ok) {
                    const data = await updateRes.json();
                    exportOverlay.classList.remove('active');
                    showShareModal(data.url);
                    showToast('Link updated');
                    return;
                }
                // If update fails (404 expired, 403 wrong key), create new below
            }

            // Create new share
            const res = await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: text,
            });

            exportOverlay.classList.remove('active');

            if (res.ok) {
                const data = await res.json();
                // Save editKey for future updates
                shares[docKey] = { id: data.id, editKey: data.editKey };
                saveShareMap(shares);
                showShareModal(data.url);
                return;
            }
        } catch (_) {
            exportOverlay.classList.remove('active');
        }

        // Fallback: LZ-string URL
        try {
            const compressed = LZString.compressToEncodedURIComponent(text);
            const url = `${location.origin}/share?doc=${compressed}`;
            if (url.length > 8000) {
                showToast('Share failed — document too large');
                return;
            }
            showShareModal(url);
        } catch (e) {
            showToast('Share failed');
        }
    }

    function loadFromURL() {
        // Try embedded content (injected by Worker for /s/:id and /share?doc=)
        const sharedEl = document.getElementById('shared-content');
        if (sharedEl) {
            try {
                const content = JSON.parse(sharedEl.textContent);
                if (content) {
                    editor.value = content;
                    currentFileName = 'shared.md';
                    fileNameEl.textContent = currentFileName;
                    history.replaceState(null, '', '/');
                    showToast('Shared document loaded');
                    return true;
                }
            } catch (_) {}
        }

        // Fallback: try ?doc= query param (client-side decompression)
        const params = new URLSearchParams(location.search);
        const docParam = params.get('doc');
        if (docParam) {
            try {
                const content = LZString.decompressFromEncodedURIComponent(docParam);
                if (content) {
                    editor.value = content;
                    currentFileName = 'shared.md';
                    fileNameEl.textContent = currentFileName;
                    history.replaceState(null, '', '/');
                    showToast('Shared document loaded');
                    return true;
                }
            } catch (_) {}
        }

        // Backward compat: try #doc= (hash)
        const hash = location.hash;
        if (hash.startsWith('#doc=')) {
            const compressed = hash.slice(5);
            try {
                const content = LZString.decompressFromEncodedURIComponent(compressed);
                if (content) {
                    editor.value = content;
                    currentFileName = 'shared.md';
                    fileNameEl.textContent = currentFileName;
                    history.replaceState(null, '', '/');
                    showToast('Shared document loaded');
                    return true;
                }
            } catch (_) {}
        }
        return false;
    }

    // ── Fullscreen ───────────────────────────────────

    function toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen().catch(() => {});
        }
    }

    // ── Find & Replace ───────────────────────────────

    let findMatches = [];
    let findIdx = -1;

    function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    function openFind(withReplace) {
        findPanel.classList.add('open');
        if (withReplace) replaceRow.classList.add('open');
        findInput.focus();
        findInput.select();
    }

    function closeFind() {
        findPanel.classList.remove('open');
        replaceRow.classList.remove('open');
        findMatches = [];
        findIdx = -1;
        findCount.textContent = '';
        editor.focus();
    }

    function doFind() {
        const query = findInput.value;
        if (!query) { findMatches = []; findIdx = -1; findCount.textContent = ''; return; }

        const text = editor.value;
        const regex = new RegExp(escapeRegex(query), 'gi');
        findMatches = [];
        let m;
        while ((m = regex.exec(text)) !== null) {
            findMatches.push({ s: m.index, e: m.index + m[0].length });
        }

        findIdx = findMatches.length > 0 ? 0 : -1;
        findCount.textContent = findMatches.length > 0
            ? `${1}/${findMatches.length}`
            : 'No results';
        selectFindMatch();
    }

    function selectFindMatch() {
        if (findIdx < 0 || findIdx >= findMatches.length) return;
        const m = findMatches[findIdx];
        editor.focus();
        editor.setSelectionRange(m.s, m.e);

        // Scroll to match
        const before = editor.value.substring(0, m.s);
        const lines = before.split('\n').length;
        const lh = parseFloat(getComputedStyle(editor).lineHeight) || 22;
        editor.scrollTop = Math.max(0, (lines - 3) * lh);

        findCount.textContent = `${findIdx + 1}/${findMatches.length}`;
    }

    function findNext() {
        if (findMatches.length === 0) return;
        findIdx = (findIdx + 1) % findMatches.length;
        selectFindMatch();
    }

    function findPrev() {
        if (findMatches.length === 0) return;
        findIdx = (findIdx - 1 + findMatches.length) % findMatches.length;
        selectFindMatch();
    }

    function doReplace() {
        if (findIdx < 0 || findIdx >= findMatches.length) return;
        const m = findMatches[findIdx];
        const rep = replaceInput.value;
        editor.value = editor.value.substring(0, m.s) + rep + editor.value.substring(m.e);
        scheduleRender();
        doFind();
    }

    function doReplaceAll() {
        const query = findInput.value;
        if (!query) return;
        const rep = replaceInput.value;
        const count = findMatches.length;
        editor.value = editor.value.split(query).join(rep);
        scheduleRender();
        doFind();
        showToast(`Replaced ${count} occurrences`);
    }

    function initFind() {
        findInput.addEventListener('input', doFind);

        findInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); e.shiftKey ? findPrev() : findNext(); }
            if (e.key === 'Escape') closeFind();
        });

        replaceInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); doReplace(); }
            if (e.key === 'Escape') closeFind();
        });

        findNextBtn.addEventListener('click', findNext);
        findPrevBtn.addEventListener('click', findPrev);
        findCloseBtn.addEventListener('click', closeFind);
        replaceToggleBtn.addEventListener('click', () => replaceRow.classList.toggle('open'));
        replaceBtn.addEventListener('click', doReplace);
        replaceAllBtn.addEventListener('click', doReplaceAll);
    }

    // ── Resizable split ──────────────────────────────

    function initResize() {
        resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const startX = e.clientX;
            const leftW  = editorPane.offsetWidth;
            const rightW = previewPane.offsetWidth;
            resizeHandle.classList.add('active');
            document.body.style.cursor     = 'col-resize';
            document.body.style.userSelect = 'none';

            const onMove = (ev) => {
                const dx    = ev.clientX - startX;
                const total = leftW + rightW;
                const newL  = Math.max(220, Math.min(total - 220, leftW + dx));
                editorPane.style.flex  = `0 0 ${newL}px`;
                previewPane.style.flex = `0 0 ${total - newL}px`;
            };
            const onUp = () => {
                resizeHandle.classList.remove('active');
                document.body.style.cursor     = '';
                document.body.style.userSelect = '';
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }

    // ── Editor enhancements ──────────────────────────

    function initEditor() {
        editor.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const s = editor.selectionStart;
                const end = editor.selectionEnd;
                editor.value = editor.value.substring(0, s) + '    ' + editor.value.substring(end);
                editor.selectionStart = editor.selectionEnd = s + 4;
                scheduleRender();
            }
        });
        editor.addEventListener('input', scheduleRender);
    }

    // ── Keyboard shortcuts ───────────────────────────

    function initShortcuts() {
        document.addEventListener('keydown', (e) => {
            const mod = e.ctrlKey || e.metaKey;
            if (mod && e.key === 's') { e.preventDefault(); exportPDF(); }
            if (mod && e.shiftKey && (e.key === 'L' || e.key === 'l')) { e.preventDefault(); toggleTheme(); }
            if (mod && e.key === 'f') { e.preventDefault(); openFind(false); }
            if (mod && e.key === 'h') { e.preventDefault(); openFind(true); }
            if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); }
        });
    }

    // ── Wire up events ───────────────────────────────

    function initEvents() {
        themeToggle.addEventListener('click', toggleTheme);

        // Export
        exportPDFBtn.addEventListener('click',  () => { exportDropdown.classList.remove('open'); exportPDF(); });
        exportHTMLBtn.addEventListener('click', () => { exportDropdown.classList.remove('open'); exportHTML(); });
        exportImageBtn.addEventListener('click', () => { exportDropdown.classList.remove('open'); exportImage(); });
        shareBtn.addEventListener('click', () => { exportDropdown.classList.remove('open'); shareByURL(); });

        // Share modal
        shareCopyBtn.addEventListener('click', copyShareUrl);
        shareCloseBtn.addEventListener('click', closeShareModal);
        shareOverlay.addEventListener('click', (e) => { if (e.target === shareOverlay) closeShareModal(); });

        // API & Prompts modal
        const apiOverlay  = $('#apiOverlay');
        const apiCloseBtn = $('#apiCloseBtn');

        $('#apiPromptsBtn').addEventListener('click', () => { apiOverlay.classList.add('active'); });
        apiCloseBtn.addEventListener('click', () => { apiOverlay.classList.remove('active'); });
        apiOverlay.addEventListener('click', (e) => { if (e.target === apiOverlay) apiOverlay.classList.remove('active'); });

        // Tabs
        document.querySelectorAll('.api-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.api-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.api-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
            });
        });

        // Copy buttons
        document.querySelectorAll('.api-copy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const pre = btn.parentElement.querySelector('pre');
                navigator.clipboard.writeText(pre.textContent).then(() => {
                    btn.textContent = 'Copied!';
                    setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
                });
            });
        });

        // Fullscreen
        fullscreenBtn.addEventListener('click', toggleFullscreen);

        // Upload
        uploadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => { if (e.target.files[0]) loadFile(e.target.files[0]); fileInput.value = ''; });

        // View toggle
        viewToggle.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-view]');
            if (!btn) return;
            const mode = btn.dataset.view;
            viewToggle.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            workspace.classList.toggle('preview-only', mode === 'preview');
        });

        // Style select
        styleSelect.addEventListener('change', () => applyStyle(styleSelect.value));

        // Custom CSS
        customCSSToggle.addEventListener('click', () => {
            customCSSPanel.classList.toggle('open');
            customCSSToggle.classList.toggle('active');
        });
        customCSSInput.addEventListener('input', applyCustomCSS);

        // Templates
        document.querySelectorAll('[data-template]').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.template;
                document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
                loadTemplate(key);
            });
        });
    }

    // ── WebMCP ────────────────────────────────────────

    function initWebMCP() {
        // Declarative: handle form submissions from AI agents
        const wmcpConvert = $('#wmcpConvert');
        const wmcpExport  = $('#wmcpExport');
        const wmcpShare   = $('#wmcpShare');

        if (wmcpConvert) {
            wmcpConvert.addEventListener('submit', (e) => {
                e.preventDefault();
                const fd = new FormData(wmcpConvert);
                const md = fd.get('markdown');
                const style = fd.get('style');
                if (md) { editor.value = md; currentFileName = 'agent.md'; fileNameEl.textContent = currentFileName; }
                if (style && STYLES[style]) applyStyle(style);
                render();
                saveDraft();
            });
        }

        if (wmcpExport) {
            wmcpExport.addEventListener('submit', (e) => {
                e.preventDefault();
                const format = new FormData(wmcpExport).get('format');
                if (format === 'pdf')   exportPDF();
                if (format === 'html')  exportHTML();
                if (format === 'image') exportImage();
            });
        }

        if (wmcpShare) {
            wmcpShare.addEventListener('submit', (e) => {
                e.preventDefault();
                shareByURL();
            });
        }

        // Imperative: register tools via navigator.modelContext (Chrome Canary)
        if (typeof navigator !== 'undefined' && navigator.modelContext?.registerTool) {
            navigator.modelContext.registerTool('convert-markdown', {
                description: 'Set markdown content and render with a chosen style. Styles: notion, github, minimal, academic, corporate, latex, dracula, newspaper, handwritten, terminal, pastel.',
                params: {
                    markdown: { type: 'string', description: 'Markdown text to render' },
                    style:    { type: 'string', description: 'Visual style (default: notion)' },
                },
                execute: async ({ markdown, style }) => {
                    if (markdown) { editor.value = markdown; currentFileName = 'agent.md'; fileNameEl.textContent = currentFileName; }
                    if (style && STYLES[style]) applyStyle(style);
                    render();
                    saveDraft();
                    return { success: true, message: 'Content rendered' };
                },
            });

            navigator.modelContext.registerTool('export-document', {
                description: 'Export current document. Formats: pdf, html, image.',
                params: {
                    format: { type: 'string', description: 'Export format: pdf, html, or image' },
                },
                execute: async ({ format }) => {
                    if (format === 'pdf')   await exportPDF();
                    if (format === 'html')  await exportHTML();
                    if (format === 'image') await exportImage();
                    return { success: true, message: `Exported as ${format}` };
                },
            });

            navigator.modelContext.registerTool('share-document', {
                description: 'Generate a shareable URL for the current document and copy to clipboard.',
                params: {},
                execute: async () => {
                    shareByURL();
                    return { success: true, message: 'Share link copied to clipboard' };
                },
            });

            navigator.modelContext.registerTool('set-style', {
                description: 'Change the visual style. Options: notion, github, minimal, academic, corporate, latex, dracula, newspaper, handwritten, terminal, pastel.',
                params: {
                    style: { type: 'string', description: 'Style name' },
                },
                execute: async ({ style }) => {
                    if (STYLES[style]) { applyStyle(style); return { success: true, message: `Style set to ${style}` }; }
                    return { success: false, message: 'Unknown style' };
                },
            });
        }
    }

    // ── Boot ─────────────────────────────────────────

    function init() {
        initMarked();
        applyTheme(getTheme());

        // Restore saved style (default: notion)
        const savedStyle = localStorage.getItem('md2pdf-style') || 'notion';
        applyStyle(savedStyle);

        // Restore custom CSS
        const savedCSS = localStorage.getItem('md2pdf-custom-css');
        if (savedCSS) { customCSSInput.value = savedCSS; applyCustomCSS(); }

        // Check for shared URL first, then draft, then sample
        if (!loadFromURL()) {
            if (!restoreDraft()) {
                editor.value = SAMPLE;
            }
        }

        render();
        initEditor();
        initDragDrop();
        initResize();
        initScrollSync();
        initFind();
        initShortcuts();
        initDropdowns();
        initEvents();
        initWebMCP();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

#!/usr/bin/env node
// One-time script to generate /public/styles/*.html landing pages for SEO.
// Run: node generate-style-pages.js

const fs = require('fs');
const path = require('path');

const STYLES = [
  {
    key: 'github',
    name: 'GitHub',
    dark: false,
    tagline: 'Classic GitHub Markdown Rendering',
    description: 'The familiar GitHub markdown look you already know. Clean, readable, and developer-friendly — the same styling used across millions of README files and documentation pages on GitHub.',
    useCases: ['README files', 'open-source documentation', 'developer notes', 'technical specs', 'pull request descriptions'],
    fonts: 'System default (-apple-system, Segoe UI)',
    vibe: 'Clean, familiar, developer-first',
    keywords: 'github markdown pdf, github style pdf, github readme to pdf, github markdown export, convert github markdown',
  },
  {
    key: 'notion',
    name: 'Notion',
    dark: false,
    tagline: 'Clean Modern Sans-Serif',
    description: 'Inspired by Notion\'s clean aesthetic. Modern sans-serif typography with generous whitespace, subtle code blocks, and a distraction-free reading experience. The default style for MD2PDF.',
    useCases: ['project documentation', 'personal notes', 'wikis', 'team handbooks', 'product specs'],
    fonts: 'System sans-serif stack',
    vibe: 'Modern, minimal, professional',
    keywords: 'notion style pdf, notion markdown export, notion like pdf, clean markdown pdf, modern markdown style',
  },
  {
    key: 'minimal',
    name: 'Minimal',
    dark: false,
    tagline: 'Elegant Serif Typography',
    description: 'Pure typographic elegance with serif fonts and zero decorations. Let your content speak for itself with refined letter spacing, subtle underline links, and a focus on readability.',
    useCases: ['essays', 'letters', 'creative writing', 'book drafts', 'personal blogs'],
    fonts: 'Georgia, Cambria, serif',
    vibe: 'Elegant, understated, literary',
    keywords: 'minimal markdown pdf, elegant pdf from markdown, serif markdown style, clean document export',
  },
  {
    key: 'academic',
    name: 'Academic',
    dark: false,
    tagline: 'Formal Justified Text for Papers',
    description: 'Designed for scholarly documents. Justified text with hyphenation, formal heading hierarchy, and a structured layout that meets academic expectations. Ideal for research papers and formal reports.',
    useCases: ['research papers', 'thesis drafts', 'formal reports', 'academic assignments', 'conference submissions'],
    fonts: 'Cambria, Georgia, serif',
    vibe: 'Formal, structured, scholarly',
    keywords: 'academic markdown pdf, research paper markdown, formal pdf from markdown, justified text markdown, scholarly markdown export',
  },
  {
    key: 'corporate',
    name: 'Corporate',
    dark: false,
    tagline: 'Professional with Blue Accents',
    description: 'Professional styling with blue accent headers, styled table headers, and a polished corporate feel. Perfect for business documents that need to look sharp and branded.',
    useCases: ['business reports', 'proposals', 'internal memos', 'quarterly reviews', 'executive summaries'],
    fonts: 'System sans-serif',
    vibe: 'Professional, polished, business-ready',
    keywords: 'corporate pdf markdown, business report markdown, professional markdown pdf, blue styled pdf, corporate document export',
  },
  {
    key: 'latex',
    name: 'LaTeX',
    dark: false,
    tagline: 'Academic Paper Typography',
    description: 'Simulates the classic look of LaTeX-typeset documents using Libre Baskerville and Inconsolata fonts. Justified text, centered titles, ornamental dividers, and the unmistakable feel of a properly typeset paper — without installing LaTeX.',
    useCases: ['academic papers', 'mathematical documents', 'journal submissions', 'dissertations', 'technical whitepapers'],
    fonts: 'Libre Baskerville, Inconsolata (Google Fonts)',
    vibe: 'Academic, precise, classic typesetting',
    keywords: 'latex style pdf, latex markdown converter, latex look pdf, academic typeset markdown, latex alternative markdown, libre baskerville pdf',
  },
  {
    key: 'dracula',
    name: 'Dracula',
    dark: true,
    tagline: 'Vibrant Dark Theme',
    description: 'The iconic Dracula color scheme brought to your documents. Purple, pink, cyan, and green accents on a dark background. A favorite among developers who prefer dark themes for everything.',
    useCases: ['developer portfolios', 'dark-mode documentation', 'coding tutorials', 'personal READMEs', 'presentation handouts'],
    fonts: 'System sans-serif',
    vibe: 'Dark, vibrant, developer-focused',
    keywords: 'dracula theme pdf, dark mode markdown pdf, dark theme document, dracula markdown export, developer dark pdf',
  },
  {
    key: 'newspaper',
    name: 'Newspaper',
    dark: false,
    tagline: 'Editorial Typography',
    description: 'Inspired by classic newspaper layouts. Playfair Display for headings, Source Serif for body text, justified paragraphs, and editorial styling with a double-border title treatment. Makes any content feel like a published article.',
    useCases: ['blog posts', 'newsletters', 'articles', 'editorials', 'press releases'],
    fonts: 'Playfair Display, Source Serif 4 (Google Fonts)',
    vibe: 'Editorial, classic, authoritative',
    keywords: 'newspaper style pdf, editorial markdown, article style pdf, playfair display pdf, published look markdown',
  },
  {
    key: 'handwritten',
    name: 'Handwritten',
    dark: false,
    tagline: 'Cursive Notebook Style',
    description: 'A playful cursive style that makes your markdown look like handwritten notes on lined paper. Uses the Caveat font with a notebook-ruled background, dashed borders on code blocks, and wavy underlines on links.',
    useCases: ['personal notes', 'creative brainstorms', 'journaling', 'informal presentations', 'fun documents'],
    fonts: 'Caveat (Google Fonts)',
    vibe: 'Playful, personal, informal',
    keywords: 'handwritten pdf, cursive markdown, notebook style pdf, caveat font pdf, handwritten notes pdf, fun markdown style',
  },
  {
    key: 'terminal',
    name: 'Terminal',
    dark: true,
    tagline: 'Green-on-Black Hacker Aesthetic',
    description: 'Channel the classic terminal look with green monospace text on a black background. Headings prefixed with symbols (# > $), command-line inspired prompts, and a pure hacker aesthetic. Makes your markdown look like terminal output.',
    useCases: ['CLI documentation', 'hacker-themed presentations', 'dev portfolios', 'command references', 'retro-styled docs'],
    fonts: 'Fira Code (Google Fonts)',
    vibe: 'Retro, hacker, command-line',
    keywords: 'terminal style pdf, hacker pdf, green terminal pdf, monospace markdown, cli style document, fira code pdf',
  },
  {
    key: 'pastel',
    name: 'Pastel',
    dark: false,
    tagline: 'Soft Colors with Rounded Elements',
    description: 'A gentle, approachable style with soft pink, purple, and teal accents. Rounded corners everywhere, the Nunito font for warmth, and a color palette that feels friendly and inviting.',
    useCases: ['design docs', 'onboarding guides', 'tutorials', 'personal projects', 'student assignments'],
    fonts: 'Nunito (Google Fonts)',
    vibe: 'Friendly, warm, approachable',
    keywords: 'pastel style pdf, soft colors markdown, rounded pdf style, nunito font pdf, friendly document style',
  },
];

function buildPage(style) {
  const allStyleLinks = STYLES.map(s =>
    s.key === style.key
      ? `<span class="style-tag current">${s.name}</span>`
      : `<a href="/styles/${s.key}" class="style-tag">${s.name}</a>`
  ).join('\n                    ');

  const useCasesList = style.useCases.map(u => `<li>${u}</li>`).join('\n                        ');

  const ctaUrl = `https://md2pdf.studio/?style=${style.key}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${style.name} Style — Markdown to PDF Converter | MD2PDF</title>
    <meta name="description" content="Convert Markdown to PDF with the ${style.name} style. ${style.tagline}. Free online tool — no signup, runs in your browser. Try it now at md2pdf.studio.">
    <meta name="keywords" content="${style.keywords}">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
    <meta name="author" content="JSiapoDev">
    <link rel="canonical" href="https://md2pdf.studio/styles/${style.key}">

    <meta property="og:type" content="website">
    <meta property="og:url" content="https://md2pdf.studio/styles/${style.key}">
    <meta property="og:title" content="${style.name} Style — Markdown to PDF | MD2PDF">
    <meta property="og:description" content="${style.tagline}. Convert Markdown to styled PDF online for free with MD2PDF.">
    <meta property="og:image" content="https://md2pdf.studio/og-image.png">
    <meta property="og:site_name" content="MD2PDF">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${style.name} Style — Markdown to PDF | MD2PDF">
    <meta name="twitter:description" content="${style.tagline}. Free Markdown to PDF converter with 11 visual styles.">
    <meta name="twitter:image" content="https://md2pdf.studio/og-image.png">

    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23f0883e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/><line x1='16' y1='13' x2='8' y2='13'/><line x1='16' y1='17' x2='8' y2='17'/><polyline points='10 9 9 9 8 9'/></svg>">

    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "${style.name} Style — Markdown to PDF Converter",
      "description": "${style.description.replace(/"/g, '\\"')}",
      "url": "https://md2pdf.studio/styles/${style.key}",
      "isPartOf": {
        "@type": "WebApplication",
        "name": "MD2PDF",
        "url": "https://md2pdf.studio"
      },
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "MD2PDF", "item": "https://md2pdf.studio/" },
          { "@type": "ListItem", "position": 2, "name": "Styles", "item": "https://md2pdf.studio/styles/" },
          { "@type": "ListItem", "position": 3, "name": "${style.name}", "item": "https://md2pdf.studio/styles/${style.key}" }
        ]
      }
    }
    </script>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet">

    <style>
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0d1117; color: #e6edf3; line-height: 1.7;
            -webkit-font-smoothing: antialiased;
        }
        a { color: #f0883e; text-decoration: none; }
        a:hover { text-decoration: underline; }

        .container { max-width: 720px; margin: 0 auto; padding: 60px 24px 64px; }

        /* Header */
        .breadcrumb { font-size: 0.85em; color: #8b949e; margin-bottom: 24px; }
        .breadcrumb a { color: #8b949e; }
        .breadcrumb a:hover { color: #f0883e; }
        .breadcrumb span { color: #e6edf3; }

        h1 { font-size: 2.2em; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 8px; color: #e6edf3; }
        h1 .accent { color: #f0883e; }
        .tagline { font-size: 1.15em; color: #8b949e; margin-bottom: 32px; }

        h2 { font-size: 1.3em; font-weight: 700; color: #f0883e; margin: 40px 0 16px; }

        p { color: #c9d1d9; margin-bottom: 16px; }

        /* CTA */
        .cta-row { margin: 32px 0; display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
        .cta {
            display: inline-block; background: #f0883e; color: #0d1117;
            padding: 12px 28px; border-radius: 8px; font-weight: 700;
            font-size: 1em; transition: background 0.2s;
        }
        .cta:hover { background: #f4a261; text-decoration: none; }
        .cta-secondary {
            display: inline-block; color: #c9d1d9; border: 1px solid #30363d;
            padding: 12px 28px; border-radius: 8px; font-weight: 600;
            font-size: 1em; transition: border-color 0.2s, color 0.2s;
        }
        .cta-secondary:hover { border-color: #f0883e; color: #f0883e; text-decoration: none; }

        /* Info grid */
        .info-grid {
            display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
            margin: 24px 0;
        }
        .info-card {
            background: #161b22; border: 1px solid #30363d; border-radius: 10px;
            padding: 16px;
        }
        .info-card .label { font-size: 0.8em; font-weight: 600; color: #8b949e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .info-card .value { font-size: 0.95em; color: #e6edf3; }

        /* Use cases */
        .use-cases { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
        .use-cases li {
            background: #161b22; border: 1px solid #30363d; border-radius: 20px;
            padding: 6px 16px; font-size: 0.88em; color: #c9d1d9;
        }

        /* Style browser */
        .style-browser { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
        .style-tag {
            display: inline-block; padding: 6px 16px; border-radius: 20px;
            font-size: 0.85em; font-weight: 500; border: 1px solid #30363d;
            background: #161b22; color: #c9d1d9; transition: border-color 0.2s, color 0.2s;
        }
        .style-tag:hover { border-color: #f0883e; color: #f0883e; text-decoration: none; }
        .style-tag.current {
            border-color: #f0883e; color: #f0883e; background: rgba(240, 136, 62, 0.1);
            font-weight: 700;
        }

        /* FAQ */
        details { border: 1px solid #30363d; border-radius: 8px; margin-bottom: 8px; }
        details:hover { border-color: #f0883e; }
        details[open] { border-color: #f0883e; }
        summary {
            padding: 12px 16px; font-size: 0.95em; font-weight: 600;
            cursor: pointer; color: #e6edf3; list-style: none;
        }
        summary::before { content: '+ '; color: #f0883e; font-weight: 700; }
        details[open] summary::before { content: '- '; }
        details p { padding: 0 16px 14px; margin: 0; font-size: 0.9em; color: #8b949e; }

        /* Footer */
        .footer {
            border-top: 1px solid #30363d; margin-top: 48px; padding-top: 24px;
            font-size: 0.85em; color: #6e7681;
            display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;
        }
        .footer a { color: #8b949e; }
        .footer a:hover { color: #f0883e; }

        @media (max-width: 600px) {
            h1 { font-size: 1.7em; }
            .info-grid { grid-template-columns: 1fr; }
            .container { padding: 40px 16px 48px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <nav class="breadcrumb">
            <a href="/">MD2PDF</a> / <a href="/styles/github">Styles</a> / <span>${style.name}</span>
        </nav>

        <h1><span class="accent">${style.name}</span> Style</h1>
        <p class="tagline">${style.tagline}</p>

        <p>${style.description}</p>

        <div class="cta-row">
            <a href="${ctaUrl}" class="cta">Try ${style.name} Style</a>
            <a href="/" class="cta-secondary">Open Editor</a>
        </div>

        <div class="info-grid">
            <div class="info-card">
                <div class="label">Typography</div>
                <div class="value">${style.fonts}</div>
            </div>
            <div class="info-card">
                <div class="label">Theme</div>
                <div class="value">${style.dark ? 'Dark' : 'Light'} background</div>
            </div>
            <div class="info-card">
                <div class="label">Aesthetic</div>
                <div class="value">${style.vibe}</div>
            </div>
            <div class="info-card">
                <div class="label">Export Formats</div>
                <div class="value">PDF, HTML, PNG</div>
            </div>
        </div>

        <h2>Best For</h2>
        <ul class="use-cases">
            ${useCasesList}
        </ul>

        <h2>How to Use the ${style.name} Style</h2>
        <ol style="padding-left: 24px; color: #c9d1d9;">
            <li style="margin-bottom: 8px;">Go to <a href="${ctaUrl}">md2pdf.studio/?style=${style.key}</a> — the ${style.name} style loads automatically.</li>
            <li style="margin-bottom: 8px;">Write or paste your Markdown in the editor, or drag and drop a <code style="background:#161b22;padding:2px 6px;border-radius:4px;font-size:0.9em;">.md</code> file.</li>
            <li style="margin-bottom: 8px;">See the live preview with ${style.name} styling applied in real time.</li>
            <li style="margin-bottom: 8px;">Click <strong>Export</strong> to download as PDF, HTML, or image — or share via a link.</li>
        </ol>

        <h2>All Styles</h2>
        <p>MD2PDF includes 11 visual styles. Click any to explore:</p>
        <div class="style-browser">
            ${allStyleLinks}
        </div>

        <h2>FAQ</h2>

        <details>
            <summary>Is the ${style.name} style free?</summary>
            <p>Yes, completely free. All 11 styles are included at no cost. No signup, no premium tiers.</p>
        </details>
        <details>
            <summary>Can I customize the ${style.name} style with my own CSS?</summary>
            <p>Yes. MD2PDF supports custom CSS injection. Your CSS is applied on top of the ${style.name} base style for both preview and export.</p>
        </details>
        <details>
            <summary>Does the style apply to exported PDFs?</summary>
            <p>Yes. The PDF, HTML, and image exports all preserve the ${style.name} styling exactly as shown in the preview.</p>
        </details>
        <details>
            <summary>Can AI agents use this style?</summary>
            <p>Yes. MD2PDF provides a REST API and an installable AI Skill. Agents can create documents and recipients can view them in any style, including ${style.name}.</p>
        </details>

        <div class="footer">
            <span>Built by <a href="https://jsiapo.dev">JSiapoDev</a></span>
            <span><a href="/">MD2PDF</a> &middot; <a href="/about">About</a> &middot; <a href="https://github.com/JSiapoDEV/md2pdf">GitHub</a></span>
        </div>
    </div>
</body>
</html>`;
}

// Generate all pages
const outDir = path.join(__dirname, 'public', 'styles');
for (const style of STYLES) {
  const html = buildPage(style);
  const filePath = path.join(outDir, `${style.key}.html`);
  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`  created: /styles/${style.key}.html`);
}

// Generate an index that redirects to the main app
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Markdown PDF Styles — MD2PDF</title>
    <meta name="description" content="Browse 11 visual styles for converting Markdown to PDF. GitHub, Notion, LaTeX, Dracula, Terminal, and more. Free online tool at md2pdf.studio.">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://md2pdf.studio/styles/">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23f0883e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/><line x1='16' y1='13' x2='8' y2='13'/><line x1='16' y1='17' x2='8' y2='17'/><polyline points='10 9 9 9 8 9'/></svg>">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet">
    <style>
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'DM Sans',-apple-system,sans-serif;background:#0d1117;color:#e6edf3;line-height:1.7;-webkit-font-smoothing:antialiased}
        a{color:#f0883e;text-decoration:none}a:hover{text-decoration:underline}
        .container{max-width:720px;margin:0 auto;padding:60px 24px 64px}
        h1{font-size:2.2em;font-weight:700;letter-spacing:-0.02em;margin-bottom:8px}
        h1 .accent{color:#f0883e}
        .subtitle{font-size:1.1em;color:#8b949e;margin-bottom:32px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:24px 0}
        .card{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:20px;transition:border-color .2s}
        .card:hover{border-color:#f0883e;text-decoration:none}
        .card h3{font-size:1.05em;font-weight:700;color:#e6edf3;margin-bottom:4px}
        .card p{font-size:0.88em;color:#8b949e;margin:0}
        .footer{border-top:1px solid #30363d;margin-top:48px;padding-top:24px;font-size:.85em;color:#6e7681;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px}
        .footer a{color:#8b949e}.footer a:hover{color:#f0883e}
        @media(max-width:600px){h1{font-size:1.7em}.grid{grid-template-columns:1fr}}
    </style>
</head>
<body>
    <div class="container">
        <h1><span class="accent">11</span> Markdown PDF Styles</h1>
        <p class="subtitle">Choose a visual style for your Markdown to PDF conversion. Each style is free and included in <a href="/">MD2PDF</a>.</p>
        <div class="grid">
${STYLES.map(s => `            <a href="/styles/${s.key}" class="card">
                <h3>${s.name}</h3>
                <p>${s.tagline}</p>
            </a>`).join('\n')}
        </div>
        <div class="footer">
            <span>Built by <a href="https://jsiapo.dev">JSiapoDev</a></span>
            <span><a href="/">MD2PDF</a> &middot; <a href="/about">About</a> &middot; <a href="https://github.com/JSiapoDEV/md2pdf">GitHub</a></span>
        </div>
    </div>
</body>
</html>`;

fs.writeFileSync(path.join(outDir, 'index.html'), indexHtml, 'utf8');
console.log('  created: /styles/index.html');
console.log(`\nDone! ${STYLES.length + 1} pages generated.`);

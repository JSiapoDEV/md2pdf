#!/usr/bin/env node
// Generates SEO landing pages: /templates/*, /vs/*, /api, /ai-skill, /changelog
// Run: node generate-seo-pages.cjs

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SITE = 'https://md2pdf.studio';
const GH_REPO = 'https://github.com/JSiapoDEV/md2pdf';

// ── Shared chrome ─────────────────────────────────────

const FAVICON = `<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23f0883e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><polyline points='14 2 14 8 20 8'/><line x1='16' y1='13' x2='8' y2='13'/><line x1='16' y1='17' x2='8' y2='17'/><polyline points='10 9 9 9 8 9'/></svg>">`;

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet">`;

const BASE_CSS = `
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0d1117; color: #e6edf3; line-height: 1.7;
            -webkit-font-smoothing: antialiased;
        }
        a { color: #f0883e; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .container { max-width: 720px; margin: 0 auto; padding: 60px 24px 64px; }
        .breadcrumb { font-size: 0.85em; color: #8b949e; margin-bottom: 24px; }
        .breadcrumb a { color: #8b949e; }
        .breadcrumb a:hover { color: #f0883e; }
        .breadcrumb span { color: #e6edf3; }
        h1 { font-size: 2.2em; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 8px; color: #e6edf3; }
        h1 .accent { color: #f0883e; }
        .tagline { font-size: 1.15em; color: #8b949e; margin-bottom: 32px; }
        h2 { font-size: 1.3em; font-weight: 700; color: #f0883e; margin: 40px 0 16px; }
        h3 { font-size: 1.05em; font-weight: 700; margin: 24px 0 8px; color: #e6edf3; }
        p { color: #c9d1d9; margin-bottom: 16px; }
        code { background: #161b22; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; font-family: 'JetBrains Mono', ui-monospace, monospace; }
        pre { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; overflow-x: auto; margin: 16px 0; }
        pre code { background: none; padding: 0; font-size: 0.85em; line-height: 1.5; color: #c9d1d9; }
        .cta-row { margin: 32px 0; display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
        .cta { display: inline-block; background: #f0883e; color: #0d1117; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 1em; transition: background 0.2s; }
        .cta:hover { background: #f4a261; text-decoration: none; }
        .cta-secondary { display: inline-block; color: #c9d1d9; border: 1px solid #30363d; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 1em; transition: border-color 0.2s, color 0.2s; }
        .cta-secondary:hover { border-color: #f0883e; color: #f0883e; text-decoration: none; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 24px 0; }
        .info-card { background: #161b22; border: 1px solid #30363d; border-radius: 10px; padding: 16px; }
        .info-card .label { font-size: 0.8em; font-weight: 600; color: #8b949e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .info-card .value { font-size: 0.95em; color: #e6edf3; }
        .use-cases { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
        .use-cases li { background: #161b22; border: 1px solid #30363d; border-radius: 20px; padding: 6px 16px; font-size: 0.88em; color: #c9d1d9; }
        .browser { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
        .tag { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 0.85em; font-weight: 500; border: 1px solid #30363d; background: #161b22; color: #c9d1d9; transition: border-color 0.2s, color 0.2s; }
        .tag:hover { border-color: #f0883e; color: #f0883e; text-decoration: none; }
        .tag.current { border-color: #f0883e; color: #f0883e; background: rgba(240, 136, 62, 0.1); font-weight: 700; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.9em; }
        th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #30363d; }
        th { color: #8b949e; font-weight: 600; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.5px; }
        td { color: #c9d1d9; }
        td.yes { color: #3fb950; font-weight: 600; }
        td.no { color: #f85149; }
        td.mid { color: #d29922; }
        details { border: 1px solid #30363d; border-radius: 8px; margin-bottom: 8px; }
        details:hover, details[open] { border-color: #f0883e; }
        summary { padding: 12px 16px; font-size: 0.95em; font-weight: 600; cursor: pointer; color: #e6edf3; list-style: none; }
        summary::before { content: '+ '; color: #f0883e; font-weight: 700; }
        details[open] summary::before { content: '- '; }
        details p { padding: 0 16px 14px; margin: 0; font-size: 0.9em; color: #8b949e; }
        .footer { border-top: 1px solid #30363d; margin-top: 48px; padding-top: 24px; font-size: 0.85em; color: #6e7681; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
        .footer a { color: #8b949e; }
        .footer a:hover { color: #f0883e; }
        @media (max-width: 600px) { h1 { font-size: 1.7em; } .info-grid { grid-template-columns: 1fr; } .container { padding: 40px 16px 48px; } }
`;

const FOOTER = `<div class="footer">
            <span>Built by <a href="https://jsiapo.dev">JSiapoDev</a></span>
            <span><a href="/">MD2PDF</a> &middot; <a href="/about">About</a> &middot; <a href="${GH_REPO}">GitHub</a></span>
        </div>`;

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function pageHead({ title, desc, canonical, keywords, jsonLd }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}">
    <meta name="keywords" content="${esc(keywords)}">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
    <meta name="author" content="JSiapoDev">
    <link rel="canonical" href="${canonical}">

    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(desc)}">
    <meta property="og:image" content="${SITE}/og-image.png">
    <meta property="og:site_name" content="MD2PDF">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(desc)}">
    <meta name="twitter:image" content="${SITE}/og-image.png">

    ${FAVICON}

    <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
    </script>

    ${FONTS}

    <style>${BASE_CSS}</style>
</head>
<body>
    <div class="container">`;
}

function breadcrumb(trail) {
  // trail: [{name, href}] — last is current (no href)
  return `<nav class="breadcrumb">` + trail.map((t, i) => {
    const last = i === trail.length - 1;
    return last ? `<span>${esc(t.name)}</span>` : `<a href="${t.href}">${esc(t.name)}</a>`;
  }).join(' / ') + `</nav>`;
}

function breadcrumbJsonLd(trail) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: t.href.startsWith('http') ? t.href : SITE + t.href,
    })),
  };
}

// ── TEMPLATES ─────────────────────────────────────────

const TEMPLATES = [
  {
    key: 'cv',
    name: 'CV / Resume',
    slug: 'CV / Resume',
    tagline: 'Clean, professional CV in Markdown',
    description: 'A ready-to-edit CV template in Markdown. Convert to a styled PDF in one click — perfect for sending to recruiters, uploading to job boards, or attaching to outreach emails. Edit once, export in any of 11 visual styles.',
    useCases: ['job applications', 'LinkedIn exports', 'freelance portfolios', 'academic CVs', 'personal branding'],
    sections: ['Contact info', 'Summary', 'Experience', 'Education', 'Skills', 'Projects'],
    keywords: 'markdown cv template, markdown resume pdf, free cv template, resume markdown, cv in markdown, pdf resume',
    previewStyle: 'minimal',
  },
  {
    key: 'report',
    name: 'Report',
    slug: 'Report',
    tagline: 'Structured report template with cover and sections',
    description: 'A polished report template ready for executive summaries, quarterly reviews, or project wrap-ups. Organized sections, tables, and headings that render beautifully in PDF — no LaTeX, no Word, no formatting headaches.',
    useCases: ['business reports', 'quarterly reviews', 'project post-mortems', 'research summaries', 'client deliverables'],
    sections: ['Executive summary', 'Background', 'Findings', 'Recommendations', 'Appendix'],
    keywords: 'markdown report template, business report pdf, quarterly report markdown, executive summary template, markdown to pdf report',
    previewStyle: 'corporate',
  },
  {
    key: 'documentation',
    name: 'Documentation',
    slug: 'Documentation',
    tagline: 'Technical documentation with code examples',
    description: 'Technical documentation template with sections for overview, installation, usage, API reference, and FAQ. Full support for code blocks, Mermaid diagrams, and syntax highlighting in 180+ languages.',
    useCases: ['API documentation', 'open-source READMEs', 'internal wikis', 'onboarding guides', 'SDK reference'],
    sections: ['Overview', 'Installation', 'Usage', 'API reference', 'FAQ'],
    keywords: 'markdown documentation template, technical docs pdf, api docs markdown, readme template, software documentation pdf',
    previewStyle: 'github',
  },
  {
    key: 'changelog',
    name: 'Changelog',
    slug: 'Changelog',
    tagline: 'Keep a Changelog-style release notes',
    description: 'Release notes template following the "Keep a Changelog" convention. Sections for Added, Changed, Fixed, and Removed — with semantic versioning and dates. Perfect for GitHub releases, product updates, and internal change logs.',
    useCases: ['release notes', 'product updates', 'GitHub releases', 'version history', 'audit logs'],
    sections: ['[Unreleased]', '[Version] — Date', 'Added', 'Changed', 'Fixed', 'Removed'],
    keywords: 'changelog template markdown, keep a changelog, release notes pdf, version history markdown, product update template',
    previewStyle: 'github',
  },
  {
    key: 'meeting-notes',
    name: 'Meeting Notes',
    slug: 'Meeting Notes',
    tagline: 'Clean meeting notes with action items',
    description: 'Meeting notes template with attendees, agenda, discussion points, decisions, and action items. Export to PDF for stakeholders or share the link directly with your team. Includes checkbox-style action items.',
    useCases: ['standups', 'client meetings', 'board meetings', '1:1s', 'workshop recaps'],
    sections: ['Date & attendees', 'Agenda', 'Discussion', 'Decisions', 'Action items'],
    keywords: 'meeting notes template, markdown meeting notes, standup notes, action items template, meeting minutes pdf',
    previewStyle: 'notion',
  },
];

function allTemplateLinks(current) {
  return TEMPLATES.map(t => current === t.key
    ? `<span class="tag current">${esc(t.name)}</span>`
    : `<a href="/templates/${t.key}" class="tag">${esc(t.name)}</a>`
  ).join('\n            ');
}

function buildTemplate(t) {
  const url = `${SITE}/templates/${t.key}`;
  const ctaUrl = `${SITE}/?template=${t.key}`;
  const trail = [
    { name: 'MD2PDF', href: '/' },
    { name: 'Templates', href: '/templates/' },
    { name: t.name, href: `/templates/${t.key}` },
  ];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${t.name} Template — Markdown to PDF`,
    description: t.description,
    url,
    isPartOf: { '@type': 'WebApplication', name: 'MD2PDF', url: SITE },
    breadcrumb: breadcrumbJsonLd(trail),
  };

  return pageHead({
    title: `${t.name} Template — Markdown to PDF | MD2PDF`,
    desc: `${t.tagline}. Free Markdown template — edit in your browser and export to PDF, HTML, or image.`,
    canonical: url,
    keywords: t.keywords,
    jsonLd,
  }) + `
        ${breadcrumb(trail)}

        <h1><span class="accent">${esc(t.name)}</span> Template</h1>
        <p class="tagline">${esc(t.tagline)}</p>

        <p>${esc(t.description)}</p>

        <div class="cta-row">
            <a href="${ctaUrl}" class="cta">Use ${esc(t.name)} Template</a>
            <a href="/" class="cta-secondary">Open Editor</a>
        </div>

        <div class="info-grid">
            <div class="info-card">
                <div class="label">Default Style</div>
                <div class="value"><a href="/styles/${t.previewStyle}">${t.previewStyle.charAt(0).toUpperCase() + t.previewStyle.slice(1)}</a> (change anytime)</div>
            </div>
            <div class="info-card">
                <div class="label">Format</div>
                <div class="value">Markdown (.md)</div>
            </div>
            <div class="info-card">
                <div class="label">Export Formats</div>
                <div class="value">PDF, HTML, PNG</div>
            </div>
            <div class="info-card">
                <div class="label">Price</div>
                <div class="value">Free — no signup</div>
            </div>
        </div>

        <h2>What's Inside</h2>
        <ul style="padding-left: 24px;">
            ${t.sections.map(s => `<li>${esc(s)}</li>`).join('\n            ')}
        </ul>

        <h2>Best For</h2>
        <ul class="use-cases">
            ${t.useCases.map(u => `<li>${esc(u)}</li>`).join('\n            ')}
        </ul>

        <h2>How to Use the ${esc(t.name)} Template</h2>
        <ol style="padding-left: 24px; color: #c9d1d9;">
            <li style="margin-bottom: 8px;">Go to <a href="${ctaUrl}">md2pdf.studio/?template=${t.key}</a> — the template loads into the editor.</li>
            <li style="margin-bottom: 8px;">Edit the content in-place. Live preview updates as you type.</li>
            <li style="margin-bottom: 8px;">Pick a visual style from <a href="/styles/">11 options</a> — or customize with your own CSS.</li>
            <li style="margin-bottom: 8px;">Click <strong>Export</strong> to download as PDF, HTML, or image — or share by URL.</li>
        </ol>

        <h2>All Templates</h2>
        <div class="browser">
            ${allTemplateLinks(t.key)}
        </div>

        <h2>FAQ</h2>
        <details>
            <summary>Is the ${esc(t.name)} template free?</summary>
            <p>Yes. All templates are free, no signup required.</p>
        </details>
        <details>
            <summary>Can I change the style after loading the template?</summary>
            <p>Yes. Templates load with a recommended style, but you can switch to any of <a href="/styles/">11 styles</a> at any point.</p>
        </details>
        <details>
            <summary>Can AI agents generate this template programmatically?</summary>
            <p>Yes. MD2PDF exposes a <a href="/api">REST API</a> and a <a href="/ai-skill">Claude Skill</a>. Agents can create filled-in versions of any template and share them by URL.</p>
        </details>
        <details>
            <summary>Where is my document stored?</summary>
            <p>Drafts are auto-saved to your browser's localStorage. Shared documents are encrypted (AES-256-GCM) and stored on Cloudflare KV for 90 days.</p>
        </details>

        ${FOOTER}
    </div>
</body>
</html>`;
}

function buildTemplatesIndex() {
  const url = `${SITE}/templates/`;
  const trail = [{ name: 'MD2PDF', href: '/' }, { name: 'Templates', href: '/templates/' }];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Markdown Templates — MD2PDF',
    description: 'Free Markdown templates for CVs, reports, documentation, changelogs, and meeting notes. Export to PDF, HTML, or image.',
    url,
    isPartOf: { '@type': 'WebApplication', name: 'MD2PDF', url: SITE },
    breadcrumb: breadcrumbJsonLd(trail),
    hasPart: TEMPLATES.map(t => ({
      '@type': 'WebPage',
      name: `${t.name} Template`,
      url: `${SITE}/templates/${t.key}`,
    })),
  };

  return pageHead({
    title: 'Markdown Templates — Free CV, Report, Documentation, Changelog | MD2PDF',
    desc: 'Free Markdown templates: CV/Resume, Report, Documentation, Changelog, Meeting Notes. Edit in browser, export to PDF, HTML, or image.',
    canonical: url,
    keywords: 'markdown templates, cv template markdown, report template, documentation template, changelog template, meeting notes template, free markdown templates',
    jsonLd,
  }) + `
        ${breadcrumb(trail)}

        <h1><span class="accent">5</span> Markdown Templates</h1>
        <p class="tagline">Edit once, export anywhere. All templates free.</p>

        <div class="cta-row">
            <a href="/" class="cta">Open Editor</a>
            <a href="/styles/" class="cta-secondary">Browse Styles</a>
        </div>

        <h2>Templates</h2>
        <ul style="list-style: none; padding: 0;">
            ${TEMPLATES.map(t => `<li style="background:#161b22;border:1px solid #30363d;border-radius:10px;padding:20px;margin-bottom:12px;">
                <h3 style="margin:0 0 6px 0;"><a href="/templates/${t.key}">${esc(t.name)}</a></h3>
                <p style="margin:0;color:#8b949e;font-size:0.92em;">${esc(t.tagline)}</p>
            </li>`).join('\n            ')}
        </ul>

        ${FOOTER}
    </div>
</body>
</html>`;
}

// ── VS COMPARISONS ────────────────────────────────────

const VS = [
  {
    key: 'pandoc',
    name: 'Pandoc',
    tagline: 'MD2PDF vs Pandoc — which to use',
    description: 'Pandoc is the Swiss-army knife of document conversion — but it requires installation, command-line knowledge, and often a LaTeX toolchain for PDF output. MD2PDF is a browser-based alternative: no install, live preview, 11 visual styles, and instant PDF export.',
    keywords: 'md2pdf vs pandoc, pandoc alternative, markdown to pdf no install, pandoc browser, pandoc online',
    rows: [
      { feature: 'Install required', md2pdf: { v: 'No — runs in browser', c: 'yes' }, other: { v: 'Yes — CLI + LaTeX for PDF', c: 'no' } },
      { feature: 'Live preview', md2pdf: { v: 'Yes', c: 'yes' }, other: { v: 'No', c: 'no' } },
      { feature: 'Visual styles out of the box', md2pdf: { v: '11 styles', c: 'yes' }, other: { v: 'Via templates / LaTeX', c: 'mid' } },
      { feature: 'Mermaid diagrams', md2pdf: { v: 'Built-in', c: 'yes' }, other: { v: 'Via filter/plugin', c: 'mid' } },
      { feature: 'CLI / scripting', md2pdf: { v: 'REST API', c: 'mid' }, other: { v: 'Native CLI', c: 'yes' } },
      { feature: 'Output formats', md2pdf: { v: 'PDF, HTML, PNG', c: 'mid' }, other: { v: 'Everything (40+)', c: 'yes' } },
      { feature: 'Custom CSS', md2pdf: { v: 'Yes, inline in browser', c: 'yes' }, other: { v: 'Yes, via templates', c: 'yes' } },
      { feature: 'Free', md2pdf: { v: 'Yes', c: 'yes' }, other: { v: 'Yes (open source)', c: 'yes' } },
      { feature: 'AI-agent ready', md2pdf: { v: 'Yes — Claude Skill + API', c: 'yes' }, other: { v: 'No', c: 'no' } },
    ],
    whenToUse: {
      md2pdf: 'You want to preview and export a Markdown document quickly, with a polished visual style, without installing anything. Ideal for CVs, reports, docs, and sharing with non-technical recipients.',
      other: 'You need batch conversions, EPUB/DOCX/ODT output, or tight integration into a build pipeline. Pandoc is unbeatable for heavy document processing.',
    },
  },
  {
    key: 'typora',
    name: 'Typora',
    tagline: 'MD2PDF vs Typora — which to use',
    description: 'Typora is a beloved desktop Markdown editor — but it requires a paid license, installation on each machine, and lives locally. MD2PDF is free, browser-based, with shareable URLs, an AI Skill, and a REST API for automation.',
    keywords: 'md2pdf vs typora, typora alternative, free typora, typora online, typora browser',
    rows: [
      { feature: 'Price', md2pdf: { v: 'Free', c: 'yes' }, other: { v: 'Paid ($14.99)', c: 'no' } },
      { feature: 'Install required', md2pdf: { v: 'No — browser', c: 'yes' }, other: { v: 'Yes — desktop app', c: 'no' } },
      { feature: 'Platform', md2pdf: { v: 'Any browser', c: 'yes' }, other: { v: 'macOS/Win/Linux', c: 'mid' } },
      { feature: 'Live preview', md2pdf: { v: 'Yes — split view', c: 'yes' }, other: { v: 'Yes — WYSIWYG', c: 'yes' } },
      { feature: 'Visual styles', md2pdf: { v: '11 built-in', c: 'yes' }, other: { v: 'Themes (CSS)', c: 'yes' } },
      { feature: 'Shareable URLs', md2pdf: { v: 'Yes — encrypted', c: 'yes' }, other: { v: 'No', c: 'no' } },
      { feature: 'Mermaid diagrams', md2pdf: { v: 'Built-in', c: 'yes' }, other: { v: 'Built-in', c: 'yes' } },
      { feature: 'Auto table of contents', md2pdf: { v: 'Yes', c: 'yes' }, other: { v: 'Yes', c: 'yes' } },
      { feature: 'AI-agent ready', md2pdf: { v: 'Claude Skill + API', c: 'yes' }, other: { v: 'No', c: 'no' } },
    ],
    whenToUse: {
      md2pdf: 'You want a polished editor with shareable links, no install, and no license fee. Ideal for collaborators, AI agents, and anyone switching between devices.',
      other: 'You write long-form locally, prefer WYSIWYG, and don\'t mind paying for a native app.',
    },
  },
  {
    key: 'stackedit',
    name: 'StackEdit',
    tagline: 'MD2PDF vs StackEdit — which to use',
    description: 'StackEdit is a classic in-browser Markdown editor focused on syncing with cloud drives. MD2PDF focuses on beautiful PDF/HTML/image export: 11 visual styles, live preview, Mermaid diagrams, and an AI Skill / REST API for agent workflows.',
    keywords: 'md2pdf vs stackedit, stackedit alternative, markdown editor online, free markdown pdf',
    rows: [
      { feature: 'Price', md2pdf: { v: 'Free', c: 'yes' }, other: { v: 'Free (with ads) / paid', c: 'mid' } },
      { feature: 'Install required', md2pdf: { v: 'No', c: 'yes' }, other: { v: 'No', c: 'yes' } },
      { feature: 'Visual style options', md2pdf: { v: '11 styles', c: 'yes' }, other: { v: 'Fewer options', c: 'mid' } },
      { feature: 'PDF export', md2pdf: { v: 'Native — preserves style', c: 'yes' }, other: { v: 'Via browser print', c: 'mid' } },
      { feature: 'Share by URL', md2pdf: { v: 'Encrypted, short link', c: 'yes' }, other: { v: 'Via Google Drive sync', c: 'mid' } },
      { feature: 'Mermaid diagrams', md2pdf: { v: 'Built-in', c: 'yes' }, other: { v: 'Built-in', c: 'yes' } },
      { feature: 'Auto table of contents', md2pdf: { v: 'Yes', c: 'yes' }, other: { v: 'Yes', c: 'yes' } },
      { feature: 'Cloud sync (Drive, Dropbox)', md2pdf: { v: 'No — URL sharing', c: 'mid' }, other: { v: 'Yes', c: 'yes' } },
      { feature: 'AI-agent ready', md2pdf: { v: 'Claude Skill + API', c: 'yes' }, other: { v: 'No', c: 'no' } },
    ],
    whenToUse: {
      md2pdf: 'You care about final output — beautiful, styled PDFs and shareable previews. Ideal for sending documents to non-technical recipients or letting AI agents produce polished files.',
      other: 'You rely on Google Drive / Dropbox sync for a team Markdown workflow and don\'t need styled PDF export.',
    },
  },
];

function buildVs(v) {
  const url = `${SITE}/vs/${v.key}`;
  const trail = [
    { name: 'MD2PDF', href: '/' },
    { name: 'Compare', href: '/vs/' },
    { name: v.name, href: `/vs/${v.key}` },
  ];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `MD2PDF vs ${v.name}`,
    description: v.description,
    url,
    isPartOf: { '@type': 'WebApplication', name: 'MD2PDF', url: SITE },
    breadcrumb: breadcrumbJsonLd(trail),
  };
  const vsOthers = VS.filter(x => x.key !== v.key)
    .map(x => `<a href="/vs/${x.key}" class="tag">vs ${esc(x.name)}</a>`).join('\n            ');

  return pageHead({
    title: `MD2PDF vs ${v.name} — Which to Use | MD2PDF`,
    desc: `Compare MD2PDF and ${v.name}. ${v.tagline}. Features, pricing, and when to use each.`,
    canonical: url,
    keywords: v.keywords,
    jsonLd,
  }) + `
        ${breadcrumb(trail)}

        <h1>MD2PDF <span class="accent">vs</span> ${esc(v.name)}</h1>
        <p class="tagline">${esc(v.tagline)}</p>

        <p>${esc(v.description)}</p>

        <div class="cta-row">
            <a href="/" class="cta">Try MD2PDF</a>
            <a href="/about" class="cta-secondary">Learn More</a>
        </div>

        <h2>Feature Comparison</h2>
        <table>
            <thead>
                <tr><th>Feature</th><th>MD2PDF</th><th>${esc(v.name)}</th></tr>
            </thead>
            <tbody>
                ${v.rows.map(r => `<tr>
                    <td><strong style="color:#e6edf3;">${esc(r.feature)}</strong></td>
                    <td class="${r.md2pdf.c}">${esc(r.md2pdf.v)}</td>
                    <td class="${r.other.c}">${esc(r.other.v)}</td>
                </tr>`).join('\n                ')}
            </tbody>
        </table>

        <h2>When to Use MD2PDF</h2>
        <p>${esc(v.whenToUse.md2pdf)}</p>

        <h2>When to Use ${esc(v.name)}</h2>
        <p>${esc(v.whenToUse.other)}</p>

        <h2>Other Comparisons</h2>
        <div class="browser">
            ${vsOthers}
        </div>

        <h2>FAQ</h2>
        <details>
            <summary>Is MD2PDF open source?</summary>
            <p>Yes. Source code is on <a href="${GH_REPO}">GitHub</a> under the MIT license.</p>
        </details>
        <details>
            <summary>Does MD2PDF work offline?</summary>
            <p>Once the page loads, the editor and export run entirely in your browser. Sharing by URL requires network access to save to Cloudflare KV.</p>
        </details>
        <details>
            <summary>Can AI agents use MD2PDF?</summary>
            <p>Yes. MD2PDF exposes a <a href="/api">REST API</a>, an installable <a href="/ai-skill">Claude Skill</a>, and WebMCP for direct agent interaction.</p>
        </details>

        ${FOOTER}
    </div>
</body>
</html>`;
}

function buildVsIndex() {
  const url = `${SITE}/vs/`;
  const trail = [{ name: 'MD2PDF', href: '/' }, { name: 'Compare', href: '/vs/' }];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'MD2PDF Comparisons',
    description: 'Compare MD2PDF to Pandoc, Typora, and StackEdit. Features, pricing, and recommendations.',
    url,
    isPartOf: { '@type': 'WebApplication', name: 'MD2PDF', url: SITE },
    breadcrumb: breadcrumbJsonLd(trail),
    hasPart: VS.map(v => ({
      '@type': 'WebPage',
      name: `MD2PDF vs ${v.name}`,
      url: `${SITE}/vs/${v.key}`,
    })),
  };

  return pageHead({
    title: 'MD2PDF vs Pandoc, Typora, StackEdit — Compare | MD2PDF',
    desc: 'How MD2PDF compares to Pandoc, Typora, and StackEdit. Features, pricing, and when to use each.',
    canonical: url,
    keywords: 'md2pdf vs pandoc, md2pdf vs typora, md2pdf vs stackedit, markdown to pdf comparison',
    jsonLd,
  }) + `
        ${breadcrumb(trail)}

        <h1>MD2PDF <span class="accent">vs</span> Alternatives</h1>
        <p class="tagline">How MD2PDF compares to Pandoc, Typora, and StackEdit.</p>

        <ul style="list-style: none; padding: 0;">
            ${VS.map(v => `<li style="background:#161b22;border:1px solid #30363d;border-radius:10px;padding:20px;margin-bottom:12px;">
                <h3 style="margin:0 0 6px 0;"><a href="/vs/${v.key}">MD2PDF vs ${esc(v.name)}</a></h3>
                <p style="margin:0;color:#8b949e;font-size:0.92em;">${esc(v.tagline)}</p>
            </li>`).join('\n            ')}
        </ul>

        ${FOOTER}
    </div>
</body>
</html>`;
}

// ── /api ──────────────────────────────────────────────

function buildApi() {
  const url = `${SITE}/api`;
  const trail = [{ name: 'MD2PDF', href: '/' }, { name: 'API', href: '/api' }];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'APIReference',
    name: 'MD2PDF REST API',
    description: 'Public REST API for creating, updating, and sharing Markdown documents programmatically.',
    url,
    isPartOf: { '@type': 'WebApplication', name: 'MD2PDF', url: SITE },
    breadcrumb: breadcrumbJsonLd(trail),
  };

  return pageHead({
    title: 'REST API — Markdown to PDF | MD2PDF',
    desc: 'Public REST API for MD2PDF. Create, update, and share Markdown documents programmatically. JSON, no auth required, rate-limited.',
    canonical: url,
    keywords: 'markdown api, markdown to pdf api, markdown rest api, programmatic pdf, document api, agent api',
    jsonLd,
  }) + `
        ${breadcrumb(trail)}

        <h1>MD2PDF <span class="accent">REST API</span></h1>
        <p class="tagline">Create, update, and share Markdown documents programmatically.</p>

        <p>The public API lets AI agents, scripts, and integrations produce styled, shareable documents in Markdown — no signup, no API key. Rate-limited to 10 saves per IP per minute.</p>

        <div class="cta-row">
            <a href="/" class="cta">Try in Browser</a>
            <a href="/ai-skill" class="cta-secondary">AI Skill</a>
            <a href="/llms-full.txt" class="cta-secondary">llms-full.txt</a>
        </div>

        <h2>Endpoints</h2>

        <h3>POST /api/save</h3>
        <p>Save a Markdown document. Returns a short URL and an edit key.</p>
<pre><code>curl -X POST https://md2pdf.studio/api/save \\
  -H "Content-Type: text/plain" \\
  --data-binary "# Hello\\n\\nThis is a shared document."</code></pre>
        <p>Response:</p>
<pre><code>{
  "id": "aB3xY9zK",
  "editKey": "…",
  "url": "https://md2pdf.studio/s/aB3xY9zK",
  "key": "…"   // AES-256-GCM key (server-encrypted docs)
}</code></pre>

        <h3>PUT /api/update/:id</h3>
        <p>Update a previously-saved document. Requires the <code>X-Edit-Key</code> header.</p>
<pre><code>curl -X PUT https://md2pdf.studio/api/update/aB3xY9zK \\
  -H "Content-Type: text/plain" \\
  -H "X-Edit-Key: YOUR_EDIT_KEY" \\
  -H "X-Enc-Key: YOUR_ENC_KEY" \\
  --data-binary "# Hello (updated)"</code></pre>

        <h3>GET /s/:id</h3>
        <p>Load a shared document. HTML response includes dynamic Open Graph tags so link previews show the document's title and description on Slack, WhatsApp, Teams, and Discord.</p>

        <h2>Rate Limits</h2>
        <div class="info-grid">
            <div class="info-card">
                <div class="label">Saves per IP</div>
                <div class="value">10 / minute</div>
            </div>
            <div class="info-card">
                <div class="label">Max document size</div>
                <div class="value">500 KB</div>
            </div>
            <div class="info-card">
                <div class="label">Retention</div>
                <div class="value">90 days from last update</div>
            </div>
            <div class="info-card">
                <div class="label">Auth</div>
                <div class="value">None (anonymous)</div>
            </div>
        </div>

        <h2>Encryption</h2>
        <p>All documents are encrypted at rest (AES-256-GCM). When you save via the API without client-side encryption, MD2PDF encrypts the document server-side and returns the key in the response. Keep the key to decrypt or re-update the document later.</p>

        <h2>For AI Agents</h2>
        <p>See <a href="/ai-skill">/ai-skill</a> for the installable Claude Skill, <a href="/llms-full.txt">/llms-full.txt</a> for the full LLM documentation, and <a href="/skill.md">/skill.md</a> for the skill manifest.</p>

        <h2>FAQ</h2>
        <details>
            <summary>Do I need an API key?</summary>
            <p>No. The API is anonymous and rate-limited by IP. For higher limits, self-host via the <a href="${GH_REPO}">open-source repo</a>.</p>
        </details>
        <details>
            <summary>Is there an OpenAPI / Swagger spec?</summary>
            <p>Not yet. See <a href="/llms-full.txt">llms-full.txt</a> for a complete machine-readable description.</p>
        </details>
        <details>
            <summary>Can I delete a document?</summary>
            <p>Not currently. Documents expire automatically 90 days after their last update.</p>
        </details>

        ${FOOTER}
    </div>
</body>
</html>`;
}

// ── /ai-skill ─────────────────────────────────────────

function buildAiSkill() {
  const url = `${SITE}/ai-skill`;
  const trail = [{ name: 'MD2PDF', href: '/' }, { name: 'AI Skill', href: '/ai-skill' }];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'MD2PDF Claude Skill',
    description: 'Installable Claude Skill that lets AI agents create, update, and share styled Markdown documents via MD2PDF.',
    url,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    isPartOf: { '@type': 'WebApplication', name: 'MD2PDF', url: SITE },
    breadcrumb: breadcrumbJsonLd(trail),
  };

  return pageHead({
    title: 'Claude Skill for Markdown to PDF — AI Agents | MD2PDF',
    desc: 'Installable Claude Skill, WebMCP, and REST API. Let AI agents create, update, and share styled Markdown documents.',
    canonical: url,
    keywords: 'claude skill, markdown claude skill, ai markdown to pdf, webmcp, mcp server, ai document generator, anthropic skill',
    jsonLd,
  }) + `
        ${breadcrumb(trail)}

        <h1><span class="accent">AI Skill</span> for Markdown</h1>
        <p class="tagline">Let AI agents create, update, and share styled documents.</p>

        <p>MD2PDF is built for the AI era. Install the Claude Skill, use WebMCP, or call the public REST API — agents produce beautifully styled PDFs, HTML, and images and hand recipients a shareable link.</p>

        <div class="cta-row">
            <a href="/skill.md" class="cta">Install Skill</a>
            <a href="/api" class="cta-secondary">REST API</a>
            <a href="/llms-full.txt" class="cta-secondary">llms-full.txt</a>
        </div>

        <h2>Integration Options</h2>

        <div class="info-grid">
            <div class="info-card">
                <div class="label">Claude Skill</div>
                <div class="value"><a href="/skill.md">/skill.md</a> — Skills format manifest</div>
            </div>
            <div class="info-card">
                <div class="label">WebMCP</div>
                <div class="value">Inline MCP in the app — agents call tools directly</div>
            </div>
            <div class="info-card">
                <div class="label">REST API</div>
                <div class="value"><a href="/api">/api</a> — anonymous, rate-limited</div>
            </div>
            <div class="info-card">
                <div class="label">LLM Docs</div>
                <div class="value"><a href="/llms.txt">llms.txt</a> / <a href="/llms-full.txt">llms-full.txt</a></div>
            </div>
            <div class="info-card">
                <div class="label">AI Plugin</div>
                <div class="value"><a href="/.well-known/ai-plugin.json">ai-plugin.json</a></div>
            </div>
            <div class="info-card">
                <div class="label">JSON-LD</div>
                <div class="value">SoftwareApplication schema</div>
            </div>
        </div>

        <h2>Install in Claude</h2>
        <ol style="padding-left: 24px; color: #c9d1d9;">
            <li style="margin-bottom: 8px;">Open Claude and go to <strong>Skills</strong>.</li>
            <li style="margin-bottom: 8px;">Add a new skill and paste the URL <code>${SITE}/skill.md</code>.</li>
            <li style="margin-bottom: 8px;">Claude can now create Markdown documents and share them as <code>/s/{id}</code> links.</li>
        </ol>

        <h2>Example Prompts</h2>

        <h3>Generate a CV</h3>
        <p style="color:#8b949e;">"Create a CV for a senior frontend engineer with 8 years of experience. Use the Minimal style and share the link."</p>

        <h3>Release notes</h3>
        <p style="color:#8b949e;">"Take this changelog and produce a styled PDF in the GitHub style, then share the link in Slack format."</p>

        <h3>Meeting notes to PDF</h3>
        <p style="color:#8b949e;">"From today's transcript, produce meeting notes with action items in the Notion style, and give me the shareable URL."</p>

        <h2>All Templates Agents Can Use</h2>
        <div class="browser">
            ${TEMPLATES.map(t => `<a href="/templates/${t.key}" class="tag">${esc(t.name)}</a>`).join('\n            ')}
        </div>

        <h2>FAQ</h2>
        <details>
            <summary>Does MD2PDF support MCP?</summary>
            <p>Yes — WebMCP (in-browser MCP) lets agents interact with the editor directly. A remote MCP server is on the roadmap.</p>
        </details>
        <details>
            <summary>Do agents need an API key?</summary>
            <p>No. The public API is anonymous, rate-limited by IP. For higher limits, self-host via <a href="${GH_REPO}">GitHub</a>.</p>
        </details>
        <details>
            <summary>Can agents update previously-created documents?</summary>
            <p>Yes. Agents receive an <code>editKey</code> when saving, which authorizes subsequent <code>PUT /api/update/:id</code> calls.</p>
        </details>
        <details>
            <summary>Are agent-created documents encrypted?</summary>
            <p>Yes — all documents are AES-256-GCM encrypted at rest. Keys are returned in the API response and must be kept by the caller.</p>
        </details>

        ${FOOTER}
    </div>
</body>
</html>`;
}

// ── /changelog ────────────────────────────────────────

function buildChangelog() {
  const url = `${SITE}/changelog`;
  const trail = [{ name: 'MD2PDF', href: '/' }, { name: 'Changelog', href: '/changelog' }];

  // Pull last ~60 commits grouped by YYYY-MM.
  let commits = [];
  try {
    const out = execSync('git log -n 80 --pretty=format:%H%x09%ad%x09%s --date=short', {
      cwd: __dirname, encoding: 'utf8',
    });
    commits = out.split('\n').filter(Boolean).map(line => {
      const [hash, date, ...rest] = line.split('\t');
      return { hash, date, subject: rest.join('\t') };
    }).filter(c => {
      const s = c.subject.toLowerCase();
      // Skip noise
      return !s.startsWith('merge ') && !s.startsWith('wip') && !s.startsWith('chore: bump');
    });
  } catch (e) {
    console.warn('git log unavailable, changelog will have no entries');
  }

  const groups = {};
  for (const c of commits) {
    const month = c.date.slice(0, 7); // YYYY-MM
    (groups[month] ||= []).push(c);
  }
  const months = Object.keys(groups).sort().reverse();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'MD2PDF Changelog',
    description: 'Release notes and recent changes to MD2PDF.',
    url,
    dateModified: commits[0]?.date || new Date().toISOString().slice(0, 10),
    isPartOf: { '@type': 'WebApplication', name: 'MD2PDF', url: SITE },
    breadcrumb: breadcrumbJsonLd(trail),
  };

  const entries = months.map(m => {
    const [y, mo] = m.split('-');
    const monthName = new Date(Number(y), Number(mo) - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
    return `<h2>${monthName}</h2>
        <ul style="padding-left: 24px;">
            ${groups[m].map(c => `<li style="margin-bottom:6px;"><span style="color:#8b949e;font-family:'JetBrains Mono',monospace;font-size:0.82em;">${c.date}</span> — ${esc(c.subject)} <a href="${GH_REPO}/commit/${c.hash}" style="color:#6e7681;font-family:'JetBrains Mono',monospace;font-size:0.78em;">${c.hash.slice(0, 7)}</a></li>`).join('\n            ')}
        </ul>`;
  }).join('\n\n        ');

  return pageHead({
    title: 'Changelog — MD2PDF',
    desc: 'Release notes and recent changes to MD2PDF. Grouped by month, linked to GitHub commits.',
    canonical: url,
    keywords: 'md2pdf changelog, md2pdf release notes, md2pdf updates, markdown to pdf changelog',
    jsonLd,
  }) + `
        ${breadcrumb(trail)}

        <h1><span class="accent">Changelog</span></h1>
        <p class="tagline">Recent changes to MD2PDF.</p>

        <p>Grouped by month. For the full history, browse commits on <a href="${GH_REPO}/commits/main">GitHub</a>.</p>

        ${entries || '<p>No changes yet.</p>'}

        ${FOOTER}
    </div>
</body>
</html>`;
}

// ── Emit ──────────────────────────────────────────────

function writeFile(rel, contents) {
  const full = path.join(__dirname, 'public', rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents, 'utf8');
  console.log('  created:', '/' + rel);
}

// Templates
for (const t of TEMPLATES) {
  writeFile(`templates/${t.key}.html`, buildTemplate(t));
}
writeFile('templates/index.html', buildTemplatesIndex());

// VS
for (const v of VS) {
  writeFile(`vs/${v.key}.html`, buildVs(v));
}
writeFile('vs/index.html', buildVsIndex());

// Singletons
writeFile('api.html', buildApi());
writeFile('ai-skill.html', buildAiSkill());
writeFile('changelog.html', buildChangelog());

console.log('\n✓ SEO pages generated');

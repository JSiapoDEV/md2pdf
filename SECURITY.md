# Security Policy

## Architecture

MD2PDF runs **entirely in the browser**. No data is sent to any server. All processing (markdown parsing, PDF/HTML/image generation, sharing) happens client-side.

- Markdown content is stored only in `localStorage` (auto-save)
- Shared URLs contain compressed content in the URL hash (`#`), which is never sent to a server
- No analytics, no tracking, no cookies
- All CDN dependencies are loaded from `cdnjs.cloudflare.com`

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public issue**
2. Email **jsiapo.dev@gmail.com** with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
3. Allow reasonable time for a fix before public disclosure

## Scope

Since MD2PDF is a client-side application with no backend, the main security concerns are:

- **XSS via markdown input** — `marked.js` handles sanitization
- **Custom CSS injection** — Scoped to the preview element only
- **CDN integrity** — Dependencies loaded from trusted CDNs

## Supported Versions

Only the latest version deployed at [md2pdf.studio](https://md2pdf.studio) is supported.

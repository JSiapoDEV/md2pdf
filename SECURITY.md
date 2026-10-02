# Security Policy

## Architecture

Conversion and export (PDF, HTML, PNG) run **in the browser**. Nothing is uploaded to convert a file.

- Drafts are stored only in the browser's `localStorage` (auto-save).
- **Share links** are the only server-side storage. The app encrypts the document in the browser with AES-256-GCM and uploads ciphertext to Cloudflare KV. The key lives only in the link's `#k=` fragment, which browsers never send to the server.
- The REST API also accepts plaintext (path 2). In that case the server sees the content during the request, encrypts it, and does not keep the key. Use the end-to-end path for anything private.
- Share links expire 30 days after creation (links created before October 2, 2026: 90 days after their last update) and can be deleted with their edit key (`DELETE /api/delete/{id}`) or from Export > My links.
- No cookies and no accounts.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public issue**
2. Email **jsiapo.dev@gmail.com** with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
3. Allow reasonable time for a fix before public disclosure

## Scope

The main security concerns are:

- **XSS via markdown input** — marked's output is sanitized with DOMPurify (no scripts, forms, frames or `<style>`), Mermaid runs with `securityLevel: 'strict'`, and every page is served with a Content Security Policy
- **Shared documents** — rendered on this origin, so they go through the same sanitizer; `/s/` pages are `noindex`
- **Custom CSS** — Applied page-wide, entered and stored only in your own browser, never included in share links; it may load HTTPS stylesheets, fonts and images
- **CDN integrity** — Third-party libraries load from cdnjs and jsDelivr; DOMPurify is self-hosted

## Supported Versions

Only the latest version deployed at [md2pdf.studio](https://md2pdf.studio) is supported.

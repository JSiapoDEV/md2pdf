# Security Policy

## Architecture

Conversion and export (PDF, HTML, PNG) run **in the browser**. Nothing is uploaded to convert a file.

- Drafts are stored only in the browser's `localStorage` (auto-save).
- **Share links** are the only server-side storage. The app, the `md2pdf-studio` CLI and the REST API clients encrypt the document with AES-256-GCM before upload, and the server stores ciphertext in Cloudflare KV. The key lives only in the link's `#k=` fragment, which browsers never send to the server.
- The API accepts only ciphertext: a write without `X-Encrypted: aes-256-gcm` is rejected (`e2ee_required`), and so is any request carrying the key (`X-Enc-Key`). Links in the old `/share?doc=` format, which carried the document unencrypted in the address, answer 410.
- Abuse limits: a per-minute rate limit and a per-day quota of writes and bytes. The daily counters live in a Durable Object keyed by a hash of the client address (or of a Pro API key), hold no address, and wipe themselves at 00:00 UTC.
- One-time links are claimed atomically in a Durable Object, so two readers cannot both get the document even though KV is eventually consistent. The page of a one-time link carries no content, so link-preview bots cannot use it up.
- The optional preview title and description (Pro) are the only plaintext the server stores. They are stripped of control characters, length-limited and HTML-escaped when injected into the page; the document stays encrypted.
- Pro API keys are stored only as SHA-256 hashes in a Worker secret.
- The CLI keeps the edit key and encryption key of the links it creates in `~/.config/md2pdf-studio/links.json` (mode 600), on the user's machine only.
- Share links expire 30 days after creation (links created before the October 2, 2026 update: 90 days after their last update) and can be deleted with their edit key (`DELETE /api/delete/{id}`) or from Export > My links.
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
- **Supply chain** — Every script, stylesheet and font the app runs is served from this origin (`public/vendor`, `public/fonts`) at a pinned version, and the Content Security Policy allows no third-party script host. Updating a library means replacing the vendored file

## Supported Versions

Only the latest version deployed at [md2pdf.studio](https://md2pdf.studio) is supported.

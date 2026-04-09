# Contributing to MD2PDF

Thanks for your interest in contributing! MD2PDF is a simple, zero-dependency static site. Contributing is straightforward.

## How to Contribute

### Reporting Bugs

1. Check [existing issues](https://github.com/JSiapoDEV/MD2PDF/issues) first
2. Open a new issue with:
   - What you expected to happen
   - What actually happened
   - Browser and OS version
   - Screenshots if applicable

### Suggesting Features

Open an issue with the **feature request** label. Describe:
- What problem it solves
- How you envision it working
- Whether you'd be willing to implement it

### Submitting Code

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Test in multiple browsers (Chrome, Firefox, Safari)
5. Commit with a clear message: `git commit -m "Add: description of change"`
6. Push to your fork: `git push origin feature/your-feature`
7. Open a Pull Request

## Development Setup

No build tools needed. Just:

```bash
git clone https://github.com/JSiapoDEV/MD2PDF.git
cd MD2PDF
open index.html
```

Edit the files and refresh the browser.

## Project Structure

```
MD2PDF/
  index.html          # Main HTML with all UI elements
  style.css           # All styling and themes
  app.js              # All application logic
  icon.svg            # App icon
  llms.txt            # AI agent discoverability
  robots.txt          # Crawler permissions
  sitemap.xml         # Sitemap for search engines
  .well-known/
    ai-plugin.json    # AI plugin manifest
```

## Guidelines

- **No frameworks** — This project stays pure HTML/CSS/JS
- **No build step** — Must work by opening `index.html` directly
- **Keep it simple** — One file per concern (HTML, CSS, JS)
- **Test exports** — Any change to styles must be tested in PDF, HTML, and image exports
- **Dark & Light** — All visual changes must work in both themes
- **Mobile friendly** — Test on small screens

## Adding a New Style

1. Add the style object to `STYLES` in `app.js`:
   ```js
   mystyle: { name: 'My Style', dark: false, bg: '#fff', css: `
     .markdown-body { /* your overrides */ }
   `},
   ```
2. Add an `<option>` to the `#styleSelect` in `index.html`
3. Add an `<option>` to the WebMCP form `#wmcpConvert` in `index.html`
4. Test in both dark and light app themes
5. Test PDF and HTML exports

## Adding a New Template

1. Add the template string to `TEMPLATES` in `app.js`
2. Add a `<button data-template="key">` to the templates dropdown in `index.html`

## Code Style

- Use `const` / `let`, never `var`
- Single quotes for strings
- 4-space indentation
- Keep functions small and focused

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

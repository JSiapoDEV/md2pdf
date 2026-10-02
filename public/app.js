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
    const langToggle      = $('#langToggle');

    // ── State ────────────────────────────────────────

    let currentFileName = 'untitled.md';
    let currentStyle    = 'github';
    let currentLang     = 'en';
    let renderTimer     = null;
    let saveTimer       = null;
    let isSharedView    = false;
    let currentDocId    = null;   // see startNewDoc()
    let linkDecryptFailed = false;
    let linkKeyMissing = false;

    // ── i18n ─────────────────────────────────────────

    const I18N = {
        en: {
            markdown: 'Markdown', preview: 'Preview',
            export: 'Export', exportPdf: 'Export PDF', exportHtml: 'Export HTML',
            exportImage: 'Export Image', shareLink: 'Share Link',
            templates: 'Templates', upload: 'Upload',
            blankDoc: 'Blank document', cvResume: 'CV / Resume', report: 'Report',
            docs: 'Documentation', changelog: 'Changelog', meeting: 'Meeting Notes',
            find: 'Find...', replace: 'Replace...',
            replaceBtn: 'Replace', replaceAll: 'All',
            builtBy: 'Built by', starGithub: 'Star on GitHub',
            apiPrompts: 'AI Skill',
            linkCreated: 'Link created!', linkHint: 'Anyone with the full link can read this document.',
            linkExpires: 'Link expires on {date}. Anyone with the full link can read it.',
            deleteLink: 'Delete link', deleteConfirm: 'Click again to delete',
            linkDeleted: 'Link deleted', deleteFailed: 'Could not delete the link',
            reportAbuse: 'Report abuse', terms: 'Terms', privacy: 'Privacy',
            shareLinkTitle: 'Share link', updateLink: 'Update link with current content',
            draftTooLarge: 'Draft too large to autosave in this browser',
            keyMissing: 'This link is missing its key (the part after #k=). Ask the sender for the full link.', myLinks: 'My links', allLinks: 'Links created in this browser ({n})', noLinks: 'No links created in this browser yet.',
            yourLinks: 'Your other links on this browser ({n})', expiresShort: 'expires {date}',
            linkExpiredNew: 'The previous link had expired. Creating a new one.',
            tooManyShares: 'Too many shares in a minute. Try again shortly.',
            copy: 'Copy', copied: 'Copied!',
            download: 'Download',
            tabSkill: 'Skill', tabApi: 'API',
            generatingPdf: 'Generating PDF...',
            dropHere: 'Drop your <strong>.md</strong> file here',
            emptyPreview: 'Start typing to see the preview...',
            words: 'words', minRead: 'min',
            nothingToShare: 'Nothing to share', creatingLink: 'Creating link...',
            linkCopied: 'Link copied!', linkUpdated: 'Link updated',
            shareFailed: 'Share failed', docTooLarge: 'Share failed — document too large',
            draftRestored: 'Draft restored', templateLoaded: 'Template loaded',
            newDocument: 'New document', sharedDocLoaded: 'Shared document loaded',
            readOnlyTitle: 'Read-only document',
            readOnlyBody: 'This is a shared document. To make changes, create your own editable copy — the original stays untouched and you can refresh this link anytime to see updates.',
            createCopyBtn: 'Create editable copy', cancelBtn: 'Cancel',
            copyCreated: 'Editable copy created',
            sharedLockTip: 'Read-only shared document',
            imgDownloaded: 'Image downloaded', htmlDownloaded: 'HTML downloaded',
            exportFailed: 'Export failed.',
            replaced: 'Replaced {n} occurrences',
            decryptFailed: 'Could not decrypt document. The link may be incomplete.',
            encryptedShare: 'End-to-end encrypted',
            tocTitle: 'Table of Contents',
            customCssPlaceholder: '/* Custom CSS — applied to preview & PDF */\n\n/* Example: colored headings */\n.markdown-body h1, .markdown-body h2 {\n  color: #6366f1;\n}\n\n/* Example: rounded code blocks */\n.markdown-body pre {\n  border-radius: 16px;\n}',
            editorPlaceholder: 'Write or drop your Markdown here...',
            // Skill tab
            skillDesc: 'Install this skill in Claude, custom GPTs, or any AI agent to let it create and share styled documents via MD2PDF.',
            // API tab
            apiDesc: 'REST API for programmatic access. No authentication required.',
            apiCreate: 'Create document', apiUpdate: 'Update document',
            apiCurl: 'cURL examples', apiLimits: 'Limits',
        },
        es: {
            markdown: 'Markdown', preview: 'Vista previa',
            export: 'Exportar', exportPdf: 'Exportar PDF', exportHtml: 'Exportar HTML',
            exportImage: 'Exportar Imagen', shareLink: 'Compartir',
            templates: 'Plantillas', upload: 'Subir',
            blankDoc: 'Documento en blanco', cvResume: 'CV / Hoja de vida', report: 'Reporte',
            docs: 'Documentacion', changelog: 'Changelog', meeting: 'Notas de reunion',
            find: 'Buscar...', replace: 'Reemplazar...',
            replaceBtn: 'Reemplazar', replaceAll: 'Todo',
            builtBy: 'Creado por', starGithub: 'Estrella en GitHub',
            apiPrompts: 'Skill de IA',
            linkCreated: 'Enlace creado!', linkHint: 'Cualquiera con el enlace completo puede leer este documento.',
            linkExpires: 'El enlace vence el {date}. Cualquiera con el enlace completo puede leerlo.',
            deleteLink: 'Borrar enlace', deleteConfirm: 'Clic otra vez para borrar',
            linkDeleted: 'Enlace borrado', deleteFailed: 'No se pudo borrar el enlace',
            reportAbuse: 'Reportar abuso', terms: 'Términos', privacy: 'Privacidad',
            shareLinkTitle: 'Enlace para compartir', updateLink: 'Actualizar el enlace con el contenido actual',
            draftTooLarge: 'El borrador es demasiado grande para guardarse en este navegador',
            keyMissing: 'A este enlace le falta su clave (lo que va después de #k=). Pide el enlace completo.', myLinks: 'Mis enlaces', allLinks: 'Enlaces creados en este navegador ({n})', noLinks: 'Aún no creaste enlaces en este navegador.',
            yourLinks: 'Tus otros enlaces en este navegador ({n})', expiresShort: 'vence el {date}',
            linkExpiredNew: 'El enlace anterior venció. Creando uno nuevo.',
            tooManyShares: 'Demasiados enlaces en un minuto. Intenta en un momento.',
            copy: 'Copiar', copied: 'Copiado!',
            download: 'Descargar',
            tabSkill: 'Skill', tabApi: 'API',
            generatingPdf: 'Generando PDF...',
            dropHere: 'Suelta tu archivo <strong>.md</strong> aqui',
            emptyPreview: 'Empieza a escribir para ver la vista previa...',
            words: 'palabras', minRead: 'min',
            nothingToShare: 'Nada que compartir', creatingLink: 'Creando enlace...',
            linkCopied: 'Enlace copiado!', linkUpdated: 'Enlace actualizado',
            shareFailed: 'Error al compartir', docTooLarge: 'Error — documento muy grande',
            draftRestored: 'Borrador restaurado', templateLoaded: 'Plantilla cargada',
            newDocument: 'Nuevo documento', sharedDocLoaded: 'Documento compartido cargado',
            readOnlyTitle: 'Documento de solo lectura',
            readOnlyBody: 'Este es un documento compartido. Para hacer cambios, crea tu propia copia editable — el original queda intacto y puedes recargar este enlace cuando quieras para ver actualizaciones.',
            createCopyBtn: 'Crear copia editable', cancelBtn: 'Cancelar',
            copyCreated: 'Copia editable creada',
            sharedLockTip: 'Documento compartido de solo lectura',
            imgDownloaded: 'Imagen descargada', htmlDownloaded: 'HTML descargado',
            exportFailed: 'Error al exportar.',
            replaced: '{n} ocurrencias reemplazadas',
            decryptFailed: 'No se pudo descifrar el documento. El enlace puede estar incompleto.',
            encryptedShare: 'Cifrado de extremo a extremo',
            tocTitle: 'Tabla de Contenido',
            customCssPlaceholder: '/* CSS personalizado — se aplica al preview y PDF */\n\n/* Ejemplo: titulos con color */\n.markdown-body h1, .markdown-body h2 {\n  color: #6366f1;\n}\n\n/* Ejemplo: bloques de codigo redondeados */\n.markdown-body pre {\n  border-radius: 16px;\n}',
            editorPlaceholder: 'Escribe o arrastra tu Markdown aqui...',
            // Skill tab
            skillDesc: 'Instala esta skill en Claude, GPTs personalizados, o cualquier agente de IA para que pueda crear y compartir documentos con MD2PDF.',
            // API tab
            apiDesc: 'API REST para acceso programatico. No requiere autenticacion.',
            apiCreate: 'Crear documento', apiUpdate: 'Actualizar documento',
            apiCurl: 'Ejemplos cURL', apiLimits: 'Limites',
        },
    };

    // Installable stub — this is what users copy into their AI agents.
    // The agent fetches the full instructions from /skill.md at runtime.
    const SKILL_INSTALLABLE = `---
name: md2pdf
description: Create and share styled PDF, HTML, and image documents from Markdown via md2pdf.studio. Use when the user wants to export, share, or create a visually styled document from markdown content.
---

Before creating or sharing a document, always fetch the latest skill instructions from:
https://md2pdf.studio/skill.md

Follow those instructions exactly.
`;

    function t(key) { return I18N[currentLang]?.[key] || I18N.en[key] || key; }

    function applyLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('md2pdf-lang', lang);
        langToggle.textContent = lang.toUpperCase();
        document.documentElement.lang = lang;

        // Static UI elements
        $('#editorPane .pane-label').innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> ' + t('markdown');
        $('#previewPane .pane-label').innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> ' + t('preview');

        $('#exportBtn span').textContent = t('export');
        $('#exportPDFBtn').lastChild.textContent = ' ' + t('exportPdf');
        $('#exportHTMLBtn').lastChild.textContent = ' ' + t('exportHtml');
        $('#exportImageBtn').lastChild.textContent = ' ' + t('exportImage');
        $('#shareBtn').lastChild.textContent = ' ' + t('shareLink');
        $('#myLinksBtn').lastChild.textContent = ' ' + t('myLinks');

        // Templates
        document.querySelector('[data-template="blank"]').textContent = t('blankDoc');
        document.querySelector('[data-template="cv"]').textContent = t('cvResume');
        document.querySelector('[data-template="report"]').textContent = t('report');
        document.querySelector('[data-template="docs"]').textContent = t('docs');
        document.querySelector('[data-template="changelog"]').textContent = t('changelog');
        document.querySelector('[data-template="meeting"]').textContent = t('meeting');

        // Find & Replace
        $('#findInput').placeholder = t('find');
        $('#replaceInput').placeholder = t('replace');
        $('#replaceBtn').textContent = t('replaceBtn');
        $('#replaceAllBtn').textContent = t('replaceAll');

        // Footer
        $('.footer-brand').innerHTML = t('builtBy') + ' <a href="https://jsiapo.dev" target="_blank" rel="noopener">JSiapoDev</a>';

        // Editor & Preview
        editor.placeholder = t('editorPlaceholder');
        $('#customCSS').placeholder = t('customCssPlaceholder');
        $('#dropOverlay .drop-content p').innerHTML = t('dropHere');
        $('.export-modal p').textContent = t('generatingPdf');

        // Share modal
        $('#shareModalTitle').textContent = t('linkCreated');
        $('#apiModalTitle').textContent = t('apiPrompts');
        updateShareHint();
        $('#reportAbuseLink').textContent = t('reportAbuse');
        $('#termsLink').textContent = t('terms');
        $('#privacyLink').textContent = t('privacy');
        shareCopyBtn.textContent = t('copy');
        shareDeleteBtn.textContent = t('deleteLink');
        shareUpdateBtn.textContent = t('updateLink');

        // Fork (editable copy) modal
        $('#forkModalTitle').textContent = t('readOnlyTitle');
        $('#forkModalBody').textContent = t('readOnlyBody');
        $('#forkCancelBtn').textContent = t('cancelBtn');
        $('#forkConfirmBtn').textContent = t('createCopyBtn');
        const _lockBtn = $('#sharedLock');
        _lockBtn.title = t('sharedLockTip');
        _lockBtn.setAttribute('aria-label', t('sharedLockTip'));

        // API modal
        $('#apiPromptsBtn').title = t('apiPrompts');
        $('#apiPromptsBtn').setAttribute('aria-label', t('apiPrompts'));
        $('#apiPromptsBtnLabel').textContent = t('apiPrompts');

        // Tab labels
        $('#tabBtnSkill').textContent = t('tabSkill');
        $('#tabBtnApi').textContent = t('tabApi');

        // Rebuild Skill/API content
        buildSkillTab();
        buildApiTab();
    }

    function buildSkillTab() {
        var html = '<p class="api-desc">' + t('skillDesc') + '</p>';
        html += '<div class="api-section">';
        html += '<h4>SKILL.md</h4>';
        html += '<div class="api-code-block">';
        html += '<pre>' + escapeHtmlLight(SKILL_INSTALLABLE) + '</pre>';
        html += '<div class="api-code-actions">';
        html += '<button class="api-copy-btn" id="skillCopyBtn">' + t('copy') + '</button>';
        html += '<button class="api-copy-btn" id="skillDownloadBtn">' + t('download') + '</button>';
        html += '</div>';
        html += '</div>';
        html += '</div>';

        $('#tab-skill').innerHTML = html;

        // Bind copy
        $('#skillCopyBtn').addEventListener('click', function () {
            navigator.clipboard.writeText(SKILL_INSTALLABLE).then(function () {
                $('#skillCopyBtn').textContent = t('copied');
                setTimeout(function () { $('#skillCopyBtn').textContent = t('copy'); }, 2000);
            });
        });

        // Bind download
        $('#skillDownloadBtn').addEventListener('click', function () {
            var blob = new Blob([SKILL_INSTALLABLE], { type: 'text/markdown;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'SKILL.md';
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    function buildApiTab() {
        var html = '<p class="api-desc">' + t('apiDesc') + '</p>';

        var sections = [
            { title: t('apiCreate'), code: 'Path 1 — End-to-end encrypted (recommended for any non-public content)\n\n  1. Generate a 256-bit key and a 12-byte IV.\n  2. Encrypt markdown with AES-256-GCM.\n  3. Send base64(IV ‖ ciphertext ‖ tag) as the body.\n\nPOST https://md2pdf.studio/api/save\nContent-Type: text/plain\nX-Encrypted: aes-256-gcm\n\n<base64 ciphertext>\n\nResponse 200:\n{\n  "id": "BrOrr0N3",\n  "editKey": "a1b2c3...64chars",\n  "url": "https://md2pdf.studio/s/BrOrr0N3"\n}\n\nBuild the share link yourself: {url}#k={your base64url key}\nThe server never sees the key.\n\n---\n\nPath 2 — Server-side encryption (legacy, public content only)\n\nPOST https://md2pdf.studio/api/save\nContent-Type: text/plain\n\n# Your markdown here\n\nResponse 200:\n{\n  "id": "BrOrr0N3",\n  "editKey": "a1b2c3...64chars",\n  "url": "https://md2pdf.studio/s/BrOrr0N3",\n  "key": "xY9kL2m..."\n}\n\nShareable link: {url}#k={key}\nThe server sees the plaintext during this request.' },
            { title: t('apiUpdate'), code: 'Path 1 — Update an end-to-end encrypted document\n\nReuse the same key; generate a fresh IV. Do NOT send X-Enc-Key.\n\nPUT https://md2pdf.studio/api/update/{id}\nContent-Type: text/plain\nX-Edit-Key: {editKey}\nX-Encrypted: aes-256-gcm\n\n<base64 ciphertext>\n\nResponse 200:\n{ "id": "BrOrr0N3", "url": "https://md2pdf.studio/s/BrOrr0N3" }\n\n---\n\nPath 2 — Update a server-side encrypted document\n\nPUT https://md2pdf.studio/api/update/{id}\nContent-Type: text/plain\nX-Edit-Key: {editKey}\nX-Enc-Key: {key}\n\n# Updated markdown\n\nResponse 403: { "error": "Unauthorized" }\nResponse 404: { "error": "Document not found" }' },
            { title: t('apiCurl'), code: '# Path 1 — End-to-end encrypted (Python example)\npython3 <<\'PY\'\nimport os, json, base64, urllib.request\nfrom cryptography.hazmat.primitives.ciphers.aead import AESGCM\n\nmarkdown = "# Hello World\\n\\nThis is my first document."\n\nkey = AESGCM.generate_key(bit_length=256)\niv  = os.urandom(12)\nct  = AESGCM(key).encrypt(iv, markdown.encode(), None)\nbody = base64.b64encode(iv + ct).decode()\nkey_b64url = base64.urlsafe_b64encode(key).rstrip(b"=").decode()\n\nreq = urllib.request.Request(\n    "https://md2pdf.studio/api/save",\n    data=body.encode(),\n    headers={"Content-Type": "text/plain", "X-Encrypted": "aes-256-gcm"},\n    method="POST",\n)\ndata = json.loads(urllib.request.urlopen(req).read())\nprint(f"{data[\'url\']}#k={key_b64url}")\nPY\n\n# Path 2 — Plaintext (server sees content)\ncurl -X POST https://md2pdf.studio/api/save \\\n  -H "Content-Type: text/plain" \\\n  -d "# Public release notes"\n# Response includes "key"; share link is {url}#k={key}\n\n# Update (path 2)\ncurl -X PUT https://md2pdf.studio/api/update/BrOrr0N3 \\\n  -H "Content-Type: text/plain" \\\n  -H "X-Edit-Key: your-edit-key" \\\n  -H "X-Enc-Key: xY9kL2m..." \\\n  -d "# Updated content"' },
            { title: t('apiLimits'), code: 'Max document size: 500 KB of Markdown (UTF-8)\nRate limit: 10 writes/minute per IP (save, update, delete)\nExpiration: 30 days after creation (updates do not extend it)\nDelete: DELETE /api/delete/{id} with X-Edit-Key\nEncryption at rest: AES-256-GCM (every document)\nE2EE path: X-Encrypted: aes-256-gcm — server never sees key or plaintext\nResponse: 429 Too Many Requests' },
        ];

        sections.forEach(function (s) {
            html += '<div class="api-section"><h4>' + s.title + '</h4><div class="api-code-block"><pre>' + escapeHtmlLight(s.code) + '</pre><button class="api-copy-btn">' + t('copy') + '</button></div></div>';
        });

        $('#tab-api').innerHTML = html;
        bindCopyButtons('#tab-api');
    }

    function escapeHtmlLight(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    function bindCopyButtons(containerSel) {
        document.querySelectorAll(containerSel + ' .api-copy-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var pre = btn.parentElement.querySelector('pre');
                navigator.clipboard.writeText(pre.textContent).then(function () {
                    btn.textContent = t('copied');
                    setTimeout(function () { btn.textContent = t('copy'); }, 2000);
                });
            });
        });
    }

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
.md-toc { border: none; background: transparent; padding: 0; }
.md-toc a { font-family: 'Iowan Old Style', Georgia, serif; }
.code-block-wrapper { border: none; }
.code-block-header { background: transparent; border-bottom: 1px solid var(--border, #e5e7eb); }
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
.md-toc { border-radius: 2px; border-color: currentColor; }
.md-toc a { font-family: Cambria, Georgia, serif; }
.md-toc-title { text-transform: uppercase; letter-spacing: 0.1em; }
.code-block-wrapper { border-radius: 4px; }
.code-block-header { border-bottom-color: currentColor; }
.code-block-lang { font-family: Cambria, Georgia, serif; }
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
.md-toc { border-left: 4px solid #2563eb; border-radius: 0 8px 8px 0; }
[data-theme="dark"] .md-toc { border-left-color: #60a5fa; }
.md-toc-title { color: #2563eb; }
[data-theme="dark"] .md-toc-title { color: #60a5fa; }
.code-block-header { background: #2563eb0d; }
[data-theme="dark"] .code-block-header { background: #60a5fa0d; }
.code-block-lang { color: #2563eb; }
[data-theme="dark"] .code-block-lang { color: #60a5fa; }
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
.md-toc { border-radius: 8px; }
.md-toc a { color: var(--text-2); }
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
.md-toc { border: 1px solid #ccc; border-radius: 2px; background: transparent; }
[data-theme="dark"] .md-toc { border-color: #444; }
.md-toc a { font-family: 'Libre Baskerville', Georgia, serif; color: inherit; text-decoration: none; }
.md-toc a:hover { text-decoration: underline; }
.md-toc-title { font-family: 'Libre Baskerville', Georgia, serif; font-variant: small-caps; letter-spacing: 0.1em; }
.code-block-wrapper { border: 1px solid #ccc; border-radius: 2px; }
[data-theme="dark"] .code-block-wrapper { border-color: #444; }
.code-block-header { background: transparent; }
.code-block-lang { font-family: 'Inconsolata', monospace; }
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
.md-toc { background: #1e1f29; border-color: #44475a; }
.md-toc-title { color: #ff79c6; }
.md-toc a { color: #f8f8f2; }
.md-toc a:hover { color: #8be9fd; }
.code-block-wrapper { border-color: #44475a; }
.code-block-header { background: #1e1f29; border-bottom-color: #44475a; }
.code-block-lang { color: #bd93f9; }
.code-copy-btn { color: #6272a4; }
.code-copy-btn:hover { color: #f8f8f2; border-color: #44475a; background: #44475a; }
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
.md-toc { border: none; border-top: 1px solid currentColor; border-bottom: 1px solid currentColor; border-radius: 0; background: transparent; }
.md-toc a { font-family: 'Source Serif 4', Georgia, serif; }
.md-toc-title { font-family: 'Playfair Display', Georgia, serif; text-transform: uppercase; letter-spacing: 0.15em; font-size: 0.75em; }
.code-block-wrapper { border-radius: 0; border-color: #999; }
[data-theme="dark"] .code-block-wrapper { border-color: #555; }
.code-block-header { background: transparent; }
.code-block-lang { font-family: 'Source Serif 4', Georgia, serif; text-transform: none; font-style: italic; }
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
.md-toc { border: 2px dashed #bbb; border-radius: 0; background: transparent; }
[data-theme="dark"] .md-toc { border-color: #555; }
.md-toc a { font-family: 'Caveat', cursive; font-size: 1.1em; }
.md-toc-title { font-family: 'Caveat', cursive; font-size: 1em; }
.code-block-wrapper { border: 2px dashed #bbb; border-radius: 0; }
[data-theme="dark"] .code-block-wrapper { border-color: #555; }
.code-block-header { background: transparent; border-bottom: 2px dashed #bbb; }
[data-theme="dark"] .code-block-header { border-bottom-color: #555; }
.code-block-lang { font-family: 'Caveat', cursive; font-size: 1em; text-transform: none; }
.code-copy-btn { font-family: 'Caveat', cursive; font-size: 1em; }
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
.md-toc { background: #111; border: 1px solid #333; border-radius: 0; }
.md-toc-title { color: #00ff41; font-family: 'Fira Code', monospace; }
.md-toc-title::before { content: '> '; }
.md-toc a { color: #00ff41; font-family: 'Fira Code', monospace; font-size: 0.85em; }
.md-toc a:hover { color: #00bcd4; }
.code-block-wrapper { border: 1px solid #333; border-radius: 0; }
.code-block-header { background: #111; border-bottom-color: #333; }
.code-block-lang { color: #00ff41; font-family: 'Fira Code', monospace; }
.code-copy-btn { color: #00ff41; font-family: 'Fira Code', monospace; }
.code-copy-btn:hover { color: #00bcd4; background: #1a1a1a; border-color: #333; }
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
.md-toc { border: 2px solid #e8d4f0; border-radius: 16px; background: rgba(184,169,232,0.05); }
[data-theme="dark"] .md-toc { border-color: #3d2850; }
.md-toc-title { color: #e879a8; }
.md-toc a { color: #7c6dd8; font-family: 'Nunito', sans-serif; }
.md-toc a:hover { color: #e879a8; }
.code-block-wrapper { border: 2px solid #e8d4f0; border-radius: 16px; }
[data-theme="dark"] .code-block-wrapper { border-color: #3d2850; }
.code-block-header { background: rgba(184,169,232,0.05); border-bottom-color: #e8d4f0; }
[data-theme="dark"] .code-block-header { border-bottom-color: #3d2850; }
.code-block-lang { color: #7c6dd8; font-family: 'Nunito', sans-serif; }
.code-copy-btn { font-family: 'Nunito', sans-serif; }
.code-copy-btn:hover { color: #e879a8; }
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

> Free, open-source Markdown to PDF converter — runs in your browser, no signup required.

[TOC title="Table of Contents"]

---

## Features

| Feature | Description |
|---|---|
| **Live Preview** | See changes in real time as you type |
| **11 Visual Styles** | Notion, GitHub, LaTeX, Dracula, Terminal & more |
| **Mermaid Diagrams** | Flowcharts, sequences, Gantt charts, and more |
| **PDF / HTML / Image** | Export in any format with one click |
| **End-to-End Encryption** | Shared documents encrypted with AES-256-GCM |
| **AI Skill** | Installable skill for Claude, ChatGPT, Gemini |
| **Custom CSS** | Full control over the output styling |
| **Auto Table of Contents** | Write \`[TOC]\` or \`[TOC title="..."]\` to generate one |

---

## Code Highlighting

Syntax highlighting for **180+ languages** with copy button on every block.

\`\`\`typescript
interface Document {
  id: string;
  content: string;
  style: "notion" | "github" | "latex" | "dracula";
  encrypted: boolean;
}

async function createDocument(md: string): Promise<Document> {
  const res = await fetch("https://md2pdf.studio/api/save", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: md,
  });
  return res.json();
}
\`\`\`

\`\`\`python
from dataclasses import dataclass

@dataclass
class Style:
    name: str
    dark: bool
    font: str

styles = [
    Style("Notion", False, "system-ui"),
    Style("Dracula", True, "system-ui"),
    Style("Terminal", True, "Fira Code"),
    Style("LaTeX", False, "Libre Baskerville"),
]

for s in styles:
    print(f"{s.name}: {'dark' if s.dark else 'light'} theme")
\`\`\`

---

## Mermaid Diagrams

Write diagrams as code — they render automatically.

### Flowchart

\`\`\`mermaid
graph TD
    A[Write Markdown] --> B{Choose Style}
    B --> C[Notion]
    B --> D[GitHub]
    B --> E[LaTeX]
    B --> F[Dracula]
    C & D & E & F --> G[Export]
    G --> H[PDF]
    G --> I[HTML]
    G --> J[Image]
\`\`\`

### Sequence Diagram

\`\`\`mermaid
sequenceDiagram
    participant User
    participant Browser
    participant API
    participant KV

    User->>Browser: Write Markdown
    Browser->>API: POST /api/save
    API->>API: Encrypt (AES-256-GCM)
    API->>KV: Store ciphertext
    API-->>Browser: { url, key }
    Browser-->>User: Share link with #k=key
\`\`\`

---

## Blockquote & Formatting

> **Tip:** Write \`[TOC]\` for a clean list, or \`[TOC title="Table of Contents"]\` to add a heading.

Text formatting: **bold**, *italic*, ~~strikethrough~~, \`inline code\`, and [links](https://md2pdf.studio).

---

## Task List

- [x] Live preview with split/preview modes
- [x] 11 visual styles with custom CSS
- [x] Syntax highlighting for 180+ languages
- [x] Mermaid diagrams (flowchart, sequence, Gantt...)
- [x] Auto table of contents with \`[TOC]\` or \`[TOC title="..."]\`
- [x] End-to-end encrypted sharing
- [x] AI Skill for Claude, ChatGPT, Gemini
- [ ] Your next document starts here

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| \`Ctrl + S\` | Export to PDF |
| \`Ctrl + F\` | Find in editor |
| \`Ctrl + H\` | Find & replace |
| \`Ctrl + Shift + L\` | Toggle dark/light theme |

---

*Start writing on the left, or drag and drop a \`.md\` file.*
`;

    // ── Markdown setup ───────────────────────────────

    let _mermaidId = 0;

    function initMarked() {
        marked.setOptions({ breaks: true, gfm: true });

        // Custom renderer: add id anchors to headings for TOC links
        try {
            const renderer = new marked.Renderer();
            renderer.heading = function (token) {
                var text = typeof token === 'object' ? token.text : arguments[0];
                var depth = typeof token === 'object' ? token.depth : arguments[1];
                var raw = text.replace(/<[^>]+>/g, '');
                var slug = raw.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
                return '<h' + depth + ' id="' + slug + '">' + text + '</h' + depth + '>\n';
            };
            marked.use({ renderer: renderer });
        } catch (_) {}

        // Mermaid init (non-blocking — app works without it)
        try {
            if (typeof mermaid !== 'undefined') {
                mermaid.initialize({
                    startOnLoad: false,
                    theme: getTheme() === 'dark' ? 'dark' : 'default',
                    securityLevel: 'strict',
                });
            }
        } catch (_) {}
    }

    // ── Render ───────────────────────────────────────

    const TOC_PLACEHOLDER = '\u00ABTOC_PLACEHOLDER\u00BB';

    // Replace [TOC] / [TOC title="..."] lines with a placeholder paragraph before
    // marked parses the source. Blank lines around it keep it a paragraph of its
    // own even next to other text; lines inside fenced code are left alone.
    function markTOC(src) {
        let fence = null;   // { char, len } of the open code fence
        return src.split('\n').map(line => {
            const f = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
            if (f) {
                const char = f[1][0], len = f[1].length, rest = f[2];
                if (!fence) {
                    // A backtick fence's info string may not contain backticks.
                    if (char === '~' || !rest.includes('`')) fence = { char, len };
                } else if (char === fence.char && len >= fence.len && !rest.trim()) {
                    fence = null;
                }
                return line;
            }
            if (fence) return line;
            const m = line.match(/^\[toc(?:\s+title="([^"]*)")?\]\s*$/i);
            if (!m) return line;
            return '\n' + (m[1] ? TOC_PLACEHOLDER + ':' + m[1] : TOC_PLACEHOLDER) + '\n';
        }).join('\n');
    }

    // Markdown may carry raw HTML, and shared links render someone else's
    // document on this origin. Everything marked emits goes through DOMPurify.
    // No forms, frames, embeds or <style> (it would restyle the whole app);
    // <input> survives only as the disabled checkbox of a GFM task list.
    const PURIFY_CONFIG = {
        FORBID_TAGS: ['style', 'form', 'button', 'textarea', 'select', 'option', 'iframe', 'frame', 'frameset', 'object', 'embed', 'base', 'link', 'meta'],
        FORBID_ATTR: ['action', 'formaction'],
        RETURN_DOM_FRAGMENT: true,
    };

    let purifyHooksAdded = false;

    function addPurifyHooks() {
        if (purifyHooksAdded) return;
        purifyHooksAdded = true;
        // The app's own element ids, taken before any document is rendered.
        const appIds = new Set(Array.from(document.querySelectorAll('[id]'), el => el.id));
        DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
            if (data.attrName !== 'id') return;
            // A document must never shadow the app's elements (#preview, ...):
            // headings get a prefixed id so TOC links still work; others lose it.
            // (No forceKeepAttr here: it would keep the original value.)
            if (appIds.has(data.attrValue)) {
                if (/^H[1-6]$/.test(node.nodeName)) data.attrValue = 'h-' + data.attrValue;
                else data.keepAttr = false;
                return;
            }
            // SANITIZE_DOM drops ids named like document properties ("links",
            // "title"...), which breaks the TOC. Heading slugs can't clobber
            // document, so keep them.
            if (/^H[1-6]$/.test(node.nodeName) && /^[a-z0-9_-]+$/.test(data.attrValue)) data.forceKeepAttr = true;
        });
    }

    function sanitizeMarkdownHTML(html) {
        if (typeof DOMPurify === 'undefined') {
            // Never render unsanitized HTML: fall back to plain text.
            const pre = document.createElement('pre');
            pre.textContent = html;
            return pre;
        }
        addPurifyHooks();
        const frag = DOMPurify.sanitize(html, PURIFY_CONFIG);
        frag.querySelectorAll('input').forEach(el => {
            if ((el.getAttribute('type') || '').toLowerCase() !== 'checkbox') { el.remove(); return; }
            el.setAttribute('disabled', '');
            el.removeAttribute('name');
        });
        return frag;
    }

    function escapeHtmlFull(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function render() {
        const src = editor.value.trim();
        if (!src) {
            preview.innerHTML = '<div class="preview-empty"><p>Start typing to see the preview...</p></div>';
        } else {
            const processed = markTOC(src);
            preview.replaceChildren(sanitizeMarkdownHTML(marked.parse(processed)));
            injectTOC();
            preview.querySelectorAll('pre code').forEach(block => {
                if (block.classList.contains('language-mermaid')) return;
                hljs.highlightElement(block);
            });
            renderMermaidBlocks();
            addCodeCopyButtons();
        }
        updateCounter();
    }

    // Replaces each [TOC] paragraph with a list of the H2–H6 headings. Works on
    // DOM nodes only: re-parsing the preview's serialized HTML would turn markup
    // hidden in attribute values back into live elements.
    function injectTOC() {
        const placeholderRe = new RegExp('^' + TOC_PLACEHOLDER + '(?::([\\s\\S]*))?$');
        const paragraphs = Array.from(preview.querySelectorAll('p'))
            .filter(p => placeholderRe.test(p.textContent.trim()));
        if (!paragraphs.length) return;

        // H2–H6 only — H1 is the document title, not a section
        const headings = preview.querySelectorAll('h2, h3, h4, h5, h6');

        paragraphs.forEach(p => {
            if (!headings.length) { p.remove(); return; }
            const title = (p.textContent.trim().match(placeholderRe)[1] || '').trim();
            p.replaceWith(buildTOC(headings, title));
        });
    }

    function buildTOC(headings, title) {
        const nav = document.createElement('nav');
        nav.className = 'md-toc';
        if (title) {
            const heading = document.createElement('p');
            heading.className = 'md-toc-title';
            heading.textContent = title;
            nav.appendChild(heading);
        }
        const list = document.createElement('ul');
        headings.forEach(h => {
            const item = document.createElement('li');
            item.className = 'md-toc-h' + h.tagName[1];
            const link = document.createElement('a');
            link.href = '#' + h.id;
            link.textContent = h.textContent;
            // Scroll inside the preview container, not the page
            link.addEventListener('click', function (e) {
                e.preventDefault();
                previewContainer.scrollTo({ top: h.offsetTop - previewContainer.offsetTop, behavior: 'smooth' });
            });
            item.appendChild(link);
            list.appendChild(item);
        });
        nav.appendChild(list);
        return nav;
    }

    // Per-style mermaid theme variables
    const MERMAID_THEMES = {
        github:     { theme: 'default' },
        notion:     { theme: 'default', themeVariables: { primaryColor: '#e8e8e8', primaryTextColor: '#1f2328', lineColor: '#656d76', secondaryColor: '#f6f8fa' } },
        minimal:    { theme: 'default', themeVariables: { primaryColor: '#f0ece4', primaryTextColor: '#333', lineColor: '#999', secondaryColor: '#faf8f4', fontFamily: 'Georgia, serif' } },
        academic:   { theme: 'default', themeVariables: { primaryColor: '#e8e4dc', primaryTextColor: '#1a1a1a', lineColor: '#666', secondaryColor: '#f5f3ef', fontFamily: 'Cambria, Georgia, serif' } },
        corporate:  { theme: 'default', themeVariables: { primaryColor: '#dbeafe', primaryTextColor: '#1e3a5f', lineColor: '#2563eb', secondaryColor: '#eff6ff', tertiaryColor: '#f0f7ff' } },
        latex:      { theme: 'default', themeVariables: { primaryColor: '#e8e4d8', primaryTextColor: '#1a1a1a', lineColor: '#666', secondaryColor: '#f5f3ed', fontFamily: "'Libre Baskerville', Georgia, serif" } },
        dracula:    { theme: 'dark',    themeVariables: { primaryColor: '#44475a', primaryTextColor: '#f8f8f2', lineColor: '#6272a4', secondaryColor: '#3c3f58', tertiaryColor: '#282a36', primaryBorderColor: '#6272a4' } },
        newspaper:  { theme: 'default', themeVariables: { primaryColor: '#e8e4dc', primaryTextColor: '#1a1a1a', lineColor: '#555', secondaryColor: '#f5f3ef', fontFamily: "'Source Serif 4', Georgia, serif" } },
        handwritten:{ theme: 'default', themeVariables: { primaryColor: '#fce4ec', primaryTextColor: '#333', lineColor: '#e88', secondaryColor: '#fff5f5', fontFamily: "'Caveat', cursive" } },
        terminal:   { theme: 'dark',    themeVariables: { primaryColor: '#1a1a1a', primaryTextColor: '#00ff41', lineColor: '#00ff41', secondaryColor: '#111', tertiaryColor: '#0a0a0a', primaryBorderColor: '#333', fontFamily: "'Fira Code', monospace" } },
        pastel:     { theme: 'default', themeVariables: { primaryColor: '#f0d4f8', primaryTextColor: '#5a3878', lineColor: '#b8a9e8', secondaryColor: '#fce4ec', tertiaryColor: '#e0f4f0' } },
    };

    function renderMermaidBlocks() {
        if (typeof mermaid === 'undefined') return;
        const blocks = preview.querySelectorAll('pre code.language-mermaid');
        if (!blocks.length) return;

        var mermaidCfg = MERMAID_THEMES[currentStyle] || MERMAID_THEMES.github;
        var isDark = STYLES[currentStyle]?.dark || getTheme() === 'dark';
        mermaid.initialize({
            startOnLoad: false,
            theme: mermaidCfg.theme || (isDark ? 'dark' : 'default'),
            themeVariables: mermaidCfg.themeVariables || {},
            securityLevel: 'strict',
        });

        const isMermaidDark = mermaidCfg.theme === 'dark';

        blocks.forEach(code => {
            const pre = code.parentElement;
            // Skip if already inside a wrapper (re-render guard)
            if (pre.closest('.mermaid-block')) return;
            const diagram = code.textContent;
            const id = 'mermaid-' + (++_mermaidId);
            const container = document.createElement('div');
            container.className = 'mermaid-block ' + (isMermaidDark ? 'mermaid-block-dark' : 'mermaid-block-light');
            pre.parentNode.replaceChild(container, pre);
            mermaid.render(id, diagram).then(function (result) {
                container.innerHTML = result.svg;
            }).catch(function () {
                container.innerHTML = '<pre class="mermaid-error">Invalid Mermaid diagram</pre>';
            });
        });
    }

    function addCodeCopyButtons() {
        preview.querySelectorAll('pre').forEach(pre => {
            if (pre.querySelector('.code-copy-btn')) return;
            const wrapper = document.createElement('div');
            wrapper.className = 'code-block-wrapper';
            pre.parentNode.insertBefore(wrapper, pre);
            wrapper.appendChild(pre);

            const code = pre.querySelector('code');
            const lang = code ? (code.className.match(/language-(\S+)/) || [])[1] || '' : '';

            const header = document.createElement('div');
            header.className = 'code-block-header';
            header.innerHTML =
                '<span class="code-block-lang">' + escapeHtmlFull(lang) + '</span>' +
                '<button class="code-copy-btn" type="button" aria-label="' + t('copy') + '">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                        '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>' +
                        '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' +
                    '</svg>' +
                    '<span class="code-copy-label">' + t('copy') + '</span>' +
                '</button>';
            wrapper.insertBefore(header, pre);

            header.querySelector('.code-copy-btn').addEventListener('click', function () {
                const text = pre.textContent;
                navigator.clipboard.writeText(text).then(() => {
                    const label = this.querySelector('.code-copy-label');
                    const svg = this.querySelector('svg');
                    label.textContent = t('copied');
                    svg.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
                    this.classList.add('copied');
                    setTimeout(() => {
                        label.textContent = t('copy');
                        svg.innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>';
                        this.classList.remove('copied');
                    }, 2000);
                });
            });
        });
    }

    function scheduleRender() {
        clearTimeout(renderTimer);
        renderTimer = setTimeout(render, 100);
        scheduleSave();
    }

    // ── Counter ──────────────────────────────────────

    function updateCounter() {
        const text = editor.value.trim();
        if (!text) { counterEl.textContent = `0 ${t('words')}`; return; }
        const words = text.split(/\s+/).filter(Boolean).length;
        const mins  = Math.max(1, Math.ceil(words / 200));
        counterEl.textContent = `${words} ${t('words')} · ~${mins} ${t('minRead')}`;
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

        // Update mermaid theme
        try {
            if (typeof mermaid !== 'undefined') {
                const forceDarkMermaid = forceDark || t === 'dark';
                mermaid.initialize({ startOnLoad: false, theme: forceDarkMermaid ? 'dark' : 'default', securityLevel: 'strict' });
            }
        } catch (_) {}

        // Force repaint on editor and preview to pick up new CSS variables
        const bg = forceDark ? STYLES[currentStyle].bg : (t === 'dark' ? '#0d1117' : '#ffffff');
        editor.style.background = bg;
        previewContainer.style.background = bg;
        requestAnimationFrame(() => {
            editor.style.background = '';
            previewContainer.style.background = '';
        });

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

    function applyCustomCSS(showFeedback) {
        // Boost specificity: wrap user CSS so it always wins over style overrides
        var raw = customCSSInput.value;
        customOverride.textContent = raw ? ('\n/* Custom CSS */\n' + raw + '\n') : '';
        localStorage.setItem('md2pdf-custom-css', raw);
        if (showFeedback) showToast(currentLang === 'es' ? 'CSS aplicado' : 'CSS applied');
    }

    // ── Templates ────────────────────────────────────

    function loadTemplate(key) {
        const tpl = TEMPLATES[key];
        if (tpl === undefined) return;
        editor.value = tpl;
        startNewDoc();
        currentFileName = key === 'blank' ? 'untitled.md' : `${key}.md`;
        fileNameEl.value = currentFileName;
        render();
        saveDraft();
        showToast(key === 'blank' ? t('newDocument') : t('templateLoaded'));
    }

    // ── File handling ────────────────────────────────

    function loadFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            editor.value = e.target.result;
            startNewDoc();
            currentFileName = file.name;
            fileNameEl.value = file.name;
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
    // The draft is one record { id, text, name }, so its text and its draft id
    // (which share links are keyed by) are always written and read together,
    // even with several tabs open.

    const DRAFT_KEY = 'md2pdf-draft-v2';
    let draftTooLargeShown = false;

    function saveDraft() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            // A shared document belongs to its author, not to this browser's draft.
            if (isSharedView) return;
            if (!currentDocId) startNewDoc();
            const record = JSON.stringify({ id: currentDocId, text: editor.value, name: currentFileName });
            try {
                writeDraftRecord(record);
                draftTooLargeShown = false;
            } catch (_) {
                if (!draftTooLargeShown) showToast(t('draftTooLarge'));
                draftTooLargeShown = true;
            }
        }, 800);
    }

    // Writes the draft record and then drops the pre-record keys. If the write
    // doesn't fit, it retries without the old copy, and puts that copy back if
    // it still doesn't fit: the stored draft is never lost to a failed write.
    const LEGACY_DRAFT_KEYS = ['md2pdf-draft', 'md2pdf-filename', 'md2pdf-doc-id'];

    function writeDraftRecord(record) {
        try {
            localStorage.setItem(DRAFT_KEY, record);
        } catch (err) {
            const old = LEGACY_DRAFT_KEYS.map(k => [k, localStorage.getItem(k)]);
            if (old.every(([, v]) => v === null)) throw err;
            LEGACY_DRAFT_KEYS.forEach(k => localStorage.removeItem(k));
            try {
                localStorage.setItem(DRAFT_KEY, record);
            } catch (retryErr) {
                old.forEach(([k, v]) => { if (v !== null) localStorage.setItem(k, v); });
                throw retryErr;
            }
        }
        LEGACY_DRAFT_KEYS.forEach(k => localStorage.removeItem(k));
    }

    // Called on every keystroke; saveDraft() debounces.
    function scheduleSave() {
        saveDraft();
    }

    // Each draft has its own id. Share links are tracked per draft, never per
    // file name, so a new "untitled.md" can't overwrite an earlier link.
    function startNewDoc() {
        currentDocId = crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    }

    function restoreDraft() {
        let draft = null;
        try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (_) {}
        if (!draft) {
            // Saved before draft records existed: text and name only. Its links
            // stay listed under "your other links" rather than being guessed.
            const text = localStorage.getItem('md2pdf-draft');
            if (text) draft = { id: null, text, name: localStorage.getItem('md2pdf-filename') };
        }
        if (!draft || !draft.text) return false;
        editor.value = draft.text;
        currentDocId = draft.id || null;
        if (!currentDocId) { startNewDoc(); saveDraft(); }
        currentFileName = draft.name || 'untitled.md';
        fileNameEl.value = currentFileName;
        showToast(t('draftRestored'));
        return true;
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
.code-block-header { display: none; }
.code-block-wrapper { border: none; overflow: visible; margin: 16px 0; }
.code-block-wrapper pre { border-radius: 6px !important; }
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
<html lang="en">
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
.code-block-wrapper {
  position: relative; margin: 16px 0; border-radius: 8px;
  overflow: hidden; border: 1px solid ${dark ? '#30363d' : '#d1d9e0'};
  background: ${dark ? '#161b22' : '#f6f8fa'};
}
.code-block-wrapper pre { margin: 0 !important; border: none !important; border-radius: 0 !important; }
.code-block-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 4px 6px 4px 14px; min-height: 32px;
  background: ${dark ? '#0d1117' : '#f0f3f6'};
  border-bottom: 1px solid ${dark ? '#30363d' : '#d1d9e0'};
}
.code-block-lang {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 11px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.5px; color: ${dark ? '#7d8590' : '#656d76'};
}
.code-copy-btn {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 11px; font-weight: 500; cursor: pointer;
  color: ${dark ? '#7d8590' : '#656d76'};
  background: transparent; border: 1px solid transparent;
  border-radius: 6px; padding: 4px 10px;
}
.code-copy-btn:hover {
  color: ${dark ? '#e6edf3' : '#1f2328'};
  background: ${dark ? '#161b22' : '#fff'};
  border-color: ${dark ? '#30363d' : '#d1d9e0'};
}
.code-copy-btn.copied { color: #22c55e; }
</style>
</head>
<body>
<article class="markdown-body">${content}</article>
<script>
document.querySelectorAll('.code-copy-btn').forEach(function(btn){
  btn.addEventListener('click',function(){
    var pre=btn.closest('.code-block-wrapper').querySelector('pre');
    navigator.clipboard.writeText(pre.textContent).then(function(){
      var label=btn.querySelector('.code-copy-label');
      var svg=btn.querySelector('svg');
      label.textContent='Copied!';
      svg.innerHTML='<polyline points="20 6 9 17 4 12"/>';
      btn.classList.add('copied');
      setTimeout(function(){
        label.textContent='Copy';
        svg.innerHTML='<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>';
        btn.classList.remove('copied');
      },2000);
    });
  });
});
</script>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = title + '.html';
        a.click();
        URL.revokeObjectURL(url);
        showToast(t('htmlDownloaded'));
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
            // Hide copy headers for clean screenshot
            preview.querySelectorAll('.code-block-header').forEach(h => h.style.display = 'none');
            const canvas = await html2canvas(preview, {
                scale: 2,
                useCORS: true,
                backgroundColor: style.bg,
                logging: false,
            });
            preview.querySelectorAll('.code-block-header').forEach(h => h.style.display = '');

            const link = document.createElement('a');
            link.download = currentFileName.replace(/\.(md|markdown|txt|mdx)$/i, '') + '.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            showToast(t('imgDownloaded'));
        } catch (err) {
            console.error('Image export failed', err);
            alert('Image export failed.');
        } finally {
            exportOverlay.classList.remove('active');
        }
    }

    // ── Share by URL ─────────────────────────────────

    const shareOverlay   = $('#shareOverlay');
    const shareUrlInput  = $('#shareUrlInput');
    const shareCopyBtn   = $('#shareCopyBtn');
    const shareCloseBtn  = $('#shareCloseBtn');
    const shareDeleteBtn = $('#shareDeleteBtn');
    const shareUpdateBtn = $('#shareUpdateBtn');
    const shareLinksEl   = $('#shareLinks');
    const shareLinksList = $('#shareLinksList');

    // Draft whose link the open share modal shows; null when viewing someone
    // else's document (this browser has no edit key for it).
    let shareModalDocId = null;

    function formatDate(iso) {
        return new Date(iso).toLocaleDateString(currentLang, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function updateShareHint() {
        const entry = shareModalDocId && getShareMap()[shareModalDocId];
        $('#shareHint').textContent = entry && entry.expiresAt
            ? t('linkExpires').replace('{date}', formatDate(entry.expiresAt))
            : t('linkHint');
    }

    function disarm(btn, label) {
        if (btn.dataset.armed) clearTimeout(Number(btn.dataset.armed));
        delete btn.dataset.armed;
        btn.classList.remove('confirm');
        btn.textContent = label;
    }

    // Two clicks to delete: the first arms the button for 3 seconds.
    function confirmTwice(btn, label, action) {
        if (btn.dataset.armed) { disarm(btn, label); action(); return; }
        btn.classList.add('confirm');
        btn.textContent = t('deleteConfirm');
        btn.dataset.armed = String(setTimeout(() => disarm(btn, label), 3000));
    }

    // Deletes a link this browser created. Resolves true once it is gone.
    async function deleteLink(docId) {
        const shares = getShareMap();
        const entry = shares[docId];
        if (!entry) return true;
        try {
            const res = await fetch('/api/delete/' + entry.id, {
                method: 'DELETE',
                headers: { 'X-Edit-Key': entry.editKey },
            });
            // 404 means it already expired: forget it locally too.
            if (res.ok || res.status === 404) {
                delete shares[docId];
                saveShareMap(shares);
                showToast(t('linkDeleted'));
                return true;
            }
        } catch (_) {}
        showToast(t('deleteFailed'));
        return false;
    }

    function onDeleteClick() {
        const docId = shareModalDocId;
        if (!docId) return;
        confirmTwice(shareDeleteBtn, t('deleteLink'), async () => {
            if (await deleteLink(docId)) closeShareModal();
        });
    }

    // Every link this browser created, so each one can be deleted, not only
    // the one for the current draft. listOnly: opened from "My links".
    function renderShareLinks(listOnly) {
        const shares = getShareMap();
        const now = Date.now();
        let pruned = false;
        shareLinksList.replaceChildren();
        Object.keys(shares).forEach(docId => {
            const entry = shares[docId];
            // Expired links are already gone from the server.
            if (!entry || typeof entry.id !== 'string' || (entry.expiresAt && Date.parse(entry.expiresAt) <= now)) {
                delete shares[docId];
                pruned = true;
                return;
            }
            if (!listOnly && docId === shareModalDocId) return;

            const item = document.createElement('li');
            const name = document.createElement('span');
            name.className = 'share-link-name';
            // Links saved before per-draft ids were keyed by file name.
            name.textContent = entry.name || docId;
            const when = document.createElement('span');
            when.className = 'share-link-meta';
            // The link id tells apart drafts that share a file name.
            when.textContent = '/s/' + entry.id + (entry.expiresAt ? ' · ' + t('expiresShort').replace('{date}', formatDate(entry.expiresAt)) : '');
            item.append(name, when);

            if (typeof entry.encKey === 'string') {
                const copy = document.createElement('button');
                copy.type = 'button';
                copy.className = 'btn btn-ghost btn-sm';
                copy.textContent = t('copy');
                copy.addEventListener('click', () => {
                    navigator.clipboard.writeText(shareUrlOf(entry)).then(() => {
                        copy.textContent = t('copied');
                        setTimeout(() => { copy.textContent = t('copy'); }, 2000);
                    }).catch(() => {});
                });
                item.append(copy);
            }

            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'btn btn-ghost btn-sm share-delete-btn';
            del.textContent = t('deleteLink');
            del.addEventListener('click', () => confirmTwice(del, t('deleteLink'), async () => {
                if (await deleteLink(docId)) {
                    renderShareLinks(listOnly);
                    if (listOnly && !shareLinksList.children.length) $('#shareHint').textContent = t('noLinks');
                }
            }));
            item.append(del);
            shareLinksList.append(item);
        });
        if (pruned) saveShareMap(shares);
        shareLinksEl.hidden = !shareLinksList.children.length;
        $('#shareLinksTitle').textContent = t(listOnly ? 'allLinks' : 'yourLinks').replace('{n}', shareLinksList.children.length);
    }

    // Opens the dialog with only the list of links, so any of them can be
    // deleted without sharing the open draft first.
    function showMyLinks() {
        shareModalDocId = null;
        $('#shareModalTitle').textContent = t('myLinks');
        $('#shareUrlRow').hidden = true;
        shareDeleteBtn.hidden = true;
        shareUpdateBtn.hidden = true;
        renderShareLinks(true);
        $('#shareHint').textContent = shareLinksList.children.length ? '' : t('noLinks');
        shareLinksEl.open = true;
        shareOverlay.classList.add('active');
    }

    async function showShareModal(url, docId, fresh) {
        shareModalDocId = docId || null;
        $('#shareModalTitle').textContent = fresh ? t('linkCreated') : t('shareLinkTitle');
        $('#shareUrlRow').hidden = false;
        shareUrlInput.value = url;
        disarm(shareDeleteBtn, t('deleteLink'));
        shareDeleteBtn.hidden = !shareModalDocId;
        shareUpdateBtn.hidden = true;
        updateShareHint();
        renderShareLinks();
        shareOverlay.classList.add('active');
        shareUrlInput.focus();
        shareUrlInput.select();
        // Offer an update only when the draft changed since it was shared.
        const entry = shareModalDocId && getShareMap()[shareModalDocId];
        if (entry && entry.hash !== await contentHash(editor.value)) shareUpdateBtn.hidden = false;
    }

    function closeShareModal() {
        shareOverlay.classList.remove('active');
    }

    function copyShareUrl() {
        const done = () => {
            shareCopyBtn.textContent = t('copied');
            setTimeout(() => { shareCopyBtn.textContent = t('copy'); }, 2000);
        };
        navigator.clipboard.writeText(shareUrlInput.value).then(done).catch(() => {
            shareUrlInput.select();
            document.execCommand('copy');
            done();
        });
    }

    // Share state: draft id → { id, editKey, encKey, expiresAt, hash, name }.
    // Entries saved before draft ids existed are keyed by file name.
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

    // ── E2EE (AES-256-GCM) ──────────────────────────

    // Spreading a large Uint8Array into String.fromCharCode overflows the call
    // stack on big documents, so encode in chunks.
    function bytesToBase64(bytes) {
        let binary = '';
        for (let i = 0; i < bytes.length; i += 0x8000) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        }
        return btoa(binary);
    }

    async function e2eeGenerateKey() {
        const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
        const raw = await crypto.subtle.exportKey('raw', key);
        // base64url encoding (no padding)
        const b64 = bytesToBase64(new Uint8Array(raw))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        return { key, b64 };
    }

    function e2eeDecodeB64(b64) {
        const str = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
        const raw = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) raw[i] = str.charCodeAt(i);
        return raw;
    }

    async function e2eeImportKey(b64) {
        return crypto.subtle.importKey('raw', e2eeDecodeB64(b64), { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    }

    async function e2eeImportKeyFull(b64) {
        return crypto.subtle.importKey('raw', e2eeDecodeB64(b64), { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    }

    async function e2eeEncrypt(plaintext, cryptoKey) {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(plaintext);
        const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, encoded);
        // Prepend IV (12 bytes) to ciphertext, then base64
        const combined = new Uint8Array(iv.length + ciphertext.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(ciphertext), iv.length);
        return bytesToBase64(combined);
    }

    async function e2eeDecrypt(encoded, cryptoKey) {
        const binary = atob(encoded);
        const combined = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) combined[i] = binary.charCodeAt(i);
        const iv = combined.slice(0, 12);
        const ciphertext = combined.slice(12);
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertext);
        return new TextDecoder().decode(decrypted);
    }

    // For AI agents: they expect the link to hold the current text, so an
    // existing link with older content is updated before it is returned.
    async function shareForAgent() {
        let url = await shareByURL();
        const entry = url && !isSharedView ? getShareMap()[currentDocId] : null;
        if (entry && entry.hash !== await contentHash(editor.value)) url = await updateShare();
        return url;
    }

    function isUsableShare(entry) {
        return !!entry && typeof entry.id === 'string' && typeof entry.editKey === 'string' &&
            typeof entry.encKey === 'string' && (!entry.expiresAt || Date.parse(entry.expiresAt) > Date.now());
    }

    function shareUrlOf(entry) {
        return location.origin + '/s/' + entry.id + '#k=' + entry.encKey;
    }

    function shareErrorToast(status) {
        showToast(status === 413 ? t('docTooLarge') : status === 429 ? t('tooManyShares') : t('shareFailed'));
    }

    // Opens the share dialog for the current draft and returns its link, or
    // null if sharing failed. A draft that was already shared shows its
    // existing link: nothing is uploaded until the user picks "Update link".
    async function shareByURL() {
        const text = editor.value;
        if (!text.trim()) { showToast(t('nothingToShare')); return null; }

        // Viewing someone else's share: surface the current URL. The viewer
        // has no edit key, so there is nothing to create or update.
        if (isSharedView) {
            showShareModal(location.href, null, false);
            return location.href;
        }

        const entry = getShareMap()[currentDocId];
        if (isUsableShare(entry)) {
            const url = shareUrlOf(entry);
            showShareModal(url, currentDocId, false);
            return url;
        }
        return createShare(text);
    }

    // Encrypts the draft in the browser and uploads only ciphertext. The key
    // stays local and goes in the link's #k= fragment.
    async function createShare(text) {
        exportOverlay.classList.add('active');
        try {
            const { key: cryptoKey, b64: encKey } = await e2eeGenerateKey();
            const ciphertext = await e2eeEncrypt(text, cryptoKey);
            const res = await fetch('/api/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain',
                    'X-Encrypted': 'aes-256-gcm',
                },
                body: ciphertext,
            });
            if (!res.ok) { shareErrorToast(res.status); return null; }

            const data = await res.json();
            const shares = getShareMap();
            shares[currentDocId] = {
                id: data.id, editKey: data.editKey, encKey, expiresAt: data.expiresAt,
                hash: await contentHash(text), name: currentFileName,
            };
            saveShareMap(shares);
            saveDraft();   // persist the draft id this link is keyed to
            const url = shareUrlOf(shares[currentDocId]);
            exportOverlay.classList.remove('active');
            showShareModal(url, currentDocId, true);
            return url;
        } catch (_) {
            showToast(t('shareFailed'));
            return null;
        } finally {
            exportOverlay.classList.remove('active');
        }
    }

    // Replaces the content behind the open link with the current draft.
    // Returns the link, or null on failure.
    async function updateShare() {
        const docId = shareModalDocId;
        const shares = getShareMap();
        const entry = shares[docId];
        if (!docId || docId !== currentDocId || !isUsableShare(entry)) return null;

        const text = editor.value;
        exportOverlay.classList.add('active');
        try {
            const cryptoKey = await e2eeImportKeyFull(entry.encKey);
            const ciphertext = await e2eeEncrypt(text, cryptoKey);
            const res = await fetch('/api/update/' + entry.id, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'text/plain',
                    'X-Edit-Key': entry.editKey,
                    'X-Encrypted': 'aes-256-gcm',
                },
                body: ciphertext,
            });
            if (res.status === 404) {
                // Expired or deleted elsewhere: start a new link instead.
                delete shares[docId];
                saveShareMap(shares);
                exportOverlay.classList.remove('active');
                showToast(t('linkExpiredNew'));
                return await createShare(text);
            }
            if (!res.ok) { shareErrorToast(res.status); return null; }

            const data = await res.json();
            entry.expiresAt = data.expiresAt || entry.expiresAt;
            entry.hash = await contentHash(text);
            saveShareMap(shares);
            shareUpdateBtn.hidden = true;
            updateShareHint();
            showToast(t('linkUpdated'));
            return shareUrlOf(entry);
        } catch (_) {
            showToast(t('shareFailed'));
            return null;
        } finally {
            exportOverlay.classList.remove('active');
        }
    }

    function loadSharedContent(content) {
        editor.value = content;
        currentDocId = null;   // not this browser's draft; forking starts a new one
        currentFileName = 'shared.md';
        fileNameEl.value = currentFileName;
        showToast(t('sharedDocLoaded'));

        // Mark as shared so the editor stays locked until the user forks a copy.
        // URL is left intact so F5 re-fetches the latest version from the creator.
        isSharedView = true;
        workspace.classList.add('preview-only', 'shared-locked');
        viewToggle.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        const previewBtn = viewToggle.querySelector('[data-view="preview"]');
        if (previewBtn) previewBtn.classList.add('active');
        const lockBtn = document.getElementById('sharedLock');
        if (lockBtn) { lockBtn.hidden = false; lockBtn.title = t('sharedLockTip'); }

        // Shared docs are encrypted, so moderation depends on readers reporting them.
        const report = document.getElementById('reportAbuseLink');
        if (report) {
            report.href = 'mailto:jsiapo.dev@gmail.com?subject=' + encodeURIComponent('Abuse report: ' + location.pathname) +
                '&body=' + encodeURIComponent('Link: ' + location.href + '\n\nWhat is wrong with it:\n');
            report.hidden = false;
        }
    }

    function openForkModal() {
        const overlay = document.getElementById('forkOverlay');
        if (!overlay) return;
        overlay.classList.add('active');
    }

    function closeForkModal() {
        const overlay = document.getElementById('forkOverlay');
        if (!overlay) return;
        overlay.classList.remove('active');
    }

    // Turn the read-only shared view back into the normal editor.
    function leaveSharedView() {
        isSharedView = false;
        workspace.classList.remove('preview-only', 'shared-locked');
        const lockBtn = document.getElementById('sharedLock');
        if (lockBtn) lockBtn.hidden = true;
        const report = document.getElementById('reportAbuseLink');
        if (report) report.hidden = true;
        // Drop the /s/:id URL so F5 no longer re-fetches the original over local edits.
        history.replaceState(null, '', '/');
        // Switch toolbar back to split view.
        viewToggle.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        const splitBtn = viewToggle.querySelector('[data-view="split"]');
        if (splitBtn) splitBtn.classList.add('active');
    }

    function forkToLocalCopy() {
        // Turn a shared read-only doc into a local editable copy.
        leaveSharedView();
        startNewDoc();
        currentFileName = 'copy-of-shared.md';
        fileNameEl.value = currentFileName;
        // Persist so F5 restores the copy instead of the sample.
        saveDraft();
        closeForkModal();
        showToast(t('copyCreated'));
        editor.focus();
    }

    async function loadFromURL() {
        // Try embedded content (injected by Worker for /s/:id and /share?doc=)
        const sharedEl = document.getElementById('shared-content');
        if (sharedEl) {
            try {
                const raw = JSON.parse(sharedEl.textContent);
                if (raw) {
                    // Check if content is encrypted (has #k= in URL hash)
                    const hash = location.hash;
                    const keyMatch = hash.match(/[#&]k=([A-Za-z0-9_-]+)/);
                    if (keyMatch) {
                        try {
                            const cryptoKey = await e2eeImportKey(keyMatch[1]);
                            const content = await e2eeDecrypt(raw, cryptoKey);
                            loadSharedContent(content);
                        } catch (decErr) {
                            // Fall back to the user's own draft; an empty, editable
                            // editor here would autosave over it. init() reports the
                            // failure last, so "Draft restored" doesn't hide it.
                            linkDecryptFailed = true;
                            history.replaceState(null, '', '/');
                            return false;
                        }
                    } else if (location.pathname.startsWith('/s/')) {
                        // Every /s/ document is encrypted: without #k= there is
                        // nothing readable. Same fallback as a failed decrypt.
                        linkKeyMissing = true;
                        history.replaceState(null, '', '/');
                        return false;
                    } else {
                        // Unencrypted legacy /share?doc= document
                        loadSharedContent(raw);
                    }
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
                if (content) { loadSharedContent(content); return true; }
            } catch (_) {}
        }

        // Backward compat: try #doc= (hash)
        const hashStr = location.hash;
        if (hashStr.startsWith('#doc=')) {
            const compressed = hashStr.slice(5);
            try {
                const content = LZString.decompressFromEncodedURIComponent(compressed);
                if (content) { loadSharedContent(content); return true; }
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

        // Language toggle
        langToggle.addEventListener('click', () => {
            applyLanguage(currentLang === 'en' ? 'es' : 'en');
        });

        // Export
        exportPDFBtn.addEventListener('click',  () => { exportDropdown.classList.remove('open'); exportPDF(); });
        exportHTMLBtn.addEventListener('click', () => { exportDropdown.classList.remove('open'); exportHTML(); });
        exportImageBtn.addEventListener('click', () => { exportDropdown.classList.remove('open'); exportImage(); });
        shareBtn.addEventListener('click', () => { exportDropdown.classList.remove('open'); shareByURL(); });
        $('#myLinksBtn').addEventListener('click', () => { exportDropdown.classList.remove('open'); showMyLinks(); });

        // Share modal
        shareCopyBtn.addEventListener('click', copyShareUrl);
        shareCloseBtn.addEventListener('click', closeShareModal);
        shareDeleteBtn.addEventListener('click', onDeleteClick);
        shareUpdateBtn.addEventListener('click', updateShare);
        shareOverlay.addEventListener('click', (e) => { if (e.target === shareOverlay) closeShareModal(); });

        // Fork (read-only → editable copy) modal
        const forkOverlay    = $('#forkOverlay');
        const forkCloseBtn   = $('#forkCloseBtn');
        const forkCancelBtn  = $('#forkCancelBtn');
        const forkConfirmBtn = $('#forkConfirmBtn');
        const sharedLockBtn  = $('#sharedLock');
        sharedLockBtn.addEventListener('click', openForkModal);
        forkCloseBtn.addEventListener('click', closeForkModal);
        forkCancelBtn.addEventListener('click', closeForkModal);
        forkConfirmBtn.addEventListener('click', forkToLocalCopy);
        forkOverlay.addEventListener('click', (e) => { if (e.target === forkOverlay) closeForkModal(); });

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

        // Copy buttons are bound dynamically in buildPromptsTab/buildApiTab

        // Editable file name
        fileNameEl.addEventListener('change', () => {
            const val = fileNameEl.value.trim();
            if (val) {
                currentFileName = val.endsWith('.md') ? val : val + '.md';
            } else {
                currentFileName = 'untitled.md';
            }
            fileNameEl.value = currentFileName;
            saveDraft();
        });
        fileNameEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); fileNameEl.blur(); }
            if (e.key === 'Escape') { fileNameEl.value = currentFileName; fileNameEl.blur(); }
        });
        fileNameEl.addEventListener('focus', () => {
            const name = fileNameEl.value.replace(/\.(md|markdown|txt|mdx)$/i, '');
            fileNameEl.value = name;
            fileNameEl.select();
        });
        fileNameEl.addEventListener('blur', () => {
            const val = fileNameEl.value.trim();
            if (val) {
                currentFileName = val.endsWith('.md') ? val : val + '.md';
            } else {
                currentFileName = 'untitled.md';
            }
            fileNameEl.value = currentFileName;
            saveDraft();
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
            // If this is a shared (locked) doc and the user wants to see the editor,
            // ask whether to fork a local editable copy first.
            if (isSharedView && mode !== 'preview') {
                openForkModal();
                return;
            }
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
        customCSSInput.addEventListener('input', () => applyCustomCSS(false));
        $('#applyCSSBtn').addEventListener('click', () => applyCustomCSS(true));

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
                if (md) { if (isSharedView) leaveSharedView(); editor.value = md; startNewDoc(); currentFileName = 'agent.md'; fileNameEl.value = currentFileName; }
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
                shareForAgent();
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
                    if (markdown) { if (isSharedView) leaveSharedView(); editor.value = markdown; startNewDoc(); currentFileName = 'agent.md'; fileNameEl.value = currentFileName; }
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
                description: 'Create a share link for the current document. It is encrypted in the browser, uploaded to md2pdf.studio and kept for 30 days; the key stays in the link (#k=). Returns the link.',
                params: {},
                execute: async () => {
                    const url = await shareForAgent();
                    return url ? { success: true, url } : { success: false, message: 'Sharing failed' };
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

    // ── GitHub Stars ─────────────────────────────────

    function fetchGitHubStars() {
        fetch('https://api.github.com/repos/JSiapoDEV/md2pdf')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.stargazers_count !== undefined) {
                    var count = data.stargazers_count;
                    var label = count >= 1000 ? (count / 1000).toFixed(1) + 'k' : count;
                    var el = $('#starText');
                    if (el) el.textContent = label + ' \u2605';
                }
            })
            .catch(function () {});
    }

    // ── Boot ─────────────────────────────────────────

    async function init() {
        initMarked();
        applyTheme(getTheme());

        // Restore language (default: detect from browser)
        const savedLang = localStorage.getItem('md2pdf-lang') || (navigator.language.startsWith('es') ? 'es' : 'en');
        applyLanguage(savedLang);

        // Restore saved style (default: notion) — ?style= query param overrides
        const urlParams = new URLSearchParams(location.search);
        const urlStyle = urlParams.get('style');
        const savedStyle = (urlStyle && STYLES[urlStyle]) ? urlStyle : (localStorage.getItem('md2pdf-style') || 'notion');
        applyStyle(savedStyle);

        // ?template= query param — maps SEO-friendly slugs to internal keys
        const urlTemplate = urlParams.get('template');
        const TEMPLATE_SLUG_MAP = { 'documentation': 'docs', 'meeting-notes': 'meeting' };
        const resolvedTemplate = urlTemplate && (TEMPLATE_SLUG_MAP[urlTemplate] || urlTemplate);
        const hasValidTemplate = resolvedTemplate && TEMPLATES[resolvedTemplate] !== undefined;

        // Restore custom CSS
        const savedCSS = localStorage.getItem('md2pdf-custom-css');
        if (savedCSS) { customCSSInput.value = savedCSS; applyCustomCSS(); }

        // Check for shared URL first, then ?template=, then draft, then sample
        let loaded = false;
        try { loaded = await loadFromURL(); } catch (_) {}
        if (!loaded && hasValidTemplate) {
            loadTemplate(resolvedTemplate);
            loaded = true;
            // Load the template once: a reload must restore the user's draft,
            // not wipe it with the blank template again.
            urlParams.delete('template');
            const qs = urlParams.toString();
            history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
        }
        if (!loaded) {
            if (!restoreDraft()) {
                editor.value = SAMPLE;
                startNewDoc();
            }
        }
        if (linkDecryptFailed) showToast(t('decryptFailed'));
        if (linkKeyMissing) showToast(t('keyMissing'));

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
        fetchGitHubStars();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

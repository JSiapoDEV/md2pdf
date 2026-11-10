// Terms and Privacy in English or Spanish. The language comes from #es / #en
// in the address, else the one chosen in the editor, else the browser's.
// English is what the page serves; the Spanish text comes from a template, so
// search engines do not see a second copy of the page.
(function () {
    function chosen() {
        if (location.hash === '#es' || location.hash === '#en') return location.hash.slice(1);
        try {
            var saved = localStorage.getItem('md2pdf-lang');
            if (saved === 'es' || saved === 'en') return saved;
        } catch (e) { /* storage blocked: use the browser's language */ }
        return (navigator.language || '').slice(0, 2) === 'es' ? 'es' : 'en';
    }

    function apply() {
        var lang = chosen();
        var en = document.getElementById('docEn');
        var es = document.getElementById('docEsBody');
        if (lang === 'es' && !es) {
            es = document.getElementById('docEs').content.firstElementChild.cloneNode(true);
            es.id = 'docEsBody';
            en.parentNode.insertBefore(es, en.nextSibling);
        }
        en.hidden = lang === 'es';
        if (es) es.hidden = lang !== 'es';
        document.documentElement.lang = lang;
        document.title = document.body.getAttribute('data-title-' + lang) || document.title;
        var links = document.querySelectorAll('.lang-switch a');
        for (var i = 0; i < links.length; i++) {
            if (links[i].getAttribute('hreflang') === lang) links[i].setAttribute('aria-current', 'true');
            else links[i].removeAttribute('aria-current');
        }
    }

    // Picking a language here also sets it for the editor, as its toggle does.
    document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('.lang-switch a');
        if (!a) return;
        try { localStorage.setItem('md2pdf-lang', a.getAttribute('hreflang')); } catch (err) { /* not remembered */ }
    });

    apply();
    window.addEventListener('hashchange', apply);
})();

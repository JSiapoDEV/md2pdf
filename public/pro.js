// /pro: shows the buy link when md2pdf Pro is on sale, and keeps a Pro key in
// this browser (localStorage), where the editor reads it. The key is sent only
// to md2pdf.studio: here to check it, and by the editor with share requests.
(function () {
    'use strict';

    var STORE = 'md2pdf-pro-key';
    var el = function (id) { return document.getElementById(id); };

    function stored() {
        try { return localStorage.getItem(STORE) || ''; } catch (_) { return ''; }
    }

    function store(key) {
        try {
            if (key) localStorage.setItem(STORE, key); else localStorage.removeItem(STORE);
            return true;
        } catch (_) {
            return false;
        }
    }

    function say(text, bad) {
        var message = el('proMessage');
        message.textContent = text;
        message.style.color = bad ? '#f85149' : '#3fb950';
    }

    function day(iso) {
        try {
            return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (_) {
            return iso;
        }
    }

    function ask(key) {
        return fetch('/api/plan', key ? { headers: { Authorization: 'Bearer ' + key } } : undefined);
    }

    function showActive(info) {
        el('proStatus').textContent = info.expiresAt
            ? 'md2pdf Pro is active in this browser until ' + day(info.expiresAt) + '.'
            : 'md2pdf Pro is active in this browser.';
        el('proStatus').hidden = false;
        el('proForm').hidden = true;
        el('proRemove').hidden = false;
    }

    function showInactive() {
        el('proStatus').hidden = true;
        el('proForm').hidden = false;
        el('proRemove').hidden = true;
    }

    // The buy link exists only while the checkout link is configured.
    function showOffer(info) {
        var url = info && info.checkoutUrl;
        el('proBuy').hidden = !url;
        if (url) el('proBuy').href = url;
        el('proUnavailable').hidden = !!url;
    }

    async function start() {
        var key = stored();
        var info = null;
        try {
            var res = await ask(key);
            if (key && res.status === 401) {
                store('');
                say('The key saved in this browser is no longer valid, so it was removed.', true);
                res = await ask('');
            } else if (key && !res.ok) {
                say('The saved key could not be checked right now. It is still saved.', true);
                res = await ask('');
            }
            if (res.ok) info = await res.json();
        } catch (_) { /* offline: the form still works later */ }
        showOffer(info);
        if (info && info.plan === 'pro') showActive(info); else showInactive();
    }

    el('proForm').addEventListener('submit', async function (event) {
        event.preventDefault();
        var key = el('proKeyInput').value.trim();
        if (!key) return;
        el('proActivate').disabled = true;
        say('Checking the key…');
        try {
            var res = await ask(key);
            if (res.ok) {
                var info = await res.json();
                if (info.plan !== 'pro') {
                    say('That key did not unlock Pro.', true);
                } else if (!store(key)) {
                    say('This browser does not let the page save the key.', true);
                } else {
                    el('proKeyInput').value = '';
                    say('Done. Links you share from this browser now use Pro.');
                    showActive(info);
                }
            } else if (res.status === 401) {
                say('That key is not valid or has expired. Copy it again from the email Polar sent you.', true);
            } else {
                say('The key could not be checked right now. Try again in a minute.', true);
            }
        } catch (_) {
            say('The key could not be checked: there is no connection.', true);
        }
        el('proActivate').disabled = false;
    });

    el('proRemove').addEventListener('click', function () {
        store('');
        say('The key was removed from this browser.');
        showInactive();
    });

    // Anonymous count of clicks on the buy link (see /privacy).
    el('proBuy').addEventListener('click', function () {
        try { if (navigator.sendBeacon) navigator.sendBeacon('/api/event', 'pro_checkout'); } catch (_) { /* never matters */ }
    });

    start();
})();

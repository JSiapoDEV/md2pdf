#!/usr/bin/env node
// What people do on md2pdf.studio, from the anonymous counter (Workers
// Analytics Engine, dataset md2pdf_events). Read-only.
//
//   npm run stats                 last 7 days
//   npm run stats -- 30           last 30 days
//
// Needs a Cloudflare API token with only "Account Analytics: Read" and the
// account ID, kept outside the repository:
//   ~/.config/md2pdf-analytics/token     (or CF_ANALYTICS_TOKEN)
//   ~/.config/md2pdf-analytics/account   (or CF_ACCOUNT_ID)
// The token is never printed.

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DIR = join(homedir(), '.config', 'md2pdf-analytics');
function setting(env, file) {
    if (process.env[env]) return process.env[env].trim();
    try { return readFileSync(join(DIR, file), 'utf8').trim(); } catch (_) { return ''; }
}

const token = setting('CF_ANALYTICS_TOKEN', 'token');
const account = setting('CF_ACCOUNT_ID', 'account');
const days = Math.max(1, Math.min(90, Number(process.argv[2]) || 7));
if (!token || !account) {
    console.error('Missing token or account ID. Put them in ' + DIR + '/token and ' + DIR + '/account (see the top of this file).');
    process.exit(2);
}

async function sql(query) {
    const res = await fetch('https://api.cloudflare.com/client/v4/accounts/' + account + '/analytics_engine/sql', {
        method: 'POST',
        headers: { authorization: 'Bearer ' + token },
        body: query + ' FORMAT JSON',
    });
    const text = await res.text();
    if (!res.ok) throw new Error('Analytics Engine answered ' + res.status + ': ' + text.slice(0, 300));
    return JSON.parse(text).data || [];
}

// Analytics Engine samples under load: each row stands for _sample_interval events.
const COUNT = 'SUM(_sample_interval * double1)';
const SINCE = "timestamp > NOW() - INTERVAL '" + days + "' DAY";

const LABELS = {
    link_created: 'Links created',
    export_pdf: 'Export PDF', export_html: 'Export HTML', export_image: 'Export image',
    copy_formatted: 'Copy with formatting', copy_formatted_big: 'Copy too big for Teams',
    open_skill: 'Open AI Skill', copy_skill: 'Copy the skill', download_skill: 'Download SKILL.md',
    download_skill_zip: 'Download skill ZIP', skill_md: 'Fetch /skill.md',
    open_about: 'Open About', new_document: 'New document',
    pro_required: 'Hit a free limit',
    open_star: 'Open star link (footer)', open_star_share: 'Open star link (after sharing)',
    star_ask_shown: 'Star ask shown', star_ask_open: 'Star ask opened',
    support_ask_shown: 'Support ask shown', support_ask_open: 'Support ask opened',
};
const label = (name) => LABELS[name] || (name.startsWith('template_') ? 'Template: ' + name.slice(9) : name);
const pad = (s, n) => String(s).padEnd(n);

const [byEvent, byDay, limits] = await Promise.all([
    sql('SELECT blob1 AS event, blob2 AS client, ' + COUNT + ' AS n FROM md2pdf_events WHERE ' + SINCE + ' GROUP BY event, client ORDER BY n DESC'),
    sql("SELECT toStartOfInterval(timestamp, INTERVAL '1' DAY) AS day, blob2 AS client, " + COUNT + " AS n FROM md2pdf_events WHERE " + SINCE + " AND blob1 = 'link_created' GROUP BY day, client ORDER BY day"),
    sql('SELECT blob3 AS limit, blob2 AS client, ' + COUNT + " AS n FROM md2pdf_events WHERE " + SINCE + " AND blob1 = 'pro_required' GROUP BY limit, client ORDER BY n DESC"),
]);

console.log('md2pdf.studio, last ' + days + ' day(s). Client: browser, cli (md2pdf-studio) or other program.\n');

console.log('Events');
if (!byEvent.length) console.log('  none yet');
for (const r of byEvent) console.log('  ' + pad(label(r.event), 26) + pad(r.client, 9) + Math.round(r.n));

console.log('\nLinks created per day');
if (!byDay.length) console.log('  none yet');
for (const r of byDay) console.log('  ' + pad(String(r.day).slice(0, 10), 12) + pad(r.client, 9) + Math.round(r.n));

console.log('\nFree limits hit (demand a paid plan would meet)');
if (!limits.length) console.log('  none yet');
for (const r of limits) console.log('  ' + pad(r.limit || '(unknown)', 12) + pad(r.client, 9) + Math.round(r.n));

// Asks: to how many one was shown, and how many of them opened its link.
// The star line under a new link is shown once per link made in the browser.
const total = (name, client) => Math.round(byEvent
    .filter((r) => r.event === name && (!client || r.client === client))
    .reduce((sum, r) => sum + Number(r.n), 0));
const rate = (opened, shown) => (shown ? '  (' + Math.round((100 * opened) / shown) + '%)' : '');
const funnel = (text, shown, opened) => console.log('  ' + pad(text, 32) + 'shown ' + pad(shown, 7) + 'opened ' + opened + rate(opened, shown));

console.log('\nAsks: shown, and how many opened the link');
funnel('Star, after the 3rd export', total('star_ask_shown'), total('star_ask_open'));
funnel('Star, after sharing a link', total('link_created', 'browser'), total('open_star_share'));
funnel('Support, from the 15th export', total('support_ask_shown'), total('support_ask_open'));
console.log('  ' + pad('Star link in the footer', 32) + 'opened ' + total('open_star'));
console.log('  ' + pad('Support link in the footer', 32) + 'opened ' + total('open_support'));

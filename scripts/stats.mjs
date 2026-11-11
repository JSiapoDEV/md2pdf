#!/usr/bin/env node
// What people do on md2pdf.studio, from the anonymous counter (Workers
// Analytics Engine, dataset md2pdf_events). Read-only.
//
//   node scripts/stats.mjs        last 7 days
//   node scripts/stats.mjs 30     last 30 days
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

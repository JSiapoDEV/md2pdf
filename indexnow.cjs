#!/usr/bin/env node
// Submit all sitemap URLs to IndexNow (Bing, Yandex, Seznam, Naver).
// Run after each deploy: `node indexnow.cjs`
//
// Docs: https://www.indexnow.org/
// The key below must match the file at /<key>.txt in public/.

const fs = require('fs');
const path = require('path');

const KEY = '2516949dff4973496f951ed44d2030bb';
const HOST = 'md2pdf.studio';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

function extractUrlsFromSitemap(sitemapPath) {
  const xml = fs.readFileSync(sitemapPath, 'utf8');
  const urls = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) urls.push(m[1].trim());
  return urls;
}

async function submit(urlList) {
  const body = JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  });

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body,
  });

  const text = await res.text();
  return { status: res.status, text };
}

async function main() {
  const sitemapPath = path.join(__dirname, 'public', 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) {
    console.error('✗ sitemap.xml not found at', sitemapPath);
    process.exit(1);
  }

  const urls = extractUrlsFromSitemap(sitemapPath);
  if (urls.length === 0) {
    console.error('✗ no <loc> entries found in sitemap.xml');
    process.exit(1);
  }

  console.log(`→ submitting ${urls.length} URL(s) to IndexNow`);
  urls.forEach(u => console.log('  •', u));

  try {
    const { status, text } = await submit(urls);
    if (status === 200 || status === 202) {
      console.log(`✓ IndexNow accepted (${status})`);
    } else {
      console.error(`✗ IndexNow returned ${status}: ${text}`);
      process.exit(1);
    }
  } catch (e) {
    console.error('✗ network error:', e.message);
    process.exit(1);
  }
}

main();

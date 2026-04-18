#!/usr/bin/env bash
# Deploy to Cloudflare Workers and notify IndexNow.
# Usage: ./deploy.sh

set -euo pipefail

echo "→ regenerating SEO pages"
node generate-seo-pages.cjs
node generate-style-pages.cjs

echo "→ deploying to Cloudflare Workers"
npx wrangler deploy

echo "→ submitting sitemap URLs to IndexNow"
node indexnow.cjs

echo "✓ deploy complete"

#!/usr/bin/env node
/**
 * scripts/capture.mjs — Headless screenshot tool for FrameForge HTML renderer
 *
 * Captures web pages, X/Twitter posts, or any URL as still images for use
 * as b-roll in HTML compositor projects. Outputs PNG files to assets/.
 *
 * Usage:
 *   node scripts/capture.mjs site  https://example.com  broll-site
 *   node scripts/capture.mjs tweet https://x.com/user/status/123  post-card
 *   node scripts/capture.mjs url   https://any-url.com  output-name
 *   node scripts/capture.mjs site  https://example.com  hero --width 1280 --height 720
 *
 * Output: assets/<output-name>.png
 *
 * Requirements: Playwright (npx playwright install chromium)
 */

import { chromium }      from 'playwright';
import fs                from 'fs';
import path              from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');

// ── Argument parsing ──────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const mode = argv[0];     // site | tweet | url
const url  = argv[1];
const name = argv[2];

const opts = {};
for (let i = 3; i < argv.length; i++) {
  if (argv[i] === '--width')   opts.width   = parseInt(argv[++i], 10);
  if (argv[i] === '--height')  opts.height  = parseInt(argv[++i], 10);
  if (argv[i] === '--delay')   opts.delay   = parseInt(argv[++i], 10);
  if (argv[i] === '--full')    opts.fullPage = true;
  if (argv[i] === '--dark')    opts.dark     = true;
}

if (!mode || !url || !name) {
  console.error(
    'Usage: node scripts/capture.mjs <mode> <url> <name> [--width N] [--height N] [--full] [--dark]\n' +
    '  mode: site | tweet | url\n' +
    '  name: output filename (without .png) — saved to assets/<name>.png'
  );
  process.exit(1);
}

// ── Directory setup ───────────────────────────────────────────────────────────

const assetsDir = path.join(ROOT, 'assets');
fs.mkdirSync(assetsDir, { recursive: true });
const outputPath = path.join(assetsDir, `${name}.png`);

// ── Per-mode config ───────────────────────────────────────────────────────────

function getModeConfig(mode) {
  switch (mode) {
    case 'tweet':
      // Twitter/X embed view: force dark theme, auto-height, 600px wide card
      return {
        width:    opts.width  || 600,
        height:   opts.height || 800,
        fullPage: opts.fullPage ?? false,
        dark:     opts.dark   ?? true,
        delay:    opts.delay  ?? 3000,  // wait for embeds to load
        clip:     null,
        waitFor:  'article[data-testid="tweet"], .tweet, [data-testid="tweetText"]',
      };

    case 'site':
      // Full-page or viewport screenshot of a website
      return {
        width:    opts.width  || 1920,
        height:   opts.height || 1080,
        fullPage: opts.fullPage ?? false,
        dark:     opts.dark   ?? false,
        delay:    opts.delay  ?? 2000,
        clip:     null,
        waitFor:  null,
      };

    case 'url':
    default:
      return {
        width:    opts.width  || 1920,
        height:   opts.height || 1080,
        fullPage: opts.fullPage ?? false,
        dark:     opts.dark   ?? false,
        delay:    opts.delay  ?? 1500,
        clip:     null,
        waitFor:  null,
      };
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  const config  = getModeConfig(mode);
  const browser = await chromium.launch({
    headless: true,
    args:     ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport:          { width: config.width, height: config.height },
    deviceScaleFactor: 2,   // retina — sharper screenshot for video use
    colorScheme:       config.dark ? 'dark' : 'light',
    userAgent:         'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  // Block ads/trackers to speed up load and reduce noise in screenshots
  await page.route('**/{ads,analytics,tracker,pixel}*', route => route.abort());

  console.log(`[capture] Navigating: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {
    // Some pages don't reach networkidle — continue anyway
  });

  // Wait for specific element if configured
  if (config.waitFor) {
    await page.waitForSelector(config.waitFor, { timeout: 10000 }).catch(() => {});
  }

  // Additional delay for JS rendering
  if (config.delay > 0) {
    await page.waitForTimeout(config.delay);
  }

  // Hide cookie banners and overlays for cleaner screenshots
  await page.evaluate(() => {
    const selectors = [
      '[id*="cookie"]', '[class*="cookie"]', '[id*="consent"]',
      '[class*="consent"]', '[id*="banner"]', '[aria-label*="cookie"]',
      '[role="dialog"]',
    ];
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach(el => { el.style.display = 'none'; });
    }
  }).catch(() => {});

  const screenshotOpts = {
    path:     outputPath,
    type:     'png',
    fullPage: config.fullPage,
  };
  if (config.clip) {
    screenshotOpts.clip = config.clip;
  }

  await page.screenshot(screenshotOpts);
  await browser.close();

  const stat = fs.statSync(outputPath);
  console.log(`[capture] ✅  Saved: ${outputPath} (${(stat.size / 1024).toFixed(0)} KB)`);
  console.log(`[capture] Use in edit.js:  at(T, imageCard('assets/${name}.png', { width: ${config.width}, height: ${config.height} }))`);
})().catch(err => {
  console.error('[capture] ERROR:', err.message);
  process.exit(1);
});

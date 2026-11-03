#!/usr/bin/env node
/**
 * capture.mjs — Headless Playwright screenshot for b-roll assets.
 *
 * Captures a full-page screenshot of a URL or renders an X/Twitter post card
 * and saves it as a PNG in the assets/ directory.
 *
 * Usage:
 *   node scripts/capture.mjs site  https://example.com  broll-site
 *   node scripts/capture.mjs tweet https://x.com/...    post-card
 *   node scripts/capture.mjs url   https://any-url.com  name  [--width=1280] [--height=720]
 *
 * Output:
 *   assets/<name>.png
 *
 * Requirements: npx playwright install chromium
 */

import { chromium }      from 'playwright';
import fs                from 'fs';
import path              from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const ASSETS    = path.join(ROOT, 'assets');

// ── Argument parsing ──────────────────────────────────────────────────────────

const argv  = process.argv.slice(2);
const mode  = argv[0] || 'site';    // site | tweet | url
const url   = argv[1] || '';
const name  = argv[2] || 'capture';
const flags = {};

for (let i = 3; i < argv.length; i++) {
  const arg = argv[i];
  if (arg.startsWith('--')) {
    const [k, v] = arg.slice(2).split('=');
    flags[k] = v ?? true;
  }
}

const WIDTH  = parseInt(flags.width  || '1280', 10);
const HEIGHT = parseInt(flags.height || '720',  10);

// ── Helpers ───────────────────────────────────────────────────────────────────

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }
function log(msg)     { process.stdout.write(msg + '\n'); }
function die(msg)     { process.stderr.write('[capture] ERROR: ' + msg + '\n'); process.exit(1); }

// ── Modes ─────────────────────────────────────────────────────────────────────

/** Capture a full-page website screenshot. */
async function captureSite(url, outPath, w, h) {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page    = await browser.newPage();
  await page.setViewportSize({ width: w, height: h });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  const buf = await page.screenshot({ type: 'png', fullPage: false });
  fs.writeFileSync(outPath, buf);
  await browser.close();
  log(`[capture] ✅  ${outPath}`);
}

/** Capture a tweet/X post as a card screenshot. */
async function captureTweet(tweetUrl, outPath) {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page    = await browser.newPage();

  // Use Twitter's oEmbed to get the HTML embed snippet, then render it
  const oembedApi = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&omit_script=false&dnt=true`;

  await page.setViewportSize({ width: 600, height: 800 });

  // Build a minimal wrapper page
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #15202b; display: flex; justify-content: center; padding: 24px; font-family: sans-serif; }
  .card { background: #1e2732; border: 1px solid #38444d; border-radius: 16px; padding: 20px; max-width: 540px; color: #fff; }
  .url { font-size: 12px; color: #8b98a5; word-break: break-all; margin-top: 8px; }
</style>
</head>
<body>
  <div class="card">
    <p>Post from X</p>
    <p class="url">${tweetUrl}</p>
  </div>
</body>
</html>`;

  // Try to load the real embed; fall back to the stub card if blocked
  try {
    await page.goto(tweetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    // Wait for tweet widget to render
    try { await page.waitForSelector('[data-testid="tweet"]', { timeout: 8000 }); } catch (_) {}
    await page.waitForTimeout(1500);
  } catch (_) {
    // Render the stub card
    await page.setContent(html, { waitUntil: 'load' });
  }

  const buf = await page.screenshot({ type: 'png', fullPage: false });
  fs.writeFileSync(outPath, buf);
  await browser.close();
  log(`[capture] ✅  ${outPath}`);
}

/** Capture any URL with custom dimensions. */
async function captureUrl(url, outPath, w, h) {
  return captureSite(url, outPath, w, h);
}

// ── Main ──────────────────────────────────────────────────────────────────────

if (!url) die('No URL provided.\nUsage: capture.mjs [site|tweet|url] <url> <name>');

ensureDir(ASSETS);
const outPath = path.join(ASSETS, `${name}.png`);
log(`[capture] ${mode} → ${url}`);
log(`[capture] Output: ${outPath}`);

try {
  switch (mode) {
    case 'site':
      await captureSite(url, outPath, WIDTH, HEIGHT);
      break;
    case 'tweet':
    case 'post':
      await captureTweet(url, outPath);
      break;
    case 'url':
    default:
      await captureUrl(url, outPath, WIDTH, HEIGHT);
      break;
  }
} catch (err) {
  die(String(err.stack || err));
}

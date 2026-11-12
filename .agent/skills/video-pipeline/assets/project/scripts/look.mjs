#!/usr/bin/env node
/**
 * look.mjs — Pre-flight DOM, Layout, and Asset Diagnostic Linter
 *
 * Verifies stage integrity before starting expensive frame rendering:
 *   1. Font readiness (document.fonts.status === 'loaded')
 *   2. Missing assets (images with naturalWidth 0, failed fetch requests)
 *   3. Sound cue verification (verifies assets/sfx/ and audio/ files exist)
 *   4. Text and viewport clipping (checks bounding boxes within stage)
 *   5. Numerical stability (detects NaN in computed styles, matrices, or opacity)
 *
 * Usage:
 *   node scripts/look.mjs
 *   node scripts/look.mjs --strict
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch (_) {
  process.stderr.write('\n[look] ERROR: Playwright is required for browser diagnostics.\n');
  process.stderr.write('       Install via: npm install playwright && npx playwright install chromium\n\n');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const INDEX     = path.join(ROOT, 'index.html');
const EDIT_JS   = path.join(ROOT, 'edit.js');

const argv   = process.argv.slice(2);
const STRICT = argv.includes('--strict');

function log(icon, label, msg) {
  process.stdout.write(`  ${icon} [${label}] ${msg}\n`);
}

async function runDiagnostics() {
  process.stdout.write(`\n[look] Inspecting ${path.basename(ROOT)}...\n`);

  if (!fs.existsSync(INDEX)) {
    log('❌', 'FAIL', `index.html not found at: ${INDEX}`);
    process.exit(1);
  }

  let pass = true;
  let warnCount = 0;
  const consoleErrors = [];
  const networkErrors = [];

  const isMac = process.platform === 'darwin';
  const browser = await chromium.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu-watchdog',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--allow-file-access-from-files',
      '--disable-web-security',
      isMac ? '--use-gl=angle' : '--use-gl=angle',
      isMac ? '--use-angle=metal' : '--use-angle=default',
    ]
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  page.on('requestfailed', req => {
    networkErrors.push(`${req.url()} (${req.failure()?.errorText || 'failed'})`);
  });

  try {
    await page.goto('file://' + INDEX, { waitUntil: 'networkidle', timeout: 15000 });
  } catch (err) {
    log('❌', 'FAIL', `Page load failed: ${err.message}`);
    await browser.close();
    process.exit(1);
  }

  // 1. Font status check
  const fontStatus = await page.evaluate(async () => {
    if (!document.fonts) return { ready: true, count: 0, status: 'unsupported' };
    await document.fonts.ready;
    return {
      ready: document.fonts.status === 'loaded',
      count: document.fonts.size,
      status: document.fonts.status
    };
  });

  if (fontStatus.ready) {
    log('✅', 'PASS', `Fonts loaded cleanly (${fontStatus.count} fonts active)`);
  } else {
    log('❌', 'FAIL', `Fonts failed to load (status: ${fontStatus.status})`);
    pass = false;
  }

  // 2. Audio & SFX reference checks
  if (fs.existsSync(EDIT_JS)) {
    const editSrc = fs.readFileSync(EDIT_JS, 'utf8');
    const sfxMatches = Array.from(editSrc.matchAll(/cue\(\s*['"]([^'"]+)['"]/g)).map(m => m[1]);
    for (const sfx of sfxMatches) {
      const sfxDir = path.join(ROOT, 'assets', 'sfx');
      const candidates = [
        path.join(sfxDir, `${sfx}.wav`),
        path.join(sfxDir, `${sfx}.mp3`),
        path.join(sfxDir, `${sfx}.ogg`)
      ];
      const exists = candidates.some(c => fs.existsSync(c));
      if (exists) {
        log('✅', 'PASS', `SFX file exists: assets/sfx/${sfx}.*`);
      } else {
        log('⚠️ ', 'WARN', `SFX referenced in edit.js not found on disk: assets/sfx/${sfx}.*`);
        warnCount++;
      }
    }

    const captionMatches = Array.from(editSrc.matchAll(/captions\(\s*['"]([^'"]+)['"]/g)).map(m => m[1]);
    for (const cap of captionMatches) {
      const capPath = path.resolve(ROOT, cap);
      if (fs.existsSync(capPath)) {
        log('✅', 'PASS', `Captions track found: ${cap}`);
      } else {
        log('❌', 'FAIL', `Captions track missing: ${cap}`);
        pass = false;
      }
    }
  }

  // 3. Sweep timeline for clipped text, offscreen elements, and NaN values
  const duration = await page.evaluate(() => window.DURATION || 10);
  const checkTimes = [0, duration * 0.25, duration * 0.5, duration * 0.75, Math.max(0, duration - 0.1)];

  let clippedCount = 0;
  let nanCount = 0;

  for (const t of checkTimes) {
    await page.evaluate((time) => {
      if (window.__seek) window.__seek(time);
      else if (window.seek) window.seek(time);
    }, t);

    const issues = await page.evaluate(() => {
      const stage = document.getElementById('stage') || document.body;
      const stageRect = stage.getBoundingClientRect();
      const report = { clipped: [], nanStyles: [] };

      const all = stage.querySelectorAll('*');
      for (const el of all) {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

        // Check for NaN in opacity or transform
        if (style.opacity.includes('NaN') || style.transform.includes('NaN')) {
          report.nanStyles.push(el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className : ''));
        }

        // Check for clipped / overflowing text elements
        const r = el.getBoundingClientRect();
        if (el.scrollWidth > el.clientWidth + 4 && (style.overflow === 'hidden' || style.overflow === 'clip')) {
          report.clipped.push(`${el.tagName} "${(el.textContent || '').slice(0, 20)}..."`);
        }

        // Check for wildly out of bounds elements (> 500px outside stage)
        if (r.right < -500 || r.left > stageRect.width + 500 || r.bottom < -500 || r.top > stageRect.height + 500) {
          report.clipped.push(`Offscreen: ${el.tagName} (${Math.round(r.left)}, ${Math.round(r.top)})`);
        }
      }
      return report;
    });

    if (issues.nanStyles.length > 0) nanCount += issues.nanStyles.length;
    if (issues.clipped.length > 0) clippedCount += issues.clipped.length;
  }

  if (nanCount === 0) {
    log('✅', 'PASS', 'Zero NaN styles detected across timeline');
  } else {
    log('❌', 'FAIL', `${nanCount} elements produced NaN transforms/opacity values`);
    pass = false;
  }

  if (clippedCount === 0) {
    log('✅', 'PASS', 'No clipped text or out-of-bounds elements');
  } else {
    log('⚠️ ', 'WARN', `${clippedCount} potential text clippings or extreme off-screen positions`);
    warnCount++;
    if (STRICT) pass = false;
  }

  // 4. Missing image checks
  const missingImgs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img'))
      .filter(img => img.naturalWidth === 0)
      .map(img => img.src);
  });

  if (missingImgs.length === 0) {
    log('✅', 'PASS', 'All image assets rendered successfully');
  } else {
    log('❌', 'FAIL', `Broken images detected: ${missingImgs.join(', ')}`);
    pass = false;
  }

  // 5. Console & Network errors
  if (consoleErrors.length === 0) {
    log('✅', 'PASS', 'Zero console errors during execution');
  } else {
    log('❌', 'FAIL', `Console errors captured: ${consoleErrors.slice(0, 3).join(' | ')}`);
    pass = false;
  }

  if (networkErrors.length === 0) {
    log('✅', 'PASS', 'All network requests resolved');
  } else {
    log('❌', 'FAIL', `Network failures: ${networkErrors.slice(0, 3).join(' | ')}`);
    pass = false;
  }

  await browser.close();

  process.stdout.write('\n');
  if (pass) {
    log('🚀', 'SUCCESS', `Look audit passed with ${warnCount} warning(s). Ready to render.\n`);
    process.exit(0);
  } else {
    log('🛑', 'FAILED', `Look audit failed. Resolve errors before rendering.\n`);
    process.exit(1);
  }
}

runDiagnostics().catch(err => {
  process.stderr.write(`[look] Unexpected error: ${err.stack || err}\n`);
  process.exit(1);
});


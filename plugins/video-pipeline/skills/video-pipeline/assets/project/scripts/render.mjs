#!/usr/bin/env node
/**
 * scripts/render.mjs — Playwright-based HTML compositor renderer for FrameForge
 *
 * Renders video frames by:
 *   1. Opening index.html in a headless Chromium page
 *   2. Calling window.REEL_SEEK(t) for each frame (pure function of t)
 *   3. Capturing a screenshot for each frame
 *   4. Encoding frames to MP4 with FFmpeg
 *
 * Usage:
 *   node scripts/render.mjs sheet               Contact sheet (fast visual check)
 *   node scripts/render.mjs stills 0 5 12 28    Named timestamps
 *   node scripts/render.mjs full                Full encode
 *   node scripts/render.mjs mux                 Re-mux audio only (no re-render)
 *
 * Requirements: Playwright (npx playwright install chromium), FFmpeg
 */

import { chromium }             from 'playwright';
import fs                       from 'fs';
import path                     from 'path';
import { spawnSync, execFileSync } from 'child_process';
import { fileURLToPath }        from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');

// ── Config ────────────────────────────────────────────────────────────────────

const INDEX_HTML = path.join(ROOT, 'index.html');
const OUT_DIR    = path.join(ROOT, 'out');
const FRAMES_DIR = path.join(ROOT, 'out', 'frames');
const AUDIO_MIX  = path.join(ROOT, 'out', 'audio_mix.m4a');

// Parallelism: number of browser pages rendering simultaneously.
// 6 = good default for motion-blur subframes; lower on low-RAM machines.
const PARALLEL_PAGES = parseInt(process.env.RENDER_PARALLEL || '6', 10);

// ── Argument parsing ──────────────────────────────────────────────────────────

const [,, command = 'full', ...rest] = process.argv;

// ── Helpers ───────────────────────────────────────────────────────────────────

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }

/** Read REEL config from the running page. */
async function getReelConfig(page) {
  return page.evaluate(() => ({
    width:    window.REEL?.width    ?? 1920,
    height:   window.REEL?.height   ?? 1080,
    fps:      window.REEL?.fps      ?? 30,
    duration: window.REEL?.duration ?? 60,
    title:    window.REEL?.title    ?? '',
  }));
}

/** Seek to time t and take a screenshot, returning a Buffer. */
async function captureFrame(page, t) {
  await page.evaluate(seekT => {
    // Engine exposes seek() globally when loaded as module in browser.
    // We call the preview-control API which calls seek() directly.
    if (window.REEL_PREVIEW) {
      window.REEL_PREVIEW.seek(seekT);
    } else if (typeof window.seek === 'function') {
      window.seek(seekT);
    }
  }, t);
  // Wait one microtask for DOM to settle after seek
  await page.evaluate(() => new Promise(r => setTimeout(r, 0)));
  return page.screenshot({ type: 'png' });
}

/** Launch a headed browser pool. */
async function launchPool(count) {
  const browser = await chromium.launch({ headless: true });
  const pages   = await Promise.all(
    Array.from({ length: count }, async () => {
      const ctx  = await browser.newContext({
        viewport:          { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
      });
      const page = await ctx.newPage();
      await page.goto(`file://${INDEX_HTML}`);
      // Pause the preview loop so we can seek manually
      await page.evaluate(() => { window.REEL_PREVIEW?.pause(); });
      return page;
    })
  );
  return { browser, pages };
}

// ── Commands ──────────────────────────────────────────────────────────────────

// ── sheet: contact sheet ─────────────────────────────────────────────────────

async function cmdSheet() {
  console.log('📋  Rendering contact sheet…');
  ensureDir(OUT_DIR);
  const { browser, pages } = await launchPool(1);
  const page     = pages[0];
  const config   = await getReelConfig(page);
  const interval = 0.5; // one frame every 0.5 seconds
  const times    = [];
  for (let t = 0; t <= config.duration; t += interval) times.push(+t.toFixed(3));

  const sheets = [];
  for (const t of times) {
    const buf  = await captureFrame(page, t);
    const file = path.join(OUT_DIR, `sheet_${t.toFixed(2).replace('.', '_')}s.png`);
    fs.writeFileSync(file, buf);
    sheets.push(file);
  }

  await browser.close();
  console.log(`✅  Contact sheet: ${sheets.length} frames in ${OUT_DIR}`);
}

// ── stills: named timestamps ──────────────────────────────────────────────────

async function cmdStills(times) {
  if (!times.length) { console.error('Usage: render.mjs stills <t0> <t1> …'); process.exit(1); }
  console.log(`🖼   Rendering ${times.length} stills…`);
  ensureDir(OUT_DIR);
  const { browser, pages } = await launchPool(1);
  const page = pages[0];

  for (const t of times) {
    const buf  = await captureFrame(page, t);
    const file = path.join(OUT_DIR, `still_${String(t).replace('.', '_')}s.png`);
    fs.writeFileSync(file, buf);
    console.log(`  ✓ ${t}s → ${file}`);
  }

  await browser.close();
  console.log('✅  Stills done.');
}

// ── full: complete render ─────────────────────────────────────────────────────

async function cmdFull() {
  ensureDir(FRAMES_DIR);

  // Open one page to read config
  const { browser, pages } = await launchPool(PARALLEL_PAGES);
  const config  = await getReelConfig(pages[0]);
  const { width, height, fps, duration, title } = config;
  const totalFrames = Math.round(duration * fps);
  const outName     = title
    ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : 'video';
  const videoPath   = path.join(OUT_DIR, `${outName}.mp4`);

  console.log(`🎬  Full render: ${totalFrames} frames @ ${fps}fps (${duration.toFixed(1)}s)`);
  console.log(`    Resolution: ${width}×${height}`);
  console.log(`    Output:     ${videoPath}`);

  // Distribute frames across the page pool
  const queue = Array.from({ length: totalFrames }, (_, i) => i);
  let rendered = 0;

  // Chunked parallel rendering
  const CHUNK = PARALLEL_PAGES;
  for (let i = 0; i < queue.length; i += CHUNK) {
    const batch = queue.slice(i, i + CHUNK);
    await Promise.all(batch.map(async (frameIdx, j) => {
      const page  = pages[j % pages.length];
      const t     = +(frameIdx / fps).toFixed(6);
      const buf   = await captureFrame(page, t);
      const file  = path.join(FRAMES_DIR, `frame_${String(frameIdx).padStart(6, '0')}.png`);
      fs.writeFileSync(file, buf);
    }));
    rendered += batch.length;
    const pct = ((rendered / totalFrames) * 100).toFixed(1);
    process.stdout.write(`\r  🖼  ${rendered}/${totalFrames} frames (${pct}%)   `);
  }

  await browser.close();
  process.stdout.write('\n');

  // Encode with FFmpeg
  console.log('🎞   Encoding with FFmpeg…');
  const audioArgs = fs.existsSync(AUDIO_MIX)
    ? ['-i', AUDIO_MIX, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2']
    : ['-an'];

  const ffResult = spawnSync('ffmpeg', [
    '-y',
    '-framerate', String(fps),
    '-i',         path.join(FRAMES_DIR, 'frame_%06d.png'),
    ...audioArgs,
    '-c:v',   'libx264',
    '-preset','slow',
    '-crf',   '18',
    '-profile:v', 'high',
    '-level', '4.1',
    '-pix_fmt', 'yuv420p',
    '-color_range', 'tv',
    '-colorspace', 'bt709',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    '-movflags', '+faststart',
    '-shortest',
    videoPath,
  ], { encoding: 'utf8' });

  if (ffResult.status !== 0) {
    console.error('FFmpeg error:', ffResult.stderr?.slice(-400));
    process.exit(1);
  }

  console.log(`✅  Video: ${videoPath}`);

  // Clean up frames
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
}

// ── mux: re-mux audio only ────────────────────────────────────────────────────

async function cmdMux() {
  const videos = fs.readdirSync(OUT_DIR).filter(f => /\.mp4$/.test(f)).map(f => path.join(OUT_DIR, f));
  if (!videos.length) { console.error('No .mp4 found in out/'); process.exit(1); }
  const videoPath = videos[0];
  const muxPath   = videoPath.replace('.mp4', '_mux.mp4');

  if (!fs.existsSync(AUDIO_MIX)) { console.error('No out/audio_mix.m4a found. Run mix first.'); process.exit(1); }

  console.log(`🎚   Re-muxing audio into ${path.basename(videoPath)}…`);
  const result = spawnSync('ffmpeg', [
    '-y', '-i', videoPath, '-i', AUDIO_MIX,
    '-map', '0:v', '-map', '1:a',
    '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '192k',
    '-shortest',
    '-movflags', '+faststart',
    muxPath,
  ], { encoding: 'utf8' });

  if (result.status !== 0) { console.error(result.stderr?.slice(-300)); process.exit(1); }
  console.log(`✅  Muxed: ${muxPath}`);
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

(async () => {
  switch (command) {
    case 'sheet':
      await cmdSheet();
      break;
    case 'stills':
      await cmdStills(rest.map(Number));
      break;
    case 'full':
      await cmdFull();
      break;
    case 'mux':
      await cmdMux();
      break;
    default:
      console.error(`Unknown command: ${command}. Use: sheet | stills | full | mux`);
      process.exit(1);
  }
})().catch(err => { console.error(err); process.exit(1); });

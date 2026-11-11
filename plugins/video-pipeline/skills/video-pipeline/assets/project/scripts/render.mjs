#!/usr/bin/env node
/**
 * render.mjs — FrameForge HTML Compositor Frame Renderer
 *
 * Drives headless Playwright/Chromium one frame at a time using a virtual clock
 * shim that replaces performance.now(), Date.now(), requestAnimationFrame, and
 * document.getAnimations() so seek(t) is the only source of time in the page.
 *
 * Modes:
 *   node scripts/render.mjs sheet              contact sheet — one frame every 0.5s
 *   node scripts/render.mjs stills 0 5.5 12    frames at specific timestamps
 *   node scripts/render.mjs at 2.4             single full-res still at exact time
 *   node scripts/render.mjs strip 2.1 2.6      every frame in a time range (motion check)
 *   node scripts/render.mjs full               full encode → out/<name>.mp4
 *   node scripts/render.mjs mux                re-mux audio only (no re-render)
 *   node scripts/render.mjs kit                generate editor XML (Premiere/Resolve)
 *
 * Options:
 *   --workers=N      parallel Playwright pages (default: 4)
 *   --crf=N          ffmpeg CRF quality (default: 18)
 *   --fps=N          output FPS override
 *   --audio=path     audio file to mux into the output
 *   --out=path       output file path (default: out/<title>.mp4)
 *   --resume         skip frames that already exist on disk
 *   --cols=N         contact sheet columns (default: 6)
 *   --w=N            contact sheet thumbnail width px (default: 320)
 *   --crop=x,y,w,h   crop region applied to all stills (sheet/stills/at/strip)
 *
 * Requirements: npm install playwright  +  npx playwright install chromium
 * Recommended:  Node 18+, FFmpeg ≥ 5.0
 */

import fs                from 'fs';
import path              from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch (_) {
  try {
    ({ chromium } = await import('playwright-core'));
  } catch (err2) {
    process.stderr.write('\n[render] ERROR: Playwright is required for browser frame rendering.\n');
    process.stderr.write('         Install via: npm install playwright && npx playwright install chromium\n\n');
    process.exit(1);
  }
}

const _require     = createRequire(import.meta.url);
const { spawnSync: _spawnSyncFn } = _require('child_process');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const INDEX     = path.join(ROOT, 'index.html');
const OUT_DIR   = path.join(ROOT, 'out');
const FRAME_DIR = path.join(OUT_DIR, 'frames');

// ── Virtual clock init script ─────────────────────────────────────────────────
// This is the mechanism that makes the renderer deterministic.
// Injected before every page load so the page never sees real wall-clock time.

const VIRTUAL_CLOCK_SCRIPT = `
(function () {
  let _now = 0;
  let _rafQueue = new Map();
  let _rafId = 0;
  let _timerQueue = [];
  let _timerId = 0;
  const _startDate = Date.now();

  window.__playwright = true;

  // 1. Replace performance.now() & Date.now()
  performance.now = () => _now;
  Date.now = () => _startDate + _now;

  // 2. Deterministic requestAnimationFrame
  window.requestAnimationFrame = (cb) => {
    const id = ++_rafId;
    _rafQueue.set(id, cb);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    _rafQueue.delete(id);
  };

  // 3. Virtual Timer Queue (prevents setTimeout/setInterval leaks)
  window.setTimeout = (fn, delay = 0, ...args) => {
    const id = ++_timerId;
    _timerQueue.push({ id, runAt: _now + Math.max(0, delay), fn, args, repeat: 0 });
    _timerQueue.sort((a, b) => a.runAt - b.runAt);
    return id;
  };
  window.clearTimeout = (id) => {
    const idx = _timerQueue.findIndex(t => t.id === id);
    if (idx !== -1) _timerQueue.splice(idx, 1);
  };
  window.setInterval = (fn, interval = 0, ...args) => {
    const id = ++_timerId;
    const step = Math.max(16, interval);
    _timerQueue.push({ id, runAt: _now + step, fn, args, repeat: step });
    _timerQueue.sort((a, b) => a.runAt - b.runAt);
    return id;
  };
  window.clearInterval = (id) => {
    const idx = _timerQueue.findIndex(t => t.id === id);
    if (idx !== -1) _timerQueue.splice(idx, 1);
  };

  // 4. Deterministic Seeded PRNG override for Math.random()
  let _seed = 0x2F6E2B1;
  window.Math.random = () => {
    _seed = (_seed + 0x6D2B79F5) | 0;
    let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // __advance(ms) — called by the renderer per frame
  window.__advance = (ms) => {
    _now += ms;
    // Process due timers
    while (_timerQueue.length > 0 && _timerQueue[0].runAt <= _now) {
      const item = _timerQueue.shift();
      try { item.fn(...item.args); } catch (_) {}
      if (item.repeat > 0) {
        item.runAt = _now + item.repeat;
        _timerQueue.push(item);
        _timerQueue.sort((a, b) => a.runAt - b.runAt);
      }
    }
    // Process rAF callbacks
    const currentRafs = Array.from(_rafQueue.values());
    _rafQueue.clear();
    currentRafs.forEach(cb => { try { cb(_now); } catch (_) {} });

    // Sync CSS animations
    try {
      document.getAnimations().forEach(a => {
        if (a.playState !== 'paused') a.pause();
        a.currentTime = _now;
      });
    } catch (_) {}
  };

  // __seek(t) — direct seek to absolute time in seconds
  window.__seek = async (t) => {
    _now = t * 1000;
    if (window.seek) await window.seek(t);
    // Flush timers due up to current virtual time
    while (_timerQueue.length > 0 && _timerQueue[0].runAt <= _now) {
      const item = _timerQueue.shift();
      try { item.fn(...item.args); } catch (_) {}
    }
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  };
})();
`;

// ── Shared Chromium Launch Flags (Fixes Mac Metal & cross-platform WebGL) ─────
function getChromiumLaunchArgs() {
  const isMac = process.platform === 'darwin';
  return [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu-watchdog',
    '--enable-surface-synchronization',
    '--run-all-compositor-stages-before-draw',
    '--disable-threaded-animation',
    '--disable-checker-imaging',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--allow-file-access-from-files',
    '--disable-web-security',
    isMac ? '--use-gl=angle' : '--use-gl=angle',
    isMac ? '--use-angle=metal' : '--use-angle=default',
  ];
}

// ── Argument parsing ──────────────────────────────────────────────────────────

const argv   = process.argv.slice(2);
const mode   = argv[0] || 'sheet';
const flags  = {};
const extras = [];

for (let i = 1; i < argv.length; i++) {
  const arg = argv[i];
  if (arg.startsWith('--')) {
    const [k, v] = arg.slice(2).split('=');
    flags[k] = v ?? true;
  } else {
    extras.push(arg);
  }
}

const WORKERS    = parseInt(flags.workers    || '4',  10);
const CRF        = parseInt(flags.crf        || '18', 10);
const FPS_OPT    = flags.fps  ? parseInt(flags.fps, 10) : null;
const AUDIO      = flags.audio ? path.resolve(ROOT, flags.audio) : null;
const RESUME     = Boolean(flags.resume);
const CHUNK_S    = parseInt(flags.chunk || '60', 10);
// Motion-blur subframes (1 = no blur; 6 = 180° shutter, ~6× render time)
const SUBFRAMES  = Math.max(1, parseInt(flags.subframes || '1', 10));
// Skip purity verification before full render (default: run it)
const SKIP_VERIFY = Boolean(flags['skip-verify']);

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg) { process.stdout.write(msg + '\n'); }
function die(msg) { process.stderr.write('[render] ERROR: ' + msg + '\n'); process.exit(1); }

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }

/** Zero-pad number to 6 digits */
function pad6(n) { return String(n).padStart(6, '0'); }

/** Discover REEL config by loading the page and reading window values. */
async function getReelConfig(page) {
  await page.goto('file://' + INDEX, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const cfg = await page.evaluate(() => ({
    duration: window.DURATION || 60,
    fps:      window.FPS      || 30,
    title:    window.REEL?.title || 'output',
    width:    window.REEL?.width  || 1920,
    height:   window.REEL?.height || 1080,
  }));
  return cfg;
}

/** Injects virtual clock shim (preferring reel/virtual-clock.js if available) */
async function injectVirtualClock(page) {
  const clockFile = path.join(ROOT, 'reel', 'virtual-clock.js');
  if (fs.existsSync(clockFile)) {
    await page.addInitScript({ path: clockFile });
  } else {
    await page.addInitScript(VIRTUAL_CLOCK_SCRIPT);
  }
}

/** Capture a single frame at time t (seconds). Returns PNG Buffer. */
async function captureFrame(page, t) {
  await page.evaluate((t) => window.__seek(t), t);
  return page.screenshot({ type: 'png' });
}

// ── Mode: sheet ───────────────────────────────────────────────────────────────
// Contact sheet: one frame every 0.5s, composed into a JPEG grid.

async function modeSheet() {
  const interval = parseFloat(flags.interval || '0.5');
  const cols     = parseInt(flags.cols || '6', 10);
  const thumbW   = parseInt(flags.w || '320', 10);
  const outPath  = flags.out ? path.resolve(ROOT, flags.out) : path.join(OUT_DIR, 'sheet.jpg');

  ensureDir(OUT_DIR);

  const browser = await chromium.launch({ args: getChromiumLaunchArgs() });
  const page    = await browser.newPage();
  await injectVirtualClock(page);

  const cfg      = await getReelConfig(page);
  const fps      = FPS_OPT || cfg.fps;
  const duration = cfg.duration;

  await page.setViewportSize({ width: cfg.width, height: cfg.height });

  const times = [];
  for (let t = 0; t <= duration; t += interval) times.push(parseFloat(t.toFixed(3)));

  log(`[sheet] ${cfg.title} — ${duration}s @ ${fps}fps — ${times.length} frames → ${path.basename(outPath)}`);

  const thumbH = Math.round(thumbW * (cfg.height / cfg.width));
  const rows   = Math.ceil(times.length / cols);
  const W      = cols * thumbW;
  const H      = rows * thumbH;

  // Render individual thumbnails, tile with ffmpeg tile filter
  const tmpDir = path.join(OUT_DIR, '_sheet_tmp_' + Date.now());
  ensureDir(tmpDir);

  for (let i = 0; i < times.length; i++) {
    const buf = await captureFrame(page, times[i]);
    fs.writeFileSync(path.join(tmpDir, `frame_${pad6(i)}.png`), buf);
    if (i % 10 === 0) process.stdout.write(`\r  ${i}/${times.length}`);
  }
  process.stdout.write('\n');

  await browser.close();

  // Tile with ffmpeg (%06d sequence works cross-platform)
  const tileResult = _spawnSync('ffmpeg', [
    '-y',
    '-i', path.join(tmpDir, 'frame_%06d.png'),
    '-vf', `scale=${thumbW}:${thumbH},tile=${cols}x${rows}`,
    '-q:v', '4',
    outPath,
  ]);
  if (tileResult.status !== 0) die('ffmpeg tile failed: ' + tileResult.stderr);

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true });
  log(`[sheet] ✅  ${outPath}`);
}

// ── Mode: stills ──────────────────────────────────────────────────────────────
// Render named timestamps to individual PNG files.

async function modeStills() {
  const times   = extras.map(Number).filter(t => !isNaN(t));
  if (times.length === 0) die('stills mode requires timestamp arguments, e.g.: stills 0 5 12');

  ensureDir(OUT_DIR);

  const browser = await chromium.launch({ args: getChromiumLaunchArgs() });
  const page    = await browser.newPage();
  await injectVirtualClock(page);

  const cfg = await getReelConfig(page);
  await page.setViewportSize({ width: cfg.width, height: cfg.height });

  for (const t of times) {
    const buf  = await captureFrame(page, t);
    const name = `still_${String(t).replace('.', '_')}s.png`;
    const out  = path.join(OUT_DIR, name);
    fs.writeFileSync(out, buf);
    log(`[stills] t=${t}s → ${out}`);
  }

  await browser.close();
}

// ── Mode: strip ───────────────────────────────────────────────────────────────
// Render every frame in a short time window horizontally for motion QA.

async function modeStrip() {
  const start = parseFloat(extras[0] || '0.0');
  const end   = parseFloat(extras[1] || String(start + 0.5));
  if (end <= start) die('strip requires valid range: strip <start> <end> where end > start');

  ensureDir(OUT_DIR);
  const browser = await chromium.launch({ args: getChromiumLaunchArgs() });
  const page    = await browser.newPage();
  await injectVirtualClock(page);

  const cfg = await getReelConfig(page);
  const fps = FPS_OPT || cfg.fps;
  await page.setViewportSize({ width: cfg.width, height: cfg.height });

  const startF = Math.round(start * fps);
  const endF   = Math.round(end * fps);
  const count  = endF - startF + 1;
  const outPath = flags.out ? path.resolve(ROOT, flags.out) : path.join(OUT_DIR, `strip_${start}_${end}s.jpg`);

  log(`[strip] ${count} frames from ${start}s to ${end}s @ ${fps}fps`);
  const tmpDir = path.join(OUT_DIR, '_strip_tmp_' + Date.now());
  ensureDir(tmpDir);

  for (let i = 0; i < count; i++) {
    const f = startF + i;
    const t = f / fps;
    const buf = await captureFrame(page, t);
    fs.writeFileSync(path.join(tmpDir, `frame_${pad6(i)}.png`), buf);
  }
  await browser.close();

  const thumbW = parseInt(flags.w || '320', 10);
  const thumbH = Math.round(thumbW * (cfg.height / cfg.width));

  const tileResult = _spawnSync('ffmpeg', [
    '-y',
    '-i', path.join(tmpDir, 'frame_%06d.png'),
    '-vf', `scale=${thumbW}:${thumbH},tile=${count}x1`,
    '-q:v', '3',
    outPath,
  ]);
  fs.rmSync(tmpDir, { recursive: true });
  if (tileResult.status !== 0) die('ffmpeg strip tile failed: ' + tileResult.stderr);
  log(`[strip] ✅  ${outPath}`);
}

// ── Mode: storyboard ──────────────────────────────────────────────────────────
// 4 keyframe storyboard gate stills at 0%, 33%, 66%, 100% of video duration.

async function modeStoryboard() {
  ensureDir(OUT_DIR);
  const browser = await chromium.launch({ args: getChromiumLaunchArgs() });
  const page    = await browser.newPage();
  await injectVirtualClock(page);

  const cfg = await getReelConfig(page);
  await page.setViewportSize({ width: cfg.width, height: cfg.height });

  const duration = cfg.duration;
  const keyframes = [
    { label: '0%', time: 0 },
    { label: '33%', time: parseFloat((duration * 0.33).toFixed(2)) },
    { label: '66%', time: parseFloat((duration * 0.66).toFixed(2)) },
    { label: '100%', time: Math.max(0, duration - 0.05) },
  ];

  log(`[storyboard] 4 keyframes (${keyframes.map(k => `${k.label}: ${k.time}s`).join(', ')})`);
  const tmpDir = path.join(OUT_DIR, '_sb_tmp_' + Date.now());
  ensureDir(tmpDir);

  for (let i = 0; i < keyframes.length; i++) {
    const k = keyframes[i];
    const buf = await captureFrame(page, k.time);
    fs.writeFileSync(path.join(tmpDir, `frame_${pad6(i)}.png`), buf);
    fs.writeFileSync(path.join(OUT_DIR, `keyframe_${k.label.replace('%', 'pct')}.png`), buf);
  }
  await browser.close();

  const outPath = flags.out ? path.resolve(ROOT, flags.out) : path.join(OUT_DIR, 'storyboard_4x.jpg');
  const thumbW = parseInt(flags.w || '480', 10);
  const thumbH = Math.round(thumbW * (cfg.height / cfg.width));

  const tileResult = _spawnSync('ffmpeg', [
    '-y',
    '-i', path.join(tmpDir, 'frame_%06d.png'),
    '-vf', `scale=${thumbW}:${thumbH},tile=2x2`,
    '-q:v', '3',
    outPath,
  ]);
  fs.rmSync(tmpDir, { recursive: true });
  if (tileResult.status !== 0) die('ffmpeg storyboard failed: ' + tileResult.stderr);
  log(`[storyboard] ✅  ${outPath}`);
}

// ── Mode: crop ────────────────────────────────────────────────────────────────
// Visual crop check (default 9:16 mobile Short framing).

async function modeCrop() {
  const ratio = extras[0] || '9:16';
  const time = parseFloat(extras[1] || '1.0');

  ensureDir(OUT_DIR);
  const browser = await chromium.launch({ args: getChromiumLaunchArgs() });
  const page    = await browser.newPage();
  await injectVirtualClock(page);

  const cfg = await getReelConfig(page);
  await page.setViewportSize({ width: cfg.width, height: cfg.height });

  const buf = await captureFrame(page, time);
  await browser.close();

  const rawStill = path.join(OUT_DIR, `crop_raw_${time}s.png`);
  fs.writeFileSync(rawStill, buf);

  const outPath = flags.out ? path.resolve(ROOT, flags.out) : path.join(OUT_DIR, `crop_${ratio.replace(':', 'x')}_${time}s.png`);

  let cropFilter = 'crop=ih*9/16:ih:(iw-ow)/2:0';
  if (ratio !== '9:16') {
    const parts = ratio.split(':').map(Number);
    if (parts.length === 2 && parts[0] && parts[1]) {
      cropFilter = `crop=ih*${parts[0]}/${parts[1]}:ih:(iw-ow)/2:0`;
    }
  }

  const cropResult = _spawnSync('ffmpeg', [
    '-y',
    '-i', rawStill,
    '-vf', cropFilter,
    outPath,
  ]);
  if (fs.existsSync(rawStill) && !flags.keep) fs.unlinkSync(rawStill);
  if (cropResult.status !== 0) die('ffmpeg crop failed: ' + cropResult.stderr);
  log(`[crop] ✅  ${outPath}`);
}

// ── Mode: full ────────────────────────────────────────────────────────────────
// Full render: pipe frames through ffmpeg → MP4.
// Parallelism: up to WORKERS pages render different chunks simultaneously.

async function modeFull() {
  ensureDir(OUT_DIR);
  ensureDir(FRAME_DIR);

  // ── Purity gate: auto-run verify before full render (skip with --skip-verify) ──
  if (!SKIP_VERIFY) {
    const purityLog = path.join(OUT_DIR, 'check', 'purity_report.json');
    let purityPassed = false;
    if (fs.existsSync(purityLog)) {
      try {
        const rep = JSON.parse(fs.readFileSync(purityLog, 'utf8'));
        purityPassed = rep.passed === true;
      } catch (_) {}
    }
    if (!purityPassed) {
      log('[full] ⚙️  No passing purity report found — running verify gate first...');
      // Delegate to harness verify via a sub-process so we reuse all its logic
      const harnessPath = path.join(__dirname, 'harness.mjs');
      if (fs.existsSync(harnessPath)) {
        const { spawnSync: ss } = _require('child_process');
        const r = ss(process.execPath, [harnessPath, 'verify'], { stdio: 'inherit', cwd: ROOT });
        if (r.status !== 0) die('Purity gate failed — fix non-determinism in edit.js before full render.');
      }
    } else {
      log('[full] ✅  Purity gate: cached report OK — skipping re-verify.');
    }
  } else {
    log('[full] ⚠️  --skip-verify set — purity gate bypassed.');
  }

  // Probe config and extract composition events (SFX cues, beat markers, transitions)
  const probeBrowser = await chromium.launch({ args: getChromiumLaunchArgs() });
  const probePage    = await probeBrowser.newPage();
  await injectVirtualClock(probePage);
  await probePage.goto('file://' + INDEX, { waitUntil: 'networkidle' });
  await probePage.evaluate(() => document.fonts.ready);
  const cfg = await getReelConfig(probePage);

  // Extract __events() from composition (OneTake sound-from-composition contract)
  let compositionEvents = [];
  try {
    compositionEvents = await probePage.evaluate(() => {
      if (typeof window.__events === 'function') return window.__events();
      if (Array.isArray(window.__cues)) return window.__cues.map(c => ({ type: 'sfx', ...c }));
      return [];
    });
    if (compositionEvents.length > 0) {
      const eventsPath = path.join(OUT_DIR, 'sfx-events.json');
      fs.writeFileSync(eventsPath, JSON.stringify(compositionEvents, null, 2), 'utf8');
      log(`[full] composition events: ${compositionEvents.length} cues → sfx-events.json`);
    }
  } catch (_) {}

  await probeBrowser.close();

  const fps      = FPS_OPT || cfg.fps;
  const duration = cfg.duration;
  const totalF   = Math.round(duration * fps);
  const title    = cfg.title.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() || 'output';
  const outPath  = flags.out ? path.resolve(ROOT, flags.out) : path.join(OUT_DIR, `${title}.mp4`);

  log(`[full] ${cfg.title} — ${duration}s @ ${fps}fps — ${totalF} frames`);
  log(`[full] workers=${WORKERS}  crf=${CRF}  subframes=${SUBFRAMES}  out=${outPath}`);

  // Determine which frames need rendering
  const pending = [];
  for (let f = 0; f < totalF; f++) {
    const framePath = path.join(FRAME_DIR, `frame_${pad6(f)}.png`);
    if (RESUME && fs.existsSync(framePath)) continue;
    pending.push(f);
  }
  log(`[full] frames to render: ${pending.length} / ${totalF}`);

  // Spawn worker pool — when SUBFRAMES > 1, each logical frame renders SUBFRAMES
  // sub-frames and blends them into a single output frame for motion blur.
  const browser = await chromium.launch({ args: getChromiumLaunchArgs() });
  const pages   = await Promise.all(
    Array.from({ length: Math.min(WORKERS, pending.length || 1) }, async () => {
      const p = await browser.newPage();
      await injectVirtualClock(p);
      await p.goto('file://' + INDEX, { waitUntil: 'networkidle' });
      await p.evaluate(() => document.fonts.ready);
      await p.setViewportSize({ width: cfg.width, height: cfg.height });
      return p;
    })
  );

  let done = 0;
  const queue = [...pending];

  /**
   * Capture a single output frame, optionally averaging SUBFRAMES sub-frames
   * for motion blur (180° shutter simulation).
   */
  async function captureOutputFrame(page, f) {
    const t = f / fps;
    if (SUBFRAMES <= 1) {
      return captureFrame(page, t);
    }
    // Accumulate SUBFRAMES sub-frames evenly distributed within the frame interval
    const dt = 1 / fps;
    const bufs = await Promise.all(
      Array.from({ length: SUBFRAMES }, (_, si) => {
        // Sub-frames evenly from t to t + dt*(SUBFRAMES-1)/SUBFRAMES
        const st = t + dt * si / SUBFRAMES;
        return captureFrame(page, st);
      })
    );
    // Average pixel values across all sub-frames (simple accumulation blend)
    const { createCanvas, loadImage } = await import('canvas').catch(() => null) || {};
    if (!createCanvas) {
      // canvas module not available — fall back to single frame
      return bufs[0];
    }
    const canvas = createCanvas(cfg.width, cfg.height);
    const ctx    = canvas.getContext('2d');
    const alpha  = 1 / SUBFRAMES;
    for (const buf of bufs) {
      const img = await loadImage(buf);
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, 0, 0);
    }
    return canvas.toBuffer('image/png');
  }

  await Promise.all(pages.map(async (page) => {
    while (queue.length > 0) {
      const f = queue.shift();
      if (f === undefined) break;
      const framePath = path.join(FRAME_DIR, `frame_${pad6(f)}.png`);
      const buf       = await captureOutputFrame(page, f);
      fs.writeFileSync(framePath, buf);
      done++;
      if (done % 30 === 0 || done === pending.length) {
        process.stdout.write(`\r  ${done}/${pending.length} (${Math.round(done/pending.length*100)}%)`);
      }
    }
  }));
  process.stdout.write('\n');

  await browser.close();

  // Encode with ffmpeg
  log('[full] encoding MP4...');
  const audioArgs = AUDIO && fs.existsSync(AUDIO)
    ? ['-i', AUDIO, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-c:v', 'copy']
    : ['-an'];

  const encResult = _spawnSync('ffmpeg', [
    '-y',
    '-framerate', String(fps),
    '-pattern_type', 'sequence',
    '-i', path.join(FRAME_DIR, 'frame_%06d.png'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF),
    '-profile:v', 'high', '-level', '4.1',
    '-pix_fmt', 'yuv420p',
    '-color_range', 'tv', '-colorspace', 'bt709',
    '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-movflags', '+faststart',
    ...audioArgs,
    '-t', String(duration),
    outPath,
  ]);

  if (encResult.status !== 0) die('ffmpeg encode failed:\n' + encResult.stderr);
  log(`[full] ✅  ${outPath}`);

  // Clean up frames directory unless --keep flag is set
  if (!flags.keep) {
    log('[full] cleaning up frames...');
    fs.rmSync(FRAME_DIR, { recursive: true, force: true });
    log('[full] frames deleted — keeping only the encoded MP4');
  } else {
    log(`[full] --keep set, frames retained at ${FRAME_DIR}`);
  }
}

// ── Mode: mux ─────────────────────────────────────────────────────────────────
// Re-mux audio into the most recently rendered MP4 without re-rendering frames.

async function modeMux() {
  const audioFile = AUDIO || extras[0];
  if (!audioFile) die('mux mode requires --audio=path or a path argument');

  const mp4Files = fs.readdirSync(OUT_DIR)
    .filter(f => f.endsWith('.mp4'))
    .map(f => path.join(OUT_DIR, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  if (mp4Files.length === 0) die('No MP4 found in out/ — run full first');

  const inputVideo = mp4Files[0];
  const outPath    = inputVideo.replace('.mp4', '_muxed.mp4');
  const audioPath  = path.resolve(ROOT, audioFile);

  log(`[mux] ${path.basename(inputVideo)} + ${path.basename(audioPath)} → ${path.basename(outPath)}`);

  const r = _spawnSync('ffmpeg', [
    '-y', '-i', inputVideo, '-i', audioPath,
    '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
    '-map', '0:v:0', '-map', '1:a:0',
    '-movflags', '+faststart',
    outPath,
  ]);
  if (r.status !== 0) die('ffmpeg mux failed: ' + r.stderr);
  log(`[mux] ✅  ${outPath}`);
}

// ── Mode: kit ─────────────────────────────────────────────────────────────────
// Generate an EDL/XML timeline for Premiere Pro / DaVinci Resolve.

async function modeKit() {
  const mp4Files = fs.readdirSync(OUT_DIR)
    .filter(f => f.endsWith('.mp4') && !f.includes('muxed'))
    .map(f => path.join(OUT_DIR, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  if (mp4Files.length === 0) die('No MP4 in out/ — run full first');

  const masterPath = mp4Files[0];
  const edlPath    = masterPath.replace('.mp4', '.edl');

  // Simple EDL — single clip on V1 track
  const edl = [
    'TITLE: FrameForge Export',
    'FCM: DROP FRAME',
    '',
    '001  AX       V     C        00:00:00:00 00:01:00:00 00:00:00:00 00:01:00:00',
    `* FROM CLIP NAME: ${path.basename(masterPath)}`,
  ].join('\n');

  fs.writeFileSync(edlPath, edl, 'utf8');
  log(`[kit] EDL → ${edlPath}`);
}

// ── Sync spawn wrapper ────────────────────────────────────────────────────────

function _spawnSync(cmd, args) {
  return _spawnSyncFn(cmd, args, {
    encoding:  'utf8',
    maxBuffer: 1024 * 1024 * 256,
    stdio:     'pipe',
  });
}

// ── Entry point ───────────────────────────────────────────────────────────────

if (!fs.existsSync(INDEX)) die(`index.html not found at: ${INDEX}\nRun new-project.mjs first.`);

ensureDir(OUT_DIR);

try {
  switch (mode) {
    case 'sheet':      await modeSheet();      break;
    case 'stills':     await modeStills();     break;
    case 'strip':      await modeStrip();      break;
    case 'storyboard': await modeStoryboard(); break;
    case 'crop':       await modeCrop();       break;
    case 'full':       await modeFull();       break;
    case 'mux':        await modeMux();        break;
    case 'kit':        await modeKit();        break;
    case 'verify':
    case 'doctor':
    case 'pixels': {
      const harnessPath = path.join(__dirname, 'harness.mjs');
      if (fs.existsSync(harnessPath)) {
        const { spawnSync } = _require('child_process');
        const res = spawnSync(process.execPath, [harnessPath, mode, ...process.argv.slice(3)], { stdio: 'inherit' });
        process.exit(res.status ?? 0);
      }
      die(`harness.mjs not found in ${__dirname}`);
      break;
    }
    default:
      die(`Unknown mode: ${mode}\nUsage: render.mjs [sheet|stills|strip|storyboard|crop|full|mux|kit|verify|doctor|pixels] [options]`);
  }
} catch (err) {
  die(String(err.stack || err));
}

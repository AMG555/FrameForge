#!/usr/bin/env node
/**
 * harness.mjs — Code-Driven Animation Production Harness CLI
 *
 * Implements the 9-part video production harness spec:
 *   doctor     — Verify Chrome path, GPU flags, and WebGL context
 *   storyboard — Validate STORYBOARD.md against the 4 gates
 *   verify     — 3-point history-leak & purity gate (repeat, wander, cold-jump)
 *   sheet      — Contact sheet of key timestamps
 *   strip      — Full-rate motion strip of a time range
 *   crop       — Full-res framing crop check
 *   pixels     — Blind-spot frame analysis (blank, blown, corner-confined)
 *   frames     — Parallel, atomic, resumable frame render
 *   encode     — Master MP4 encoding with BT.709 tags and audio mux
 *   all        — Complete gate-checked end-to-end production
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { doctorBrowser, launchHarnessBrowser } from './browser.mjs';
import { openPageWithVirtualClock } from './capture.mjs';
import { verifyScenePurity } from './verify-purity.mjs';
import { verifySceneQuality } from './verify-quality.mjs';
import { renderSheet, renderStrip, renderCrop, renderStoryboard } from './sheets.mjs';
import { renderFrameJobs } from './jobs.mjs';
import { encodeFramesToMp4 } from './encode.mjs';
import { analyzeImageFile } from './pixels.mjs';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CWD = process.cwd();

// Argument parsing
const argv = process.argv.slice(2);
const command = argv[0] || 'doctor';
const flags = {};
const extras = [];

for (let i = 1; i < argv.length; i++) {
  const arg = argv[i];
  if (arg.startsWith('--')) {
    const eqIdx = arg.indexOf('=');
    if (eqIdx !== -1) {
      const k = arg.slice(2, eqIdx);
      const v = arg.slice(eqIdx + 1);
      flags[k] = v;
    } else {
      const k = arg.slice(2);
      if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        flags[k] = argv[++i];
      } else {
        flags[k] = true;
      }
    }
  } else {
    extras.push(arg);
  }
}

function resolveProjectFile(filename, fallback) {
  const inCwd = path.resolve(CWD, filename);
  if (fs.existsSync(inCwd)) return inCwd;
  if (fallback && fs.existsSync(fallback)) return fallback;
  return inCwd;
}

const HTML_FILE   = flags.html ? path.resolve(CWD, flags.html) : resolveProjectFile('index.html', resolveProjectFile('studio.html'));
const OUT_DIR     = flags.outDir ? path.resolve(CWD, flags.outDir) : path.join(CWD, 'out');
const CHECK_DIR   = path.join(OUT_DIR, 'check');
const FRAMES_DIR  = flags.frames ? path.resolve(CWD, flags.frames) : flags.out ? path.resolve(CWD, flags.out) : path.join(OUT_DIR, 'frames');
const PURITY_LOG  = path.join(CHECK_DIR, 'purity_report.json');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(CHECK_DIR, { recursive: true });

async function cmdDoctor() {
  console.log('🩺 FrameForge Harness — Doctor');
  const res = await doctorBrowser({
    softGl: flags['soft-gl'],
    gpuAngle: flags['gpu-angle'],
    chromePath: flags.chrome,
  });

  if (res.status === 'ok') {
    console.log(`  ✅ Chrome:   ${res.chromePath}`);
    console.log(`  ✅ WebGL:    ${res.webgl ? 'available' : 'unavailable'}`);
    console.log(`  ✅ Renderer: ${res.renderer}`);
    console.log(`  ✅ Vendor:   ${res.vendor}`);
    console.log(`  Flags:      ${res.flags.join(' ')}`);
  } else {
    console.error(`  ❌ Doctor failed: ${res.error}`);
    process.exit(1);
  }
}

async function cmdStoryboard() {
  const sbPath = flags.file ? path.resolve(CWD, flags.file) : resolveProjectFile('STORYBOARD.md');
  console.log(`📋 Validating Storyboard: ${sbPath}`);

  const validatorCandidates = [
    path.join(__dirname, 'storyboard-validator.mjs'),
    path.join(CWD, 'scripts', 'storyboard-validator.mjs'),
    path.resolve(__dirname, '../../../plugins/video-pipeline/skills/video-pipeline/assets/project/scripts/storyboard-validator.mjs'),
  ];
  const validatorScript = validatorCandidates.find(p => fs.existsSync(p));
  if (validatorScript) {
    const res = spawnSync('node', [validatorScript, sbPath], { stdio: 'inherit' });
    if (res.status !== 0) {
      console.error('❌ Storyboard gate failed. Fix storyboard before proceeding to code.');
      process.exit(1);
    }
  } else {
    console.log('  ✅ Storyboard file present.');
  }
}

async function cmdVerify() {
  console.log(`🔬 Running 3-Point Purity Verification: ${HTML_FILE}`);
  const { browser } = await launchHarnessBrowser({
    softGl: flags['soft-gl'],
    chromePath: flags.chrome,
  });

  let times = null;
  if (flags.times) {
    times = flags.times.split(',').map(Number).filter(n => !isNaN(n));
  }

  const duration = flags.duration ? parseFloat(flags.duration) : null;
  const res = await verifyScenePurity({
    browser,
    htmlPath: HTML_FILE,
    duration,
    times,
    width: 640,
    height: 360,
  });
  await browser.close();

  fs.writeFileSync(PURITY_LOG, JSON.stringify(res, null, 2), 'utf8');

  console.log(`\n  Tested ${res.timesTested} sample points.`);
  for (const r of res.results) {
    const icon = r.ok ? '✅' : '❌';
    console.log(`  ${icon} t=${r.time}s  hash=${r.a}${r.failure ? ' — ' + r.failure : ''}`);
  }

  if (res.passed) {
    console.log(`\n  ✅ PURITY GATE PASSED — frames_sha256: ${res.framesSha256}`);
    console.log(`  Report: ${PURITY_LOG}`);
  } else {
    console.error('\n  ❌ PURITY GATE FAILED — non-determinism or history leak detected!');
    process.exit(1);
  }
}

async function cmdSheet() {
  const { browser } = await launchHarnessBrowser();
  const page = await openPageWithVirtualClock({ browser, htmlPath: HTML_FILE });
  const outPath = flags.out ? path.resolve(CWD, flags.out) : path.join(CHECK_DIR, 'sheet.jpg');

  let times;
  if (flags.times) {
    times = flags.times.split(',').map(Number).filter(n => !isNaN(n));
  } else {
    // Auto-derive timestamps from scene duration so long films get full coverage.
    const duration = await page.evaluate(() =>
      window.DURATION || window.REEL?.duration || 5
    );
    const step = Math.max(0.5, duration / 20);
    const count = Math.min(20, Math.ceil(duration / step));
    times = Array.from({ length: count }, (_, i) =>
      parseFloat(((i + 1) * step).toFixed(2))
    );
  }

  console.log(`🖼 Generating Contact Sheet (${times.length} frames) → ${outPath}`);
  await renderSheet({
    page,
    times,
    cols: parseInt(flags.cols || '5', 10),
    thumbWidth: parseInt(flags.w || '320', 10),
    outPath,
  });
  await browser.close();
  console.log(`  ✅ Sheet ready: ${outPath}`);
}

async function cmdStrip() {
  const range = (flags.range || extras[0] || '0.0:1.0').split(':').map(Number);
  const start = range[0] || 0.0;
  const end = range[1] || 1.0;
  const outPath = flags.out ? path.resolve(CWD, flags.out) : path.join(CHECK_DIR, `strip_${start}_${end}s.jpg`);

  const { browser } = await launchHarnessBrowser();
  const page = await openPageWithVirtualClock({ browser, htmlPath: HTML_FILE });

  console.log(`🎞 Generating Motion Strip [${start}s → ${end}s] → ${outPath}`);
  await renderStrip({
    page,
    start,
    end,
    fps: parseInt(flags.fps || '30', 10),
    thumbWidth: parseInt(flags.w || '320', 10),
    outPath,
  });
  await browser.close();
  console.log(`  ✅ Strip ready: ${outPath}`);
}

async function cmdCrop() {
  const time = parseFloat(flags.time || extras[0] || '1.0');
  const cropStr = flags.at || flags.crop || '9:16';
  let cropParam = cropStr;
  if (cropStr.includes(',')) {
    cropParam = cropStr.split(',').map(Number);
  }
  const outPath = flags.out ? path.resolve(CWD, flags.out) : path.join(CHECK_DIR, `crop_${time}s.jpg`);

  const { browser } = await launchHarnessBrowser();
  const page = await openPageWithVirtualClock({ browser, htmlPath: HTML_FILE });

  console.log(`✂ Generating Crop Check (at ${time}s, framing=${cropStr}) → ${outPath}`);
  await renderCrop({
    page,
    time,
    crop: cropParam,
    outPath,
  });
  await browser.close();
  console.log(`  ✅ Crop ready: ${outPath}`);
}

async function cmdFrames() {
  const fps = parseInt(flags.fps || '30', 10);
  const workers = parseInt(flags.workers || '4', 10);
  const duration = flags.duration ? parseFloat(flags.duration) : 2.0;
  const first = flags.first !== undefined ? parseInt(flags.first, 10) : 0;
  const last = flags.last !== undefined ? parseInt(flags.last, 10) : (Math.round(duration * fps) - 1);
  const totalFrames = last - first + 1;

  console.log(`📦 Rendering Frame Range [${first}..${last}] (${totalFrames} frames @ ${fps}fps, workers=${workers})`);
  const { browser } = await launchHarnessBrowser();

  const res = await renderFrameJobs({
    browser,
    htmlPath: HTML_FILE,
    framesDir: FRAMES_DIR,
    first,
    last,
    fps,
    workers,
    width: parseInt(flags.width || '1920', 10),
    height: parseInt(flags.height || '1080', 10),
    format: flags.format || 'jpg',
    onProgress: (done, total) => {
      process.stdout.write(`\r  Frames: ${done}/${total} (${Math.round((done / total) * 100)}%)`);
    },
  });
  process.stdout.write('\n');
  await browser.close();

  console.log(`  ✅ ${res.rendered} rendered, ${res.skipped} skipped (resumed). Total: ${res.total}`);
}

async function cmdEncode() {
  // Purity report gate: refuse encode if purity report does not exist or failed
  if (!flags['skip-verify']) {
    if (!fs.existsSync(PURITY_LOG)) {
      console.warn('⚠️ No purity report found. Running verify gate first...');
      await cmdVerify();
    } else {
      const rep = JSON.parse(fs.readFileSync(PURITY_LOG, 'utf8'));
      if (!rep.passed) {
        console.error('❌ ENCODE REFUSED: Purity report in out/check/purity_report.json has FAIL status.');
        process.exit(1);
      }
    }
  }

  const fps = parseInt(flags.fps || '30', 10);
  const duration = parseFloat(flags.duration || '2.0');
  const ext = flags.format === 'png' ? 'png' : 'jpg';
  const outPath = flags.out ? path.resolve(CWD, flags.out) : path.join(OUT_DIR, 'film.mp4');
  const framesPattern = path.join(FRAMES_DIR, `f%06d.${ext}`);
  const audioPath = flags.audio ? path.resolve(CWD, flags.audio) : null;

  console.log(`🎬 Encoding Master MP4 → ${outPath}`);
  const encRes = await encodeFramesToMp4({
    framesPattern,
    duration,
    fps,
    crf: parseInt(flags.crf || '17', 10),
    audioPath,
    outPath,
  });

  console.log(`  ✅ Master encoded successfully (${(encRes.sizeBytes / 1024 / 1024).toFixed(2)} MB)`);
}

async function cmdPixels() {
  const target = extras[0] || path.join(CHECK_DIR, 'sheet.jpg');
  console.log(`🔍 Inspecting Pixels: ${target}`);
  const analysis = analyzeImageFile(target);
  console.log(`  Mean Color: RGB(${analysis.meanColor.join(', ')})`);
  console.log(`  Bright Pixel Share: ${(analysis.brightPixelShare * 100).toFixed(2)}%`);
  console.log(`  BBox: ${analysis.bbox ? analysis.bbox.join(', ') : 'none'}`);
  console.log(`  Blank: ${analysis.isBlank} | Blown: ${analysis.isBlown} | Corner-confined: ${analysis.isCornerConfined}`);
  if (analysis.flags.length > 0) {
    console.warn(`  ⚠️ Visual Flags Triggered: ${analysis.flags.join(', ')}`);
  } else {
    console.log('  ✅ No visual anomalies detected.');
  }
}

async function cmdQuality() {
  console.log(`🎯 Running Closed-Loop Visual QA Gate (1–10 Scoring) on: ${HTML_FILE}`);
  const { browser } = await launchHarnessBrowser();
  const sheetTarget = path.join(CHECK_DIR, 'quality_sheet.jpg');
  // --sample-rate=N overrides samples-per-second (default 2)
  const sampleRate = flags['sample-rate'] ? parseFloat(flags['sample-rate']) : 2;
  const res = await verifySceneQuality({
    browser,
    htmlPath: HTML_FILE,
    sheetPath: sheetTarget,
    sampleRate,
  });
  await browser.close();

  console.log(`  Overall Scene Score: ${res.overallScore}/10 [${res.passed ? 'PASSED ✅' : 'FAILED ❌'}]`);
  console.log(`  Motion Delta: ${(res.motionDelta * 100).toFixed(0)}%`);
  for (const f of res.sampledFrames) {
    const issueStr = f.issues.length > 0 ? ` (${f.issues.join(', ')})` : '';
    console.log(`    t=${f.time.toFixed(2)}s: ${f.score}/10${issueStr}`);
  }

  const qualityReportPath = path.join(CHECK_DIR, 'quality_report.json');
  fs.writeFileSync(qualityReportPath, JSON.stringify(res, null, 2), 'utf8');
  console.log(`  Quality report saved: ${qualityReportPath}`);

  if (!res.passed && !flags['skip-quality']) {
    throw new Error(`Scene failed closed-loop quality gate (Score: ${res.overallScore}/10). Fix worst frames: ${res.worstFrames.map(w => `${w.time}s`).join(', ')}`);
  }
}

async function cmdLook() {
  console.log(`🔍 Running Stage & Asset Diagnostic Linter: ${HTML_FILE}`);
  const lookCandidates = [
    path.join(CWD, 'scripts', 'look.mjs'),
    path.resolve(__dirname, 'look.mjs'),
    path.join(__dirname, 'look.mjs'),
  ];
  const lookScript = lookCandidates.find(p => fs.existsSync(p));
  if (lookScript) {
    const lookArgs = [lookScript];
    if (flags.strict) lookArgs.push('--strict');
    const res = spawnSync('node', lookArgs, { stdio: 'inherit', cwd: CWD });
    if (res.status !== 0) {
      console.error('❌ Look diagnostics failed. Resolve asset or stage errors before rendering.');
      process.exit(1);
    }
  } else {
    console.log('  ⚠️ look.mjs not found in project scripts, skipping DOM linter.');
  }
}

async function cmdAll() {
  console.log('🚀 Running Complete Production Pipeline: Doctor → Storyboard → Look → Sheet → Verify → Quality → Frames → Encode');
  await cmdDoctor();
  await cmdStoryboard();
  await cmdLook();
  await cmdSheet();
  await cmdVerify();
  await cmdQuality();
  await cmdFrames();
  await cmdEncode();
  console.log('\n✨ Production complete! Output ready at out/film.mp4');
}

/**
 * Golden stills regression — save or check.
 *
 * harness golden --save   Capture 4-keyframe storyboard and write hashes to
 *                         out/check/golden.json. Run after a video passes QC.
 * harness golden --check  Re-capture the same 4 keyframes and compare hashes.
 *                         Fails if any frame hash changed (refactor broke determinism).
 */
async function cmdGolden() {
  const goldenPath = flags.out
    ? path.resolve(CWD, flags.out)
    : path.join(CHECK_DIR, 'golden.json');

  const { browser } = await launchHarnessBrowser({
    softGl: flags['soft-gl'],
    chromePath: flags.chrome,
  });
  const page = await openPageWithVirtualClock({ browser, htmlPath: HTML_FILE });

  const duration = await page.evaluate(() =>
    window.DURATION || window.REEL?.duration || 5
  );

  // 4 canonical keyframes (1%, 33%, 66%, 99%)
  const goldenTimes = [
    parseFloat((duration * 0.01).toFixed(3)),
    parseFloat((duration * 0.33).toFixed(3)),
    parseFloat((duration * 0.66).toFixed(3)),
    parseFloat((duration * 0.99).toFixed(3)),
  ];

  async function captureHashes() {
    const hashes = {};
    for (const t of goldenTimes) {
      const buf = await captureFrame(page, t, { type: 'image/png' });
      const { createHash } = await import('crypto');
      hashes[String(t)] = createHash('sha256').update(buf).digest('hex').slice(0, 16);
    }
    return hashes;
  }

  if (flags.save) {
    console.log(`🟡 Golden: capturing ${goldenTimes.length} keyframes → ${goldenPath}`);
    const hashes = await captureHashes();
    fs.writeFileSync(goldenPath, JSON.stringify({ htmlFile: HTML_FILE, duration, times: goldenTimes, hashes }, null, 2), 'utf8');
    await browser.close();
    console.log(`  ✅ Golden baseline saved: ${goldenPath}`);
    for (const [t, h] of Object.entries(hashes)) {
      console.log(`     t=${t}s  hash=${h}`);
    }
  } else if (flags.check) {
    if (!fs.existsSync(goldenPath)) {
      console.error(`❌ No golden baseline at ${goldenPath}. Run: harness golden --save first.`);
      process.exit(1);
    }
    const baseline = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
    console.log(`🔎 Golden: comparing against baseline (${baseline.times.length} frames)`);
    const current = await captureHashes();
    await browser.close();

    let passed = true;
    for (const t of baseline.times) {
      const key = String(t);
      const expected = baseline.hashes[key];
      const actual   = current[key];
      if (expected !== actual) {
        passed = false;
        console.error(`  ❌ REGRESSION at t=${t}s  expected=${expected}  got=${actual}`);
      } else {
        console.log(`  ✅ t=${t}s  hash=${actual} (matches)`);
      }
    }

    if (!passed) {
      console.error('\n❌ GOLDEN CHECK FAILED — refactor broke determinism. Investigate edit.js changes.');
      process.exit(1);
    } else {
      console.log('\n✅ GOLDEN CHECK PASSED — all keyframe hashes match baseline.');
    }
  } else {
    await browser.close();
    console.log('Usage: harness golden --save   (capture baseline)\n       harness golden --check  (verify against baseline)');
  }
}

try {
  switch (command) {
    case 'doctor':     await cmdDoctor();     break;
    case 'storyboard': await cmdStoryboard(); break;
    case 'look':       await cmdLook();       break;
    case 'verify':     await cmdVerify();     break;
    case 'quality':    await cmdQuality();    break;
    case 'sheet':      await cmdSheet();      break;
    case 'strip':      await cmdStrip();      break;
    case 'crop':       await cmdCrop();       break;
    case 'frames':     await cmdFrames();     break;
    case 'encode':     await cmdEncode();     break;
    case 'pixels':     await cmdPixels();     break;
    case 'golden':     await cmdGolden();     break;
    case 'all':        await cmdAll();        break;
    default:
      console.log(`Usage: harness <doctor|storyboard|look|verify|quality|sheet|strip|crop|frames|encode|pixels|golden|all> [options]`);
      break;
  }
} catch (err) {
  console.error(`\n❌ Harness error: ${err.message}`);
  process.exit(1);
}

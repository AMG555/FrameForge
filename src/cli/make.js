#!/usr/bin/env node
/**
 * FrameForge Make — Standalone One-Command Video Generator
 *
 * Usage:
 *   node src/cli/make.js --topic "The Roman Empire"
 *   npm run make -- --topic "The Roman Empire"
 *   npm run make -- --topics-file topics.txt            (batch queue)
 *   npm run make -- --topic "Topic" --language ml       (Malayalam)
 *   npm run make -- --topic "Topic" --channels telegram,youtube
 *   npm run make -- --topic "Topic" --dry-run
 *
 * Options:
 *   --topic        <string>  Video topic (required unless --topics-file given)
 *   --topics-file  <path>    Batch: text file, one topic per line
 *   --language     <code>    BCP-47 language code — auto-selects edge-tts voice
 *                            Examples: en (default), ml (Malayalam), hi, es, fr, de, ja, zh
 *   --style        <string>  Tone/style (default: "educational comedy")
 *   --channels     <string>  Comma-separated: telegram,youtube (default: telegram)
 *   --no-shorts              Skip Shorts extraction
 *   --dry-run                Run research + script only, skip assets/render/publish
 *   --out-dir      <path>    Output directory (default: ./output)
 *   --env          <path>    Path to .env file (default: ./.env)
 *   --help                   Print this help
 *
 * No n8n, no IDE, no Docker required.
 */

'use strict';

const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');
const https   = require('https');
const http    = require('http');

// ── Language → edge-tts voice map ─────────────────────────────────────────────
// Maps BCP-47 language codes to sensible edge-tts defaults.
// User can still override with TTS_VOICE env var.
const LANGUAGE_VOICES = {
  'en':    'en-US-BrianNeural',
  'en-us': 'en-US-BrianNeural',
  'en-gb': 'en-GB-RyanNeural',
  'ml':    'ml-IN-MidhunNeural',    // Malayalam
  'hi':    'hi-IN-MadhurNeural',    // Hindi
  'ta':    'ta-IN-ValluvarNeural',  // Tamil
  'te':    'te-IN-MohanNeural',     // Telugu
  'kn':    'kn-IN-GaganNeural',     // Kannada
  'es':    'es-ES-AlvaroNeural',    // Spanish
  'fr':    'fr-FR-HenriNeural',     // French
  'de':    'de-DE-ConradNeural',    // German
  'pt':    'pt-BR-AntonioNeural',   // Portuguese
  'it':    'it-IT-DiegoNeural',     // Italian
  'ja':    'ja-JP-KeitaNeural',     // Japanese
  'ko':    'ko-KR-InJoonNeural',    // Korean
  'zh':    'zh-CN-YunxiNeural',     // Mandarin
  'ar':    'ar-SA-HamedNeural',     // Arabic
  'ru':    'ru-RU-DmitryNeural',    // Russian
  'tr':    'tr-TR-AhmetNeural',     // Turkish
  'id':    'id-ID-ArdiNeural',      // Indonesian
};

// ── Argument parsing ──────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    topic: '', topicsFile: '', language: 'en',
    style: 'educational comedy', channels: ['telegram'],
    shorts: true, dryRun: false, outDir: './output', env: '.env',
  };
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--topic':        args.topic       = argv[++i] || '';  break;
      case '--topics-file':  args.topicsFile  = argv[++i] || '';  break;
      case '--language':     args.language    = (argv[++i] || 'en').toLowerCase(); break;
      case '--style':        args.style       = argv[++i] || args.style; break;
      case '--channels':     args.channels    = (argv[++i] || 'telegram').split(',').map(s => s.trim()); break;
      case '--no-shorts':    args.shorts      = false; break;
      case '--dry-run':      args.dryRun      = true;  break;
      case '--out-dir':      args.outDir      = argv[++i] || args.outDir; break;
      case '--env':          args.env         = argv[++i] || args.env; break;
      case '--help': case '-h': printHelp(); process.exit(0); break;
    }
  }
  return args;
}

function printHelp() {
  console.log(`
FrameForge Make — Standalone Video Generator

Usage:
  node src/cli/make.js --topic "Your Topic"
  npm run make -- --topic "Your Topic"
  npm run make -- --topics-file topics.txt      (batch: one topic per line)

Options:
  --topic        <text>   Video topic (required unless --topics-file given)
  --topics-file  <path>   Batch mode: text file with one topic per line
  --language     <code>   BCP-47 language (default: en). Auto-selects voice.
                          Supported: en, ml, hi, ta, te, kn, es, fr, de, pt,
                                     it, ja, ko, zh, ar, ru, tr, id
  --style        <text>   Narrative style (default: "educational comedy")
  --channels     <list>   Delivery channels: telegram,youtube (default: telegram)
  --no-shorts             Skip Shorts extraction
  --dry-run               Research + script only — no render, no publish
  --out-dir      <path>   Output directory (default: ./output)
  --env          <path>   Path to .env file (default: ./.env)
  --help                  Show this message

Examples:
  npm run make -- --topic "How WiFi actually works"
  npm run make -- --topic "The Fall of Rome" --style "documentary" --channels telegram
  npm run make -- --topic "ഗണേശ ചതുർഥി" --language ml
  npm run make -- --topics-file topics.txt --channels telegram
  npm run make -- --topic "Bitcoin" --dry-run
`);
}

// ── .env loader ───────────────────────────────────────────────────────────────

function loadEnv(envPath) {
  const full = path.resolve(process.cwd(), envPath);
  if (!fs.existsSync(full)) return;
  fs.readFileSync(full, 'utf8').split('\n').forEach(line => {
    const stripped = line.trim();
    if (!stripped || stripped.startsWith('#')) return;
    const eq = stripped.indexOf('=');
    if (eq < 1) return;
    const key = stripped.slice(0, eq).trim();
    const val = stripped.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && val && !process.env[key]) process.env[key] = val;
  });
}

// ── Progress logger ───────────────────────────────────────────────────────────

function log(stage, msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] [${stage}] ${msg}`);
}

function logSection(title) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(60));
}

// ── Thumbnail generator ───────────────────────────────────────────────────────
// Downloads a Pollinations image for the thumbnail prompt and optionally
// overlays the video title with FFmpeg drawtext. Saves to <outDir>/thumbnail.jpg.
// Non-fatal: failures are logged as warnings, not errors.

async function generateThumbnail({ thumbnailPrompt, youtubeTitle, outDir }) {
  if (!thumbnailPrompt) return null;
  const outputPath = path.join(outDir, 'thumbnail.jpg');
  try {
    const model   = process.env.POLLINATIONS_MODEL || 'flux';
    const prompt  = encodeURIComponent(thumbnailPrompt.slice(0, 500));
    const imgUrl  = `https://image.pollinations.ai/prompt/${prompt}?width=1280&height=720&model=${model}&nologo=true`;
    // Download image
    const imgPath = path.join(outDir, 'thumbnail_raw.jpg');
    await _downloadFile(imgUrl, imgPath);
    if (!fs.existsSync(imgPath)) return null;

    // Optionally burn title text with FFmpeg
    const { spawnSync } = require('child_process');
    if (youtubeTitle) {
      // Resolve a usable font (same logic as renderer.js)
      const fontCandidates = process.platform === 'win32'
        ? ['C:/Windows/Fonts/arialbd.ttf', 'C:/Windows/Fonts/calibrib.ttf', 'C:/Windows/Fonts/segoeui.ttf']
        : process.platform === 'darwin'
          ? ['/System/Library/Fonts/Helvetica.ttc', '/Library/Fonts/Arial Bold.ttf']
          : ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf'];
      const font = process.env.FFMPEG_FONT
        || fontCandidates.find(f => fs.existsSync(f))
        || '';

      if (font) {
        const safeTitle = youtubeTitle.replace(/['":\\]/g, ' ').slice(0, 80);
        const result = spawnSync('ffmpeg', [
          '-y', '-i', imgPath,
          '-vf', `drawtext=fontfile='${font}':text='${safeTitle}':fontcolor=white:fontsize=52:x=(w-text_w)/2:y=h-120:shadowx=3:shadowy=3:shadowcolor=black`,
          '-q:v', '3',
          outputPath,
        ], { encoding: 'utf8' });
        if (result.status === 0) {
          fs.unlinkSync(imgPath); // remove raw
          return outputPath;
        }
      }
      // FFmpeg unavailable or failed — just rename the raw image
      fs.renameSync(imgPath, outputPath);
    } else {
      fs.renameSync(imgPath, outputPath);
    }
    return outputPath;
  } catch (err) {
    log('Thumbnail', `⚠️  Thumbnail generation failed (non-fatal): ${err.message}`);
    return null;
  }
}

function _downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file   = fs.createWriteStream(destPath);
    function follow(u, hops) {
      if (hops > 5) return reject(new Error('Too many redirects'));
      client.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return follow(res.headers.location, hops + 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} downloading ${u}`));
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
        file.on('error', reject);
      }).on('error', reject);
    }
    follow(url, 0);
  });
}

// ── Single video runner (used by both single-topic and batch modes) ───────────

async function runSingleVideo(args, topic, outDir, workflows) {
  const { runResearch, runScript, runAssets, runRender, runShorts, runPackaging, runPublishing } = workflows;

  console.log(`\n🎬  FrameForge — Starting Production`);
  console.log(`    Topic:    "${topic}"`);
  console.log(`    Style:    ${args.style}`);
  console.log(`    Language: ${args.language}`);
  console.log(`    Channels: ${args.channels.join(', ')}`);
  console.log(`    Output:   ${outDir}`);
  if (args.dryRun) console.log(`    Mode:     DRY RUN (no render/publish)`);

  const startTime = Date.now();

  // ── Stage A: Research ──────────────────────────────────────────────────────
  logSection('Stage A: Research');
  const researchResult = await runResearch(topic, { claimCount: 10 });
  log('Research', `✅  ${researchResult.claims.length} claims extracted (production: ${researchResult.productionId})`);

  // ── Stage B: Script ────────────────────────────────────────────────────────
  logSection('Stage B: Script');
  const scriptResult = await runScript({
    productionId: researchResult.productionId,
    claims:       researchResult.claims,
    topic,
    style:        args.style,
  });
  log('Script', `✅  ${scriptResult.sceneCount || scriptResult.scenes?.length} scenes, ~${scriptResult.totalWords} words`);
  log('Script', `    Title: "${scriptResult.youtubeTitle}"`);

  if (args.dryRun) {
    logSection('Dry Run Complete');
    console.log(`\n📄  Script saved. Skipping assets/render/publish (--dry-run).\n`);
    const scriptPath = path.join(outDir, `${researchResult.productionId}-script.json`);
    fs.writeFileSync(scriptPath, JSON.stringify({ research: researchResult, script: scriptResult }, null, 2));
    log('Output', `Script written to: ${scriptPath}`);
    summarise(startTime);
    return { productionId: researchResult.productionId, topic, dryRun: true, youtubeTitle: scriptResult.youtubeTitle };
  }

  // ── Stage C: Assets ────────────────────────────────────────────────────────
  logSection('Stage C: Assets (images + TTS)');
  const assetsResult = await runAssets({
    productionId: scriptResult.productionId,
    scenes:       scriptResult.scenes,
    parallelism:  4,
  });
  log('Assets', `✅  ${assetsResult.sceneCount} scenes rendered`);

  // ── Stage D: Render ────────────────────────────────────────────────────────
  logSection('Stage D: Video Render (FFmpeg)');
  const renderResult = await runRender({
    productionId: scriptResult.productionId,
    sceneAssets:  assetsResult.sceneAssets,
  });
  if (!renderResult.passed) {
    throw new Error(`Quality gate FAILED: ${JSON.stringify(renderResult.qcReport?.checks?.filter(c => !c.passed).map(c => c.name))}`);
  }
  log('Render', `✅  Master: ${renderResult.masterPath}`);
  log('Render', `    Size:   ${(renderResult.sizeBytes / 1024 / 1024).toFixed(1)} MB`);

  // ── Stage D2: Shorts ───────────────────────────────────────────────────────
  let shortsResult = { shorts: [] };
  if (args.shorts) {
    logSection('Stage D2: Shorts Extraction (9:16)');
    shortsResult = await runShorts({
      productionId: scriptResult.productionId,
      masterPath:   renderResult.masterPath,
      scenes:       scriptResult.scenes,
    }).catch(err => {
      log('Shorts', `⚠️  Shorts extraction failed (non-blocking): ${err.message}`);
      return { shorts: [] };
    });
    log('Shorts', `✅  ${shortsResult.shorts?.length || 0} shorts extracted`);
  }

  // ── Stage E: Packaging ────────────────────────────────────────────────────
  logSection('Stage E: Packaging');
  const packageResult = await runPackaging({
    productionId:       scriptResult.productionId,
    masterPath:         renderResult.masterPath,
    shorts:             shortsResult.shorts || [],
    scenes:             scriptResult.scenes,
    youtubeTitle:       scriptResult.youtubeTitle,
    youtubeDescription: scriptResult.youtubeDescription,
    youtubeTags:        scriptResult.youtubeTags,
    thumbnailPrompt:    scriptResult.thumbnailPrompt,
    qcReport:           renderResult.qcReport,
    totalWords:         scriptResult.totalWords,
  });
  log('Package', `✅  Manifest: ${packageResult.manifestPath || 'saved'}`);

  // ── Thumbnail ─────────────────────────────────────────────────────────────
  logSection('Thumbnail');
  const thumbPath = await generateThumbnail({
    thumbnailPrompt: scriptResult.thumbnailPrompt,
    youtubeTitle:    scriptResult.youtubeTitle,
    outDir,
  });
  if (thumbPath) log('Thumbnail', `✅  Saved: ${thumbPath}`);

  // ── Stage F: Publish ──────────────────────────────────────────────────────
  logSection('Stage F: Publish');
  const publishResult = await runPublishing({
    productionId: scriptResult.productionId,
    manifest:     packageResult.manifest,
    channels:     args.channels,
  });
  for (const [channel, result] of Object.entries(publishResult.results || {})) {
    log('Publish', `${result.ok ? '✅' : '⚠️ '} ${channel}: ${result.ok ? 'delivered' : result.reason || result.error || 'failed'}`);
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  logSection('Production Complete');
  console.log(`\n🎉  Video ready!`);
  console.log(`    Production ID: ${scriptResult.productionId}`);
  console.log(`    Master:        ${renderResult.masterPath}`);
  if (thumbPath) console.log(`    Thumbnail:     ${thumbPath}`);
  if (shortsResult.shorts?.length) {
    shortsResult.shorts.forEach((s, i) => console.log(`    Short #${i + 1}:       ${s.path || s}`));
  }
  summarise(startTime);
  return {
    productionId:  scriptResult.productionId,
    topic,
    masterPath:    renderResult.masterPath,
    thumbnailPath: thumbPath,
    youtubeTitle:  scriptResult.youtubeTitle,
    shorts:        shortsResult.shorts || [],
    publishResult,
  };
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  // Validate: must have --topic OR --topics-file
  if (!args.topic && !args.topicsFile) {
    console.error('\n❌  --topic or --topics-file is required.\n    Run: npm run make -- --topic "Your Topic"\n    Or:  npm run make -- --topics-file topics.txt\n');
    process.exit(1);
  }

  // Load env file before requiring modules (they read env at import time)
  loadEnv(args.env);

  // ── Language → TTS voice auto-select ──────────────────────────────────────
  // Only set if user hasn't already set TTS_VOICE in the env file
  if (args.language && args.language !== 'en' && !process.env.TTS_VOICE) {
    const voice = LANGUAGE_VOICES[args.language];
    if (voice) {
      process.env.TTS_VOICE = voice;
      log('Language', `Auto-selected voice: ${voice} (${args.language})`);
    } else {
      log('Language', `⚠️  Unknown language code "${args.language}" — using default voice`);
    }
  }

  // Set N8N_FILES_DIR to outDir so all artifacts go there
  const outDir = path.resolve(process.cwd(), args.outDir);
  fs.mkdirSync(outDir, { recursive: true });
  process.env.N8N_FILES_DIR = outDir;

  // Lazy-require pipeline modules (after env + language are set)
  const workflows = {
    runResearch:   require('../workflows/research').runResearch,
    runScript:     require('../workflows/script').runScript,
    runAssets:     require('../workflows/assets').runAssets,
    runRender:     require('../workflows/render').runRender,
    runShorts:     require('../workflows/shorts').runShorts,
    runPackaging:  require('../workflows/packaging').runPackaging,
    runPublishing: require('../workflows/publishing').runPublishing,
  };

  // ── Batch mode (--topics-file) ────────────────────────────────────────────
  if (args.topicsFile) {
    const topicsPath = path.resolve(process.cwd(), args.topicsFile);
    if (!fs.existsSync(topicsPath)) {
      console.error(`\n❌  Topics file not found: ${topicsPath}\n`);
      process.exit(1);
    }
    const topics = fs.readFileSync(topicsPath, 'utf8')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));

    if (topics.length === 0) {
      console.error(`\n❌  Topics file is empty: ${topicsPath}\n`);
      process.exit(1);
    }

    console.log(`\n🎬  FrameForge Batch — ${topics.length} topic(s) queued`);
    console.log(`    Language: ${args.language}  Channels: ${args.channels.join(', ')}`);

    const batchStart  = Date.now();
    const batchResults = [];
    let   succeeded = 0, failed = 0;

    for (let i = 0; i < topics.length; i++) {
      const topic    = topics[i];
      const topicDir = path.join(outDir, `batch_${String(i + 1).padStart(3, '0')}`);
      fs.mkdirSync(topicDir, { recursive: true });
      process.env.N8N_FILES_DIR = topicDir;

      console.log(`\n${'═'.repeat(60)}`);
      console.log(`  Batch ${i + 1}/${topics.length}: "${topic}"`);
      console.log('═'.repeat(60));

      try {
        const result = await runSingleVideo(args, topic, topicDir, workflows);
        batchResults.push({ index: i + 1, topic, status: 'ok', ...result });
        succeeded++;
      } catch (err) {
        log('Batch', `❌  Topic ${i + 1} FAILED: ${err.message}`);
        batchResults.push({ index: i + 1, topic, status: 'failed', error: err.message });
        failed++;
      }
    }

    // ── Batch summary ────────────────────────────────────────────────────────
    const elapsed = Math.round((Date.now() - batchStart) / 1000);
    logSection(`Batch Complete — ${succeeded} succeeded, ${failed} failed`);
    console.log(`⏱️   Total time: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s\n`);

    // Print per-topic summary
    batchResults.forEach(r => {
      const icon = r.status === 'ok' ? '✅' : '❌';
      const detail = r.status === 'ok' ? r.youtubeTitle || r.masterPath : r.error;
      console.log(`  ${icon} [${r.index}] ${r.topic} — ${detail}`);
    });

    // Send Telegram summary if configured
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = process.env.TELEGRAM_CHAT_ID;
    const apiBase  = process.env.TELEGRAM_API_BASE || 'https://api.telegram.org';
    if (botToken && chatId) {
      const lines = batchResults.map(r =>
        `${r.status === 'ok' ? '✅' : '❌'} ${r.topic}` + (r.youtubeTitle ? `\n   → ${r.youtubeTitle}` : r.error ? `\n   Error: ${r.error}` : '')
      );
      const summary = `🎬 FrameForge Batch Complete\n\n${lines.join('\n\n')}\n\n⏱️ ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;
      const { spawnSync } = require('child_process');
      spawnSync('curl', [
        '-sS', '-X', 'POST', `${apiBase}/bot${botToken}/sendMessage`,
        '-H', 'Content-Type: application/json',
        '-d', JSON.stringify({ chat_id: chatId, text: summary.slice(0, 4096) }),
      ], { timeout: 30000, encoding: 'utf8' });
    }

    // Exit with error code if any topic failed
    if (failed > 0) process.exit(1);
    return;
  }

  // ── Single topic mode ─────────────────────────────────────────────────────
  await runSingleVideo(args, args.topic, outDir, workflows);
}

function summarise(startTime) {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  const mins    = Math.floor(elapsed / 60);
  const secs    = elapsed % 60;
  console.log(`\n⏱️   Total time: ${mins > 0 ? `${mins}m ` : ''}${secs}s\n`);
}

main().catch(err => {
  console.error(`\n❌  Fatal error: ${err.message}`);
  if (process.env.DEBUG_PROVIDERS) console.error(err.stack);
  process.exit(1);
});

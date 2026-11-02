#!/usr/bin/env node
/**
 * FrameForge Make — Standalone One-Command Video Generator
 *
 * Usage:
 *   node src/cli/make.js --topic "The Roman Empire"
 *   npm run make -- --topic "The Roman Empire"
 *   npm run make -- --topic "Topic" --style "educational comedy" --channels telegram,youtube
 *   npm run make -- --topic "Topic" --dry-run
 *
 * Options:
 *   --topic     <string>  Video topic (required)
 *   --style     <string>  Tone/style (default: "educational comedy")
 *   --channels  <string>  Comma-separated: telegram,youtube (default: telegram)
 *   --no-shorts           Skip Shorts extraction
 *   --dry-run             Run research + script only, skip assets/render/publish
 *   --out-dir   <path>    Output directory (default: ./output)
 *   --env       <path>    Path to .env file (default: ./.env)
 *   --help                Print this help
 *
 * No n8n, no IDE, no Docker required.
 */

'use strict';

const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');

// ── Argument parsing ──────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { topic: '', style: 'educational comedy', channels: ['telegram'], shorts: true, dryRun: false, outDir: './output', env: '.env' };
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--topic':      args.topic    = argv[++i] || '';  break;
      case '--style':      args.style    = argv[++i] || args.style; break;
      case '--channels':   args.channels = (argv[++i] || 'telegram').split(',').map(s => s.trim()); break;
      case '--no-shorts':  args.shorts   = false; break;
      case '--dry-run':    args.dryRun   = true;  break;
      case '--out-dir':    args.outDir   = argv[++i] || args.outDir; break;
      case '--env':        args.env      = argv[++i] || args.env; break;
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

Options:
  --topic     <text>   Video topic (required)
  --style     <text>   Narrative style (default: "educational comedy")
  --channels  <list>   Delivery channels: telegram,youtube (default: telegram)
  --no-shorts          Skip Shorts extraction
  --dry-run            Research + script only — no render, no publish
  --out-dir   <path>   Output directory (default: ./output)
  --env       <path>   Path to .env file (default: ./.env)
  --help               Show this message

Examples:
  npm run make -- --topic "How WiFi actually works"
  npm run make -- --topic "The Fall of Rome" --style "documentary" --channels telegram
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

// ── Main pipeline ─────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  if (!args.topic) {
    console.error('\n❌  --topic is required.\n    Run: npm run make -- --topic "Your Topic"\n');
    process.exit(1);
  }

  // Load env file before requiring modules (they read env at import time)
  loadEnv(args.env);

  // Set N8N_FILES_DIR to outDir so all artifacts go there
  const outDir = path.resolve(process.cwd(), args.outDir);
  fs.mkdirSync(outDir, { recursive: true });
  process.env.N8N_FILES_DIR = outDir;

  // Lazy-require pipeline modules (after env is loaded)
  const { runResearch }   = require('../workflows/research');
  const { runScript }     = require('../workflows/script');
  const { runAssets }     = require('../workflows/assets');
  const { runRender }     = require('../workflows/render');
  const { runShorts }     = require('../workflows/shorts');
  const { runPackaging }  = require('../workflows/packaging');
  const { runPublishing } = require('../workflows/publishing');

  console.log(`\n🎬  FrameForge — Starting Production`);
  console.log(`    Topic:    "${args.topic}"`);
  console.log(`    Style:    ${args.style}`);
  console.log(`    Channels: ${args.channels.join(', ')}`);
  console.log(`    Output:   ${outDir}`);
  if (args.dryRun) console.log(`    Mode:     DRY RUN (no render/publish)`);

  const startTime = Date.now();

  // ── Stage A: Research ──────────────────────────────────────────────────────
  logSection('Stage A: Research');
  const researchResult = await runResearch(args.topic, { claimCount: 10 });
  log('Research', `✅  ${researchResult.claims.length} claims extracted (production: ${researchResult.productionId})`);

  // ── Stage B: Script ────────────────────────────────────────────────────────
  logSection('Stage B: Script');
  const scriptResult = await runScript({
    productionId: researchResult.productionId,
    claims:       researchResult.claims,
    topic:        args.topic,
    style:        args.style,
  });
  log('Script', `✅  ${scriptResult.sceneCount || scriptResult.scenes?.length} scenes, ~${scriptResult.totalWords} words`);
  log('Script', `    Title: "${scriptResult.youtubeTitle}"`);

  if (args.dryRun) {
    logSection('Dry Run Complete');
    console.log(`\n📄  Script saved. Skipping assets/render/publish (--dry-run).\n`);
    // Write script to disk for inspection
    const scriptPath = path.join(outDir, `${researchResult.productionId}-script.json`);
    fs.writeFileSync(scriptPath, JSON.stringify({ research: researchResult, script: scriptResult }, null, 2));
    log('Output', `Script written to: ${scriptPath}`);
    summarise(startTime);
    return;
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
    console.error(`\n❌  Quality gate FAILED:\n${JSON.stringify(renderResult.qcReport, null, 2)}\n`);
    process.exit(1);
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
  if (shortsResult.shorts?.length) {
    shortsResult.shorts.forEach((s, i) => console.log(`    Short #${i + 1}:       ${s.path || s}`));
  }
  summarise(startTime);
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

#!/usr/bin/env node
/**
 * FrameForge Make — Standalone Video Generator
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  MODES                                                                      │
 * │                                                                             │
 * │  full-auto (default)                                                        │
 * │    Research → Script → AI Images → TTS → Render → Publish                  │
 * │    node src/cli/make.js --topic "Your Topic"                                │
 * │                                                                             │
 * │  edit-only                                                                  │
 * │    Bring your own clips, images, audio — skip all AI generation             │
 * │    node src/cli/make.js --mode edit-only --scenes-file ./scenes.json        │
 * │    node src/cli/make.js --mode edit-only --media-dir  ./my-clips            │
 * │                                                                             │
 * │  script-only                                                                │
 * │    Research → Script → stop. Review/edit the JSON before continuing.        │
 * │    node src/cli/make.js --mode script-only --topic "Your Topic"             │
 * │                                                                             │
 * │  custom (mix-and-match — skip individual stages you don't need)             │
 * │    node src/cli/make.js --topic "X" --no-research --script-file s.json      │
 * │    node src/cli/make.js --topic "X" --no-images --no-tts (use your own)    │
 * │    node src/cli/make.js --script-file script.json --no-publish              │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * All options:
 *   --mode          <mode>   full-auto|edit-only|script-only|custom  (default: full-auto)
 *   --topic         <text>   Video topic (required for full-auto/script-only)
 *   --topics-file   <path>   Batch mode: text file, one topic per line
 *   --scenes-file   <path>   Skip research+script, load scenes JSON directly
 *   --script-file   <path>   Skip research, load approved script JSON directly
 *   --media-dir     <path>   Auto-discover clips from a directory (edit-only)
 *   --language      <code>   BCP-47 language code for TTS voice (default: en)
 *   --style         <text>   Narrative style (default: "educational comedy")
 *   --channels      <list>   file,webhook  (default: file)
 *   --no-research            Skip research stage (use --topic as raw facts)
 *   --no-script              Skip script stage (requires --scenes-file)
 *   --no-images              Skip AI image generation (use code-driven animation or user clips)
 *   --ai-images              Opt-in: generate AI diffusion images (default: code animation)
 *   --no-tts                 Skip TTS synthesis (use audio_path in scenes)
 *   --no-shorts              Skip Shorts extraction
 *   --no-publish             Skip publishing (render only)
 *   --dry-run                Research + script only, stop before render
 *   --out-dir       <path>   Output directory (default: ./output)
 *   --env           <path>   Path to .env file (default: ./.env)
 *   --help                   Print this help
 *
 * No n8n, no IDE, no Docker required. Run 'node src/cli/setup-keys.js' to configure.
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

// ── Subcommand Dispatcher ─────────────────────────────────────────────────────

const subCmd = (process.argv[2] || '').toLowerCase();

// 1. Dispatch to code-driven animation harness
if (subCmd === 'harness') {
  const harnessBin = path.resolve(__dirname, '../harness/bin/harness.mjs');
  const { spawnSync } = require('child_process');
  const res = spawnSync(process.execPath, [harnessBin, ...process.argv.slice(3)], { stdio: 'inherit' });
  process.exit(res.status ?? 0);
}

// 2. Dispatch to media downloader (yt-dlp)
if (subCmd === 'download' || subCmd === 'ingest') {
  const url = process.argv[3];
  if (!url || url.startsWith('-')) {
    console.error('Usage: frameforge download <url> [--audio] [--subtitles] [--out-dir <dir>] [--filename <name>]');
    process.exit(1);
  }
  const isAudio = process.argv.includes('--audio') || process.argv.includes('-a');
  const sub = process.argv.includes('--subtitles') || process.argv.includes('--subs');
  let outDir, filename;
  for (let i = 4; i < process.argv.length; i++) {
    if (process.argv[i] === '--out-dir' || process.argv[i] === '-o') outDir = process.argv[++i];
    if (process.argv[i] === '--filename' || process.argv[i] === '-f') filename = process.argv[++i];
  }
  const { downloadMediaWithYtDlp, detectYtDlp } = require('../utils/media-downloader');
  if (!detectYtDlp()) {
    console.error('✖ yt-dlp is not installed. Install with: pip install yt-dlp');
    process.exit(1);
  }
  try {
    console.log(`⬇️  Downloading with yt-dlp: ${url}`);
    const res = downloadMediaWithYtDlp(url, { format: isAudio ? 'audio' : 'video', subtitles: sub, outputDir: outDir, filename });
    console.log(`✔ Downloaded successfully to: ${res.localPath}`);
    if (res.subtitlePath) console.log(`✔ Subtitles saved to: ${res.subtitlePath}`);
    if (res.duration) console.log(`  Duration: ${res.duration.toFixed(1)}s (${res.width || 0}x${res.height || 0})`);
    process.exit(0);
  } catch (err) {
    console.error(`✖ Download failed: ${err.message}`);
    process.exit(1);
  }
}

// 3. Dispatch to speech transcription (Whisper)
if (subCmd === 'transcribe') {
  const mediaPath = process.argv[3];
  if (!mediaPath || mediaPath.startsWith('-')) {
    console.error('Usage: frameforge transcribe <mediaPath> [--model <model>] [--language <lang>] [--format <ndjson|srt|json|all>] [--out <path>]');
    process.exit(1);
  }
  let model = 'base', language, format = 'all', outputPath;
  for (let i = 4; i < process.argv.length; i++) {
    if (process.argv[i] === '--model' || process.argv[i] === '-m') model = process.argv[++i];
    if (process.argv[i] === '--language' || process.argv[i] === '-l') language = process.argv[++i];
    if (process.argv[i] === '--format' || process.argv[i] === '-f') format = process.argv[++i];
    if (process.argv[i] === '--out' || process.argv[i] === '-o') outputPath = process.argv[++i];
  }
  const { transcribeAudio, detectWhisper } = require('../utils/transcribe');
  const engine = detectWhisper();
  console.log(`🎙️  Transcribing with Whisper (${engine.engine}, model: ${model}): ${mediaPath}`);
  transcribeAudio(mediaPath, { model, language, format, outputPath })
    .then(res => {
      console.log(`✔ Transcription complete (${res.duration.toFixed(1)}s, ${res.words.length} words, ${res.segments.length} segments, ${res.pauses.length} pauses)`);
      if (res.files) {
        for (const [fmt, p] of Object.entries(res.files)) {
          console.log(`  ↳ [${fmt.toUpperCase()}] ${p}`);
        }
      }
      process.exit(0);
    })
    .catch(err => {
      console.error(`✖ Transcription failed: ${err.message}`);
      process.exit(1);
    });
}

// 4. Dispatch to upstream skills synchronizer
if (subCmd === 'sync' || subCmd === 'sync-skills' || subCmd === 'update') {
  const isSilent = process.argv.includes('--silent');
  const { syncSkills } = require('../skills/sync-upstream');
  syncSkills({ silent: isSilent })
    .then(() => process.exit(0))
    .catch(err => {
      console.error(`✖ Upstream sync failed: ${err.message}`);
      process.exit(1);
    });
}

// 5. Dispatch to doctor
if (subCmd === 'doctor') {
  require('./doctor');
  return;
}

// 6. Dispatch to setup
if (subCmd === 'setup') {
  require('./setup-keys');
  return;
}

function parseArgs(argv) {
  const args = {
    mode: 'full-auto',
    topic: '', topicsFile: '', language: 'en',
    style: 'educational comedy', channels: ['file'],
    theme: '',
    orientation: 'landscape',
    captions: false, subtitles: false,
    scenesFile: '', scriptFile: '', mediaDir: '',
    shorts: true, dryRun: false,
    noResearch: false, noScript: false, noImages: false, noTts: false, noPublish: false,
    outDir: './output', env: '.env',
  };
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--mode':          args.mode        = (argv[++i] || 'full-auto').toLowerCase(); break;
      case '--topic':         args.topic       = argv[++i] || '';  break;
      case '--topics-file':   args.topicsFile  = argv[++i] || '';  break;
      case '--scenes-file':   args.scenesFile  = argv[++i] || '';  break;
      case '--script-file':   args.scriptFile  = argv[++i] || '';  break;
      case '--media-dir':     args.mediaDir    = argv[++i] || '';  break;
      case '--language':      args.language    = (argv[++i] || 'en').toLowerCase(); break;
      case '--orientation':   args.orientation = (argv[++i] || 'landscape').toLowerCase(); break;
      case '--portrait':      args.orientation = 'portrait'; break;
      case '--captions':
      case '--subtitles':
      case '--with-captions': args.captions = true; break;
      case '--style':         args.style       = argv[++i] || args.style; break;
      case '--theme':
      case '--aesthetic':     args.theme       = argv[++i] || ''; break;
      case '--channels':      args.channels    = (argv[++i] || 'file').split(',').map(s => s.trim()); break;
      case '--no-research':   args.noResearch  = true; break;
      case '--no-script':     args.noScript    = true; break;
      case '--no-images':     args.noImages    = true; break;
      case '--ai-images':     args.aiImages    = true; break;
      case '--no-tts':        args.noTts       = true; break;
      case '--no-shorts':     args.shorts      = false; break;
      case '--no-publish':    args.noPublish   = true; break;
      case '--dry-run':       args.dryRun      = true; break;
      case '--out-dir':       args.outDir      = argv[++i] || args.outDir; break;
      case '--env':           args.env         = argv[++i] || args.env; break;
      case '--help': case '-h': printHelp(); process.exit(0); break;
    }
  }

  // Mode shorthands → set stage flags
  if (args.mode === 'edit-only') {
    args.noResearch = true;
    args.noScript   = true;
  } else if (args.mode === 'script-only') {
    args.dryRun = true;
  }

  return args;
}

function printHelp() {
  console.log(`
FrameForge — Unified AI Video Production Engine

SUBCOMMANDS:
  download <url>     Download video/audio from web (YouTube, Twitter, Vimeo, etc.) via yt-dlp
                     Options: [--audio] [--subtitles] [--out-dir <dir>] [--filename <name>]
  transcribe <file>  Transcribe speech to word-level timestamps & subtitles via Whisper
                     Options: [--model <size>] [--language <code>] [--format srt|ndjson|json|all]
  sync               Synchronize skills from 9 upstream frontier repositories
  doctor             Pre-flight environment diagnostics (FFmpeg, Whisper, yt-dlp, Playwright)
  setup              Configure API keys (~/.frameforge/config.json)
  harness            Run HTML code-driven animation test harness (Playwright + Chromium)

MODES:
  full-auto    (default) Research → Script → AI Images → TTS → Render → Publish
  edit-only    Bring your own clips/images/audio — skip all AI generation
  script-only  Research + Script only — review JSON before continuing
  custom       Use --no-* flags to skip individual stages

USAGE (full-auto):
  npm run make -- --topic "Your Topic"
  npm run make -- --topic "Your Topic" --language ml --channels file,webhook
  npm run make -- --topics-file topics.txt

USAGE (edit-only — your own media):
  npm run make -- --mode edit-only --scenes-file ./my-scenes.json
  npm run make -- --mode edit-only --media-dir   ./my-clips

USAGE (custom — mix AI + your media):
  npm run make -- --topic "X" --script-file approved-script.json --no-research
  npm run make -- --topic "X" --no-images   (generate TTS but skip AI images)
  npm run make -- --topic "X" --no-tts      (use your own voice files)
  npm run make -- --topic "X" --no-publish  (render only, don't upload)

OPTIONS:
  --mode          full-auto|edit-only|script-only|custom  (default: full-auto)
  --topic         Video topic text (required for full-auto / script-only)
  --topics-file   Batch mode: text file, one topic per line
  --scenes-file   Load a scenes.json directly (skips research + script)
  --script-file   Load an approved script.json (skips research stage only)
  --media-dir     Auto-discover clips from a directory (edit-only)
  --language      BCP-47 code: en (default), ml, hi, ta, te, kn, es, fr, de, pt, it, ja, ko, zh, ar, ru, tr, id
  --style         Narrative style (default: "educational comedy")
  --channels      Delivery: file,webhook  (default: file)
  --no-research   Skip research (use --topic text directly as context)
  --no-script     Skip script generation (requires --scenes-file)
  --no-images     Skip AI image generation (supply image_path / video_path in scenes)
  --no-tts        Skip TTS synthesis (supply audio_path in scenes)
  --no-shorts     Skip 9:16 Shorts extraction
  --no-publish    Skip publishing (produce master video only)
  --dry-run       Research + script only, stop before render
  --out-dir       Output directory (default: ./output)
  --env           Path to .env file (default: ./.env)
  --help          Show this message

FIRST TIME SETUP:
  node src/cli/setup-keys.js        Interactive API key wizard
  node src/cli/setup-keys.js --check  Validate existing .env
  npm run doctor                    System dependency check

SCENES FILE FORMAT (for --scenes-file / --mode edit-only):
  [
    {
      "narration":   "Voice-over text (used for TTS if no audio_path)",
      "caption":     "ON-SCREEN TEXT",
      "video_path":  "./clips/scene1.mp4",   (optional)
      "image_path":  "./images/scene1.png",  (optional, used if no video_path)
      "audio_path":  "./audio/scene1.mp3",   (optional, used instead of TTS)
      "camera_hint": "zoom_in",
      "music_mood":  "energetic"
    }
  ]
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
// Generates a crisp code-driven procedural thumbnail with FFmpeg.
// Saves to <outDir>/thumbnail.jpg. Non-fatal: failures are logged as warnings.

async function generateThumbnail({ thumbnailPrompt, title, outDir }) {
  if (!thumbnailPrompt && !title) return null;
  const outputPath = path.join(outDir, 'thumbnail.jpg');
  try {
    const { spawnSync } = require('child_process');
    const safeTitle = (title || 'FrameForge Video').replace(/['":\\]/g, ' ').slice(0, 80);
    const fontCandidates = process.platform === 'win32'
      ? ['C:/Windows/Fonts/arialbd.ttf', 'C:/Windows/Fonts/calibrib.ttf', 'C:/Windows/Fonts/segoeui.ttf']
      : process.platform === 'darwin'
        ? ['/System/Library/Fonts/Helvetica.ttc', '/Library/Fonts/Arial Bold.ttf']
        : ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf'];
    const font = process.env.FFMPEG_FONT
      || fontCandidates.find(f => fs.existsSync(f))
      || '';

    const drawFilter = font
      ? `drawtext=fontfile='${font}':text='${safeTitle}':fontcolor=white:fontsize=56:x=(w-text_w)/2:y=(h-text_h)/2:shadowx=3:shadowy=3:shadowcolor=black`
      : `drawtext=text='${safeTitle}':fontcolor=white:fontsize=56:x=(w-text_w)/2:y=(h-text_h)/2:shadowx=3:shadowy=3:shadowcolor=black`;

    const result = spawnSync('ffmpeg', [
      '-y',
      '-f', 'lavfi',
      '-i', 'color=c=0x0f172a:s=1280x720:d=1',
      '-vf', drawFilter,
      '-frames:v', '1',
      '-q:v', '3',
      outputPath,
    ], { encoding: 'utf8' });

    if (result.status === 0 && fs.existsSync(outputPath)) {
      return outputPath;
    }
    return null;
  } catch (err) {
    log('Thumbnail', `⚠️  Thumbnail generation failed (non-fatal): ${err.message}`);
    return null;
  }
}

// ── Single video runner (used by both single-topic and batch modes) ───────────

async function runSingleVideo(args, topic, outDir, workflows) {
  const { runResearch, runScript, runAssets, runRender, runShorts, runPackaging, runPublishing, runIngest } = workflows;

  console.log(`\n🎬  FrameForge — Starting Production`);
  console.log(`    Mode:     ${args.mode}`);
  if (topic)             console.log(`    Topic:    "${topic}"`);
  if (args.scenesFile)   console.log(`    Scenes:   ${args.scenesFile}`);
  if (args.scriptFile)   console.log(`    Script:   ${args.scriptFile}`);
  if (args.mediaDir)     console.log(`    Media:    ${args.mediaDir}`);
  console.log(`    Style:    ${args.style}`);
  console.log(`    Language: ${args.language}`);
  console.log(`    Channels: ${args.channels.join(', ')}`);
  console.log(`    Output:   ${outDir}`);
  const skipFlags = ['noResearch','noScript','noImages','noTts','noPublish'].filter(f => args[f]).map(f => '--' + f.replace(/([A-Z])/g, '-$1').toLowerCase());
  if (args.dryRun)        skipFlags.push('--dry-run');
  if (skipFlags.length)   console.log(`    Skipping: ${skipFlags.join(', ')}`);

  const startTime = Date.now();

  let scenes = null;
  let productionId = null;
  let title = topic || 'Video';
  let description = '';
  let tags = [];
  let thumbnailPrompt = null;
  let totalWords = 0;

  // ── Stage A: Research (skip if --no-research / --scenes-file / --script-file) ─
  if (!args.noResearch && !args.scenesFile && !args.scriptFile) {
    logSection('Stage A: Research');
    const researchResult = await runResearch(topic, { claimCount: 10 });
    productionId = researchResult.productionId;
    log('Research', `✅  ${researchResult.claims.length} claims extracted (production: ${productionId})`);

    // ── Stage B: Script (uses research output) ──────────────────────────────
    if (!args.noScript) {
      logSection('Stage B: Script');
      const scriptResult = await runScript({
        productionId,
        claims:       researchResult.claims,
        topic,
        style:        args.style,
      });
      scenes      = scriptResult.scenes;
      title       = scriptResult.title || topic;
      description = scriptResult.description || '';
      tags        = scriptResult.tags || [];
      thumbnailPrompt = scriptResult.thumbnailPrompt;
      totalWords  = scriptResult.totalWords || 0;
      log('Script', `✅  ${scenes.length} scenes, ~${totalWords} words`);
      log('Script', `    Title: "${title}"`);

      if (args.dryRun) {
        logSection('Script-Only / Dry Run Complete');
        console.log(`\n📄  Script saved. Skipping assets/render/publish.\n`);
        const scriptPath = path.join(outDir, `${productionId}-script.json`);
        fs.writeFileSync(scriptPath, JSON.stringify({ research: researchResult, script: scriptResult }, null, 2));
        log('Output', `Script written to: ${scriptPath}`);
        log('TIP', `Resume with: npm run make -- --script-file ${scriptPath}`);
        summarise(startTime);
        return { productionId, topic, dryRun: true, title, scriptPath };
      }
    }
  }

  // ── Script file bypass (--script-file): skip research, load approved JSON or Markdown ──
  if (args.scriptFile && !scenes) {
    logSection('Loading Approved Script');
    const absScript = path.resolve(process.cwd(), args.scriptFile);
    if (!fs.existsSync(absScript)) throw new Error(`Script file not found: ${absScript}`);
    const content = fs.readFileSync(absScript, 'utf8');

    if (/\.(md|markdown)$/i.test(absScript) || (!content.trim().startsWith('{') && !content.trim().startsWith('['))) {
      const { parseMarkdownScript } = require('../workflows/ingest');
      const parsedMd = parseMarkdownScript(content);
      scenes = parsedMd.scenes;
      productionId = `script_${Date.now()}`;
      title = parsedMd.title || topic || 'Video';
      description = '';
      tags = [];
      thumbnailPrompt = null;
      totalWords = scenes?.reduce((n, s) => n + (s.narration || '').split(/\s+/).filter(Boolean).length, 0) || 0;
      log('Script', `✅  Parsed ${scenes?.length} scenes from Markdown: ${absScript}`);
    } else {
      const raw = JSON.parse(content);
      const scriptData = raw.script || raw;
      scenes      = scriptData.scenes;
      productionId = scriptData.productionId || raw.productionId || `script_${Date.now()}`;
      title       = scriptData.title || topic || 'Video';
      description = scriptData.description || '';
      tags        = scriptData.tags || [];
      thumbnailPrompt = scriptData.thumbnailPrompt || null;
      totalWords  = scriptData.totalWords || scenes?.reduce((n, s) => n + (s.narration || '').split(/\s+/).filter(Boolean).length, 0) || 0;
      log('Script', `✅  Loaded ${scenes?.length} scenes from: ${absScript}`);
    }

    if (args.dryRun) {
      logSection('Dry Run Complete');
      summarise(startTime);
      return { productionId, topic, dryRun: true, title };
    }
  }

  // ── Scenes file bypass (--scenes-file / --media-dir / edit-only) ──────────
  if ((args.scenesFile || args.mediaDir) && !scenes) {
    logSection('Stage A: Media Ingest (edit-only)');
    const ingestResult = await runIngest({
      productionId,
      scenesFile: args.scenesFile || undefined,
      mediaDir:   args.mediaDir   || undefined,
      outDir,
    });
    scenes       = ingestResult.scenes;
    productionId = ingestResult.productionId;
    log('Ingest', `✅  ${scenes.length} scene(s) ingested`);
  }

  if (!scenes || scenes.length === 0) {
    throw new Error('No scenes available. Use --topic, --scenes-file, --script-file, or --media-dir.');
  }

  // ── Stage C: Assets (images + TTS) ────────────────────────────────────────
  logSection('Stage C: Assets (images + TTS)');

  // Code-driven first: AI diffusion images are disabled by default to eliminate AI artifacts.
  const enableAiImages = Boolean(args.aiImages || process.env.ENABLE_AI_IMAGES === 'true');
  const skipImages = args.noImages !== undefined ? args.noImages : !enableAiImages;

  if (!enableAiImages) {
    log('Assets', 'ℹ️   Code-driven animation: kinetic typography & user media (diffusion disabled)');
  }

  // Pass stage-skip flags into scenes so runAssets can honour them
  const preparedScenes = scenes.map(s => ({
    ...s,
    language:      s.language || args.language,
    _skipImageGen: skipImages,
    _skipTts:      args.noTts,
  }));

  const resolvedVoice = LANGUAGE_VOICES[args.language] || null;

  const assetsResult = await runAssets({
    productionId,
    scenes:       preparedScenes,
    parallelism:  4,
    skipImages,
    skipTts:      args.noTts,
    enableAiImages,
    topic,
    title,
    style: args.style || '',
    theme: args.theme || '',
    language: args.language,
    voice: resolvedVoice,
  });
  log('Assets', `✅  ${assetsResult.sceneCount} scenes prepared`);

  // ── Stage D: Render ────────────────────────────────────────────────────────
  logSection('Stage D: Video Render (FFmpeg)');
  const renderWidth  = args.orientation === 'portrait' ? 1080 : 1920;
  const renderHeight = args.orientation === 'portrait' ? 1920 : 1080;

  const renderResult = await runRender({
    productionId,
    sceneAssets: assetsResult.sceneAssets,
    topic,
    title,
    style: args.style || '',
    theme: args.theme || '',
    language: args.language,
    showCaptions: Boolean(args.captions || args.subtitles),
    renderWidth,
    renderHeight,
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
      productionId,
      masterPath: renderResult.masterPath,
      scenes,
    }).catch(err => {
      log('Shorts', `⚠️  Shorts extraction failed (non-blocking): ${err.message}`);
      return { shorts: [] };
    });
    log('Shorts', `✅  ${shortsResult.shorts?.length || 0} shorts extracted`);
  }

  // ── Stage E: Packaging ────────────────────────────────────────────────────
  logSection('Stage E: Packaging');
  const packageResult = await runPackaging({
    productionId,
    masterPath:   renderResult.masterPath,
    shorts:       shortsResult.shorts || [],
    scenes,
    title,
    description,
    tags,
    thumbnailPrompt,
    qcReport:     renderResult.qcReport,
    totalWords,
  });
  log('Package', `✅  Manifest: ${packageResult.manifestPath || 'saved'}`);

  // ── Thumbnail ─────────────────────────────────────────────────────────────
  logSection('Thumbnail');
  const thumbPath = await generateThumbnail({
    thumbnailPrompt,
    title,
    outDir,
  });
  if (thumbPath) log('Thumbnail', `✅  Saved: ${thumbPath}`);

  // ── Stage F: Publish ──────────────────────────────────────────────────────
  if (args.noPublish) {
    logSection('Publish Skipped (--no-publish)');
    log('Output', `Master video: ${renderResult.masterPath}`);
    summarise(startTime);
    return { productionId, topic, masterPath: renderResult.masterPath, thumbnailPath: thumbPath, title, shorts: shortsResult.shorts || [] };
  }

  logSection('Stage F: Publish');
  const publishResult = await runPublishing({
    productionId,
    manifest:     packageResult.manifest,
    channels:     args.channels,
  });
  for (const [channel, result] of Object.entries(publishResult.results || {})) {
    log('Publish', `${result.ok ? '✅' : '⚠️ '} ${channel}: ${result.ok ? 'delivered' : result.reason || result.error || 'failed'}`);
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  logSection('Production Complete');
  console.log(`\n🎉  Video ready!`);
  console.log(`    Production ID: ${productionId}`);
  console.log(`    Master:        ${renderResult.masterPath}`);
  if (thumbPath) console.log(`    Thumbnail:     ${thumbPath}`);
  if (shortsResult.shorts?.length) {
    shortsResult.shorts.forEach((s, i) => console.log(`    Short #${i + 1}:       ${s.path || s}`));
  }
  summarise(startTime);
  return {
    productionId,
    topic,
    masterPath:    renderResult.masterPath,
    thumbnailPath: thumbPath,
    title,
    shorts:        shortsResult.shorts || [],
    publishResult,
  };
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  // Validate: must have a topic source OR a media source
  const hasTopic    = args.topic || args.topicsFile;
  const hasMedia    = args.scenesFile || args.scriptFile || args.mediaDir;
  if (!hasTopic && !hasMedia) {
    console.error(
      '\n❌  A content source is required. Examples:\n' +
      '    npm run make -- --topic "Your Topic"\n' +
      '    npm run make -- --mode edit-only --scenes-file ./scenes.json\n' +
      '    npm run make -- --mode edit-only --media-dir  ./my-clips\n' +
      '    npm run make -- --script-file approved-script.json\n' +
      '\n    Run: npm run make -- --help   for all options\n'
    );
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
    runIngest:     require('../workflows/ingest').runIngest,
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
      const detail = r.status === 'ok' ? r.title || r.masterPath : r.error;
      console.log(`  ${icon} [${r.index}] ${r.topic} — ${detail}`);
    });

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

const KNOWN_SUBCMDS = ['harness', 'download', 'ingest', 'transcribe', 'sync', 'sync-skills', 'update', 'doctor', 'setup'];
if (!KNOWN_SUBCMDS.includes(subCmd)) {
  main().catch(err => {
    console.error(`\n❌  Fatal error: ${err.message}`);
    if (process.env.DEBUG_PROVIDERS) console.error(err.stack);
    process.exit(1);
  });
}

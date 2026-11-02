#!/usr/bin/env node
/**
 * FrameForge Key Setup Wizard
 *
 * Interactive CLI that walks through every provider and writes a .env file.
 * Skips sections you don't need (e.g. skip ElevenLabs if using edge-tts).
 *
 * Usage:
 *   node src/cli/setup-keys.js
 *   node src/cli/setup-keys.js --out .env.production
 *   node src/cli/setup-keys.js --check          (validate existing .env)
 *
 * Provider options explained:
 *
 *   LLM (script + research):
 *     groq       — Free tier, very fast. Get key: console.groq.com
 *     openai     — GPT-4o-mini. Get key: platform.openai.com
 *     watsonx    — IBM granite. Get key: ibm.com/watsonx
 *     ollama     — Fully local. Install: ollama.com. No key needed.
 *     webhook    — Any OpenAI-compatible endpoint. Set WEBHOOK_LLM_URL.
 *
 *   TTS (voice generation):
 *     edge-tts   — Free, offline. 400+ voices. No key needed.
 *     elevenlabs — Best quality + voice cloning. Get key: elevenlabs.io
 *     azure      — Microsoft Cognitive. Get key: portal.azure.com
 *     openai     — OpenAI TTS. Uses OPENAI_API_KEY.
 *     webhook    — Any TTS endpoint. Set WEBHOOK_TTS_URL.
 *
 *   Image (scene visuals):
 *     pollinations — Free, no key. Best default.
 *     falai        — High quality, fast. Get key: fal.ai
 *     replicate    — FLUX models. Get key: replicate.com
 *     dalle        — DALL-E 3. Uses OPENAI_API_KEY.
 *     webhook      — Any image endpoint. Set WEBHOOK_IMAGE_URL.
 */

'use strict';

const fs       = require('fs');
const path     = require('path');
const readline = require('readline');

// ── Parse args ────────────────────────────────────────────────────────────────

const argv   = process.argv.slice(2);
const outArg = argv.findIndex(a => a === '--out');
const outFile = outArg >= 0 ? argv[outArg + 1] : '.env';
const checkMode = argv.includes('--check');

// ── Readline helper ───────────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question, defaultVal = '') {
  return new Promise(resolve => {
    const prompt = defaultVal ? `${question} [${defaultVal}]: ` : `${question}: `;
    rl.question(prompt, answer => {
      const trimmed = answer.trim();
      resolve(trimmed || defaultVal);
    });
  });
}

function askSecret(question) {
  return new Promise(resolve => {
    process.stdout.write(`${question} (hidden): `);
    // readline can't hide input; we just note it's sensitive
    rl.question('', answer => resolve(answer.trim()));
  });
}

function menu(question, options, defaultKey) {
  const lines = [question];
  options.forEach(([key, label]) => {
    const marker = key === defaultKey ? ' (default)' : '';
    lines.push(`  ${key}) ${label}${marker}`);
  });
  return ask(lines.join('\n'), defaultKey);
}

function section(title) {
  const bar = '─'.repeat(60);
  console.log(`\n${bar}`);
  console.log(`  ${title}`);
  console.log(bar);
}

// ── Check mode ────────────────────────────────────────────────────────────────

function checkEnv(envPath) {
  const fullPath = path.resolve(process.cwd(), envPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`\n❌  No .env file found at: ${fullPath}`);
    console.log(`    Run: node src/cli/setup-keys.js   to create one\n`);
    process.exit(1);
  }

  const lines = fs.readFileSync(fullPath, 'utf8').split('\n');
  const env = {};
  lines.forEach(line => {
    const stripped = line.trim();
    if (!stripped || stripped.startsWith('#')) return;
    const eq = stripped.indexOf('=');
    if (eq < 1) return;
    env[stripped.slice(0, eq).trim()] = stripped.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  });

  console.log(`\n🔍  Checking .env at: ${fullPath}\n`);

  const checks = [
    { key: 'PROVIDER_LLM',   label: 'LLM provider',   optional: false },
    { key: 'GROQ_API_KEY',   label: 'Groq key',        optional: true,  needs: env.PROVIDER_LLM === 'groq' || !env.PROVIDER_LLM },
    { key: 'OPENAI_API_KEY', label: 'OpenAI key',      optional: true,  needs: ['openai','dalle'].includes(env.PROVIDER_LLM) },
    { key: 'WATSONX_API_KEY',label: 'WatsonX key',     optional: true,  needs: env.PROVIDER_LLM === 'watsonx' },
    { key: 'PROVIDER_TTS',   label: 'TTS provider',    optional: false },
    { key: 'ELEVENLABS_API_KEY', label: 'ElevenLabs key', optional: true, needs: env.PROVIDER_TTS === 'elevenlabs' },
    { key: 'AZURE_SPEECH_KEY',   label: 'Azure key',      optional: true, needs: env.PROVIDER_TTS === 'azure' },
    { key: 'PROVIDER_IMAGE', label: 'Image provider',  optional: false },
    { key: 'FALAI_API_KEY',  label: 'fal.ai key',      optional: true,  needs: env.PROVIDER_IMAGE === 'falai' },
    { key: 'REPLICATE_API_KEY', label: 'Replicate key', optional: true, needs: env.PROVIDER_IMAGE === 'replicate' },
    { key: 'TELEGRAM_BOT_TOKEN', label: 'Telegram token', optional: true },
    { key: 'TELEGRAM_CHAT_ID',   label: 'Telegram chat ID', optional: true },
  ];

  let issues = 0;
  checks.forEach(({ key, label, optional, needs }) => {
    if (needs === false) return; // skip — not needed for current config
    const val = env[key];
    if (!val) {
      if (!optional || needs) {
        console.log(`  ❌  MISSING  ${key.padEnd(30)} (${label})`);
        issues++;
      } else {
        console.log(`  ⚪  optional ${key.padEnd(30)} (${label})`);
      }
    } else {
      const display = val.length > 8 ? val.slice(0, 4) + '…' + val.slice(-4) : '***';
      console.log(`  ✅  OK       ${key.padEnd(30)} = ${display}`);
    }
  });

  console.log(`\n${issues === 0 ? '✅  All required keys present.' : `❌  ${issues} issue(s) found. Run: node src/cli/setup-keys.js`}\n`);
  process.exit(issues > 0 ? 1 : 0);
}

// ── Main wizard ───────────────────────────────────────────────────────────────

async function main() {
  if (checkMode) {
    checkEnv(outFile);
    return;
  }

  console.log(`
╔══════════════════════════════════════════════════════════╗
║          FrameForge — Provider Key Setup Wizard          ║
╚══════════════════════════════════════════════════════════╝

This wizard writes your provider API keys to: ${path.resolve(outFile)}
Keys are never sent anywhere — they stay on your machine.
Press Enter to accept a default. Ctrl+C to cancel.
`);

  const cfg = {};

  // ── LLM ──────────────────────────────────────────────────────────────────
  section('1 / 5  —  LLM Provider  (research + script generation)');
  console.log('  Used for: researching topics, writing scripts, fact-checking.');
  console.log('  Free option: Groq (no credit card needed for free tier).\n');

  cfg.PROVIDER_LLM = await menu('Choose LLM provider', [
    ['groq',    'Groq — free, fast (llama-3.3-70b). Get key: console.groq.com'],
    ['openai',  'OpenAI GPT-4o-mini. Get key: platform.openai.com'],
    ['watsonx', 'IBM WatsonX Granite. Get key: ibm.com/watsonx'],
    ['ollama',  'Ollama — fully local, no key needed. Install: ollama.com'],
    ['webhook', 'Custom/VoxForge/any OpenAI-compatible endpoint'],
  ], 'groq');

  if (cfg.PROVIDER_LLM === 'groq') {
    cfg.GROQ_API_KEY = await askSecret('  Groq API key (starts with gsk_)');
  } else if (cfg.PROVIDER_LLM === 'openai') {
    cfg.OPENAI_API_KEY = await askSecret('  OpenAI API key (starts with sk-)');
  } else if (cfg.PROVIDER_LLM === 'watsonx') {
    cfg.WATSONX_API_KEY     = await askSecret('  WatsonX IBM Cloud API key');
    cfg.WATSONX_PROJECT_ID  = await ask('  WatsonX project ID');
    cfg.WATSONX_BASE_URL    = await ask('  WatsonX endpoint URL', 'https://us-south.ml.cloud.ibm.com/ml/v1/text/chat');
    cfg.WATSONX_MODEL       = await ask('  WatsonX model ID', 'ibm/granite-3-3-8b-instruct');
  } else if (cfg.PROVIDER_LLM === 'ollama') {
    cfg.OLLAMA_BASE_URL = await ask('  Ollama base URL', 'http://localhost:11434/api');
    cfg.OLLAMA_MODEL    = await ask('  Ollama model name', 'llama3.3');
  } else if (cfg.PROVIDER_LLM === 'webhook') {
    cfg.WEBHOOK_LLM_URL  = await ask('  Webhook URL (e.g. https://voxforge.example.com/v1/chat)');
    cfg.WEBHOOK_LLM_HEADERS = await ask('  Extra headers JSON (or leave blank)', '{}');
    cfg.WEBHOOK_LLM_RESPONSE_PATH = await ask('  JSON response path', 'choices.0.message.content');
  }

  // ── TTS ───────────────────────────────────────────────────────────────────
  section('2 / 5  —  TTS Provider  (voice generation)');
  console.log('  Used for: converting narration text to audio.');
  console.log('  Free option: edge-tts (400+ voices, no account needed).\n');

  cfg.PROVIDER_TTS = await menu('Choose TTS provider', [
    ['edge-tts',   'edge-tts — free, offline, 400+ voices. No key needed.'],
    ['elevenlabs', 'ElevenLabs — best quality + voice cloning. elevenlabs.io'],
    ['azure',      'Azure Cognitive Speech. portal.azure.com'],
    ['openai',     'OpenAI TTS (uses OPENAI_API_KEY above)'],
    ['webhook',    'Custom/VoxForge/any TTS endpoint'],
  ], 'edge-tts');

  if (cfg.PROVIDER_TTS === 'elevenlabs') {
    cfg.ELEVENLABS_API_KEY  = await askSecret('  ElevenLabs API key');
    cfg.ELEVENLABS_VOICE_ID = await ask('  Voice ID (leave blank for default Adam)', 'pNInz6obpgDQGcFmaJgB');
    console.log('  ℹ️   For voice cloning: set ELEVENLABS_VOICE_ID to your cloned voice ID.');
  } else if (cfg.PROVIDER_TTS === 'azure') {
    cfg.AZURE_SPEECH_KEY    = await askSecret('  Azure Speech key');
    cfg.AZURE_SPEECH_REGION = await ask('  Azure region', 'eastus');
  } else if (cfg.PROVIDER_TTS === 'webhook') {
    cfg.WEBHOOK_TTS_URL      = await ask('  Webhook TTS URL');
    cfg.WEBHOOK_TTS_RESPONSE = await ask('  Response type: binary | json_url', 'binary');
    cfg.WEBHOOK_TTS_RESPONSE_PATH = await ask('  JSON path to audio URL (if json_url)', 'audio_url');
  }

  // ── Image ─────────────────────────────────────────────────────────────────
  section('3 / 5  —  Image Generation Provider');
  console.log('  Used for: generating AI visuals for each scene.');
  console.log('  Skip this if you supply your own images (--no-images).');
  console.log('  Free option: Pollinations (no key needed).\n');

  cfg.PROVIDER_IMAGE = await menu('Choose image provider', [
    ['pollinations', 'Pollinations — free, no key, FLUX model. Best default.'],
    ['falai',        'fal.ai — high quality, fast. Get key: fal.ai'],
    ['replicate',    'Replicate FLUX-schnell. Get key: replicate.com'],
    ['dalle',        'DALL-E 3 (uses OPENAI_API_KEY above)'],
    ['webhook',      'Custom/external image API endpoint'],
  ], 'pollinations');

  if (cfg.PROVIDER_IMAGE === 'falai') {
    cfg.FALAI_API_KEY = await askSecret('  fal.ai API key');
  } else if (cfg.PROVIDER_IMAGE === 'replicate') {
    cfg.REPLICATE_API_KEY = await askSecret('  Replicate API key');
  } else if (cfg.PROVIDER_IMAGE === 'webhook') {
    cfg.WEBHOOK_IMAGE_URL      = await ask('  Webhook image URL');
    cfg.WEBHOOK_IMAGE_RESPONSE = await ask('  Response type: binary | json_url', 'json_url');
    cfg.WEBHOOK_IMAGE_RESPONSE_PATH = await ask('  JSON path to image URL', 'url');
  }

  // ── Telegram ───────────────────────────────────────────────────────────────
  section('4 / 5  —  Telegram Publishing  (optional)');
  console.log('  Used for: sending finished videos to a Telegram channel/group.');
  console.log('  Create a bot: t.me/BotFather → /newbot\n');

  const wantTelegram = await ask('  Enable Telegram publishing? (y/n)', 'n');
  if (wantTelegram.toLowerCase() === 'y') {
    cfg.TELEGRAM_BOT_TOKEN = await askSecret('  Bot token (from BotFather)');
    cfg.TELEGRAM_CHAT_ID   = await ask('  Chat ID (negative for groups, e.g. -1001234567890)');
  }

  // ── YouTube ────────────────────────────────────────────────────────────────
  section('5 / 5  —  YouTube Publishing  (optional)');
  console.log('  Used for: uploading finished videos to YouTube.');
  console.log('  Requires OAuth2 credentials from Google Cloud Console.\n');

  const wantYouTube = await ask('  Enable YouTube publishing? (y/n)', 'n');
  if (wantYouTube.toLowerCase() === 'y') {
    cfg.YOUTUBE_CLIENT_ID     = await ask('  OAuth2 Client ID');
    cfg.YOUTUBE_CLIENT_SECRET = await askSecret('  OAuth2 Client Secret');
    cfg.YOUTUBE_REFRESH_TOKEN = await askSecret('  OAuth2 Refresh Token');
  }

  // ── External adapter (VoxForge / amg555 / any platform) ────────────────────
  section('Bonus  —  External Platform Adapter  (optional)');
  console.log('  Connect any external platform (e.g. VoxForge, amg555, Remotion, Runway).');
  console.log('  Frames can be sent to / received from any HTTP endpoint.\n');

  const wantExt = await ask('  Connect an external platform? (y/n)', 'n');
  if (wantExt.toLowerCase() === 'y') {
    cfg.EXTERNAL_PLATFORM_NAME = await ask('  Platform name (label only)', 'voxforge');
    cfg.EXTERNAL_PLATFORM_URL  = await ask('  Platform base URL (e.g. https://api.voxforge.io)');
    cfg.EXTERNAL_PLATFORM_KEY  = await askSecret('  API key (leave blank if none)');
    cfg.EXTERNAL_PLATFORM_INGEST_PATH  = await ask('  Media ingest path', '/v1/ingest');
    cfg.EXTERNAL_PLATFORM_RENDER_PATH  = await ask('  Render/export path', '/v1/render');
    cfg.EXTERNAL_PLATFORM_STATUS_PATH  = await ask('  Status poll path', '/v1/status');
  }

  // ── Write .env ─────────────────────────────────────────────────────────────
  const outPath = path.resolve(process.cwd(), outFile);
  const lines   = [
    '# FrameForge environment — generated by setup-keys wizard',
    `# Generated: ${new Date().toISOString()}`,
    '# DO NOT commit this file. It is already in .gitignore.',
    '',
    '# ── LLM ─────────────────────────────────────────────────────────',
  ];

  const groups = {
    '# ── LLM ─────────────────────────────────────────────────────────': ['PROVIDER_LLM','GROQ_API_KEY','OPENAI_API_KEY','WATSONX_API_KEY','WATSONX_PROJECT_ID','WATSONX_BASE_URL','WATSONX_MODEL','OLLAMA_BASE_URL','OLLAMA_MODEL','WEBHOOK_LLM_URL','WEBHOOK_LLM_HEADERS','WEBHOOK_LLM_RESPONSE_PATH','LLM_MODEL'],
    '# ── TTS ─────────────────────────────────────────────────────────': ['PROVIDER_TTS','ELEVENLABS_API_KEY','ELEVENLABS_VOICE_ID','AZURE_SPEECH_KEY','AZURE_SPEECH_REGION','WEBHOOK_TTS_URL','WEBHOOK_TTS_RESPONSE','WEBHOOK_TTS_RESPONSE_PATH','TTS_VOICE','TTS_RATE'],
    '# ── Image generation ─────────────────────────────────────────────': ['PROVIDER_IMAGE','FALAI_API_KEY','REPLICATE_API_KEY','WEBHOOK_IMAGE_URL','WEBHOOK_IMAGE_RESPONSE','WEBHOOK_IMAGE_RESPONSE_PATH','POLLINATIONS_MODEL'],
    '# ── Telegram ─────────────────────────────────────────────────────': ['TELEGRAM_BOT_TOKEN','TELEGRAM_CHAT_ID'],
    '# ── YouTube ──────────────────────────────────────────────────────': ['YOUTUBE_CLIENT_ID','YOUTUBE_CLIENT_SECRET','YOUTUBE_REFRESH_TOKEN'],
    '# ── External platform adapter ────────────────────────────────────': ['EXTERNAL_PLATFORM_NAME','EXTERNAL_PLATFORM_URL','EXTERNAL_PLATFORM_KEY','EXTERNAL_PLATFORM_INGEST_PATH','EXTERNAL_PLATFORM_RENDER_PATH','EXTERNAL_PLATFORM_STATUS_PATH'],
  };

  const envLines = ['# FrameForge environment — generated by setup-keys wizard', `# Generated: ${new Date().toISOString()}`, '# DO NOT commit this file. It is already in .gitignore.', ''];
  for (const [header, keys] of Object.entries(groups)) {
    const relevant = keys.filter(k => cfg[k] !== undefined);
    if (relevant.length === 0) continue;
    envLines.push(header);
    for (const k of relevant) {
      if (cfg[k]) envLines.push(`${k}=${cfg[k]}`);
    }
    envLines.push('');
  }

  fs.writeFileSync(outPath, envLines.join('\n'), 'utf8');

  console.log(`\n✅  .env written to: ${outPath}`);
  console.log(`\n    Next steps:`);
  console.log(`    1. Review the file:  cat ${outFile}`);
  console.log(`    2. Validate keys:    node src/cli/setup-keys.js --check`);
  console.log(`    3. Generate a video: npm run make -- --topic "Your topic"`);
  console.log(`    4. Edit-only mode:   npm run make -- --mode edit-only --scenes-file scenes.json\n`);

  rl.close();
}

main().catch(err => {
  console.error(`\n❌  Setup wizard failed: ${err.message}\n`);
  rl.close();
  process.exit(1);
});

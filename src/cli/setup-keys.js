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
 *     groq        — Free, fast (llama-3.3-70b). Get key: console.groq.com
 *     cerebras    — Fastest inference (2000+ tok/s). Get key: cloud.cerebras.ai
 *     openrouter  — All models in one key. Get key: openrouter.ai
 *     anthropic   — Claude Sonnet 4.5. Get key: console.anthropic.com
 *     gemini      — Gemini 2.0 Flash. Get key: aistudio.google.com
 *     mistral     — Mistral Large. Get key: console.mistral.ai
 *     together    — Llama 3.3-70B Turbo. Get key: api.together.ai
 *     openai      — GPT-4o. Get key: platform.openai.com
 *     ollama      — Fully local, no key needed. Install: ollama.com
 *     webhook     — Any OpenAI-compatible endpoint. Set WEBHOOK_LLM_URL.
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
const os       = require('os');
const readline = require('readline');

const { CONFIG_DIR, CONFIG_FILE } = require('../config/load-config');

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
    { key: 'CEREBRAS_API_KEY',  label: 'Cerebras key',   optional: true, needs: env.PROVIDER_LLM === 'cerebras' },
    { key: 'OPENROUTER_API_KEY',label: 'OpenRouter key',  optional: true, needs: env.PROVIDER_LLM === 'openrouter' },
    { key: 'ANTHROPIC_API_KEY', label: 'Anthropic key',   optional: true, needs: env.PROVIDER_LLM === 'anthropic' },
    { key: 'GEMINI_API_KEY',    label: 'Gemini key',      optional: true, needs: env.PROVIDER_LLM === 'gemini' },
    { key: 'MISTRAL_API_KEY',   label: 'Mistral key',     optional: true, needs: env.PROVIDER_LLM === 'mistral' },
    { key: 'TOGETHER_API_KEY',  label: 'Together key',    optional: true, needs: env.PROVIDER_LLM === 'together' },
    { key: 'PROVIDER_TTS',   label: 'TTS provider',    optional: false },
    { key: 'ELEVENLABS_API_KEY', label: 'ElevenLabs key', optional: true, needs: env.PROVIDER_TTS === 'elevenlabs' },
    { key: 'AZURE_SPEECH_KEY',   label: 'Azure key',      optional: true, needs: env.PROVIDER_TTS === 'azure' },
    { key: 'PROVIDER_IMAGE', label: 'Image provider',  optional: false },
    { key: 'FALAI_API_KEY',  label: 'fal.ai key',      optional: true,  needs: env.PROVIDER_IMAGE === 'falai' },
    { key: 'REPLICATE_API_KEY', label: 'Replicate key', optional: true, needs: env.PROVIDER_IMAGE === 'replicate' },
    { key: 'PUBLISH_WEBHOOK_URL', label: 'Publish webhook URL', optional: true },
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

  ✅  No keys are required to make videos.
      Your IDE writes the scenes — FrameForge uses free providers by default:
        • edge-tts  — free voice (no account)
        • pollinations — free images (no account)
        • FFmpeg — free local render (already on your machine)

      You only need keys for the auto-research pipeline (FrameForge writes the
      script itself). Skip those sections if you plan to write scenes yourself.
`);

  const cfg = {};

  // ── LLM ──────────────────────────────────────────────────────────────────
  section('1 / 5  —  LLM Provider  (research + script generation)');
  console.log('  Used for: researching topics, writing scripts, fact-checking.');
  console.log('  ⚡ SKIP THIS if your IDE agent writes the scenes (most common path).');
  console.log('  Free option: Groq (no credit card needed for free tier).\n');

  cfg.PROVIDER_LLM = await menu('Choose LLM provider', [
    ['skip',       '⏭  Skip — I write my own scenes (most common, no key needed)'],
    ['groq',       'Groq — free, fast (llama-3.3-70b). Get key: console.groq.com'],
    ['cerebras',   'Cerebras — fastest inference (2000+ tok/s). Get key: cloud.cerebras.ai'],
    ['gemini',     'Google Gemini 2.0 Flash — free tier. Get key: aistudio.google.com'],
    ['openrouter', 'OpenRouter — all models with one key. Get key: openrouter.ai'],
    ['anthropic',  'Anthropic Claude Sonnet 4.5. Get key: console.anthropic.com'],
    ['mistral',    'Mistral Large. Get key: console.mistral.ai'],
    ['together',   'Together AI Llama-3.3-70B-Turbo. Get key: api.together.ai'],
    ['openai',     'OpenAI GPT-4o. Get key: platform.openai.com'],
    ['ollama',     'Ollama — fully local, no key needed. Install: ollama.com'],
    ['webhook',    'Custom/VoxForge/any OpenAI-compatible endpoint'],
  ], 'skip');

  if (cfg.PROVIDER_LLM === 'skip') {
    console.log('  ✅  LLM skipped — your IDE will write scenes via create_video_from_script.\n');
    cfg.PROVIDER_LLM = undefined; // don't write to config
  } else if (cfg.PROVIDER_LLM === 'groq') {
    cfg.GROQ_API_KEY = await askSecret('  Groq API key (starts with gsk_)');
  } else if (cfg.PROVIDER_LLM === 'cerebras') {
    cfg.CEREBRAS_API_KEY = await askSecret('  Cerebras API key');
  } else if (cfg.PROVIDER_LLM === 'openrouter') {
    cfg.OPENROUTER_API_KEY = await askSecret('  OpenRouter API key (starts with sk-or-)');
    cfg.LLM_MODEL = await ask('  Model to use (leave blank for claude-sonnet-4-5)', '');
  } else if (cfg.PROVIDER_LLM === 'anthropic') {
    cfg.ANTHROPIC_API_KEY = await askSecret('  Anthropic API key (starts with sk-ant-)');
  } else if (cfg.PROVIDER_LLM === 'gemini') {
    cfg.GEMINI_API_KEY = await askSecret('  Gemini API key');
  } else if (cfg.PROVIDER_LLM === 'mistral') {
    cfg.MISTRAL_API_KEY = await askSecret('  Mistral API key');
  } else if (cfg.PROVIDER_LLM === 'together') {
    cfg.TOGETHER_API_KEY = await askSecret('  Together AI API key');
  } else if (cfg.PROVIDER_LLM === 'openai') {
    cfg.OPENAI_API_KEY = await askSecret('  OpenAI API key (starts with sk-)');
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

  // ── Publish webhook ────────────────────────────────────────────────────────
  section('4 / 4  —  Publish Webhook  (optional)');
  console.log('  Used for: receiving a JSON summary after each video is published.');
  console.log('  POST is sent to PUBLISH_WEBHOOK_URL with productionId, masterPath, title, etc.');
  console.log('  Works with n8n, Make, Zapier, or any HTTP endpoint.\n');

  const wantWebhook = await ask('  Enable publish webhook? (y/n)', 'n');
  if (wantWebhook.toLowerCase() === 'y') {
    cfg.PUBLISH_WEBHOOK_URL = await ask('  Webhook URL');
  }

  const wantReviewNotify = await ask('  Enable fact-check review notifications? (y/n)', 'n');
  if (wantReviewNotify.toLowerCase() === 'y') {
    cfg.REVIEW_NOTIFY_URL = await ask('  Review notify URL');
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
    '# ── LLM ─────────────────────────────────────────────────────────': ['PROVIDER_LLM','GROQ_API_KEY','CEREBRAS_API_KEY','OPENROUTER_API_KEY','ANTHROPIC_API_KEY','GEMINI_API_KEY','MISTRAL_API_KEY','TOGETHER_API_KEY','OPENAI_API_KEY','OLLAMA_BASE_URL','OLLAMA_MODEL','WEBHOOK_LLM_URL','WEBHOOK_LLM_HEADERS','WEBHOOK_LLM_RESPONSE_PATH','LLM_MODEL'],
    '# ── TTS ─────────────────────────────────────────────────────────': ['PROVIDER_TTS','ELEVENLABS_API_KEY','ELEVENLABS_VOICE_ID','AZURE_SPEECH_KEY','AZURE_SPEECH_REGION','WEBHOOK_TTS_URL','WEBHOOK_TTS_RESPONSE','WEBHOOK_TTS_RESPONSE_PATH','TTS_VOICE','TTS_RATE'],
    '# ── Image generation ─────────────────────────────────────────────': ['PROVIDER_IMAGE','FALAI_API_KEY','REPLICATE_API_KEY','WEBHOOK_IMAGE_URL','WEBHOOK_IMAGE_RESPONSE','WEBHOOK_IMAGE_RESPONSE_PATH','POLLINATIONS_MODEL'],
    '# ── Delivery webhooks ────────────────────────────────────────────': ['PUBLISH_WEBHOOK_URL','REVIEW_NOTIFY_URL'],
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

  // Also write to ~/.frameforge/config.json so `npx frameforge-mcp` picks up
  // the keys from any directory without a .env file in the project root.
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    // Merge into existing config (preserves keys not set in this wizard run)
    let existing = {};
    if (fs.existsSync(CONFIG_FILE)) {
      try { existing = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch { existing = {}; }
    }
    const merged = { ...existing, ...cfg };
    // Omit blank values
    for (const k of Object.keys(merged)) {
      if (!merged[k]) delete merged[k];
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
    console.log(`\n✅  Keys saved to: ${outPath}`);
    console.log(`    Keys also saved to: ${CONFIG_FILE}  (used by npx frameforge-mcp)`);
  } catch (cfgErr) {
    console.log(`\n✅  .env written to: ${outPath}`);
    console.warn(`    (Could not write global config: ${cfgErr.message})`);
  }

  // Detect whether running via npx (package in npm cache) or from a cloned repo.
  // When run via npx the file lives inside npm's temp cache, not under a project path.
  const isNpx = __filename.includes('_npx') || __filename.includes(path.join('npm', 'cache'));
  console.log(`\n    Next steps:`);
  if (isNpx) {
    console.log(`    1. Validate keys:     npx frameforge-doctor`);
    console.log(`    2. Add to your IDE:   see https://github.com/AMG555/FrameForge#connect-your-ide`);
    console.log(`    3. Generate a video:  npx frameforge --topic "Your topic"`);
  } else {
    console.log(`    1. Review the file:   cat ${outFile}`);
    console.log(`    2. Validate keys:     npm run doctor`);
    console.log(`    3. Generate a video:  npm run make -- --topic "Your topic"`);
  }
  console.log('');

  rl.close();
}

main().catch(err => {
  console.error(`\n❌  Setup wizard failed: ${err.message}\n`);
  rl.close();
  process.exit(1);
});

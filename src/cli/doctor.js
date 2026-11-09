#!/usr/bin/env node
// Load keys from ~/.frameforge/config.json before any env checks
require('../config/load-config').loadConfig();
/**
 * FrameForge System Doctor — Pre-flight Environment Diagnostics
 *
 * Verifies all required and optional runtime dependencies for running
 * FrameForge locally on Windows, macOS, or Linux.
 *
 * Run: npm run doctor (or: node src/cli/doctor.js)
 */

'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red:   '\x1b[31m',
  yellow:'\x1b[33m',
  cyan:  '\x1b[36m',
  bold:  '\x1b[1m',
};

function pass(name, detail = '') {
  console.log(`  ${COLORS.green}✔${COLORS.reset} ${COLORS.bold}${name}${COLORS.reset} ${COLORS.cyan}${detail}${COLORS.reset}`);
}

function warn(name, detail = '', fix = '') {
  console.log(`  ${COLORS.yellow}⚠${COLORS.reset} ${COLORS.bold}${name}${COLORS.reset} ${detail}`);
  if (fix) console.log(`    ${COLORS.yellow}↳ Fix:${COLORS.reset} ${fix}`);
}

function fail(name, detail = '', fix = '') {
  console.log(`  ${COLORS.red}✖${COLORS.reset} ${COLORS.bold}${name}${COLORS.reset} ${detail}`);
  if (fix) console.log(`    ${COLORS.red}↳ Fix:${COLORS.reset} ${fix}`);
}

console.log(`\n${COLORS.bold}${COLORS.cyan}=== FrameForge System Doctor ===${COLORS.reset}\n`);

let hasCriticalFailure = false;

// 1. Node.js Version
const nodeVer = process.version;
const major = parseInt(nodeVer.replace('v', '').split('.')[0], 10);
if (major >= 18) {
  pass('Node.js', `${nodeVer} (>= 18 required)`);
} else {
  fail('Node.js', `${nodeVer} is outdated`, 'Install Node.js 18 or 20+ from https://nodejs.org');
  hasCriticalFailure = true;
}

// 2. FFmpeg
const ffmpeg = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8', timeout: 5000, shell: process.platform === 'win32' });
if (ffmpeg.status === 0) {
  const firstLine = (ffmpeg.stdout || '').split('\n')[0] || '';
  pass('FFmpeg', firstLine.slice(0, 45));
} else {
  fail('FFmpeg', 'Not found in PATH', 'Download FFmpeg from https://ffmpeg.org/download.html and add bin/ to PATH');
  hasCriticalFailure = true;
}

// 3. FFprobe
const ffprobe = spawnSync('ffprobe', ['-version'], { encoding: 'utf8', timeout: 5000, shell: process.platform === 'win32' });
if (ffprobe.status === 0) {
  const firstLine = (ffprobe.stdout || '').split('\n')[0] || '';
  pass('FFprobe', firstLine.slice(0, 45));
} else {
  fail('FFprobe', 'Not found in PATH', 'FFprobe usually installs alongside FFmpeg. Ensure both are in PATH');
  hasCriticalFailure = true;
}

// 4. Voice Engine (edge-tts, VoxForge, or Cloud API)
const edgeTts = spawnSync('edge-tts', ['--version'], { encoding: 'utf8', timeout: 5000, shell: process.platform === 'win32' });
const hasCloudTts = Boolean(
  process.env.ELEVENLABS_API_KEY ||
  process.env.AZURE_SPEECH_KEY ||
  process.env.OPENAI_API_KEY ||
  process.env.CUSTOM_TTS_URL ||
  process.env.WEBHOOK_TTS_URL ||
  process.env.VOXFORGE_URL
);

if (edgeTts.status === 0) {
  pass('Voice Engine', `edge-tts CLI available (${(edgeTts.stdout || '').trim()})`);
} else if (hasCloudTts) {
  pass('Voice Engine', 'TTS provider (VoxForge or Cloud API) configured via environment');
} else {
  warn(
    'Voice Engine',
    'Neither edge-tts CLI nor configured TTS provider detected',
    'Run "pip install edge-tts" for free offline voiceover, set VOXFORGE_URL (VoxForge), or set OPENAI_API_KEY / ELEVENLABS_API_KEY in .env'
  );
}

// 5. Playwright / Chromium (required for code-driven animation — Path 2)
const playwright = spawnSync('node', ['-e', "require('playwright')"], {
  encoding: 'utf8', timeout: 5000,
  // Look in the project's own node_modules first (how it ships in the npm package)
  cwd: path.resolve(__dirname, '../..'),
});
const playwrightGlobal = spawnSync('node', ['-e', "require('playwright')"], {
  encoding: 'utf8', timeout: 5000,
});
const hasPlaywright = playwright.status === 0 || playwrightGlobal.status === 0;

// Check for a locally installed Chromium browser
const chromiumPaths = [
  path.join(require('os').homedir(), '.cache', 'ms-playwright'),   // Linux / macOS default
  path.join(process.env.LOCALAPPDATA || '', 'ms-playwright'),       // Windows
  path.join(require('os').homedir(), 'Library', 'Caches', 'ms-playwright'), // macOS alt
];
const hasChromium = chromiumPaths.some(p => { try { return require('fs').readdirSync(p).length > 0; } catch { return false; } });

if (hasPlaywright && hasChromium) {
  pass('Playwright', 'playwright package + Chromium browser installed (code-driven animation ready)');
} else if (hasPlaywright && !hasChromium) {
  warn('Playwright', 'playwright package found but Chromium browser not installed',
    'Run in your animation project dir: npx playwright install chromium');
} else {
  warn('Playwright', 'Not installed — required for code-driven animation (Path 2)',
    'Run in your animation project dir: npm install playwright && npx playwright install chromium\n' +
    '    (Path 1 via create_video_from_script does not need Playwright)');
}

// 6. System Font (for video subtitles/captions)
const FONT_CANDIDATES = [
  'C:\\Windows\\Fonts\\arialbd.ttf',
  'C:\\Windows\\Fonts\\calibrib.ttf',
  'C:\\Windows\\Fonts\\segoeui.ttf',
  '/System/Library/Fonts/Helvetica.ttc',
  '/Library/Fonts/Arial Bold.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/liberation/LiberationSans-Bold.ttf',
];

const foundFont = process.env.FFMPEG_FONT || FONT_CANDIDATES.find(f => fs.existsSync(f));
if (foundFont) {
  pass('System Font', foundFont);
} else {
  warn(
    'System Font',
    'No standard bold font file found',
    'Subtitles may be skipped. Set FFMPEG_FONT=/path/to/font.ttf or install Liberation/Arial font'
  );
}

// 6. LLM Provider (Research & Scriptwriting)
const llmProvider = (process.env.PROVIDER_LLM || 'groq').toLowerCase();

// Built-in key env vars — any unknown provider can also supply LLM_BASE_URL or WEBHOOK_LLM_URL
const builtinKeyMap = {
  groq:       process.env.GROQ_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY,
  anthropic:  process.env.ANTHROPIC_API_KEY,
  gemini:     process.env.GEMINI_API_KEY,
  mistral:    process.env.MISTRAL_API_KEY,
  together:   process.env.TOGETHER_API_KEY,
  cerebras:   process.env.CEREBRAS_API_KEY,
  openai:     process.env.OPENAI_API_KEY,
  ollama:     'local',
  webhook:    process.env.WEBHOOK_LLM_URL,
};

const hasLLMKey = Boolean(
  builtinKeyMap[llmProvider] ||  // known built-in provider has a key
  process.env.LLM_BASE_URL    ||  // custom OpenAI-compatible endpoint
  process.env.WEBHOOK_LLM_URL ||  // webhook provider
  llmProvider === 'ollama'        // ollama needs no key
);

const customModel    = process.env.LLM_MODEL    ? ` model=${process.env.LLM_MODEL}`    : '';
const customEndpoint = process.env.LLM_BASE_URL ? ` endpoint=${process.env.LLM_BASE_URL}` : '';

if (hasLLMKey) {
  pass('LLM Provider', `${llmProvider}${customModel}${customEndpoint}`);
} else {
  warn(
    'LLM Provider',
    `PROVIDER_LLM=${llmProvider} but no API key found`,
    `Run: npm run setup   OR   set the required key in .env\n` +
    `    Free options: GROQ_API_KEY (groq) · GEMINI_API_KEY (gemini) · CEREBRAS_API_KEY (cerebras)\n` +
    `    Any OpenAI-compatible API: set LLM_BASE_URL + PROVIDER_LLM=webhook`
  );
}

// 7. Output directory check
const baseDir = process.env.N8N_FILES_DIR || path.join(process.cwd(), '.frameforge-files');
try {
  fs.mkdirSync(baseDir, { recursive: true });
  fs.accessSync(baseDir, fs.constants.W_OK);
  pass('Working Dir', baseDir);
} catch (err) {
  fail('Working Dir', `Cannot write to ${baseDir}: ${err.message}`, 'Check disk permissions or set N8N_FILES_DIR');
  hasCriticalFailure = true;
}

console.log('\n----------------------------------------');
if (hasCriticalFailure) {
  console.log(`${COLORS.red}${COLORS.bold}✖ FrameForge has missing critical dependencies above.${COLORS.reset}\n`);
  process.exit(1);
} else {
  console.log(`${COLORS.green}${COLORS.bold}✔ FrameForge is ready for local video production!${COLORS.reset}\n`);
  console.log(`Quick run:\n  ${COLORS.cyan}npm run make -- --topic "Why Did Ancient Humans Wear Clothes?"${COLORS.reset}\n`);
  process.exit(0);
}

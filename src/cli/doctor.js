#!/usr/bin/env node
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
const ffmpeg = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
if (ffmpeg.status === 0) {
  const firstLine = (ffmpeg.stdout || '').split('\n')[0] || '';
  pass('FFmpeg', firstLine.slice(0, 45));
} else {
  fail('FFmpeg', 'Not found in PATH', 'Download FFmpeg from https://ffmpeg.org/download.html and add bin/ to PATH');
  hasCriticalFailure = true;
}

// 3. FFprobe
const ffprobe = spawnSync('ffprobe', ['-version'], { encoding: 'utf8' });
if (ffprobe.status === 0) {
  const firstLine = (ffprobe.stdout || '').split('\n')[0] || '';
  pass('FFprobe', firstLine.slice(0, 45));
} else {
  fail('FFprobe', 'Not found in PATH', 'FFprobe usually installs alongside FFmpeg. Ensure both are in PATH');
  hasCriticalFailure = true;
}

// 4. Voice Engine (edge-tts or Cloud API)
const edgeTts = spawnSync('edge-tts', ['--version'], { encoding: 'utf8' });
const hasCloudTts = Boolean(process.env.ELEVENLABS_API_KEY || process.env.AZURE_SPEECH_KEY || process.env.OPENAI_API_KEY || process.env.CUSTOM_TTS_URL);

if (edgeTts.status === 0) {
  pass('Voice Engine', `edge-tts CLI available (${(edgeTts.stdout || '').trim()})`);
} else if (hasCloudTts) {
  pass('Voice Engine', 'Cloud TTS API configured via environment');
} else {
  warn(
    'Voice Engine',
    'Neither edge-tts CLI nor cloud TTS API detected',
    'Run "pip install edge-tts" for free offline voiceover, or set OPENAI_API_KEY / ELEVENLABS_API_KEY in .env'
  );
}

// 5. System Font (for video subtitles/captions)
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

// 6. LLM API Key (for Research & Scriptwriting)
const hasLLM = Boolean(
  process.env.GROQ_API_KEY ||
  process.env.OPENAI_API_KEY ||
  process.env.WATSONX_API_KEY ||
  process.env.LLM_BASE_URL
);

if (hasLLM) {
  pass('LLM Provider', 'API credential or custom endpoint detected');
} else {
  warn(
    'LLM Provider',
    'No LLM API key detected in environment',
    'Set GROQ_API_KEY (free at console.groq.com) or OPENAI_API_KEY in .env'
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

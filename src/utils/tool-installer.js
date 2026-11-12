/**
 * tool-installer.js — Automatic Dependency Provisioning for FrameForge
 *
 * Automatically checks and installs required runtime tools on demand:
 *   - edge-tts (free broadcast-grade neural TTS)
 *   - yt-dlp (video/audio downloader)
 *   - whisper (word-level transcription & silence alignment)
 *   - playwright chromium (headless browser for code-driven animation)
 *
 * Ensures smooth zero-config experience: users run an npm command and
 * FrameForge automatically fetches missing binaries/packages if needed.
 */

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Check if a command is executable on PATH
 * @param {string} cmd
 * @param {string[]} args
 * @returns {boolean}
 */
function isCommandAvailable(cmd, args = ['--version']) {
  try {
    const res = spawnSync(cmd, args, {
      encoding: 'utf8',
      timeout: 4000,
      shell: false,
    });
    return res.status === 0;
  } catch (_) {
    return false;
  }
}

/**
 * Run a package installation command synchronously with progress logging
 * @param {string} cmd
 * @param {string[]} args
 * @param {string} toolName
 * @returns {boolean}
 */
function runInstallCommand(cmd, args, toolName) {
  console.log(`[ToolInstaller] 📦 Auto-installing missing dependency: ${toolName}...`);
  try {
    const res = spawnSync(cmd, args, {
      stdio: 'inherit',
      timeout: 180000, // 3 min cap
      shell: false,
    });
    const ok = res.status === 0;
    if (ok) {
      console.log(`[ToolInstaller] ✔ Successfully installed ${toolName}`);
    } else {
      console.warn(`[ToolInstaller] ⚠️ Automatic install of ${toolName} exited with code ${res.status}`);
    }
    return ok;
  } catch (err) {
    console.warn(`[ToolInstaller] ⚠️ Failed to auto-install ${toolName}: ${err.message}`);
    return false;
  }
}

/**
 * Ensure edge-tts is installed. Auto-installs via pip if missing.
 * @returns {boolean}
 */
function ensureEdgeTts() {
  if (isCommandAvailable('edge-tts')) return true;

  console.log('[ToolInstaller] edge-tts CLI not found. Attempting auto-install...');
  // Try python -m pip first, then bare pip
  if (isCommandAvailable('python', ['-m', 'pip', '--version'])) {
    if (runInstallCommand('python', ['-m', 'pip', 'install', '--quiet', 'edge-tts'], 'edge-tts')) {
      return isCommandAvailable('edge-tts');
    }
  }
  if (isCommandAvailable('pip', ['--version'])) {
    if (runInstallCommand('pip', ['install', '--quiet', 'edge-tts'], 'edge-tts')) {
      return isCommandAvailable('edge-tts');
    }
  }
  return false;
}

/**
 * Ensure yt-dlp is installed. Auto-installs via pip if missing.
 * @returns {boolean}
 */
function ensureYtDlp() {
  if (isCommandAvailable('yt-dlp')) return true;

  console.log('[ToolInstaller] yt-dlp not found. Attempting auto-install...');
  if (isCommandAvailable('python', ['-m', 'pip', '--version'])) {
    if (runInstallCommand('python', ['-m', 'pip', 'install', '--quiet', 'yt-dlp'], 'yt-dlp')) {
      return isCommandAvailable('yt-dlp');
    }
  }
  if (isCommandAvailable('pip', ['--version'])) {
    if (runInstallCommand('pip', ['install', '--quiet', 'yt-dlp'], 'yt-dlp')) {
      return isCommandAvailable('yt-dlp');
    }
  }
  return false;
}

/**
 * Ensure whisper is installed. Auto-installs via pip if missing.
 * @returns {boolean}
 */
function ensureWhisper() {
  // Check if python has whisper module
  const check = spawnSync('python', ['-c', 'import whisper; print("ok")'], {
    encoding: 'utf8',
    timeout: 4000,
    shell: process.platform === 'win32',
  });
  if (check.status === 0 && (check.stdout || '').includes('ok')) return true;

  console.log('[ToolInstaller] Whisper engine not found. Attempting auto-install (openai-whisper)...');
  if (isCommandAvailable('python', ['-m', 'pip', '--version'])) {
    if (runInstallCommand('python', ['-m', 'pip', 'install', '--quiet', 'openai-whisper'], 'openai-whisper')) {
      return true;
    }
  }
  return false;
}

/**
 * Ensure Playwright Chromium browser is installed.
 * @returns {boolean}
 */
function ensurePlaywrightChromium() {
  console.log('[ToolInstaller] Checking/installing Chromium browser for Playwright...');
  return runInstallCommand('npx', ['playwright', 'install', 'chromium'], 'Chromium (Playwright)');
}

/**
 * Auto-install all recommended dependencies at once
 */
function autoInstallAll() {
  console.log('\n=== FrameForge Tool Provisioner ===\n');
  const ttsOk    = ensureEdgeTts();
  const ytdlpOk  = ensureYtDlp();
  const crOk     = ensurePlaywrightChromium();
  console.log(`\nResults: edge-tts: ${ttsOk ? '✔' : '✖'}, yt-dlp: ${ytdlpOk ? '✔' : '✖'}, chromium: ${crOk ? '✔' : '✖'}\n`);
  return { ttsOk, ytdlpOk, crOk };
}

module.exports = {
  isCommandAvailable,
  ensureEdgeTts,
  ensureYtDlp,
  ensureWhisper,
  ensurePlaywrightChromium,
  autoInstallAll,
};

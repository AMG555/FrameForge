/**
 * media-downloader.js — yt-dlp & URL Media Ingestion for FrameForge
 *
 * Downloads video and audio assets from YouTube, Vimeo, social media,
 * or direct web URLs using yt-dlp, saving into .frameforge-files/downloads/.
 */

'use strict';

const { spawnSync } = require('child_process');
const path          = require('path');
const os            = require('os');
const fs            = require('fs');
const crypto        = require('crypto');

const DEFAULT_FILES_DIR = process.env.N8N_FILES_DIR || path.join(os.homedir(), '.frameforge-files');
const DOWNLOADS_DIR = path.join(DEFAULT_FILES_DIR, 'downloads');

/**
 * Check if a string is a valid HTTP/HTTPS URL
 */
function isWebUrl(str) {
  if (typeof str !== 'string') return false;
  try {
    const u = new URL(str.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

/**
 * Detect if yt-dlp binary is available on PATH
 */
function detectYtDlp() {
  try {
    const res = spawnSync('yt-dlp', ['--version'], {
      encoding: 'utf8',
      timeout: 3000,
      shell: false,
    });
    return res.status === 0;
  } catch (_) {
    return false;
  }
}

/**
 * Download a media stream via yt-dlp
 *
 * @param {string} url - Target web URL (YouTube, Vimeo, Twitter, direct MP4, etc.)
 * @param {object} [opts]
 * @param {string} [opts.outputDir] - Target directory (defaults to .frameforge-files/downloads)
 * @param {'video'|'audio'} [opts.format='video'] - Download video or audio-only
 * @param {number} [opts.maxDuration=600] - Safety duration clamp in seconds
 * @param {string} [opts.filename] - Custom output filename
 * @returns {{ success: boolean, localPath: string, title?: string, duration?: number }}
 */
function downloadMediaWithYtDlp(url, opts = {}) {
  if (!isWebUrl(url)) {
    throw new Error(`Invalid web URL: ${url}`);
  }

  const outDir = opts.outputDir || DOWNLOADS_DIR;
  fs.mkdirSync(outDir, { recursive: true });

  const urlHash = crypto.createHash('sha256').update(url).digest('hex').slice(0, 10);
  const targetFormat = opts.format === 'audio' ? 'audio' : 'video';
  const outBase = opts.filename ? opts.filename.replace(/\.[^.]+$/, '') : `dl_${urlHash}_${Date.now()}`;
  const outTemplate = path.join(outDir, `${outBase}.%(ext)s`);

  const isWin = process.platform === 'win32';

  // Build safe yt-dlp argument array
  const args = [
    '--no-playlist',
    '--no-warnings',
    '--max-filesize', '500M',
  ];

  if (targetFormat === 'audio') {
    args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
  } else {
    // 1080p max to guarantee fast local rendering
    args.push(
      '-f', 'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '--merge-output-format', 'mp4'
    );
  }

  // Auto-download subtitles / captions if requested
  if (opts.subtitles) {
    args.push('--write-subs', '--write-auto-subs', '--sub-lang', opts.subLang || 'en', '--convert-subs', 'srt');
  }

  args.push('-o', outTemplate, url);

  if (!detectYtDlp()) {
    const { ensureYtDlp } = require('./tool-installer');
    if (!ensureYtDlp()) {
      throw new Error('yt-dlp is not installed and auto-install failed. Run: pip install yt-dlp');
    }
  }

  const res = spawnSync('yt-dlp', args, {
    encoding: 'utf8',
    timeout: 180000, // 3 min max
    shell: false,
  });

  if (res.status !== 0) {
    const errMsg = (res.stderr || res.stdout || 'yt-dlp failed').trim().slice(0, 300);
    throw new Error(`yt-dlp download failed: ${errMsg}`);
  }

  // Find generated file matching outBase
  const files = fs.readdirSync(outDir);
  const matched = files.find(f => f.startsWith(outBase));
  if (!matched) {
    throw new Error(`Downloaded file not found in ${outDir} matching ${outBase}`);
  }

  const localPath = path.join(outDir, matched);

  // Probe media metadata using ffprobe if available
  let duration = 0;
  let width = 0;
  let height = 0;
  try {
    const probe = spawnSync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration:stream=width,height',
      '-of', 'json',
      localPath,
    ], { encoding: 'utf8', timeout: 5000, shell: isWin });

    if (probe.status === 0) {
      const data = JSON.parse(probe.stdout);
      duration = parseFloat(data.format?.duration || 0);
      const vStream = (data.streams || []).find(s => s.width && s.height);
      if (vStream) {
        width = parseInt(vStream.width, 10);
        height = parseInt(vStream.height, 10);
      }
    }
  } catch (_) {}

  // Find subtitle file if generated
  const subFile = files.find(f => f.startsWith(outBase) && (f.endsWith('.srt') || f.endsWith('.vtt')));
  const subtitlePath = subFile ? path.join(outDir, subFile) : null;

  return {
    success: true,
    localPath,
    subtitlePath,
    duration,
    width,
    height,
    format: targetFormat,
    url,
  };
}

module.exports = {
  isWebUrl,
  detectYtDlp,
  downloadMediaWithYtDlp,
  DOWNLOADS_DIR,
};

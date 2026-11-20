/**
 * FrameForge — Live Stream & Broadcast Clipping Engine
 *
 * Provides capture, highlight scoring, reframe layout, libass subtitles,
 * and pre-publish QA validation for long livestreams, news broadcasts,
 * debates, podcasts, and gaming streams.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { isCommandAvailable, ensureClippingTools } = require('../utils/tool-installer');

const IS_WIN = process.platform === 'win32';
const PYTHON_CMD = IS_WIN ? (which('python') || which('py') || 'python') : (which('python3') || 'python3');

function which(cmd) {
  try {
    const res = spawnSync(IS_WIN ? 'where' : 'which', [cmd], { encoding: 'utf8', timeout: 3000 });
    if (res.status === 0 && res.stdout.trim()) {
      return res.stdout.trim().split(/\r?\n/)[0];
    }
  } catch (_) {}
  return null;
}

/**
 * Probe a media file and return JSON stream/format information.
 */
function probeMedia(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist for probe: ${filePath}`);
  }
  const res = spawnSync('ffprobe', [
    '-v', 'error',
    '-show_streams',
    '-show_format',
    '-of', 'json',
    filePath,
  ], { encoding: 'utf8', timeout: 15000 });

  if (res.status !== 0) {
    throw new Error(`ffprobe failed on ${filePath}: ${res.stderr || res.stdout}`);
  }
  return JSON.parse(res.stdout);
}

/**
 * Capture a targeted section of a VOD or live stream to disk.
 */
function captureVod({ url, start, end, outputPath, cookies = null, format = 'mp4' } = {}) {
  if (!url) throw new Error('url is required for captureVod');
  if (!outputPath) throw new Error('outputPath is required for captureVod');

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // On-demand tool provisioning: ensure yt-dlp is available when stream capture is called
  if (!isCommandAvailable('yt-dlp')) {
    console.log('[StreamClipper] 📥 Stream clipping requested: installing yt-dlp on demand...');
    ensureClippingTools({ verbose: true });
    if (!isCommandAvailable('yt-dlp')) {
      throw new Error('yt-dlp is required for stream/VOD clipping. Automatic installation failed. Run: pip install yt-dlp');
    }
  }

  const args = ['--no-playlist', '--no-warnings'];
  if (cookies) {
    args.push('--cookies-from-browser', cookies);
  }

  // Sliced download
  if (typeof start === 'number' && typeof end === 'number') {
    const s = Math.max(0, start).toFixed(2);
    const e = Math.max(start + 1, end).toFixed(2);
    args.push('--download-sections', `*${s}-${e}`);
  }

  args.push(
    '-f', 'bv*[height<=1080][vcodec^=avc1]+ba/bv*[height<=1080]+ba/b[height<=1080]/bv*+ba/b',
    '--merge-output-format', format,
    '-o', outputPath,
    url
  );

  const res = spawnSync('yt-dlp', args, { encoding: 'utf8', timeout: 30 * 60 * 1000 });
  if (res.status !== 0 && !fs.existsSync(outputPath)) {
    throw new Error(`yt-dlp capture failed: ${res.stderr || res.stdout}`);
  }

  if (!fs.existsSync(outputPath)) {
    throw new Error(`Capture finished but output file not found at ${outputPath}`);
  }

  const info = probeMedia(outputPath);
  const dur = parseFloat(info.format?.duration || 0);
  const hasAudio = (info.streams || []).some(s => s.codec_type === 'audio');
  const hasVideo = (info.streams || []).some(s => s.codec_type === 'video');

  if (dur < 3.0) {
    throw new Error(`Captured stream section is too short (${dur.toFixed(1)}s < 3.0s)`);
  }
  if (!hasAudio) {
    throw new Error('Captured stream section contains no audio stream');
  }

  return {
    success: true,
    outputPath,
    durationSec: dur,
    hasAudio,
    hasVideo,
    sizeBytes: fs.statSync(outputPath).size,
  };
}

/**
 * Score chat velocity and detect reaction bursts from a chat log or replay.
 */
function scoreChatVelocity(chatFilePath, { bucketSec = 10, spikeMult = 2.5 } = {}) {
  const scriptPath = path.resolve(__dirname, '../../plugins/stream-clipping/scripts/chat_velocity.py');
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`chat_velocity.py not found at ${scriptPath}`);
  }

  const res = spawnSync(PYTHON_CMD, [
    scriptPath,
    chatFilePath,
    '--bucket-sec', String(bucketSec),
    '--spike-multiplier', String(spikeMult),
  ], { encoding: 'utf8', timeout: 30000 });

  if (res.status !== 0) {
    throw new Error(`chat_velocity analysis failed: ${res.stderr || res.stdout}`);
  }

  return JSON.parse(res.stdout);
}

/**
 * Execute an OBS Studio WebSocket command.
 */
function obsCommand({ action = 'status', host = 'localhost', port = 4455, password = '', timeout = 12 } = {}) {
  const scriptPath = path.resolve(__dirname, '../../plugins/stream-clipping/scripts/obs_replay.py');
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`obs_replay.py not found at ${scriptPath}`);
  }

  const res = spawnSync(PYTHON_CMD, [
    scriptPath,
    action,
    '--host', host,
    '--port', String(port),
    '--password', password || process.env.OBS_WS_PASSWORD || '',
    '--timeout', String(timeout),
  ], { encoding: 'utf8', timeout: (timeout + 5) * 1000 });

  if (res.status !== 0) {
    throw new Error(`OBS command '${action}' failed: ${res.stderr || res.stdout}`);
  }

  return JSON.parse(res.stdout);
}

/**
 * Cut, reframe, apply audio mastering, and burn subtitles into a clip.
 */
function cutAndReframeClip({
  sourcePath,
  outputPath,
  start = 0,
  end = null,
  layout = 'blur', // blur | crop | stack | landscape
  targetAspect = '9:16', // 9:16 | 16:9
  title = null,
  subtitles = null, // array of { start, end, text } or path to ASS/SRT file
  loudnorm = true,
  crf = 18,
  preset = 'slow',
} = {}) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source video not found: ${sourcePath}`);
  }
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const probe = probeMedia(sourcePath);
  const duration = parseFloat(probe.format?.duration || 0);
  const effectiveEnd = (typeof end === 'number' && end > start) ? end : duration;
  const clipDur = effectiveEnd - start;

  if (clipDur < 5.0) {
    throw new Error(`Clip duration too short: ${clipDur.toFixed(1)}s (min 5.0s)`);
  }

  let filterComplex = '';
  const isPortrait = targetAspect === '9:16';

  if (!isPortrait || layout === 'landscape') {
    // 16:9 Landscape Mode
    filterComplex = '[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[v]';
  } else if (layout === 'crop') {
    // 9:16 Saliency / Center Crop
    filterComplex = '[0:v]crop=ih*9/16:ih:(iw-ow)/2:0,scale=1080:1920[v]';
  } else if (layout === 'stack') {
    // 9:16 Stack Mode (Top facecam, bottom game/content)
    filterComplex = '[0:v]crop=iw:ih*0.5:0:0,scale=1080:960[top];[0:v]crop=iw:ih*0.5:0:ih*0.5,scale=1080:960[bot];[top][bot]vstack[v]';
  } else {
    // Default: Blur Backdrop (News, Broadcast & Chyron standard)
    filterComplex = '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5,eq=brightness=-0.15[bg];[0:v]scale=1080:608:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:336[v]';
  }

  // Kinetic title overlay with HarfBuzz shaping if title is passed
  if (title && typeof title === 'string') {
    const { buildCaptionFilter } = require('../video-editor/editor');
    const titleFilter = buildCaptionFilter(title);
    if (titleFilter) {
      filterComplex += `,${titleFilter}`;
    }
  }

  // Burn subtitle file if path is passed
  if (subtitles && typeof subtitles === 'string' && fs.existsSync(subtitles)) {
    const safeSubPath = subtitles.replace(/\\/g, '/').replace(/:/g, '\\:');
    filterComplex += `,subtitles='${safeSubPath}'`;
  }

  // Audio filter: loudnorm -14 LUFS + smooth 0.3s head/tail fades
  const fadeOutStart = Math.max(0, clipDur - 0.3).toFixed(2);
  let audioFilter = 'afade=t=in:ss=0:d=0.3,afade=t=out:st=' + fadeOutStart + ':d=0.3';
  if (loudnorm) {
    audioFilter = 'loudnorm=I=-14:TP=-1.5:LRA=11,' + audioFilter;
  }

  const ffmpegArgs = [
    '-y',
    '-nostdin',
    '-ss', String(start),
    '-t', String(clipDur),
    '-i', sourcePath,
    '-filter_complex', filterComplex,
    '-map', '[v]',
    '-map', '0:a?',
    '-af', audioFilter,
    '-c:v', 'libx264',
    '-preset', preset || 'slow',
    '-crf', String(crf || 18),
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    outputPath,
  ];

  const res = spawnSync('ffmpeg', ffmpegArgs, { encoding: 'utf8', timeout: 10 * 60 * 1000 });
  if (res.status !== 0 || !fs.existsSync(outputPath)) {
    throw new Error(`ffmpeg cutAndReframeClip failed: ${res.stderr || res.stdout}`);
  }

  return {
    success: true,
    outputPath,
    durationSec: clipDur,
    layout,
    targetAspect,
  };
}

/**
 * Strict quality gate for stream clips before export/publishing.
 */
function validateClip(clipPath, {
  minDuration = 8.0,
  maxDuration = 600.0,
  requiredAspect = null, // '9:16' | '16:9'
} = {}) {
  if (!fs.existsSync(clipPath)) {
    return {
      pass: false,
      hard_asserts: { file_exists: false },
      error: `Clip file not found: ${clipPath}`,
    };
  }

  let info;
  try {
    info = probeMedia(clipPath);
  } catch (err) {
    return { pass: false, error: err.message };
  }

  const vStream = (info.streams || []).find(s => s.codec_type === 'video');
  const aStream = (info.streams || []).find(s => s.codec_type === 'audio');
  const duration = parseFloat(info.format?.duration || 0);

  const durationOk = duration >= minDuration && duration <= maxDuration;
  const streamsOk = Boolean(vStream && aStream);
  const width = vStream ? vStream.width : 0;
  const height = vStream ? vStream.height : 0;

  let dimensionsOk = true;
  if (requiredAspect === '9:16') {
    dimensionsOk = width === 1080 && height === 1920;
  } else if (requiredAspect === '16:9') {
    dimensionsOk = width === 1920 && height === 1080;
  }

  // Probe audio volume levels
  let meanVolumeDb = -40;
  let maxVolumeDb = -40;
  let audioLevelOk = true;

  try {
    const volRes = spawnSync('ffmpeg', [
      '-nostdin',
      '-i', clipPath,
      '-af', 'volumedetect',
      '-f', 'null',
      IS_WIN ? 'NUL' : '/dev/null',
    ], { encoding: 'utf8', timeout: 15000 });

    const stderr = volRes.stderr || '';
    const meanMatch = stderr.match(/mean_volume:\s*(-?[\d.]+)\s*dB/);
    const maxMatch = stderr.match(/max_volume:\s*(-?[\d.]+)\s*dB/);
    if (meanMatch) meanVolumeDb = parseFloat(meanMatch[1]);
    if (maxMatch) maxVolumeDb = parseFloat(maxMatch[1]);

    // Hard assert: must not be silent (mean_volume > -35 dB, max_volume > -12 dB)
    if (meanVolumeDb <= -35.0 || maxVolumeDb <= -12.0) {
      audioLevelOk = false;
    }
  } catch (_) {
    audioLevelOk = false;
  }

  const pass = Boolean(durationOk && streamsOk && dimensionsOk && audioLevelOk);

  return {
    pass,
    hard_asserts: {
      duration_ok: durationOk,
      streams_ok: streamsOk,
      dimensions_ok: dimensionsOk,
      audio_level_ok: audioLevelOk,
    },
    metrics: {
      duration_sec: round(duration, 2),
      width,
      height,
      fps: vStream ? evalFps(vStream.r_frame_rate) : 0,
      mean_volume_db: meanVolumeDb,
      max_volume_db: maxVolumeDb,
    },
    retry_hint: pass ? null : (!audioLevelOk ? 'Check audio normalization or unmute source' : 'Verify aspect ratio or duration bounds'),
  };
}

/**
 * Discover recent or live streams for a given topic.
 */
function discoverStreams({ topic, count = 5, platform = 'youtube' } = {}) {
  if (!isCommandAvailable('yt-dlp')) {
    ensureClippingTools({ verbose: true });
  }

  const scriptPath = path.resolve(__dirname, '../../plugins/stream-clipping/scripts/streamclips.py');
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`streamclips.py not found at ${scriptPath}`);
  }

  const res = spawnSync(PYTHON_CMD, [
    scriptPath,
    'find',
    '--topic', topic || 'news',
    '--count', String(count),
  ], { encoding: 'utf8', timeout: 30000 });

  return {
    success: res.status === 0,
    output: res.stdout || res.stderr,
  };
}

function round(n, d) {
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
}

function evalFps(rateStr) {
  if (!rateStr) return 0;
  const parts = rateStr.split('/');
  if (parts.length === 2 && parseFloat(parts[1]) > 0) {
    return round(parseFloat(parts[0]) / parseFloat(parts[1]), 2);
  }
  return round(parseFloat(rateStr) || 0, 2);
}

module.exports = {
  probeMedia,
  captureVod,
  scoreChatVelocity,
  obsCommand,
  cutAndReframeClip,
  validateClip,
  discoverStreams,
};

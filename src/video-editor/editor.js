/**
 * VideoEditor — Autonomous Local Video Editor for FrameForge
 *
 * Full-featured local FFmpeg editor:
 * - Media probing (ffprobe)
 * - Timestamp parsing ("01:23.45", "83.45s", numeric seconds)
 * - Trimming, cutting, speed ramping (PTS + atempo chaining)
 * - Color grading (cinematic, warm, cool, vintage, bw, vibrant, cyberpunk)
 * - Re-framing / aspect-ratio conforming (16:9 landscape, 9:16 portrait, 1:1 square)
 * - Hardcoded / broadcast captions with HarfBuzz text shaping & multilingual support
 * - Clip audio volume adjustment and voiceover / narration mixing
 * - Multi-clip transitions using FFmpeg xfade (fade, dissolve, wipeleft, wiperight, slideup, slidedown, circleopen, etc.) and acrossfade
 * - End-to-end assemble pipeline (editAndAssemble) matching user audio, b-roll, background music with ducking
 * - Imperative operation dispatcher (applyOperations) for external_platform_call fallback
 */

'use strict';

const { spawnSync } = require('child_process');
const path          = require('path');
const os            = require('os');
const fs            = require('fs');
const crypto        = require('crypto');

const { AudioMixer }  = require('../audio-mixer/mixer');
const { resolveFont } = require('../video-renderer/renderer');

const DEFAULT_FILES_DIR = process.env.N8N_FILES_DIR || path.join(os.homedir(), '.frameforge-files');

// Supported color grading presets (all curves coordinates must be in [0, 1] range)
const COLOR_GRADES = {
  none: null,
  cinematic: "curves=m='0/0 0.25/0.2 0.75/0.8 1/1':r='0/0 0.5/0.53 1/1':b='0/0.03 0.5/0.48 1/0.97',eq=saturation=1.12:contrast=1.05",
  warm: "curves=r='0/0 0.5/0.55 1/1':b='0/0 0.5/0.45 1/0.92',eq=saturation=1.08",
  cool: "curves=b='0/0 0.5/0.56 1/1':r='0/0 0.5/0.46 1/0.94',eq=saturation=0.98",
  vintage: "curves=vintage,eq=contrast=0.95:saturation=0.85",
  bw: "hue=s=0,eq=contrast=1.15",
  monochrome: "hue=s=0,eq=contrast=1.15",
  vibrant: "eq=saturation=1.35:contrast=1.05",
  cyberpunk: "curves=r='0/0 0.5/0.45 1/1':b='0/0.08 0.5/0.58 1/1',eq=saturation=1.3:contrast=1.1",
  editorial_collage: "curves=vintage,eq=contrast=1.1:saturation=0.9",
  editorial: "curves=vintage,eq=contrast=1.1:saturation=0.9",
  product_launch: "curves=m='0/0 0.5/0.52 1/1':b='0/0 0.5/0.53 1/0.98',eq=contrast=1.08:saturation=1.05",
  retrovhs: "curves=vintage,hue=s=0.9,eq=contrast=1.1",
  anime: "curves=m='0/0 0.4/0.45 1/1',eq=saturation=1.4:contrast=1.12",
  scifi: "curves=r='0/0 0.5/0.46 1/1':b='0/0 0.5/0.56 1/1',eq=contrast=1.15:saturation=1.1",
  lofi: "curves=m='0/0.05 0.5/0.5 1/0.95',eq=saturation=0.9:contrast=0.95",
};

// Supported transition types in FFmpeg xfade
const VALID_TRANSITIONS = new Set([
  'fade', 'wipeleft', 'wiperight', 'wipeup', 'wipedown',
  'slideleft', 'slideright', 'slideup', 'slidedown',
  'circlecrop', 'rectcrop', 'distance', 'fadeblack', 'fadewhite',
  'radial', 'smoothleft', 'smoothright', 'smoothup', 'smoothdown',
  'circleopen', 'circleclose', 'dissolve', 'pixelize', 'diagtl',
  'diagtr', 'diagbl', 'diagbr', 'hlslice', 'hrslice', 'vuslice', 'vdslice'
]);

/**
 * Parse flexible timestamp into seconds (float).
 * Supports: 12, "12", "12s", "12.5", "01:30", "01:30.5", "01:02:03", "01:02:03.500"
 */
function parseTimestamp(val) {
  if (val == null || val === '') return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? Math.max(0, val) : 0;
  if (typeof val !== 'string') return 0;

  const s = val.trim().replace(/s$/i, '');
  if (!s) return 0;

  if (!s.includes(':')) {
    const num = parseFloat(s);
    return Number.isFinite(num) ? Math.max(0, num) : 0;
  }

  const parts = s.split(':').map(p => parseFloat(p));
  if (parts.some(p => !Number.isFinite(p))) return 0;

  if (parts.length === 3) {
    return Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2]);
  }
  if (parts.length === 2) {
    return Math.max(0, parts[0] * 60 + parts[1]);
  }
  return 0;
}

/**
 * Return color grading filter string for a given preset name.
 */
function buildColorFilter(grade) {
  if (!grade || typeof grade !== 'string') return null;
  const key = grade.trim().toLowerCase().replace(/[\s-_]/g, '');
  return COLOR_GRADES[key] || null;
}

/**
 * Build PTS and atempo filters for a speed multiplier.
 * FFmpeg atempo filter requires 0.5 <= value <= 2.0; chains filters if needed.
 */
function buildSpeedFilters(speed = 1.0) {
  const sp = Number.isFinite(speed) && speed > 0 ? speed : 1.0;
  const videoFilter = `setpts=${(1 / sp).toFixed(6)}*PTS`;
  if (Math.abs(sp - 1.0) < 0.001) {
    return { speed: 1.0, videoFilter, audioFilter: '' };
  }

  let rem = sp;
  const atempoFilters = [];
  while (rem > 2.0) {
    atempoFilters.push('atempo=2.0');
    rem /= 2.0;
  }
  while (rem < 0.5) {
    atempoFilters.push('atempo=0.5');
    rem /= 0.5;
  }
  atempoFilters.push(`atempo=${rem.toFixed(4)}`);
  return {
    speed: sp,
    videoFilter,
    audioFilter: atempoFilters.join(','),
  };
}

/**
 * Build caption drawtext filter with HarfBuzz shaping and font fallback.
 */
function buildCaptionFilter(caption, fontOverride = '') {
  if (!caption || typeof caption !== 'string') return '';
  const font = fontOverride || resolveFont(caption);
  if (!font) return '';

  const hasIndic = /[\u0D00-\u0D7F\u0900-\u0DFF]/.test(caption);
  const safe = Array.from(
    caption.replace(/['"\\:;|<>{}[\]()!@#$%^&*+=]/g, '').replace(/\s+/g, ' ').trim()
  ).slice(0, 50).join('');
  if (!safe) return '';

  const safeText = hasIndic ? safe : safe.toUpperCase();
  const safeFont = font.replace(/\\/g, '/').replace(/:/g, '\\:');
  const shaping = hasIndic ? ':text_shaping=1' : '';

  return `drawtext=fontfile='${safeFont}'${shaping}:text='${safeText}':fontsize=64:fontcolor=white:bordercolor=black:borderw=4:x=(w-text_w)/2:y=h-180:line_spacing=10`;
}

class VideoEditor {
  constructor({ filesDir = DEFAULT_FILES_DIR } = {}) {
    this.filesDir = filesDir;
    this.editDir  = path.join(filesDir, 'edit_tmp');
    this.mixer    = new AudioMixer({ filesDir });
  }

  /**
   * Probe media file using ffprobe.
   * Returns metadata: duration, dimensions, fps, codecs, channels.
   */
  probeMedia(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error(`probeMedia failed: file does not exist (${filePath})`);
    }

    const result = spawnSync('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ], { encoding: 'utf8', timeout: 30000 });

    if (result.status !== 0) {
      throw new Error(`ffprobe failed on ${filePath}: ${(result.stderr || '').slice(-300)}`);
    }

    let info;
    try {
      info = JSON.parse(result.stdout || '{}');
    } catch (err) {
      throw new Error(`Failed to parse ffprobe JSON for ${filePath}: ${err.message}`);
    }

    const streams = Array.isArray(info.streams) ? info.streams : [];
    const format  = info.format || {};

    const vStream = streams.find(s => s.codec_type === 'video');
    const aStream = streams.find(s => s.codec_type === 'audio');

    let width = 0;
    let height = 0;
    let fps = 24;
    let videoCodec = null;

    if (vStream) {
      width = parseInt(vStream.width || 0, 10);
      height = parseInt(vStream.height || 0, 10);
      videoCodec = vStream.codec_name || null;
      const rateStr = vStream.r_frame_rate || vStream.avg_frame_rate || '';
      if (rateStr.includes('/')) {
        const [num, den] = rateStr.split('/').map(Number);
        if (den && num) fps = parseFloat((num / den).toFixed(3));
      } else if (parseFloat(rateStr)) {
        fps = parseFloat(rateStr);
      }
    }

    const duration = parseFloat(format.duration || vStream?.duration || aStream?.duration || 0) || 0;
    const sizeBytes = parseInt(format.size || (fs.existsSync(filePath) ? fs.statSync(filePath).size : 0), 10);
    const bitrate = parseInt(format.bit_rate || 0, 10);

    return {
      duration,
      width,
      height,
      aspectRatio: height > 0 ? width / height : 0,
      fps,
      videoCodec,
      hasVideo: Boolean(vStream),
      hasAudio: Boolean(aStream),
      audioCodec: aStream ? aStream.codec_name : null,
      audioChannels: aStream ? parseInt(aStream.channels || 0, 10) : 0,
      audioSampleRate: aStream ? parseInt(aStream.sample_rate || 0, 10) : 0,
      bitrate,
      sizeBytes,
      formatName: format.format_name || null,
    };
  }

  /**
   * Edit a single clip: trim, speed-ramp, color-grade, reframe, caption, audio adjust/mix.
   *
   * @param {{
   *   videoPath: string,
   *   startTime?: string|number,
   *   trimStart?: string|number,
   *   endTime?: string|number,
   *   trimEnd?: string|number,
   *   duration?: string|number,
   *   speed?: number,
   *   clipVolume?: number,
   *   voicePath?: string,
   *   colorGrade?: string,
   *   caption?: string,
   *   orientation?: 'landscape'|'portrait'|'square',
   *   width?: number,
   *   height?: number,
   *   fps?: number,
   *   outputPath?: string,
   * }} opts
   * @returns {{ outputPath: string, duration: number, width: number, height: number, hasAudio: boolean }}
   */
  editClip({
    videoPath,
    startTime = 0,
    trimStart,
    endTime,
    trimEnd,
    duration,
    speed = 1.0,
    clipVolume = 1.0,
    voicePath = null,
    colorGrade = null,
    caption = '',
    orientation = 'landscape',
    width,
    height,
    fps = 24,
    outputPath = null,
  } = {}) {
    if (!videoPath || !fs.existsSync(videoPath)) {
      throw new Error(`editClip failed: videoPath does not exist (${videoPath})`);
    }

    fs.mkdirSync(this.editDir, { recursive: true });

    // Target dimensions
    let targetW = width;
    let targetH = height;
    if (!targetW || !targetH) {
      if (orientation === 'portrait') {
        targetW = 1080;
        targetH = 1920;
      } else if (orientation === 'square') {
        targetW = 1080;
        targetH = 1080;
      } else {
        targetW = 1920;
        targetH = 1080;
      }
    }

    const startSec = parseTimestamp(trimStart != null ? trimStart : startTime);
    const endSec   = (trimEnd != null || endTime != null) ? parseTimestamp(trimEnd != null ? trimEnd : endTime) : null;
    let durSec     = duration != null ? parseTimestamp(duration) : null;

    if (endSec != null && endSec > startSec && durSec == null) {
      durSec = endSec - startSec;
    }

    const probe = this.probeMedia(videoPath);
    if (!durSec) {
      durSec = Math.max(1, (probe.duration || 5) - startSec);
    }

    const spFilters = buildSpeedFilters(speed);
    // Calculated final duration after speed adjustment
    const finalDur = Math.max(0.5, durSec / spFilters.speed);

    const outPath = outputPath || path.join(
      this.editDir,
      `clip_${crypto.randomBytes(4).toString('hex')}_${Date.now()}.mp4`
    );

    // Build video filter
    const vfParts = [
      `scale=${targetW}:${targetH}:force_original_aspect_ratio=increase:flags=lanczos`,
      `crop=${targetW}:${targetH}`,
      `fps=${fps}`,
    ];

    if (spFilters.speed !== 1.0) {
      vfParts.push(spFilters.videoFilter);
    }

    const colorFilter = buildColorFilter(colorGrade);
    if (colorFilter) {
      vfParts.push(colorFilter);
    }

    const captionFilter = buildCaptionFilter(caption);
    if (captionFilter) {
      vfParts.push(captionFilter);
    }

    vfParts.push('format=yuv420p');

    // Build FFmpeg command arguments
    const ffmpegArgs = ['-nostdin', '-y'];

    // Fast input seek
    if (startSec > 0) {
      ffmpegArgs.push('-ss', startSec.toFixed(3));
    }

    ffmpegArgs.push('-i', videoPath);

    const hasVoice = voicePath && fs.existsSync(voicePath);
    if (hasVoice) {
      ffmpegArgs.push('-i', voicePath);
    }

    const hasClipAudio = probe.hasAudio && clipVolume > 0;

    // Filter complex setup
    let filterComplex = '';
    const vFilterStr = vfParts.join(',');

    if (hasVoice && hasClipAudio) {
      // Mix clip audio + voice audio
      const aParts = [`[0:a]volume=${clipVolume.toFixed(2)}`];
      if (spFilters.audioFilter) aParts.push(spFilters.audioFilter);
      aParts.push('[ca]');

      filterComplex = `[0:v]${vFilterStr}[vout];` +
        `${aParts.join(',')};` +
        `[1:a]volume=1.0[va];` +
        `[ca][va]amix=inputs=2:duration=first:dropout_transition=2[aout]`;
      ffmpegArgs.push('-filter_complex', filterComplex, '-map', '[vout]', '-map', '[aout]');
    } else if (hasVoice && !hasClipAudio) {
      // Voice only
      filterComplex = `[0:v]${vFilterStr}[vout];[1:a]volume=1.0[aout]`;
      ffmpegArgs.push('-filter_complex', filterComplex, '-map', '[vout]', '-map', '[aout]');
    } else if (!hasVoice && hasClipAudio) {
      // Clip audio only
      const aParts = [`volume=${clipVolume.toFixed(2)}`];
      if (spFilters.audioFilter) aParts.push(spFilters.audioFilter);
      ffmpegArgs.push('-vf', vFilterStr);
      ffmpegArgs.push('-af', aParts.join(','));
      ffmpegArgs.push('-map', '0:v:0', '-map', '0:a:0');
    } else {
      // No audio from clip or voice: generate silent stereo audio
      filterComplex = `[0:v]${vFilterStr}[vout];aevalsrc=0:d=${finalDur.toFixed(3)}:s=48000[aout]`;
      ffmpegArgs.push('-filter_complex', filterComplex, '-map', '[vout]', '-map', '[aout]');
    }

    // Encoding parameters: broadcast quality BT.709
    ffmpegArgs.push(
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22',
      '-profile:v', 'high', '-level', '4.1',
      '-color_range', 'tv', '-colorspace', 'bt709',
      '-color_primaries', 'bt709', '-color_trc', 'bt709',
      '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
      '-pix_fmt', 'yuv420p',
      '-t', finalDur.toFixed(3),
      '-movflags', '+faststart',
      outPath
    );

    const result = spawnSync('ffmpeg', ffmpegArgs, { timeout: 5 * 60 * 1000, encoding: 'utf8' });
    if (result.status !== 0) {
      throw new Error(`editClip failed: ${(result.stderr || '').slice(-400)}`);
    }

    return {
      outputPath: outPath,
      duration: finalDur,
      width: targetW,
      height: targetH,
      hasAudio: true,
    };
  }

  /**
   * Concat multiple clips with xfade transitions and acrossfade audio.
   *
   * @param {{
   *   clips: Array<string|{ path: string, duration?: number, transition?: string, transitionDuration?: number }>,
   *   transition?: string,
   *   transitionDuration?: number,
   *   outputPath?: string,
   * }} opts
   * @returns {{ outputPath: string, duration: number, clipCount: number }}
   */
  concatClipsWithTransitions({
    clips = [],
    transition = 'fade',
    transitionDuration = 0.5,
    outputPath = null,
  } = {}) {
    if (!Array.isArray(clips) || clips.length === 0) {
      throw new Error('concatClipsWithTransitions requires at least one clip');
    }

    fs.mkdirSync(this.editDir, { recursive: true });

    // Normalize clip entries
    const normClips = clips.map((c, i) => {
      const p = typeof c === 'string' ? c : c.path;
      if (!p || !fs.existsSync(p)) {
        throw new Error(`Clip ${i} not found: ${p}`);
      }
      const dur = (typeof c === 'object' && c.duration) ? c.duration : this.probeMedia(p).duration;
      const trans = (typeof c === 'object' && c.transition) ? c.transition : transition;
      const transDur = (typeof c === 'object' && c.transitionDuration != null) ? c.transitionDuration : transitionDuration;
      return { path: p, duration: dur, transition: trans, transitionDuration: transDur };
    });

    const outPath = outputPath || path.join(
      this.editDir,
      `concat_${crypto.randomBytes(4).toString('hex')}_${Date.now()}.mp4`
    );

    // Single clip edge case
    if (normClips.length === 1) {
      fs.copyFileSync(normClips[0].path, outPath);
      return { outputPath: outPath, duration: normClips[0].duration, clipCount: 1 };
    }

    const N = normClips.length;

    // Check if transitions are enabled
    const usesTransitions = normClips.some(c => c.transition && c.transition !== 'none' && c.transitionDuration > 0);

    if (!usesTransitions) {
      // Fast concat filter without xfade
      const ffmpegArgs = ['-nostdin', '-y'];
      for (const c of normClips) {
        ffmpegArgs.push('-i', c.path);
      }
      const streams = normClips.map((_, i) => `[${i}:v][${i}:a]`).join('');
      const filter = `${streams}concat=n=${N}:v=1:a=1[vout][aout]`;
      ffmpegArgs.push(
        '-filter_complex', filter,
        '-map', '[vout]', '-map', '[aout]',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22',
        '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        outPath
      );
      const res = spawnSync('ffmpeg', ffmpegArgs, { timeout: 10 * 60 * 1000, encoding: 'utf8' });
      if (res.status !== 0) {
        throw new Error(`concatClips failed: ${(res.stderr || '').slice(-400)}`);
      }
      const totalDur = normClips.reduce((sum, c) => sum + c.duration, 0);
      return { outputPath: outPath, duration: totalDur, clipCount: N };
    }

    // Build xfade + acrossfade filter complex
    const ffmpegArgs = ['-nostdin', '-y'];
    for (const c of normClips) {
      ffmpegArgs.push('-i', c.path);
    }

    const vFilters = [];
    const aFilters = [];

    let currentOffset = 0;

    for (let i = 1; i < N; i++) {
      const prevV = (i === 1) ? '[0:v]' : `[v${i - 1}]`;
      const prevA = (i === 1) ? '[0:a]' : `[a${i - 1}]`;
      const nextV = `[${i}:v]`;
      const nextA = `[${i}:a]`;

      const outV  = (i === N - 1) ? '[vout]' : `[v${i}]`;
      const outA  = (i === N - 1) ? '[aout]' : `[a${i}]`;

      const clipConfig = normClips[i - 1];
      let tType = clipConfig.transition || transition || 'fade';
      if (!VALID_TRANSITIONS.has(tType)) tType = 'fade';

      // Duration of transition
      let tDur = clipConfig.transitionDuration != null ? clipConfig.transitionDuration : transitionDuration;
      // Guard: transition duration cannot exceed 45% of clip duration
      tDur = Math.min(tDur, normClips[i - 1].duration * 0.45, normClips[i].duration * 0.45);
      tDur = Math.max(0.1, tDur);

      if (i === 1) {
        currentOffset = normClips[0].duration - tDur;
      } else {
        currentOffset = currentOffset + normClips[i - 1].duration - tDur;
      }

      vFilters.push(
        `${prevV}${nextV}xfade=transition=${tType}:duration=${tDur.toFixed(3)}:offset=${currentOffset.toFixed(3)}${outV}`
      );
      aFilters.push(
        `${prevA}${nextA}acrossfade=d=${tDur.toFixed(3)}:curve1=tri:curve2=tri${outA}`
      );
    }

    const filterComplex = [...vFilters, ...aFilters].join(';');

    ffmpegArgs.push(
      '-filter_complex', filterComplex,
      '-map', '[vout]', '-map', '[aout]',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22',
      '-profile:v', 'high', '-level', '4.1',
      '-color_range', 'tv', '-colorspace', 'bt709',
      '-color_primaries', 'bt709', '-color_trc', 'bt709',
      '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      outPath
    );

    const res = spawnSync('ffmpeg', ffmpegArgs, { timeout: 10 * 60 * 1000, encoding: 'utf8' });
    if (res.status !== 0) {
      throw new Error(`concatClipsWithTransitions failed: ${(res.stderr || '').slice(-400)}`);
    }

    const finalDur = currentOffset + normClips[N - 1].duration;
    return { outputPath: outPath, duration: finalDur, clipCount: N };
  }

  /**
   * End-to-end autonomous video assemble:
   * Slices clips, adjusts speed/color/captions, stitches with transitions,
   * mixes master narration and ducked background music.
   *
   * @param {{
   *   clips: Array<object>,
   *   audioPath?: string,
   *   musicPath?: string,
   *   musicVolume?: number,
   *   orientation?: 'landscape'|'portrait'|'square',
   *   width?: number,
   *   height?: number,
   *   colorGrade?: string,
   *   transition?: string,
   *   transitionDuration?: number,
   *   autoFit?: boolean,
   *   outputPath?: string,
   * }} opts
   * @returns {{ outputPath: string, duration: number, sizeBytes: number, clipCount: number }}
   */
  editAndAssemble({
    clips = [],
    audioPath = null,
    musicPath = null,
    musicVolume = 0.08,
    orientation = 'landscape',
    width,
    height,
    colorGrade = null,
    transition = 'fade',
    transitionDuration = 0.5,
    autoFit = false,
    outputPath = null,
  } = {}) {
    if (!Array.isArray(clips) || clips.length === 0) {
      throw new Error('editAndAssemble requires at least one clip in clips array');
    }

    fs.mkdirSync(this.editDir, { recursive: true });

    // Target dimensions
    let targetW = width;
    let targetH = height;
    if (!targetW || !targetH) {
      if (orientation === 'portrait') {
        targetW = 1080;
        targetH = 1920;
      } else if (orientation === 'square') {
        targetW = 1080;
        targetH = 1080;
      } else {
        targetW = 1920;
        targetH = 1080;
      }
    }

    // Auto-fit duration logic if master audio is provided
    let perClipDuration = null;
    let masterAudioDur = 0;
    if (audioPath && fs.existsSync(audioPath) && (autoFit || clips.every(c => !c.duration && !c.end_time && !c.endTime))) {
      masterAudioDur = this.probeMedia(audioPath).duration;
      if (masterAudioDur > 0) {
        // Total duration with xfade: D_total = N * d - (N - 1) * td = masterAudioDur
        // => N * d = masterAudioDur + (N - 1) * td => d = (masterAudioDur + (N - 1) * td) / N
        const td = transitionDuration || 0.5;
        perClipDuration = Math.max(1.5, (masterAudioDur + (clips.length - 1) * td) / clips.length);
      }
    }

    // Step 1: Process each clip
    const editedClips = [];
    for (let i = 0; i < clips.length; i++) {
      const c = clips[i];
      const videoP = c.video_path || c.videoPath || c.path;
      if (!videoP) throw new Error(`Clip ${i} is missing video_path`);

      const cDur = c.duration || perClipDuration || null;
      const cSpeed = c.speed || 1.0;
      const cVol = (c.clip_volume != null) ? c.clip_volume : (c.clipVolume != null ? c.clipVolume : 1.0);
      const cGrade = c.color_grade || c.colorGrade || colorGrade || null;
      const cCaption = c.caption || '';
      const cVoice = c.audio_path || c.audioPath || null;
      const cStart = c.start_time != null ? c.start_time : (c.startTime != null ? c.startTime : (c.trim_start != null ? c.trim_start : 0));
      const cEnd = c.end_time != null ? c.end_time : (c.endTime != null ? c.endTime : (c.trim_end != null ? c.trim_end : null));

      const edited = this.editClip({
        videoPath: videoP,
        startTime: cStart,
        endTime: cEnd,
        duration: cDur,
        speed: cSpeed,
        clipVolume: cVol,
        voicePath: cVoice,
        colorGrade: cGrade,
        caption: cCaption,
        orientation,
        width: targetW,
        height: targetH,
      });

      editedClips.push({
        path: edited.outputPath,
        duration: edited.duration,
        transition: c.transition || transition,
        transitionDuration: c.transition_duration || transitionDuration,
      });
    }

    // Step 2: Join clips with transitions
    const joined = this.concatClipsWithTransitions({
      clips: editedClips,
      transition,
      transitionDuration,
    });

    let currentVideoPath = joined.outputPath;

    // Step 3: Mix master audio track if provided
    if (audioPath && fs.existsSync(audioPath)) {
      const audioMuxPath = path.join(
        this.editDir,
        `mux_${crypto.randomBytes(4).toString('hex')}_${Date.now()}.mp4`
      );

      // Mix master voiceover: replace or mix over ambient audio
      const result = spawnSync('ffmpeg', [
        '-nostdin', '-y',
        '-i', currentVideoPath,
        '-i', audioPath,
        '-c:v', 'copy',
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-shortest',
        '-movflags', '+faststart',
        audioMuxPath,
      ], { timeout: 5 * 60 * 1000, encoding: 'utf8' });

      if (result.status === 0) {
        currentVideoPath = audioMuxPath;
      }
    }

    // Step 4: Mix background music with ducking if provided
    const outFinal = outputPath || path.join(
      this.filesDir,
      `video_edit_${crypto.randomBytes(4).toString('hex')}_${Date.now()}.mp4`
    );

    if (musicPath && fs.existsSync(musicPath)) {
      this.mixer.mixVideo({
        videoPath: currentVideoPath,
        musicPath,
        outputPath: outFinal,
      });
    } else {
      fs.copyFileSync(currentVideoPath, outFinal);
    }

    const finalProbe = this.probeMedia(outFinal);

    return {
      outputPath: outFinal,
      duration: finalProbe.duration,
      sizeBytes: finalProbe.sizeBytes,
      width: finalProbe.width,
      height: finalProbe.height,
      clipCount: clips.length,
    };
  }

  /**
   * Dispatch imperative editing operations (for external_platform_call fallback).
   * Supports: cut, trim, speed, color, caption, mute, transition, assemble.
   */
  async applyOperations({
    operations = [],
    files = [],
    outputPath = null,
    orientation = 'landscape',
    musicPath = null,
    musicVolume = 0.08,
    audioPath = null,
  } = {}) {
    if (!Array.isArray(operations) || operations.length === 0) {
      throw new Error('applyOperations requires non-empty operations array');
    }

    // Group operations into clip specs
    const clipSpecs = [];
    let globalTransition = 'fade';
    let globalTransDur = 0.5;

    // Resolve initial clips from files or operations
    for (let i = 0; i < files.length; i++) {
      clipSpecs.push({ video_path: files[i], clip_volume: 1.0 });
    }

    for (const op of operations) {
      const targetIndex = (typeof op.clip === 'number') ? op.clip : 0;
      let targetClip = clipSpecs[targetIndex];

      if (!targetClip && op.clip && typeof op.clip === 'string') {
        targetClip = clipSpecs.find(c => c.video_path === op.clip);
        if (!targetClip) {
          targetClip = { video_path: op.clip, clip_volume: 1.0 };
          clipSpecs.push(targetClip);
        }
      }

      switch (op.op) {
        case 'cut':
        case 'trim':
          if (targetClip) {
            if (op.at != null || op.start != null) targetClip.start_time = op.at || op.start;
            if (op.to != null || op.end != null) targetClip.end_time = op.to || op.end;
            if (op.duration != null) targetClip.duration = op.duration;
          }
          break;

        case 'speed':
          if (targetClip) {
            targetClip.speed = op.speed || 1.0;
          }
          break;

        case 'color':
          if (targetClip) {
            targetClip.color_grade = op.grade || op.type || op.color;
          }
          break;

        case 'caption':
          if (targetClip) {
            targetClip.caption = op.text || op.caption || '';
          }
          break;

        case 'mute':
          if (targetClip) {
            targetClip.clip_volume = 0;
          }
          break;

        case 'transition':
          globalTransition = op.type || op.transition || 'fade';
          if (op.duration != null) globalTransDur = parseTimestamp(op.duration);
          if (targetClip) {
            targetClip.transition = globalTransition;
            targetClip.transition_duration = globalTransDur;
          }
          break;

        case 'assemble':
          // Explicit assemble op can override clips/audio/music
          if (Array.isArray(op.clips)) {
            clipSpecs.length = 0;
            clipSpecs.push(...op.clips);
          }
          if (op.audio) audioPath = op.audio;
          if (op.music) musicPath = op.music;
          break;

        default:
          break;
      }
    }

    if (clipSpecs.length === 0) {
      throw new Error('No valid clips defined in files or operations');
    }

    const result = this.editAndAssemble({
      clips: clipSpecs,
      audioPath,
      musicPath,
      musicVolume,
      orientation,
      transition: globalTransition,
      transitionDuration: globalTransDur,
      outputPath,
    });

    return {
      status: 'success',
      operationsApplied: operations.length,
      ...result,
    };
  }
}

module.exports = {
  VideoEditor,
  parseTimestamp,
  buildColorFilter,
  buildSpeedFilters,
  buildCaptionFilter,
  COLOR_GRADES,
  VALID_TRANSITIONS,
};

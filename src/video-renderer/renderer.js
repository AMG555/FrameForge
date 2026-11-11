/**
 * Video Renderer — Tasks #11, #12, #18
 *
 * Assembles scene images + voice tracks into a master MP4.
 * Uses FFmpeg concat demuxer for frame-accurate assembly.
 *
 * Changes vs. initial version:
 *   - Task #11: Uses AnimationSystem for all camera movement; removes inline _zoomFilter
 *   - Task #18: Calls AudioMixer.mixVideo() for final LUFS normalisation + optional music ducking
 *   - ArtifactManifest: accepts optional manifest for idempotency (skip already-rendered scenes)
 *
 * Scene render parameters:
 *   - Image:  1920×1080, zoompan animation (AnimationSystem), caption drawtext
 *   - Voice:  per-scene m4a (produced by TTSProvider)
 *   - Output: H.264 CRF 22, yuv420p, 30fps, AAC 192kbps
 *   - Safe zones: top 180px, bottom 400px, right 130px
 *
 * Requirements: Req 2 (Animation System), Req 5 (Audio Mixer), Req 6 (Rendering Pipeline)
 */

'use strict';

const { spawnSync } = require('child_process');
const path  = require('path');
const os    = require('os');
const fs    = require('fs');

const DEFAULT_FILES_DIR = process.env.N8N_FILES_DIR || path.join(os.homedir(), '.frameforge-files');

const { buildCameraFilter, selectCameraHint } = require('../animation/animation-system');
const { AudioMixer }                          = require('../audio-mixer/mixer');
const { generateSceneHtml, wrapCodeInHarnessHtml, detectAesthetic, AESTHETICS } = require('./scene-animator');
const { findChromePath }                      = require('../harness/lib/browser.mjs');

// ── Cross-platform Indic / Malayalam font resolver ────────────────────────────
const INDIC_FONTS = [
  // Windows
  'C:\\Windows\\Fonts\\Nirmala.ttc',
  'C:\\Windows\\Fonts\\NirmalaB.ttf',
  'C:\\Windows\\Fonts\\Nirmala.ttf',
  'C:\\Windows\\Fonts\\kartika.ttf',
  'C:\\Windows\\Fonts\\kartikab.ttf',
  // macOS
  '/System/Library/Fonts/Supplemental/Malayalam Sangam MN.ttc',
  '/System/Library/Fonts/Supplemental/Malayalam MN.ttc',
  // Linux
  '/usr/share/fonts/opentype/noto/NotoSansMalayalam-Bold.ttf',
  '/usr/share/fonts/truetype/noto/NotoSansMalayalam-Bold.ttf',
  '/usr/share/fonts/truetype/malayalam/Meera.ttf',
  '/usr/share/fonts/truetype/lohit-malayalam/Lohit-Malayalam.ttf',
];

// ── Cross-platform font resolver ──────────────────────────────────────────────
// Checked in priority order. First existing file wins. Covers:
//   Windows 10/11: C:\Windows\Fonts
//   macOS:         /System/Library/Fonts, /Library/Fonts, ~/Library/Fonts
//   Linux (Debian/Ubuntu/Alpine/RHEL): various truetype/opentype paths
const FONTS = [
  // Windows
  'C:\\Windows\\Fonts\\arialbd.ttf',
  'C:\\Windows\\Fonts\\Arial Bold.ttf',
  'C:\\Windows\\Fonts\\calibrib.ttf',
  'C:\\Windows\\Fonts\\segoeui.ttf',
  'C:\\Windows\\Fonts\\tahoma.ttf',
  // macOS system
  '/System/Library/Fonts/Helvetica.ttc',
  '/System/Library/Fonts/Arial Bold.ttf',
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
  '/Library/Fonts/Arial Bold.ttf',
  // macOS user
  `${process.env.HOME || ''}/Library/Fonts/Arial Bold.ttf`,
  // Linux Debian/Ubuntu
  '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
  // Linux RedHat/Alpine
  '/usr/share/fonts/liberation/LiberationSans-Bold.ttf',
  '/usr/share/fonts/opentype/noto/NotoSans-Bold.ttf',
  '/usr/share/fonts/noto/NotoSans-Bold.ttf',
  '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',
];

/** Return the first font file that exists, or '' if none found. */
function resolveFont(text = '') {
  // Allow explicit override via FFMPEG_FONT env var
  const override = process.env.FFMPEG_FONT;
  if (override && fs.existsSync(override)) return override;

  const hasIndic = /[\u0D00-\u0D7F\u0900-\u0DFF]/.test(text || '');
  if (hasIndic) {
    const indicFont = INDIC_FONTS.find(f => f && fs.existsSync(f));
    if (indicFont) return indicFont;
  }
  return FONTS.find(f => f && fs.existsSync(f)) || '';
}

class VideoRenderer {
  constructor({ filesDir = DEFAULT_FILES_DIR } = {}) {
    this.filesDir = filesDir;
    this.vdir     = path.join(filesDir, 'video_tmp');
    this.font     = resolveFont();
    this.mixer    = new AudioMixer({ filesDir });
    if (!this.font) {
      console.warn('[Renderer] WARNING: no font file found — captions will be disabled. Set FFMPEG_FONT=/path/to/font.ttf or install liberation-fonts.');
    }
  }

  /**
   * Render a single scene: code-driven animated video or clip + voice → scene_N_out.mp4
   *
   * @param {{
   *   sceneIndex:         number,
   *   imagePath?:         string,
   *   videoPath?:         string,   // optional user clip / B-roll
   *   voicePath:          string,
   *   caption?:           string,
   *   narration?:         string,
   *   visualDescription?: string,
   *   visualType?:        string,
   *   topic?:             string,
   *   style?:             string,
   *   theme?:             string,
   *   title?:             string,
   *   language?:          string,
   *   musicMood?:         string,
   *   camera?:            string,   // camera_hint from scene schema v1.0.0
   *   focalPoint?:        { x: number, y: number },
   *   html?:              string,   // direct agent/user pure-t HTML scene
   *   code?:              string,   // direct agent/user canvas seek(t) drawing code
   *   manifest?:          ArtifactManifest  // optional — enables idempotency
   *   renderWidth?:       number,   // default 1920
   *   renderHeight?:      number,   // default 1080
   *   fps?:               number,   // default 24
   *   startTime?:         number|string,
   *   trimStart?:         number|string,
   *   endTime?:           number|string,
   *   trimEnd?:           number|string,
   *   speed?:             number,   // default 1.0
   *   clipVolume?:        number,   // default 0 (voiceover primary)
   *   colorGrade?:        string,   // cinematic, warm, cool, etc.
   * }} opts
   * @returns {string} outputPath
   */
  renderScene({
    sceneIndex,
    imagePath,
    videoPath,
    voicePath,
    caption = '',
    narration = '',
    prompt = '',
    visualDescription = '',
    visualType = 'code_animation',
    topic = '',
    style = '',
    theme = '',
    title = '',
    language = '',
    musicMood = 'neutral',
    camera,
    focalPoint,
    html = null,
    code = null,
    manifest,
    renderWidth = 1920,
    renderHeight = 1080,
    fps = 24,
    startTime = 0,
    trimStart,
    endTime,
    duration = null,
    trimEnd,
    speed = 1.0,
    clipVolume = 0,
    colorGrade = null,
    showCaptions = false,
    showAnchor = false,
  } = {}) {
    const effectiveShowCaptions = Boolean(
      showCaptions ||
      process.env.FRAMEFORGE_SHOW_CAPTIONS === '1'
    );
    const effectiveShowAnchor = Boolean(
      showAnchor ||
      process.env.FRAMEFORGE_SHOW_ANCHOR === '1'
    );
    const outputPath = path.join(this.vdir, `scene_${sceneIndex}_out.mp4`);

    // Idempotency: skip if already rendered and manifest says so
    if (manifest?.isSceneComplete(sceneIndex)) {
      const existingPath = manifest.scenes[sceneIndex].rendered_path;
      if (existingPath && fs.existsSync(existingPath)) return existingPath;
    }

    fs.mkdirSync(this.vdir, { recursive: true });

    // Duration from voice file or explicit scene duration.
    if (!voicePath || !fs.existsSync(voicePath)) {
      throw new Error(`Scene ${sceneIndex} render failed: voicePath is missing or does not exist (${voicePath})`);
    }
    const voiceDur   = this._getAudioDuration(voicePath);
    const dur        = (typeof duration === 'number' && duration > 0) ? Math.max(duration, voiceDur) : voiceDur;
    const clampedDur = Math.max(1, Number.isFinite(dur) ? dur + 0.15 : 3.15);

    const isVideoInput = Boolean(videoPath) || (videoPath && /\.(mp4|mov|webm|mkv|m4v)$/i.test(videoPath));

    // Priority 1: User-supplied video clip
    if (isVideoInput) {
      const { buildColorFilter, parseTimestamp, buildSpeedFilters } = require('../video-editor/editor');
      const startSec = parseTimestamp(trimStart != null ? trimStart : startTime);
      const sp = buildSpeedFilters(speed);

      const captionFilter = effectiveShowCaptions ? this._captionFilter(caption) : '';
      const scaleFilter = `scale=${renderWidth}:${renderHeight}:force_original_aspect_ratio=increase:flags=lanczos,crop=${renderWidth}:${renderHeight}`;
      const colorFilter = buildColorFilter(colorGrade);

      const vfList = [scaleFilter];
      if (sp.speed !== 1.0) vfList.push(sp.videoFilter);
      if (colorFilter) vfList.push(colorFilter);
      if (captionFilter) vfList.push(captionFilter);
      vfList.push('format=yuv420p');
      const vf = vfList.join(',');

      const ffmpegArgs = ['-nostdin', '-y', '-threads', '2'];

      if (startSec > 0) {
        ffmpegArgs.push('-ss', startSec.toFixed(3));
      }

      ffmpegArgs.push('-stream_loop', '-1', '-i', videoPath, '-i', voicePath);

      if (clipVolume > 0) {
        const caParts = [`[0:a]volume=${clipVolume.toFixed(2)}`];
        if (sp.audioFilter) caParts.push(sp.audioFilter);
        caParts.push('[ca]');
        const filterComplex = `[0:v]${vf}[vout];` +
          `${caParts.join(',')};` +
          `[1:a]apad=whole_dur=${clampedDur}[va];` +
          `[ca][va]amix=inputs=2:duration=first:dropout_transition=2[aout]`;
        ffmpegArgs.push('-filter_complex', filterComplex, '-map', '[vout]', '-map', '[aout]');
      } else {
        ffmpegArgs.push(
          '-vf', vf,
          '-af', `apad=whole_dur=${clampedDur}`,
          '-map', '0:v:0', '-map', '1:a:0'
        );
      }

      ffmpegArgs.push(
        '-t', String(clampedDur),
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22',
        '-profile:v', 'high', '-level', '4.1',
        '-color_range', 'tv', '-colorspace', 'bt709',
        '-color_primaries', 'bt709', '-color_trc', 'bt709',
        '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709',
        '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
        '-movflags', '+faststart',
        '-pix_fmt', 'yuv420p',
        outputPath
      );

      const result = spawnSync('ffmpeg', ffmpegArgs, { timeout: 5 * 60 * 1000, encoding: 'utf8' });

      if (result.status !== 0) {
        const err = `Scene ${sceneIndex} render failed: ${(result.stderr || '').slice(-300)}`;
        manifest?.setSceneFailed(sceneIndex, err);
        throw new Error(err);
      }

      manifest?.setSceneRendered(sceneIndex, outputPath);
      return outputPath;
    }

    // Priority 2: Code-driven animated video scene via Chromium + Harness
    // Produces pure-function-of-t 24fps motion graphics (kinetic typography,
    // spring motion, animated particles, graphs, code typing, full multilingual Indic/Malayalam support).
    const chrome = findChromePath();
    if (chrome && process.env.FRAMEFORGE_NO_BROWSER !== '1') {
      try {
        return this._renderCodeAnimationScene({
          sceneIndex,
          imagePath,
          voicePath,
          caption,
          narration,
          prompt,
          visualDescription,
          visualType,
          topic,
          style,
          theme,
          title,
          language,
          camera,
          focalPoint,
          html,
          code,
          clampedDur,
          renderWidth,
          renderHeight,
          fps,
          outputPath,
          manifest,
          musicMood,
          showCaptions: effectiveShowCaptions,
        });
      } catch (err) {
        console.warn(`[Renderer] Code-driven browser scene render failed (${err.message}), falling back to procedural animation`);
      }
    }

    // Priority 3: Procedural dynamic animated fallback (dynamic moving gradients / camera drift)
    const captionFilter = effectiveShowCaptions ? this._captionFilter(caption) : '';
    let inputArgs = [];
    let vf = '';

    if (imagePath && fs.existsSync(imagePath)) {
      inputArgs = ['-loop', '1', '-i', imagePath, '-i', voicePath];
      const hint = camera || selectCameraHint(sceneIndex, focalPoint || {});
      const fx   = focalPoint ? { focalX: focalPoint.x, focalY: focalPoint.y } : {};
      const cameraFilter = buildCameraFilter(hint, { duration: clampedDur, w: renderWidth, h: renderHeight, ...fx });
      vf = [cameraFilter, captionFilter].filter(Boolean).join(',');
    } else {
      const aestheticKey = detectAesthetic({ topic, style, theme, title, narration, visualDescription, caption, language, musicMood });
      const aesthetic = AESTHETICS[aestheticKey] || AESTHETICS.cyber_tech;
      const pal = aesthetic.palettes[sceneIndex % aesthetic.palettes.length];
      const c0 = (pal.bg0 || '#0d1117').replace('#', '');
      const c1 = (pal.accent || '#38bdf8').replace('#', '');
      inputArgs = [
        '-f', 'lavfi', '-i', `gradients=s=${renderWidth}x${renderHeight}:r=30:c0=0x${c0}:c1=0x${c1}:speed=0.5:type=radial`,
        '-i', voicePath,
      ];
      const vfFilters = ['vignette=PI/4'];
      if (captionFilter) vfFilters.push(captionFilter);
      vf = vfFilters.join(',');
    }

    const result = spawnSync('ffmpeg', [
      '-nostdin', '-y', '-threads', '2',
      ...inputArgs,
      '-vf', vf || `scale=${renderWidth}:${renderHeight},format=yuv420p`,
      '-af', `apad=whole_dur=${clampedDur}`,
      '-t', String(clampedDur),
      '-map', '0:v:0', '-map', '1:a:0',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '17',
      '-profile:v', 'high', '-level', '4.1',
      '-color_range', 'tv', '-colorspace', 'bt709',
      '-color_primaries', 'bt709', '-color_trc', 'bt709',
      '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709:aq-mode=3:deblock=-1,-1',
      '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-ac', '2',
      '-movflags', '+faststart',
      '-pix_fmt', 'yuv420p',
      outputPath,
    ], { timeout: 5 * 60 * 1000, encoding: 'utf8' });

    if (result.status !== 0) {
      const err = `Scene ${sceneIndex} (no-image fallback) render failed: ${(result.stderr || '').slice(-300)}`;
      manifest?.setSceneFailed(sceneIndex, err);
      throw new Error(err);
    }

    manifest?.setSceneRendered(sceneIndex, outputPath);
    return outputPath;
  }

  _renderCodeAnimationScene({
    sceneIndex,
    imagePath,
    voicePath,
    caption,
    narration,
    prompt = '',
    visualDescription,
    visualType = 'code_animation',
    topic = '',
    style = '',
    theme = '',
    title = '',
    language = '',
    camera = 'auto',
    focalPoint = null,
    html = null,
    code = null,
    clampedDur,
    renderWidth,
    renderHeight,
    fps = 24,
    outputPath,
    manifest,
    musicMood,
    showCaptions = false,
  }) {
    let htmlContent;
    if (html && typeof html === 'string' && html.trim().length > 0) {
      htmlContent = html;
      if (!htmlContent.includes('window.DURATION')) {
        htmlContent = htmlContent.replace('<script>', `<script>\nwindow.DURATION = ${clampedDur};\n`);
      }
    } else if (code && typeof code === 'string' && code.trim().length > 0) {
      htmlContent = wrapCodeInHarnessHtml({
        code,
        duration: clampedDur,
        width: renderWidth,
        height: renderHeight,
        language,
        style,
        topic,
      });
    } else {
      const effectiveCam = camera || selectCameraHint(sceneIndex, focalPoint || {});
      htmlContent = generateSceneHtml({
        caption,
        narration,
        prompt,
        visualDescription,
        imagePath,
        topic,
        style,
        theme,
        title,
        language,
        duration: clampedDur,
        width: renderWidth,
        height: renderHeight,
        sceneIndex,
        musicMood,
        showCaptions: effectiveShowCaptions,
        showAnchor: effectiveShowAnchor,
        camera: effectiveCam,
        cameraHint: effectiveCam,
      });
    }

    const animHtmlPath = path.join(this.vdir, `scene_${sceneIndex}_anim.html`);
    const framesDir    = path.join(this.vdir, `scene_${sceneIndex}_frames`);
    fs.writeFileSync(animHtmlPath, htmlContent, 'utf8');
    fs.mkdirSync(framesDir, { recursive: true });

    const harnessBin = path.resolve(__dirname, '../harness/bin/harness.mjs');
    const totalFrames = Math.max(1, Math.round(clampedDur * fps));
    const lastFrame = totalFrames - 1;

    const res = spawnSync(process.execPath, [
      harnessBin,
      'frames',
      '--html', animHtmlPath,
      '--out', framesDir,
      '--fps', String(fps),
      '--first', '0',
      '--last', String(lastFrame),
      '--workers', '4',
    ], { encoding: 'utf8', timeout: 5 * 60 * 1000 });

    if (res.status !== 0) {
      throw new Error(`Harness frame rendering failed: ${(res.stderr || res.stdout || '').slice(-400)}`);
    }

    // Closed-loop visual frame inspection (catches blank/blown frames before encoding)
    try {
      const { analyzeImageFile } = require('../harness/lib/pixels.mjs');
      const midFrameIdx = Math.floor(lastFrame / 2);
      const midFrameFile = path.join(framesDir, `f${String(midFrameIdx).padStart(6, '0')}.jpg`);
      if (fs.existsSync(midFrameFile)) {
        const analysis = analyzeImageFile(midFrameFile, renderWidth, renderHeight);
        if (analysis.isBlank) {
          console.warn(`[Renderer] ⚠️ Scene ${sceneIndex} visual warning: blank frame at t=${(midFrameIdx / fps).toFixed(2)}s`);
        }
      }
    } catch (_) {}

    const framesPattern = path.join(framesDir, 'f%06d.jpg');
    const encResult = spawnSync('ffmpeg', [
      '-nostdin', '-y', '-threads', '2',
      '-framerate', String(fps),
      '-pattern_type', 'sequence',
      '-i', framesPattern,
      '-i', voicePath,
      '-map', '0:v:0', '-map', '1:a:0',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '17',
      '-profile:v', 'high', '-level', '4.1',
      '-color_range', 'tv', '-colorspace', 'bt709',
      '-color_primaries', 'bt709', '-color_trc', 'bt709',
      '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709:aq-mode=3:deblock=-1,-1',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-ac', '2',
      '-af', `apad=whole_dur=${clampedDur}`,
      '-t', String(clampedDur),
      '-movflags', '+faststart',
      outputPath,
    ], { timeout: 5 * 60 * 1000, encoding: 'utf8' });

    if (encResult.status !== 0) {
      throw new Error(`Scene ${sceneIndex} video encode failed: ${(encResult.stderr || '').slice(-300)}`);
    }

    try {
      fs.rmSync(framesDir, { recursive: true, force: true });
      fs.unlinkSync(animHtmlPath);
    } catch (_) {}

    manifest?.setSceneRendered(sceneIndex, outputPath);
    return outputPath;
  }

  /**
   * Assemble all scene_N_out.mp4 files into final_video.mp4,
   * then pass through AudioMixer for sidechain ducking + LUFS normalisation.
   *
   * @param {{
   *   productionId?: string,
   *   sceneCount?:   number,
   *   musicPath?:    string,   // explicit music file; falls back to random from music/ dir
   *   withMusic?:    boolean,
   *   musicVolume?:  number,
   *   manifest?:     ArtifactManifest
   * }} opts
   * @returns {string} path to the final master video
   */
  assembleMain({ productionId, sceneCount = null, musicPath = null, withMusic = true, musicVolume = 0.07, manifest } = {}) {
    fs.mkdirSync(this.vdir, { recursive: true });

    const rawPath    = path.join(this.filesDir, `raw_concat_${productionId || Date.now()}.mp4`);
    const outputPath = path.join(this.filesDir, `final_video_${productionId || Date.now()}.mp4`);

    // Discover scene files
    const sceneFiles = this._discoverScenes(sceneCount);
    if (sceneFiles.length < 1) throw new Error(`Too few scenes assembled: ${sceneFiles.length}`);
    if (sceneFiles.length < 3) {
      console.warn(`[Renderer] WARNING: only ${sceneFiles.length} scene(s) — video will be short. Minimum 3 recommended.`);
    }

    // Build concat list (paths relative to vdir so concat demuxer works)
    const concatPath = path.join(this.vdir, 'concat_main.txt');
    fs.writeFileSync(concatPath, sceneFiles.map(f => `file '${path.basename(f)}'`).join('\n'));

    // Step 1: Concat scenes → raw_concat.mp4 (no audio processing yet)
    const concatResult = spawnSync('ffmpeg', [
      '-nostdin', '-y', '-threads', '2',
      '-f', 'concat', '-safe', '0', '-i', concatPath,
      '-map', '0:v', '-map', '0:a',
      '-c:v', 'copy', '-c:a', 'copy',
      '-movflags', '+faststart',
      rawPath,
    ], { cwd: this.vdir, timeout: 60 * 60 * 1000, encoding: 'utf8' });

    if (concatResult.status !== 0) {
      throw new Error(`Concat failed: ${(concatResult.stderr || '').slice(-400)}`);
    }

    // Step 2: AudioMixer — sidechain ducking + LUFS normalisation (Task #18)
    const resolvedMusic = musicPath || (withMusic ? this._findRandomMusicFile() : null);
    this.mixer.mixVideo({
      videoPath:  rawPath,
      musicPath:  resolvedMusic,
      outputPath,
    });

    // Clean up raw concat
    fs.unlink(rawPath, () => {});

    // Verify
    const stat = fs.statSync(outputPath);
    if (stat.size < 100 * 1024) throw new Error(`Assembled video too small: ${stat.size} bytes`);

    manifest?.setMaster(outputPath, { qualityPassed: false });
    return outputPath;
  }

  // ── Filter helpers ────────────────────────────────────────────────────────

  _captionFilter(caption) {
    if (!caption || !this.font) return '';
    const resolvedFont = resolveFont(caption) || this.font;
    if (!resolvedFont) return '';

    const hasIndic = /[\u0D00-\u0D7F\u0900-\u0DFF]/.test(caption);
    // Sanitize caption for ffmpeg drawtext.
    // Strip syntax-breaking characters; preserve full Unicode letters & viramas.
    const safe = Array.from(
      caption.replace(/['"\\:;|<>{}[\]()!@#$%^&*+=]/g, '').replace(/\s+/g, ' ').trim()
    ).slice(0, 45).join('');
    if (!safe) return '';

    const safeText = hasIndic ? safe : safe.toUpperCase();
    const safeFont = resolvedFont.replace(/\\/g, '/').replace(/:/g, '\\:');
    const shaping = hasIndic ? ':text_shaping=1' : '';
    // Bottom-center, safe zone: 100px from bottom + UI button zone
    return `drawtext=fontfile='${safeFont}'${shaping}:text='${safeText}':fontsize=68:fontcolor=white:bordercolor=black:borderw=4:x=(w-text_w)/2:y=h-180:line_spacing=10`;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _discoverScenes(sceneCount) {
    if (!fs.existsSync(this.vdir)) return [];
    const all = fs.readdirSync(this.vdir)
      .filter(f => /^scene_\d+_out\.mp4$/.test(f))
      // >10KB guards against truly empty 0-byte renders; actual stream-validity
      // is checked below via ffprobe to catch partial writes from failed encodes.
      .filter(f => fs.statSync(path.join(this.vdir, f)).size > 10000)
      .map(f => path.join(this.vdir, f))
      .filter(f => this._hasValidStreams(f))     // Fix 5: drop scenes with no valid A/V streams
      .sort((a, b) => {
        const na = parseInt(path.basename(a).match(/scene_(\d+)_out/)[1], 10);
        const nb = parseInt(path.basename(b).match(/scene_(\d+)_out/)[1], 10);
        return na - nb;
      });
    return sceneCount ? all.slice(0, sceneCount) : all;
  }

  /**
   * Returns true iff the file has at least one valid video stream AND one valid audio stream.
   * Uses ffprobe -select_streams to check quickly (< 200ms per file).
   * A failed scene render may produce a partial MP4 container (20-40KB) with no streams;
   * including it in the concat list causes A/V desync for all subsequent scenes.
   */
  _hasValidStreams(filePath) {
    try {
      const checkV = spawnSync('ffprobe', [
        '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=codec_type',
        '-of', 'default=nw=1:nk=1', filePath,
      ], { encoding: 'utf8', timeout: 8000 });
      const checkA = spawnSync('ffprobe', [
        '-v', 'error', '-select_streams', 'a:0',
        '-show_entries', 'stream=codec_type',
        '-of', 'default=nw=1:nk=1', filePath,
      ], { encoding: 'utf8', timeout: 8000 });
      const hasVideo = (checkV.stdout || '').trim() === 'video';
      const hasAudio = (checkA.stdout || '').trim() === 'audio';
      if (!hasVideo || !hasAudio) {
        console.warn(`[Renderer] Scene file excluded from concat (missing streams — video:${hasVideo} audio:${hasAudio}): ${path.basename(filePath)}`);
      }
      return hasVideo && hasAudio;
    } catch {
      return false;
    }
  }

  _findRandomMusicFile() {
    const musicDir = path.join(this.filesDir, 'music');
    if (!fs.existsSync(musicDir)) return null;
    const files = fs.readdirSync(musicDir)
      .filter(f => /\.(mp3|m4a)$/i.test(f))
      .filter(f => fs.statSync(path.join(musicDir, f)).size > 50000)
      .map(f => path.join(musicDir, f));
    return files.length > 0 ? files[Math.floor(Math.random() * files.length)] : null;
  }

  _getAudioDuration(audioPath) {
    // Callers must validate voicePath before calling this method.
    // Passing null/undefined here means ffprobe will receive a null argument and
    // return empty stdout → parseFloat('') = NaN → NaN propagates to clampedDur.
    // The guard in renderScene() prevents that path, but we also sanitize here.
    if (!audioPath) return 3;
    try {
      const result = spawnSync('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=nk=1:nw=1',
        audioPath,
      ], { encoding: 'utf8', timeout: 10000 });
      const parsed = parseFloat((result.stdout || '').trim());
      // parseFloat of an empty string is NaN — fall back to 3s rather than propagating NaN
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
    } catch { return 3; }
  }
}

module.exports = {
  VideoRenderer,
  resolveFont,
  FONTS,
  INDIC_FONTS,
};

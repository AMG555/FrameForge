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
function resolveFont() {
  // Allow explicit override via FFMPEG_FONT env var
  const override = process.env.FFMPEG_FONT;
  if (override && fs.existsSync(override)) return override;
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
   * Render a single scene: image or video clip + voice → scene_N_out.mp4
   *
   * @param {{
   *   sceneIndex:   number,
   *   imagePath?:   string,
   *   videoPath?:   string,   // optional user clip / B-roll
   *   voicePath:    string,
   *   caption?:     string,
   *   camera?:      string,   // camera_hint from scene schema v1.0.0
   *   focalPoint?:  { x: number, y: number },
   *   manifest?:    ArtifactManifest  // optional — enables idempotency
   *   renderWidth?: number,   // default 1920
   *   renderHeight?: number,  // default 1080
   * }} opts
   * @returns {string} outputPath
   */
  renderScene({ sceneIndex, imagePath, videoPath, voicePath, caption = '', camera, focalPoint, manifest, renderWidth = 1920, renderHeight = 1080 } = {}) {
    const outputPath = path.join(this.vdir, `scene_${sceneIndex}_out.mp4`);

    // Idempotency: skip if already rendered and manifest says so
    if (manifest?.isSceneComplete(sceneIndex)) {
      const existingPath = manifest.scenes[sceneIndex].rendered_path;
      if (existingPath && fs.existsSync(existingPath)) return existingPath;
    }

    fs.mkdirSync(this.vdir, { recursive: true });

    // Duration from voice file.
    // No hard 60s cap — long scenes (documentary, lecture, podcast) can run as long as
    // the narration dictates. The per-scene ffmpeg timeout (5 min) is the real ceiling.
    //
    // Fix: guard voicePath=null/undefined before calling ffprobe.
    // _getAudioDuration(null) → ffprobe stdout empty → parseFloat('') = NaN → clampedDur=NaN
    // → ffmpeg receives "-t NaN" → scene silently produces 0-byte output → concat breaks A/V sync.
    if (!voicePath || !fs.existsSync(voicePath)) {
      throw new Error(`Scene ${sceneIndex} render failed: voicePath is missing or does not exist (${voicePath})`);
    }
    const dur        = this._getAudioDuration(voicePath);
    const clampedDur = Math.max(2, Number.isFinite(dur) ? dur + 0.15 : 3.15);

    const mediaSource    = videoPath || imagePath;
    const captionFilter  = this._captionFilter(caption);

    // No image and no video: generate a solid dark background so TTS-only
    // scenes (e.g. --no-images) still produce a valid video segment.
    if (!mediaSource) {
      const bgColor = '1e1e2e'; // dark navy
      const result = spawnSync('ffmpeg', [
        '-nostdin', '-y', '-threads', '2',
        '-f', 'lavfi', '-i', `color=c=#${bgColor}:s=${renderWidth}x${renderHeight}:r=30`,
        '-i', voicePath,
        '-map', '0:v:0', '-map', '1:a:0',
        // apad=whole_dur pads audio to exactly clampedDur so -t never truncates mid-word.
        // Specifying whole_dur is mandatory: without it -apad on a color source runs forever.
        '-af', `apad=whole_dur=${clampedDur}`,
        '-t', String(clampedDur),
        ...( captionFilter ? ['-vf', captionFilter] : [] ),
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
        '-movflags', '+faststart',
        outputPath,
      ], { timeout: 5 * 60 * 1000, encoding: 'utf8' });

      if (result.status !== 0) {
        throw new Error(`Scene ${sceneIndex} (no-image fallback) render failed: ${(result.stderr || '').slice(-300)}`);
      }
      manifest?.setSceneRendered(sceneIndex, outputPath);
      return outputPath;
    }

    const isVideoInput = Boolean(videoPath) || /\.(mp4|mov|webm|mkv|m4v)$/i.test(mediaSource);

    let inputArgs = [];
    let vf = '';

    if (isVideoInput) {
      // Loop video clip if shorter than duration, scale/crop to target resolution
      inputArgs = ['-stream_loop', '-1', '-i', mediaSource, '-i', voicePath];
      const scaleFilter = `scale=${renderWidth}:${renderHeight}:force_original_aspect_ratio=increase:flags=lanczos,crop=${renderWidth}:${renderHeight}`;
      vf = [scaleFilter, captionFilter].filter(Boolean).join(',');
    } else {
      // Image input with AnimationSystem camera motion
      inputArgs = ['-loop', '1', '-i', mediaSource, '-i', voicePath];
      const hint = camera || selectCameraHint(sceneIndex, focalPoint || {});
      const fx   = focalPoint ? { focalX: focalPoint.x, focalY: focalPoint.y } : {};
      const cameraFilter = buildCameraFilter(hint, { duration: clampedDur, w: renderWidth, h: renderHeight, ...fx });
      vf = [cameraFilter, captionFilter].filter(Boolean).join(',');
    }

    const result = spawnSync('ffmpeg', [
      '-nostdin', '-y', '-threads', '2',
      ...inputArgs,
      '-vf', vf || `scale=${renderWidth}:${renderHeight},format=yuv420p`,
      // apad=whole_dur pads audio to exactly clampedDur, preventing mid-word truncation
      // when voice is fractionally shorter than clampedDur and avoiding infinite padding
      // on looped-image inputs. -t then hard-caps output length at clampedDur.
      '-af', `apad=whole_dur=${clampedDur}`,
      '-t', String(clampedDur),
      '-map', '0:v:0', '-map', '1:a:0',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22',
      '-profile:v', 'high', '-level', '4.1',
      '-color_range', 'tv', '-colorspace', 'bt709',
      '-color_primaries', 'bt709', '-color_trc', 'bt709',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
      '-movflags', '+faststart',
      '-pix_fmt', 'yuv420p',
      outputPath,
    ], { timeout: 5 * 60 * 1000, encoding: 'utf8' });

    if (result.status !== 0) {
      const err = `Scene ${sceneIndex} render failed: ${(result.stderr || '').slice(-300)}`;
      manifest?.setSceneFailed(sceneIndex, err);
      throw new Error(err);
    }

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
    // Sanitize caption for ffmpeg drawtext.
    // Strip all characters that need ffmpeg escaping or that break the drawtext
    // filter syntax. After stripping : and %, re-escaping them is a no-op — removed.
    const safe = caption
      .replace(/['"\\:;|<>{}[\]()!@#$%^&*+=]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 45)
      .toUpperCase();
    if (!safe) return '';
    const safeFont = this.font.replace(/\\/g, '/').replace(/:/g, '\\:');
    // Bottom-center, safe zone: 100px from bottom + UI button zone
    return `drawtext=fontfile='${safeFont}':text='${safe}':fontsize=68:fontcolor=white:bordercolor=black:borderw=4:x=(w-text_w)/2:y=h-180:line_spacing=10`;
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

module.exports = { VideoRenderer };

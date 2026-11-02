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
const fs    = require('fs');

const { buildCameraFilter, selectCameraHint } = require('../animation/animation-system');
const { AudioMixer }                          = require('../audio-mixer/mixer');

const FONTS = [
  '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
  '/usr/share/fonts/liberation/LiberationSans-Bold.ttf',
  '/usr/share/fonts/opentype/noto/NotoSans-Bold.ttf',
  '/usr/share/fonts/noto/NotoSans-Bold.ttf',
];

class VideoRenderer {
  constructor({ filesDir = '/home/node/.n8n-files' } = {}) {
    this.filesDir = filesDir;
    this.vdir     = path.join(filesDir, 'video_tmp');
    this.font     = FONTS.find(f => fs.existsSync(f)) || '';
    this.mixer    = new AudioMixer({ filesDir });
  }

  /**
   * Render a single scene: image + voice → scene_N_out.mp4
   *
   * @param {{
   *   sceneIndex:  number,
   *   imagePath:   string,
   *   voicePath:   string,
   *   caption?:    string,
   *   camera?:     string,   // camera_hint from scene schema v1.0.0
   *   focalPoint?: { x: number, y: number },
   *   manifest?:   ArtifactManifest  // optional — enables idempotency
   * }} opts
   * @returns {string} outputPath
   */
  renderScene({ sceneIndex, imagePath, voicePath, caption = '', camera, focalPoint, manifest } = {}) {
    const outputPath = path.join(this.vdir, `scene_${sceneIndex}_out.mp4`);

    // Idempotency: skip if already rendered and manifest says so
    if (manifest?.isSceneComplete(sceneIndex)) {
      const existingPath = manifest.scenes[sceneIndex].rendered_path;
      if (existingPath && fs.existsSync(existingPath)) return existingPath;
    }

    fs.mkdirSync(this.vdir, { recursive: true });

    // Duration from voice file
    const dur        = this._getAudioDuration(voicePath);
    const clampedDur = Math.max(2, Math.min(60, dur + 0.15));

    // Camera movement from AnimationSystem
    const hint        = camera || selectCameraHint(sceneIndex, focalPoint || {});
    const fx          = focalPoint ? { focalX: focalPoint.x, focalY: focalPoint.y } : {};
    const cameraFilter = buildCameraFilter(hint, { duration: clampedDur, ...fx });

    // Caption filter
    const captionFilter = this._captionFilter(caption);
    const vf = [cameraFilter, captionFilter].filter(Boolean).join(',');

    const result = spawnSync('ffmpeg', [
      '-nostdin', '-y', '-threads', '2',
      '-loop', '1', '-i', imagePath,
      '-i', voicePath,
      '-vf', vf || `scale=1920:1080,format=yuv420p`,
      '-af', 'apad',
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
    if (sceneFiles.length < 5) throw new Error(`Too few scenes assembled: ${sceneFiles.length}`);

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
    if (stat.size < 1024 * 1024) throw new Error(`Assembled video too small: ${stat.size} bytes`);

    manifest?.setMaster(outputPath, { qualityPassed: false });
    return outputPath;
  }

  // ── Filter helpers ────────────────────────────────────────────────────────

  _captionFilter(caption) {
    if (!caption || !this.font) return '';
    // Sanitize caption for ffmpeg drawtext
    const safe = caption
      .replace(/['"\\:;|<>{}[\]()!@#$%^&*+=]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 45)
      .toUpperCase();
    if (!safe) return '';
    const escaped = safe.replace(/:/g, '\\:').replace(/%/g, '\\%');
    // Bottom-center, safe zone: 100px from bottom + UI button zone
    return `drawtext=fontfile='${this.font}':text='${escaped}':fontsize=68:fontcolor=white:bordercolor=black:borderw=4:x=(w-text_w)/2:y=h-180:line_spacing=10`;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _discoverScenes(sceneCount) {
    if (!fs.existsSync(this.vdir)) return [];
    const all = fs.readdirSync(this.vdir)
      .filter(f => /^scene_\d+_out\.mp4$/.test(f))
      .filter(f => fs.statSync(path.join(this.vdir, f)).size > 50000)
      .map(f => path.join(this.vdir, f))
      .sort((a, b) => {
        const na = parseInt(path.basename(a).match(/scene_(\d+)_out/)[1], 10);
        const nb = parseInt(path.basename(b).match(/scene_(\d+)_out/)[1], 10);
        return na - nb;
      });
    return sceneCount ? all.slice(0, sceneCount) : all;
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
    try {
      const result = spawnSync('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=nk=1:nw=1',
        audioPath,
      ], { encoding: 'utf8', timeout: 10000 });
      return parseFloat((result.stdout || '').trim()) || 3;
    } catch { return 3; }
  }
}

module.exports = { VideoRenderer };

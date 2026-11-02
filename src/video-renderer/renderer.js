/**
 * Video Renderer
 *
 * Assembles scene images + voice tracks into a master MP4.
 * Uses FFmpeg concat demuxer for frame-accurate assembly.
 *
 * Scene render parameters:
 * - Image: 1920x1080, zoompan animation (±1.12x max), caption drawtext
 * - Voice: per-scene m4a (produced by TTSProvider)
 * - Output: H.264 CRF 22, yuv420p, 30fps, AAC 192kbps
 * - Safe zones enforced: top 180px, bottom 400px, right 130px
 *
 * Requirements: Req 2 (Animation System), Req 6 (Rendering Pipeline)
 */

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

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
  }

  /**
   * Render a single scene: image + voice → scene_N_out.mp4
   * @param {{ sceneIndex: number, imagePath: string, voicePath: string, caption: string, camera: string }} opts
   */
  renderScene({ sceneIndex, imagePath, voicePath, caption = '', camera = 'slow_zoom_in' }) {
    const outputPath = path.join(this.vdir, `scene_${sceneIndex}_out.mp4`);

    // Duration from voice file
    const dur = this._getAudioDuration(voicePath);
    const clampedDur = Math.max(2, Math.min(60, dur + 0.15));

    // Zoom filter
    const zoomFilter = this._zoomFilter(camera);
    // Caption filter
    const captionFilter = this._captionFilter(caption);
    const vf = [zoomFilter, captionFilter].filter(Boolean).join(',');

    const result = spawnSync('ffmpeg', [
      '-nostdin', '-y', '-threads', '2',
      '-loop', '1', '-i', imagePath,
      '-i', voicePath,
      '-vf', vf || 'scale=1920:1080,format=yuv420p',
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

    if (result.status !== 0) throw new Error(`Scene ${sceneIndex} render failed: ${(result.stderr || '').slice(-300)}`);
    return outputPath;
  }

  /**
   * Assemble all scene_N_out.mp4 files into final_video.mp4
   */
  assembleMain({ productionId, sceneCount = null, withMusic = true, musicVolume = 0.07 } = {}) {
    fs.mkdirSync(this.vdir, { recursive: true });
    const outputPath = path.join(this.filesDir, `final_video_${productionId || Date.now()}.mp4`);

    // Discover scene files
    const sceneFiles = this._discoverScenes(sceneCount);
    if (sceneFiles.length < 5) throw new Error(`Too few scenes assembled: ${sceneFiles.length}`);

    // Build concat list
    const concatPath = path.join(this.vdir, 'concat_main.txt');
    fs.writeFileSync(concatPath, sceneFiles.map(f => `file '${path.basename(f)}'`).join('\n'));

    // Find music
    const musicFiles = this._findMusicFiles();
    const musicPath  = withMusic && musicFiles.length > 0 ? musicFiles[Math.floor(Math.random() * musicFiles.length)] : null;

    const ffmpegArgs = musicPath
      ? this._buildMixArgs(concatPath, musicPath, musicVolume, outputPath)
      : this._buildNoMusicArgs(concatPath, outputPath);

    const result = spawnSync('ffmpeg', ffmpegArgs, { cwd: this.vdir, timeout: 60 * 60 * 1000, encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`Assembly failed: ${(result.stderr || '').slice(-400)}`);

    // Verify
    const stat = fs.statSync(outputPath);
    if (stat.size < 1024 * 1024) throw new Error(`Assembled video too small: ${stat.size} bytes`);
    return outputPath;
  }

  // ── FFmpeg filter helpers ─────────────────────────────────────────────────

  _zoomFilter(camera) {
    switch (camera) {
      case 'slow_zoom_in':
        return "zoompan=z='min(zoom+0.0007,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=24";
      case 'slow_zoom_out':
        return "zoompan=z='if(lte(zoom,1.0),1.12,max(zoom-0.0007,1.0))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=24";
      default:
        return 'scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,crop=1920:1080';
    }
  }

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

  // ── Assembly args ─────────────────────────────────────────────────────────

  _buildMixArgs(concatPath, musicPath, musicVolume, outputPath) {
    const vol = Math.max(0.01, Math.min(0.5, musicVolume));
    return [
      '-nostdin', '-y', '-threads', '2',
      '-f', 'concat', '-safe', '0', '-i', concatPath,
      '-stream_loop', '-1', '-i', musicPath,
      '-filter_complex', `[0:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=1.0[av];[1:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${vol}[am];[av][am]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1:LRA=11[aout]`,
      '-map', '0:v', '-map', '[aout]',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
      '-movflags', '+faststart', outputPath,
    ];
  }

  _buildNoMusicArgs(concatPath, outputPath) {
    // Explicit stream maps are required when using -af alongside -c:v copy so
    // FFmpeg doesn't silently drop the audio filter or create ambiguous mapping.
    return [
      '-nostdin', '-y', '-threads', '2',
      '-f', 'concat', '-safe', '0', '-i', concatPath,
      '-map', '0:v', '-map', '0:a',
      '-af', 'loudnorm=I=-14:TP=-1:LRA=11',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
      '-movflags', '+faststart', outputPath,
    ];
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _discoverScenes(sceneCount) {
    const pattern = path.join(this.vdir, 'scene_*_out.mp4');
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

  _findMusicFiles() {
    const musicDir = path.join(this.filesDir, 'music');
    if (!fs.existsSync(musicDir)) return [];
    return fs.readdirSync(musicDir)
      .filter(f => /\.(mp3|m4a)$/i.test(f))
      .filter(f => fs.statSync(path.join(musicDir, f)).size > 50000)
      .map(f => path.join(musicDir, f));
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

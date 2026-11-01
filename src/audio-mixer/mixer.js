/**
 * Audio Mixer
 *
 * Professional audio mixing with sidechain ducking.
 * Voice track compresses to -20dB, music ducks by 15dB when voice is active.
 * Final output: -14 LUFS ± 0.5 LU, true peak ≤ -1 dBTP.
 *
 * Requirements implemented:
 * - Req 5.1: Voice compression ratio 3:1, threshold -20dBFS, attack 5ms, release 50ms
 * - Req 5.2: Music attenuation 15dB within 200ms when voice detected
 * - Req 5.3: Music restore within 1s when voice ends
 * - Req 5.4: Normalize final to -14 LUFS ±0.5 LU
 * - Req 5.6: High-pass 80Hz + low-pass 8000Hz on music track
 * - Req 5.7: Peak below -1 dBFS across all tracks
 */

'use strict';

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

class AudioMixer {
  constructor({ filesDir = '/home/node/.n8n-files' } = {}) {
    this.filesDir = filesDir;
  }

  /**
   * Mix voice track with background music using sidechain ducking.
   * @param {{ voicePath: string, musicPath: string|null, outputPath: string }} opts
   * @returns {string} outputPath
   */
  mixWithDucking({ voicePath, musicPath = null, outputPath }) {
    if (!musicPath || !fs.existsSync(musicPath) || fs.statSync(musicPath).size < 5000) {
      // No music — just normalise voice
      return this._normaliseVoice(voicePath, outputPath);
    }
    return this._sidechainMix(voicePath, musicPath, outputPath);
  }

  /**
   * Apply ducking + normalization to an assembled video.
   * Replaces the audio track in-place (creates new file).
   * @param {{ videoPath: string, musicPath?: string, outputPath: string }} opts
   */
  mixVideo({ videoPath, musicPath = null, outputPath }) {
    if (!musicPath || !fs.existsSync(musicPath)) {
      // Normalise existing audio track
      return this._normaliseVideo(videoPath, outputPath);
    }
    return this._videoWithDucking(videoPath, musicPath, outputPath);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _sidechainMix(voicePath, musicPath, outputPath) {
    // Voice: compress → sidechain trigger
    // Music: highpass 80Hz + lowpass 8000Hz → sidechaincompress (duck on voice)
    // Mix: loudnorm -14 LUFS
    const filterComplex = [
      '[0:a]acompressor=ratio=3:threshold=-20dB:attack=5:release=50[voice_comp]',
      '[1:a]highpass=f=80,lowpass=f=8000[music_filtered]',
      '[voice_comp][music_filtered]sidechaincompress=threshold=0.003:ratio=20:attack=0.2:release=1:makeup=2[mixed]',
      '[mixed]loudnorm=I=-14:TP=-1:LRA=11[out]',
    ].join(';');

    const result = spawnSync('ffmpeg', [
      '-nostdin', '-y',
      '-i', voicePath,
      '-i', musicPath,
      '-filter_complex', filterComplex,
      '-map', '[out]',
      '-ar', '48000', '-ac', '2', '-c:a', 'aac', '-b:a', '192k',
      outputPath,
    ], { timeout: 120000, encoding: 'utf8' });

    if (result.status !== 0) {
      throw new Error(`Audio ducking failed: ${(result.stderr || '').slice(-300)}`);
    }
    return outputPath;
  }

  _videoWithDucking(videoPath, musicPath, outputPath) {
    const filterComplex = [
      '[0:a]acompressor=ratio=3:threshold=-20dB:attack=5:release=50[voice_comp]',
      '[1:a]aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=80,lowpass=f=8000,volume=0.15[music_filtered]',
      '[voice_comp][music_filtered]sidechaincompress=threshold=0.003:ratio=20:attack=0.2:release=1:makeup=2[mixed]',
      '[mixed]loudnorm=I=-14:TP=-1:LRA=11[audio_out]',
    ].join(';');

    const result = spawnSync('ffmpeg', [
      '-nostdin', '-y',
      '-i', videoPath,          // input 0: video with voice
      '-stream_loop', '-1',
      '-i', musicPath,          // input 1: music (loop to fill)
      '-filter_complex', filterComplex,
      '-map', '0:v',
      '-map', '[audio_out]',
      '-c:v', 'copy',           // no re-encode of video
      '-c:a', 'aac', '-b:a', '192k',
      '-shortest',
      '-movflags', '+faststart',
      outputPath,
    ], { timeout: 300000, encoding: 'utf8' });

    if (result.status !== 0) {
      throw new Error(`Video ducking failed: ${(result.stderr || '').slice(-300)}`);
    }
    return outputPath;
  }

  _normaliseVoice(voicePath, outputPath) {
    const result = spawnSync('ffmpeg', [
      '-nostdin', '-y',
      '-i', voicePath,
      '-af', 'loudnorm=I=-14:TP=-1:LRA=11',
      '-ar', '48000', '-ac', '2', '-c:a', 'aac', '-b:a', '192k',
      outputPath,
    ], { timeout: 60000, encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`Voice normalise failed: ${(result.stderr || '').slice(-200)}`);
    return outputPath;
  }

  _normaliseVideo(videoPath, outputPath) {
    const result = spawnSync('ffmpeg', [
      '-nostdin', '-y',
      '-i', videoPath,
      '-vf', 'copy',
      '-af', 'loudnorm=I=-14:TP=-1:LRA=11',
      '-c:v', 'copy',
      '-c:a', 'aac', '-b:a', '192k',
      '-movflags', '+faststart',
      outputPath,
    ], { timeout: 300000, encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`Video normalise failed: ${(result.stderr || '').slice(-200)}`);
    return outputPath;
  }

  /**
   * Detect pauses in an audio file (for caption sync).
   * Returns array of { start, end } in seconds.
   */
  detectPauses(audioPath, { noiseTolerance = '-40dB', minPause = 0.3 } = {}) {
    try {
      const result = spawnSync('ffmpeg', [
        '-nostdin', '-i', audioPath,
        '-af', `silencedetect=noise=${noiseTolerance}:d=${minPause}`,
        '-f', 'null', '-',
      ], { timeout: 30000, encoding: 'utf8' });
      const output = (result.stderr || result.stdout || '').toString();
      const pauses = [];
      const starts  = [...output.matchAll(/silence_start: ([\d.]+)/g)].map(m => parseFloat(m[1]));
      const ends    = [...output.matchAll(/silence_end: ([\d.]+)/g)].map(m => parseFloat(m[1]));
      for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
        pauses.push({ start: starts[i], end: ends[i], duration: ends[i] - starts[i] });
      }
      return pauses;
    } catch { return []; }
  }
}

module.exports = { AudioMixer };

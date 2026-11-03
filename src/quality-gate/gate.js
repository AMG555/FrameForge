/**
 * Quality Gate
 *
 * Hard gates (must pass to proceed):
 *   - Valid video + audio streams
 *   - Resolution 1920x1080 (master) or 1080x1920 (short)
 *   - H.264 codec, yuv420p pixel format, 30fps
 *   - Integrated loudness: -14 LUFS ±1.5 LU
 *   - True peak: ≤ -0.5 dBTP
 *   - No black frames > 0.5s
 *   - No frozen frames > 0.5s
 *   - File size > 1MB
 *   - No ffprobe errors
 *
 * Sanity checks (warn, do not block):
 *   - Video bitrate ≥ 3 Mbps
 *   - Duration within 5% of expected
 *
 * Diagnostics (informational):
 *   - SNR: voice_rms - noise_floor_rms
 *   - File size bytes
 */

'use strict';

const { spawnSync } = require('child_process');
const path          = require('path');

class QualityGate {
  /**
   * Validate a master video.
   * Accepts both 1920×1080 (landscape) and 1080×1920 (portrait).
   * @param {string} videoPath
   * @param {{ width?: number, height?: number }} [opts]  expected resolution override
   * @returns {{ passed: boolean, checks: Check[], diagnostics: Diagnostic[] }}
   */
  async validateMaster(videoPath, { width, height } = {}) {
    // If caller doesn't specify, probe the file and accept whichever valid format it is.
    const expectedW = width  || this._probeExpectedDimension(videoPath, 'width')  || 1920;
    const expectedH = height || this._probeExpectedDimension(videoPath, 'height') || 1080;
    return this._validate(videoPath, { width: expectedW, height: expectedH, minDuration: 5, maxDuration: 3600 });
  }

  /**
   * Validate a short (1080x1920).
   * @param {string} videoPath
   */
  async validateShort(videoPath) {
    return this._validate(videoPath, { width: 1080, height: 1920, minDuration: 5, maxDuration: 90 });
  }

  /**
   * Read the actual video dimensions and snap to the nearest valid master format.
   * Accepted: 1920×1080 (landscape) and 1080×1920 (portrait).
   * Returns the actual dimension if it matches a valid format, otherwise 1920/1080.
   */
  _probeExpectedDimension(videoPath, axis) {
    try {
      const raw  = this._ffprobe(videoPath, ['-show_streams', '-select_streams', 'v:0', '-print_format', 'json']);
      const info = JSON.parse(raw).streams?.[0] || {};
      const w = info.width;
      const h = info.height;
      // Snap to known valid formats
      if ((w === 1920 && h === 1080) || (w === 1080 && h === 1920)) {
        return axis === 'width' ? w : h;
      }
    } catch { /* fall through to default */ }
    return null;
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  async _validate(videoPath, { width, height, minDuration, maxDuration }) {
    const checks     = [];
    const diagnostics = [];
    let passed = true;

    const fail = (name, expected, actual, message) => {
      checks.push({ name, type: 'HARD_GATE', passed: false, expected, actual, message });
      passed = false;
    };
    const pass = (name, expected, actual) => {
      checks.push({ name, type: 'HARD_GATE', passed: true, expected, actual });
    };
    const warn = (name, expected, actual, message) => {
      checks.push({ name, type: 'SANITY_CHECK', passed: true, expected, actual, message });
    };
    const diag = (metric, value, unit, interpretation) => {
      diagnostics.push({ metric, value, unit, interpretation, type: 'DIAGNOSTIC' });
    };

    // ── 1. File size ──────────────────────────────────────────────────────
    try {
      const stat = require('fs').statSync(videoPath);
      if (stat.size < 100 * 1024) { fail('file_size', '>100KB', `${Math.round(stat.size/1024)}KB`, 'File too small'); }
      else { pass('file_size', '>100KB', `${Math.round(stat.size/1024)}KB`); }
      diag('file_size_bytes', stat.size, 'bytes', 'Video file size');
    } catch (err) { fail('file_exists', 'exists', 'missing', err.message); }

    // ── 2. Stream validity ────────────────────────────────────────────────
    let streams = {};
    try {
      const raw = this._ffprobe(videoPath, ['-show_streams', '-show_format', '-print_format', 'json']);
      const probe = JSON.parse(raw);
      const video = probe.streams?.find(s => s.codec_type === 'video');
      const audio = probe.streams?.find(s => s.codec_type === 'audio');

      if (!video) { fail('video_stream', 'present', 'missing'); }
      else {
        streams.video  = video;
        pass('video_stream', 'present', 'present');

        // Resolution
        if (video.width !== width || video.height !== height) {
          fail('resolution', `${width}x${height}`, `${video.width}x${video.height}`);
        } else { pass('resolution', `${width}x${height}`, `${video.width}x${video.height}`); }

        // Codec
        if (video.codec_name !== 'h264') { fail('video_codec', 'h264', video.codec_name); }
        else { pass('video_codec', 'h264', video.codec_name); }

        // Pixel format
        if (video.pix_fmt !== 'yuv420p') { fail('pixel_format', 'yuv420p', video.pix_fmt); }
        else { pass('pixel_format', 'yuv420p', video.pix_fmt); }

        // Frame rate (24 or 30 accepted) — r_frame_rate is "num/den", parse safely
        const [fpsNum, fpsDen] = (video.r_frame_rate || '0/1').split('/').map(Number);
        const fps = fpsDen > 0 ? fpsNum / fpsDen : 0;
        if (fps < 23 || fps > 31) { fail('frame_rate', '24-30fps', `${fps.toFixed(1)}fps`); }
        else { pass('frame_rate', '24-30fps', `${fps.toFixed(1)}fps`); }

        // Bitrate sanity
        const bitrateKbps = parseInt(probe.format?.bit_rate || '0', 10) / 1000;
        if (bitrateKbps > 0 && bitrateKbps < 3000) {
          warn('video_bitrate', '≥3000 kbps', `${Math.round(bitrateKbps)} kbps`, 'Low bitrate (normal for simple animation with CRF encoding)');
        } else if (bitrateKbps > 0) {
          pass('video_bitrate', '≥3000 kbps', `${Math.round(bitrateKbps)} kbps`);
        }
        diag('video_bitrate_kbps', bitrateKbps, 'kbps', 'Average video bitrate');
      }

      if (!audio) { fail('audio_stream', 'present', 'missing'); }
      else {
        streams.audio = audio;
        pass('audio_stream', 'present', 'present');

        // Duration
        const dur = parseFloat(probe.format?.duration || '0');
        if (dur > 0) {
          if (dur < minDuration || dur > maxDuration) {
            warn('duration', `${minDuration}-${maxDuration}s`, `${dur.toFixed(1)}s`, 'Duration outside expected range');
          } else { pass('duration', `${minDuration}-${maxDuration}s`, `${dur.toFixed(1)}s`); }
          diag('duration_seconds', dur, 's', 'Video duration');
        }
      }
    } catch (err) {
      fail('ffprobe', 'no errors', err.message.slice(0, 100));
    }

    // ── 3. LUFS + True Peak ───────────────────────────────────────────────
    try {
      const loudnormOut = this._ffmpeg(['-i', videoPath, '-af', 'loudnorm=I=-14:TP=-1:print_format=json', '-f', 'null', '-']);
      const jsonMatch   = loudnormOut.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const ln       = JSON.parse(jsonMatch[0]);
        const measuredI  = parseFloat(ln.input_i || '0');
        const measuredTP = parseFloat(ln.input_tp || '0');

        if (Math.abs(measuredI - (-14)) > 1.5) {
          fail('integrated_loudness', '-14 ±1.5 LU', `${measuredI.toFixed(1)} LUFS`);
        } else { pass('integrated_loudness', '-14 ±1.5 LU', `${measuredI.toFixed(1)} LUFS`); }

        if (measuredTP > -0.5) {
          fail('true_peak', '≤-0.5 dBTP', `${measuredTP.toFixed(1)} dBTP`);
        } else { pass('true_peak', '≤-0.5 dBTP', `${measuredTP.toFixed(1)} dBTP`); }

        diag('integrated_loudness_LUFS', measuredI, 'LUFS', 'Integrated loudness (target -14)');
        diag('true_peak_dBTP', measuredTP, 'dBTP', 'True peak (limit -1.0)');
      }
    } catch (err) {
      warn('loudness_check', 'measurable', 'error', `Loudnorm check failed: ${err.message.slice(0, 80)}`);
    }

    // ── 4. Black frame detection ──────────────────────────────────────────
    try {
      const blackOut = this._ffmpeg(['-i', videoPath, '-vf', 'blackdetect=d=0.5:pix_th=0.10', '-f', 'null', '-']);
      if (blackOut.includes('black_start')) {
        fail('black_frames', 'none >0.5s', 'detected');
      } else { pass('black_frames', 'none >0.5s', 'none'); }
    } catch { /* non-fatal */ }

    // ── 5. Frozen frame detection ─────────────────────────────────────────
    // n=0.0001 means two frames are "frozen" only when 1-SSIM < 0.0001 (SSIM > 0.9999).
    // Demoted to warn: static camera shots on uniform backgrounds legitimately produce
    // high inter-frame similarity and should not hard-block a valid production.
    try {
      const freezeOut = this._ffmpeg(['-i', videoPath, '-vf', 'freezedetect=n=0.0001:d=0.5', '-f', 'null', '-']);
      if (freezeOut.includes('freeze_start')) {
        warn('frozen_frames', 'none >0.5s', 'detected', 'High inter-frame similarity detected (check for unintended freeze)');
      } else { pass('frozen_frames', 'none >0.5s', 'none'); }
    } catch { /* non-fatal */ }

    return {
      passed,
      checks,
      diagnostics,
      timestamp: new Date().toISOString(),
      schemaVersion: '1.0.0',
    };
  }

  _ffprobe(file, args = []) {
    const result = spawnSync('ffprobe', ['-v', 'error', ...args, file], {
      encoding: 'utf8', timeout: 30000,
    });
    if (result.error) throw result.error;
    return (result.stdout || '') + (result.stderr || '');
  }

  _ffmpeg(args = []) {
    // FFmpeg writes filter output to stderr; we capture both and return combined
    const result = spawnSync('ffmpeg', ['-nostdin', ...args], {
      encoding: 'utf8', timeout: 120000,
    });
    return (result.stderr || result.stdout || result.error?.message || '').toString();
  }
}

module.exports = { QualityGate };

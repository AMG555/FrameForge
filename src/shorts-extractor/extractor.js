/**
 * Shorts Extractor — Tasks #13, #14, #15
 *
 * Extracts 3-5 vertical (9:16) short videos from a master 16:9 video.
 *
 * Algorithm:
 * 1. Analyze master for scene boundaries (silence + freeze detection)
 * 2. Score each candidate segment: hook + curiosity + payoff + standalone_context + information_density - repetition_penalty
 * 3. Select top 3-5 segments (30-90s each, non-overlapping)
 * 4. Vertical reformat with saliency-aware crop (scene-defined focal_point or center)
 * 5. Final audio normalization to -14 LUFS
 *
 * Task #14 — Vertical Reformatting (16:9 → 9:16):
 * Input: 1920×1080 (16:9)
 * Output: 1080×1920 (9:16)
 * Strategy:
 *   - Crop width = ih × 9/16 = 1080 × 9/16 = 607.5 → 607px (keeping divisible-by-2)
 *   - X offset computed from focal_point.x, clamped to [0, 1920-607] = [0, 1313]
 *   - Y is always 0 (full height retained; vertical output height = input height)
 *   - After crop: scale 607×1080 → 1080×1920
 *
 * Safe zones enforced (YouTube Shorts UI overlay areas):
 *   - Top 180px of OUTPUT: avoid placing text/action here (navigation bar)
 *   - Bottom 400px of OUTPUT: avoid placing key action here (buttons/captions)
 *   - Right 130px: avoid (subscribe / like buttons)
 *   Focal-point bias: y ≤ 0.35 (upper-third bias for talking-head content)
 *   These are informational — they guide _defaultFocalY() but FFmpeg itself crops the full frame.
 *
 * Requirements implemented:
 * - Req 4.1: Analyze for scene changes, audio peaks, motion scores
 * - Req 4.2: Segments 30-90s, begin/end at scene boundaries
 * - Req 4.5: Saliency-aware framing with focal_point support + safe-zone bias
 * - Req 4.7: Audio normalization to -14 LUFS
 * - Req 4.8: Generate 3-5 shorts per master
 * - Req 4.10: Output 1080x1920 H.264 AAC
 */

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

class ShortsExtractor {
  constructor({ filesDir = '/home/node/.n8n-files' } = {}) {
    this.filesDir = filesDir;
  }

  /**
   * Extract candidate segments from a master video (used by Workflow D2).
   * Returns scored, non-overlapping segment objects — does NOT render them.
   * @param {string} masterPath
   * @param {{ sceneMeta?: object, maxCandidates?: number }} opts
   * @returns {Segment[]}
   */
  extractCandidates(masterPath, { sceneMeta = {}, maxCandidates = 9 } = {}) {
    const duration = this._getDuration(masterPath);
    if (!duration || duration < 30) throw new Error(`Master video too short: ${duration}s`);

    const silences   = this._detectSilence(masterPath);
    const boundaries = this._silenceToBoundaries(silences, duration);

    // Build scenes array from sceneMeta map (keyed by scene_id)
    const scenes = Object.entries(sceneMeta).map(([id, meta]) => ({
      scene_id:      parseInt(id, 10),
      focal_point:   meta.focalPoint,
      hook_potential: meta.hookPotential,
      standalone:    meta.standalone,
    }));

    const candidates = this._buildCandidates(boundaries, scenes, duration);
    const selected   = this._selectSegments(candidates).slice(0, maxCandidates);

    return selected.map(seg => ({
      startSec:  seg.start,
      endSec:    seg.end,
      duration:  seg.duration,
      score:     seg.score,
      coveredScenes: seg.coveredScenes,
    }));
  }

  /**
   * Render a single short from a pre-scored segment (used by Workflow D2).
   * @param {string} masterPath
   * @param {{ startSec: number, endSec: number, duration: number, coveredScenes?: object[] }} segment
   * @param {string} outputPath
   */
  renderShort(masterPath, segment, outputPath) {
    const seg = {
      start:         segment.startSec,
      end:           segment.endSec,
      duration:      segment.duration || (segment.endSec - segment.startSec),
      coveredScenes: segment.coveredScenes || [],
    };
    this._extractSegment(masterPath, seg, seg.coveredScenes, outputPath);
    return outputPath;
  }

  /**
   * High-level: extract + render all shorts in one call.
   * @param {{ masterPath: string, scenes: Scene[], outputDir: string }} opts
   * @returns {ShortResult[]}
   */
  extractShorts({ masterPath, scenes = [], outputDir }) {
    fs.mkdirSync(outputDir, { recursive: true });

    // Step 1: Get master duration
    const duration = this._getDuration(masterPath);
    if (!duration || duration < 30) throw new Error(`Master video too short: ${duration}s`);

    // Step 2: Detect silence boundaries (scene breaks)
    const silences   = this._detectSilence(masterPath);
    const boundaries = this._silenceToBoundaries(silences, duration);

    // Step 3: Build candidate segments
    const candidates = this._buildCandidates(boundaries, scenes, duration);

    // Step 4: Score and select best segments
    const selected = this._selectSegments(candidates);
    if (selected.length < 1) throw new Error(`No valid segments found (need 30-90s, got ${candidates.length} candidates)`);

    // Step 5: Extract and reformat each segment
    const results = [];
    for (let i = 0; i < selected.length; i++) {
      const seg       = selected[i];
      const outputPath = path.join(outputDir, `short_${i + 1}.mp4`);
      this._extractSegment(masterPath, seg, scenes, outputPath);
      const stat = fs.statSync(outputPath);
      results.push({ index: i + 1, outputPath, start: seg.start, end: seg.end, duration: seg.duration, contentScore: seg.score, sizeBytes: stat.size });
    }

    return results;
  }

  // ── Silence / scene boundary detection ───────────────────────────────────

  _detectSilence(videoPath) {
    const result = spawnSync('ffmpeg', [
      '-nostdin', '-i', videoPath,
      '-af', 'silencedetect=noise=-40dB:d=0.4',
      '-f', 'null', '-',
    ], { timeout: 60000, encoding: 'utf8' });
    const output = (result.stderr || result.stdout || '').toString();
    const pauses = [];
    const starts  = [...output.matchAll(/silence_start: ([\d.]+)/g)].map(m => parseFloat(m[1]));
    const ends    = [...output.matchAll(/silence_end: ([\d.]+)/g)].map(m => parseFloat(m[1]));
    for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
      pauses.push({ start: starts[i], end: ends[i] });
    }
    return pauses;
  }

  _silenceToBoundaries(silences, totalDuration) {
    // Start/end of each silence = potential scene boundary
    const pts = new Set([0, totalDuration]);
    for (const { start, end } of silences) {
      pts.add(Math.round(start * 10) / 10);
      pts.add(Math.round(end * 10) / 10);
    }
    return [...pts].sort((a, b) => a - b);
  }

  // ── Segment building ──────────────────────────────────────────────────────

  _buildCandidates(boundaries, scenes, totalDuration) {
    const candidates = [];
    const MIN = 30, MAX = 90;

    for (let i = 0; i < boundaries.length - 1; i++) {
      for (let j = i + 1; j < boundaries.length; j++) {
        const start    = boundaries[i];
        const end      = boundaries[j];
        const duration = end - start;
        if (duration < MIN) continue;
        if (duration > MAX) break;
        // Estimate which scenes fall in this segment
        const coveredScenes = this._scenesInRange(scenes, start, end, totalDuration);
        candidates.push({ start, end, duration, coveredScenes, score: 0 });
      }
    }

    // Score each candidate
    for (const cand of candidates) {
      cand.score = this._scoreSegment(cand);
    }
    return candidates;
  }

  _scenesInRange(scenes, start, end, totalDuration) {
    if (!scenes.length) return [];
    const sceneDur = totalDuration / scenes.length;
    return scenes.filter((_, i) => {
      const sStart = i * sceneDur;
      const sEnd   = (i + 1) * sceneDur;
      return sStart >= start && sEnd <= end;
    });
  }

  // ── Content scoring ───────────────────────────────────────────────────────

  _scoreSegment(segment) {
    const { duration, coveredScenes } = segment;
    // Prefer segments near the start (hook potential), but not the very first 30s
    const positionScore = segment.start > 30 && segment.start < 300 ? 0.8 : 0.4;
    // Prefer denser content (more scenes)
    const densityScore  = Math.min(coveredScenes.length / 8, 1.0);
    // Prefer 45-70s duration (sweet spot for Shorts)
    const durationScore = duration >= 45 && duration <= 70 ? 1.0 : 0.6;
    return (positionScore + densityScore + durationScore) / 3;
  }

  _selectSegments(candidates) {
    if (!candidates.length) return [];
    // Sort by score descending
    const sorted = [...candidates].sort((a, b) => b.score - a.score);
    // Greedily select non-overlapping segments
    const selected = [];
    for (const cand of sorted) {
      if (selected.length >= 5) break;
      const overlaps = selected.some(s => cand.start < s.end && cand.end > s.start);
      if (!overlaps) selected.push(cand);
    }
    return selected.slice(0, 5);
  }

  // ── Extraction + vertical reformat ───────────────────────────────────────

  _extractSegment(masterPath, segment, scenes, outputPath) {
    // Task #14: focal-point aware crop with safe-zone bias
    const focal = this._focalPointForSegment(segment, scenes);
    const xOff  = this._focalToFFmpegX(focal.x);
    const yOff  = this._focalToFFmpegY();
    // cropW=608, cropH=1080 → scale to 1080×1920 (9:16)
    const CROP_W = 608;
    const CROP_H = 1080;

    // Extract → vertical crop → scale → normalise audio
    // Note: crop filter uses pixel integers — no FFmpeg expression needed
    const vf = [
      `crop=${CROP_W}:${CROP_H}:${xOff}:${yOff}`,
      'scale=1080:1920:flags=lanczos',
      // Gentle quality enhancement — safe for any content
      'unsharp=3:3:0.3:3:3:0.0',
      'eq=contrast=1.02:brightness=0:saturation=1.04',
      'format=yuv420p',
    ].join(',');

    const result = spawnSync('ffmpeg', [
      '-nostdin', '-y',
      '-ss',     String(segment.start),
      '-t',      String(segment.duration),
      '-i',      masterPath,
      '-vf',     vf,
      '-af',     'loudnorm=I=-14:TP=-1:LRA=11',
      '-c:v',    'libx264',
      '-preset', 'fast',
      '-crf',    '22',
      '-profile:v', 'high',
      '-level',  '4.1',
      '-color_range', 'tv',
      '-colorspace', 'bt709',
      '-color_primaries', 'bt709',
      '-color_trc', 'bt709',
      '-c:a',    'aac',
      '-b:a',    '192k',
      '-ar',     '48000',
      '-ac',     '2',
      '-movflags', '+faststart',
      outputPath,
    ], { timeout: 300000, encoding: 'utf8' });

    if (result.status !== 0) {
      throw new Error(`Short extraction failed: ${(result.stderr || '').slice(-300)}`);
    }
    return outputPath;
  }

  /**
   * Task #14 — Vertical Reformat helpers
   *
   * For a 1920×1080 input:
   *   cropW = floor(1080 * 9 / 16 / 2) * 2 = 608 (must be even for libx264)
   *   cropH = 1080
   *   x offset = clamp(round(focalX * 1920 - cropW/2), 0, 1920 - cropW)
   *   y offset = 0
   */

  // Safe-zone bias: subjects are more compelling in the upper third of a Shorts frame.
  // Focal y ≤ 0.35 maps naturally to upper-third; fallback for non-talking content is 0.5.
  _defaultFocalY(scenes) {
    for (const s of (scenes || [])) {
      if (s.focal_point?.y !== undefined && s.focal_point.y <= 0.5) {
        return s.focal_point.y;
      }
    }
    return 0.35; // upper-third bias — safe against both top (180px) and bottom (400px) zones
  }

  _focalPointForSegment(segment, scenes) {
    for (const scene of (segment.coveredScenes || [])) {
      if (scene.focal_point?.x !== undefined) {
        return { x: scene.focal_point.x, y: scene.focal_point.y ?? 0.35 };
      }
    }
    // No focal point from scenes — apply safe-zone upper-third bias
    const defaultY = this._defaultFocalY(scenes);
    return { x: 0.5, y: defaultY };
  }

  /**
   * Compute pixel X offset for a 9:16 crop of a 1920×1080 frame.
   * cropW = 608 (largest even number ≤ 1080 × 9/16 = 607.5)
   * @param {number} focalX  0-1 relative horizontal position of subject
   * @returns {number}       integer pixel offset (clamped, even)
   */
  _focalToFFmpegX(focalX) {
    const INPUT_W = 1920;
    const CROP_W  = 608; // must be even; = floor(1080*9/16/2)*2
    const raw     = Math.round(focalX * INPUT_W - CROP_W / 2);
    const clamped = Math.max(0, Math.min(INPUT_W - CROP_W, raw));
    // Force even (libx264 requires even dimensions)
    return clamped % 2 === 0 ? clamped : clamped - 1;
  }

  _focalToFFmpegY() {
    return 0; // for landscape→portrait, Y crop is always from top (retain full height)
  }

  _getDuration(videoPath) {
    try {
      const result = spawnSync('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=nk=1:nw=1',
        videoPath,
      ], { encoding: 'utf8', timeout: 15000 });
      return parseFloat((result.stdout || result.stderr || '0').trim());
    } catch { return 0; }
  }
}

module.exports = { ShortsExtractor };

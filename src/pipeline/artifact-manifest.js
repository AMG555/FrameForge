/**
 * Artifact Manifest — Task #24
 *
 * Every production run creates a deterministic, content-addressed manifest
 * so the pipeline can:
 *   1. Skip re-rendering unchanged scenes (idempotency)
 *   2. Verify artifact integrity on resume
 *   3. Build Artifact Retention Rules (#27)
 *   4. Feed cost tracking (telemetry.js)
 *
 * Manifest structure (written to artifacts/<production_id>/manifest.json):
 * {
 *   "schema_version": "1.0.0",
 *   "production_id": "prod_...",
 *   "pipeline_version": "1.0.0",
 *   "narration_hash": "<sha256 of full script text>",
 *   "config_hash": "<sha256 of env+provider config>",
 *   "created_at": "<ISO 8601>",
 *   "scenes": [
 *     {
 *       "index": 0,
 *       "scene_hash": "<sha256 of scene JSON>",
 *       "image_path": "...",
 *       "image_hash": "<sha256 of image file>",
 *       "voice_path": "...",
 *       "voice_hash": "<sha256 of voice file>",
 *       "rendered_path": "...",
 *       "rendered_hash": "<sha256 of rendered scene>",
 *       "status": "pending|complete|failed"
 *     }
 *   ],
 *   "master": {
 *     "path": "...",
 *     "hash": "...",
 *     "duration_sec": 0,
 *     "size_bytes": 0,
 *     "quality_passed": false
 *   },
 *   "shorts": [],
 *   "thumbnail": { "path": "...", "hash": "..." },
 *   "audio_config": {
 *     "provider": "edge-tts",
 *     "voice": "en-US-GuyNeural",
 *     "music_path": null,
 *     "lufs_target": -14,
 *     "true_peak_max": -1
 *   },
 *   "telemetry": {
 *     "total_cost_usd": 0,
 *     "stage_durations_ms": {}
 *   }
 * }
 *
 * Hashes are computed lazily (file hash only when file exists).
 * The manifest file itself is re-written on every stage completion.
 */

'use strict';

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const MANIFEST_SCHEMA_VERSION = '1.0.0';
const PIPELINE_VERSION        = process.env.PIPELINE_VERSION || '1.0.0';

class ArtifactManifest {
  /**
   * @param {{ productionId: string, artifactsDir?: string }} opts
   */
  constructor({ productionId, artifactsDir = '/home/node/.n8n-files/artifacts' } = {}) {
    if (!productionId) throw new Error('productionId is required');
    this.productionId  = productionId;
    this.dir           = path.join(artifactsDir, productionId);
    this.manifestPath  = path.join(this.dir, 'manifest.json');
    this._data         = null;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Create a new manifest for a fresh production run.
   * Returns the manifest data object.
   */
  create({ narrationText, configSnapshot, scenes = [], audioConfig = {} } = {}) {
    fs.mkdirSync(this.dir, { recursive: true });
    this._data = {
      schema_version:  MANIFEST_SCHEMA_VERSION,
      production_id:   this.productionId,
      pipeline_version: PIPELINE_VERSION,
      narration_hash:  narrationText ? _sha256(narrationText) : null,
      config_hash:     configSnapshot ? _sha256(JSON.stringify(configSnapshot)) : null,
      created_at:      new Date().toISOString(),
      updated_at:      new Date().toISOString(),
      scenes:          scenes.map((s, i) => this._sceneEntry(s, i)),
      master:          { path: null, hash: null, duration_sec: 0, size_bytes: 0, quality_passed: false },
      shorts:          [],
      thumbnail:       { path: null, hash: null },
      audio_config:    {
        provider:      process.env.PROVIDER_TTS || 'edge-tts',
        voice:         process.env.TTS_VOICE || 'en-US-GuyNeural',
        music_path:    null,
        lufs_target:   -14,
        true_peak_max: -1,
        ...audioConfig,
      },
      telemetry: {
        total_cost_usd:     0,
        stage_durations_ms: {},
      },
    };
    this._write();
    return this._data;
  }

  /**
   * Load an existing manifest from disk (for resume / idempotency checks).
   * Returns null if no manifest exists.
   */
  load() {
    if (!fs.existsSync(this.manifestPath)) return null;
    try {
      this._data = JSON.parse(fs.readFileSync(this.manifestPath, 'utf8'));
      return this._data;
    } catch (err) {
      throw new Error(`Corrupt manifest at ${this.manifestPath}: ${err.message}`);
    }
  }

  /**
   * Load or create — the canonical entry point for a production run.
   * If an existing manifest exists AND its narration_hash matches → resume.
   * Otherwise → create new (or overwrite stale).
   */
  loadOrCreate({ narrationText, configSnapshot, scenes = [], audioConfig = {} } = {}) {
    const existing = this.load();
    if (existing) {
      const incomingHash = narrationText ? _sha256(narrationText) : null;
      if (incomingHash && existing.narration_hash === incomingHash) {
        // Same narration — resume
        return { manifest: this._data, resumed: true };
      }
      // Different narration — overwrite
    }
    return { manifest: this.create({ narrationText, configSnapshot, scenes, audioConfig }), resumed: false };
  }

  // ── Scene artifact updates ─────────────────────────────────────────────────

  /**
   * Mark a scene's image as generated.
   */
  setSceneImage(sceneIndex, imagePath) {
    const scene = this._getScene(sceneIndex);
    scene.image_path = imagePath;
    scene.image_hash = fs.existsSync(imagePath) ? _fileHash(imagePath) : null;
    this._touch();
    return this;
  }

  /**
   * Mark a scene's voice track as generated.
   */
  setSceneVoice(sceneIndex, voicePath) {
    const scene = this._getScene(sceneIndex);
    scene.voice_path = voicePath;
    scene.voice_hash = fs.existsSync(voicePath) ? _fileHash(voicePath) : null;
    this._touch();
    return this;
  }

  /**
   * Mark a scene's rendered MP4 as complete.
   */
  setSceneRendered(sceneIndex, renderedPath) {
    const scene = this._getScene(sceneIndex);
    scene.rendered_path = renderedPath;
    scene.rendered_hash = fs.existsSync(renderedPath) ? _fileHash(renderedPath) : null;
    scene.status = 'complete';
    this._touch();
    return this;
  }

  setSceneFailed(sceneIndex, reason) {
    const scene = this._getScene(sceneIndex);
    scene.status = 'failed';
    scene.fail_reason = reason;
    this._touch();
    return this;
  }

  // ── Master + shorts ────────────────────────────────────────────────────────

  setMaster(masterPath, { durationSec = 0, qualityPassed = false } = {}) {
    const stat = fs.existsSync(masterPath) ? fs.statSync(masterPath) : null;
    this._data.master = {
      path:           masterPath,
      hash:           stat ? _fileHash(masterPath) : null,
      duration_sec:   durationSec,
      size_bytes:     stat ? stat.size : 0,
      quality_passed: qualityPassed,
    };
    this._touch();
    return this;
  }

  addShort({ path: shortPath, durationSec = 0, qualityPassed = false } = {}) {
    const stat = fs.existsSync(shortPath) ? fs.statSync(shortPath) : null;
    this._data.shorts.push({
      path:           shortPath,
      hash:           stat ? _fileHash(shortPath) : null,
      duration_sec:   durationSec,
      size_bytes:     stat ? stat.size : 0,
      quality_passed: qualityPassed,
    });
    this._touch();
    return this;
  }

  setThumbnail(thumbnailPath) {
    this._data.thumbnail = {
      path: thumbnailPath,
      hash: fs.existsSync(thumbnailPath) ? _fileHash(thumbnailPath) : null,
    };
    this._touch();
    return this;
  }

  // ── Telemetry ─────────────────────────────────────────────────────────────

  recordStageDuration(stage, durationMs) {
    this._data.telemetry.stage_durations_ms[stage] = durationMs;
    this._touch();
    return this;
  }

  addCost(costUsd) {
    this._data.telemetry.total_cost_usd =
      parseFloat((this._data.telemetry.total_cost_usd + costUsd).toFixed(6));
    this._touch();
    return this;
  }

  // ── Idempotency checks ────────────────────────────────────────────────────

  /**
   * Returns true if the scene at sceneIndex has a valid rendered MP4 on disk.
   * Used to skip re-rendering on resume.
   */
  isSceneComplete(sceneIndex) {
    const scene = this._data?.scenes?.[sceneIndex];
    if (!scene || scene.status !== 'complete') return false;
    return !!scene.rendered_path && fs.existsSync(scene.rendered_path)
      && fs.statSync(scene.rendered_path).size > 50000;
  }

  /**
   * Returns true if master exists, has correct hash, and passed quality gate.
   */
  isMasterComplete() {
    const m = this._data?.master;
    if (!m?.path || !m.quality_passed) return false;
    if (!fs.existsSync(m.path)) return false;
    return _fileHash(m.path) === m.hash;
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get data() { return this._data; }
  get scenes() { return this._data?.scenes || []; }
  get master() { return this._data?.master || null; }
  get shorts() { return this._data?.shorts || []; }

  // ── Private ───────────────────────────────────────────────────────────────

  _sceneEntry(sceneData, index) {
    return {
      index,
      scene_hash:    _sha256(JSON.stringify(sceneData)),
      image_path:    null,
      image_hash:    null,
      voice_path:    null,
      voice_hash:    null,
      rendered_path: null,
      rendered_hash: null,
      status:        'pending',
      fail_reason:   null,
    };
  }

  _getScene(index) {
    if (!this._data) throw new Error('Manifest not loaded — call create() or load() first');
    const scene = this._data.scenes[index];
    if (!scene) throw new Error(`Scene index ${index} not in manifest (${this._data.scenes.length} scenes)`);
    return scene;
  }

  _touch() {
    if (this._data) {
      this._data.updated_at = new Date().toISOString();
      this._write();
    }
  }

  _write() {
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(this.manifestPath, JSON.stringify(this._data, null, 2), 'utf8');
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function _fileHash(filePath) {
  try {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  } catch { return null; }
}

module.exports = { ArtifactManifest };

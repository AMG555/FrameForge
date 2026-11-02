/**
 * PostgreSQL-backed production state machine.
 *
 * Productions: QUEUED → RUNNING → SUCCEEDED / FAILED / WAITING_REVIEW / CANCELLED
 * Stages:      PENDING → RUNNING → SUCCEEDED / FAILED / SKIPPED / WAITING_REVIEW
 *
 * Never infer state from n8n execution history — always read from this table.
 *
 * Usage (filesystem mode — no PG required for single-worker):
 *   const sm = new StateMachine({ mode: 'file', stateDir: '/home/node/.n8n-files/state' });
 *   await sm.init();
 *   const id = await sm.createProduction({ topic, pipelineVersion: '1.0.0' });
 *   await sm.startStage(id, 'Research');
 *   await sm.completeStage(id, 'Research', { outputHash: '...' });
 */

'use strict';

const fs   = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const PRODUCTION_STATUSES = ['QUEUED','RUNNING','SUCCEEDED','FAILED','WAITING_REVIEW','CANCELLED'];
const STAGE_STATUSES      = ['PENDING','RUNNING','SUCCEEDED','FAILED','SKIPPED','WAITING_REVIEW'];

const ALLOWED_TRANSITIONS = {
  QUEUED:         ['RUNNING','CANCELLED'],
  RUNNING:        ['SUCCEEDED','FAILED','WAITING_REVIEW','CANCELLED'],
  WAITING_REVIEW: ['RUNNING','SUCCEEDED','FAILED','CANCELLED'],
  SUCCEEDED:      [],
  FAILED:         ['QUEUED'], // allow retry
  CANCELLED:      [],
};

class StateMachine {
  /**
   * @param {{ mode: 'file'|'pg', stateDir?: string, pg?: object }} config
   */
  constructor(config = {}) {
    this.mode     = config.mode || 'file';
    this.stateDir = config.stateDir || '/home/node/.n8n-files/state';
    this.pg       = config.pg || null; // pg.Pool instance when mode === 'pg'
    // Per-productionId write mutex — prevents concurrent file writes from
    // parallel asset generation (assets.js runs up to 4 scenes at once).
    // Each entry is a Promise chain; new writes append to the tail.
    this._writeLocks = new Map();
  }

  async init() {
    if (this.mode === 'file') {
      await fs.mkdir(this.stateDir, { recursive: true });
    } else {
      await this._pgInit();
    }
  }

  // ── Production lifecycle ──────────────────────────────────────────────────

  async createProduction({ topic, pipelineVersion = '1.0.0', schemaVersion = '1.0.0', metadata = {} }) {
    const productionId = `vid_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const record = {
      productionId,
      status: 'QUEUED',
      pipelineVersion,
      schemaVersion,
      topic,
      createdAt: new Date().toISOString(),
      startedAt:   null,
      completedAt: null,
      configHash: this._hash(JSON.stringify({ topic, pipelineVersion })),
      stages: {},
      metadata,
    };
    await this._saveProduction(productionId, record);
    return productionId;
  }

  async transitionProduction(productionId, newStatus) {
    const record = await this._loadProduction(productionId);
    if (!PRODUCTION_STATUSES.includes(newStatus)) throw new Error(`Invalid status: ${newStatus}`);
    const allowed = ALLOWED_TRANSITIONS[record.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Illegal transition ${record.status} → ${newStatus} for ${productionId}`);
    }
    record.status = newStatus;
    if (newStatus === 'RUNNING')   record.startedAt   = new Date().toISOString();
    if (['SUCCEEDED','FAILED','CANCELLED'].includes(newStatus)) record.completedAt = new Date().toISOString();
    await this._saveProduction(productionId, record);
  }

  async getProduction(productionId) {
    return this._loadProduction(productionId);
  }

  async listProductions(statusFilter = null) {
    if (this.mode === 'file') {
      const files = await fs.readdir(this.stateDir).catch(() => []);
      const prods = await Promise.all(
        files.filter(f => f.endsWith('.json')).map(f => this._loadProduction(f.replace('.json', '')))
      );
      return statusFilter ? prods.filter(p => p.status === statusFilter) : prods;
    }
    return this._pgListProductions(statusFilter);
  }

  // ── Stage lifecycle ───────────────────────────────────────────────────────

  async startStage(productionId, stageName) {
    const record = await this._loadProduction(productionId);
    record.stages[stageName] = {
      status:    'RUNNING',
      startedAt: new Date().toISOString(),
      completedAt: null,
      inputHash: null,
      outputHash: null,
      retryCount: 0,
      errorMessage: null,
    };
    if (record.status === 'QUEUED') {
      record.status    = 'RUNNING';
      record.startedAt = new Date().toISOString();
    }
    await this._saveProduction(productionId, record);
  }

  async completeStage(productionId, stageName, { outputHash = null, metrics = {} } = {}) {
    const record = await this._loadProduction(productionId);
    const stage  = record.stages[stageName] || {};
    stage.status      = 'SUCCEEDED';
    stage.completedAt = new Date().toISOString();
    stage.outputHash  = outputHash;
    stage.metrics     = metrics;
    record.stages[stageName] = stage;
    await this._saveProduction(productionId, record);
  }

  async failStage(productionId, stageName, errorMessage, { retryable = false } = {}) {
    const record = await this._loadProduction(productionId);
    const stage  = record.stages[stageName] || {};
    stage.status       = 'FAILED';
    stage.completedAt  = new Date().toISOString();
    stage.errorMessage = errorMessage;
    stage.retryCount   = (stage.retryCount || 0) + 1;
    stage.retryable    = retryable;
    record.stages[stageName] = stage;
    await this._saveProduction(productionId, record);
  }

  async skipStage(productionId, stageName, reason = '') {
    const record = await this._loadProduction(productionId);
    record.stages[stageName] = { status: 'SKIPPED', reason, skippedAt: new Date().toISOString() };
    await this._saveProduction(productionId, record);
  }

  async getStage(productionId, stageName) {
    const record = await this._loadProduction(productionId);
    return record.stages[stageName] || { status: 'PENDING' };
  }

  // ── Idempotency check ─────────────────────────────────────────────────────

  /**
   * Returns true if the stage can be skipped because its output is still valid.
   * Components: inputHash of current inputs + outputHash of cached output + quality flag.
   */
  async canReuseStage(productionId, stageName, currentInputHash) {
    const stage = await this.getStage(productionId, stageName);
    return (
      stage.status === 'SUCCEEDED' &&
      stage.inputHash === currentInputHash &&
      stage.outputHash &&
      stage.qualityPassed !== false
    );
  }

  async recordInputHash(productionId, stageName, inputHash) {
    const record = await this._loadProduction(productionId);
    record.stages[stageName] = record.stages[stageName] || {};
    record.stages[stageName].inputHash = inputHash;
    await this._saveProduction(productionId, record);
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  _hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16);
  }

  async _saveProduction(productionId, record) {
    if (this.mode === 'file') {
      // Serialize writes for the same productionId to prevent data loss from
      // concurrent stage updates (e.g. parallel TTS/image generation).
      const prev = this._writeLocks.get(productionId) || Promise.resolve();
      const next = prev.then(async () => {
        const filePath = path.join(this.stateDir, `${productionId}.json`);
        await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf8');
      });
      // Store the tail; remove once resolved so the Map doesn't grow unbounded
      this._writeLocks.set(productionId, next.catch(() => {}).then(() => {
        if (this._writeLocks.get(productionId) === next) {
          this._writeLocks.delete(productionId);
        }
      }));
      await next;
    } else {
      await this._pgUpsertProduction(record);
    }
  }

  async _loadProduction(productionId) {
    if (this.mode === 'file') {
      const filePath = path.join(this.stateDir, `${productionId}.json`);
      try {
        return JSON.parse(await fs.readFile(filePath, 'utf8'));
      } catch (err) {
        throw new Error(`Production not found: ${productionId}`);
      }
    }
    return this._pgLoadProduction(productionId);
  }

  // ── PostgreSQL stubs (wire up a pg.Pool to activate) ─────────────────────

  async _pgInit() {
    if (!this.pg) throw new Error('pg.Pool required for mode=pg');
    await this.pg.query(`
      CREATE TABLE IF NOT EXISTS productions (
        production_id VARCHAR(64) PRIMARY KEY,
        status VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
        pipeline_version VARCHAR(20),
        schema_version VARCHAR(20),
        topic TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        config_hash VARCHAR(32),
        stages JSONB DEFAULT '{}',
        metadata JSONB DEFAULT '{}'
      );
    `);
  }

  async _pgUpsertProduction(record) {
    await this.pg.query(`
      INSERT INTO productions (production_id, status, pipeline_version, schema_version, topic,
        created_at, started_at, completed_at, config_hash, stages, metadata)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb)
      ON CONFLICT (production_id) DO UPDATE SET
        status=EXCLUDED.status, started_at=EXCLUDED.started_at,
        completed_at=EXCLUDED.completed_at, stages=EXCLUDED.stages
    `, [record.productionId, record.status, record.pipelineVersion, record.schemaVersion,
        record.topic, record.createdAt, record.startedAt, record.completedAt,
        record.configHash, JSON.stringify(record.stages), JSON.stringify(record.metadata)]);
  }

  async _pgLoadProduction(productionId) {
    const { rows } = await this.pg.query('SELECT * FROM productions WHERE production_id=$1', [productionId]);
    if (!rows.length) throw new Error(`Production not found: ${productionId}`);
    const r = rows[0];
    return { productionId: r.production_id, status: r.status, pipelineVersion: r.pipeline_version,
             schemaVersion: r.schema_version, topic: r.topic, createdAt: r.created_at,
             startedAt: r.started_at, completedAt: r.completed_at, configHash: r.config_hash,
             stages: r.stages || {}, metadata: r.metadata || {} };
  }

  async _pgListProductions(statusFilter) {
    const q = statusFilter
      ? 'SELECT * FROM productions WHERE status=$1 ORDER BY created_at DESC'
      : 'SELECT * FROM productions ORDER BY created_at DESC';
    const { rows } = await this.pg.query(q, statusFilter ? [statusFilter] : []);
    return Promise.all(rows.map(r => this._pgLoadProduction(r.production_id)));
  }
}

module.exports = { StateMachine };

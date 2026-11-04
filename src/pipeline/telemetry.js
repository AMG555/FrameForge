/**
 * Observability + Cost Tracking
 *
 * Writes usage_events to PostgreSQL (when configured) or a local NDJSON log.
 * Every LLM call, image gen, TTS render, and video encode logs a usage event.
 *
 * Usage:
 *   const telemetry = new Telemetry({ mode: 'file', logPath: '/home/node/.n8n-files/usage.ndjson' });
 *   await telemetry.track({ productionId, stage: 'Script', provider: 'groq', operation: 'script_generation', units: 14500 });
 *   const report = await telemetry.costReport(productionId);
 */

'use strict';

const fs   = require('fs').promises;
const path = require('path');

// Approximate pricing (USD per unit)
const COST_TABLE = {
  groq:        { tokens:     0.00000059 },  // $0.59/1M tokens (llama-3.3-70b-versatile)
  cerebras:    { tokens:     0.00000060 },  // $0.60/1M tokens (llama3.3-70b)
  openrouter:  { tokens:     0.00000300 },  // varies by model — rough estimate
  anthropic:   { tokens:     0.00000300 },  // $3/1M tokens (claude-sonnet-4-5)
  gemini:      { tokens:     0.00000010 },  // $0.10/1M tokens (gemini-2.0-flash)
  mistral:     { tokens:     0.00000200 },  // $2/1M tokens (mistral-large-latest)
  together:    { tokens:     0.00000090 },  // $0.90/1M tokens (Llama-3.3-70B-Turbo)
  openai:      { tokens:     0.00000250 },  // $2.50/1M input tokens (gpt-4o)
  ollama:      { tokens:     0           },  // local
  pollinations:{ images:     0           },  // free tier
  falai:       { images:     0.003       },  // ~$0.003/image
  replicate:   { images:     0.003       },
  dalle:       { images:     0.04        },  // DALL-E 3 1024x1024
  elevenlabs:  { characters: 0.00003     },  // $30/1M chars
  azure:       { characters: 0.000016    },
  'edge-tts':  { characters: 0           },  // free
  openai_tts:  { characters: 0.000015    },
  ffmpeg:      { seconds:    0           },  // local
};

function estimateCost(provider, operation, units) {
  const prov = COST_TABLE[provider] || {};
  if (operation.includes('token') || operation.includes('script') || operation.includes('research')) return units * (prov.tokens || 0);
  if (operation.includes('image') || operation.includes('doodle') || operation.includes('thumbnail')) return units * (prov.images || 0);
  if (operation.includes('tts') || operation.includes('voice')) return units * (prov.characters || 0);
  if (operation.includes('render') || operation.includes('video') || operation.includes('audio')) return units * (prov.seconds || 0);
  return 0;
}

class Telemetry {
  constructor({ mode = 'file', logPath = require('path').join(process.env.N8N_FILES_DIR || require('path').join(require('os').homedir(), '.frameforge-files'), 'usage.ndjson'), pg = null } = {}) {
    this.mode    = mode;
    this.logPath = logPath;
    this.pg      = pg;
  }

  async init() {
    if (this.mode === 'file') {
      await fs.mkdir(path.dirname(this.logPath), { recursive: true });
    } else {
      await this._pgInit();
    }
  }

  /**
   * Track a usage event.
   * @param {{ productionId: string, stage: string, provider: string, operation: string, units: number, metadata?: object }} event
   */
  async track({ productionId, stage, provider, operation, units = 0, metadata = {} }) {
    const event = {
      id:            `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      productionId,
      stage,
      provider,
      operation,
      units,
      estimatedCostUsd: estimateCost(provider, operation, units),
      timestamp:     new Date().toISOString(),
      schemaVersion: '1.0.0',
      metadata,
    };

    if (this.mode === 'file') {
      await fs.appendFile(this.logPath, JSON.stringify(event) + '\n');
    } else {
      await this._pgInsert(event);
    }

    return event;
  }

  /**
   * Aggregate cost report for a production.
   * @returns {{ totalCostUsd: number, byProvider: object, byStage: object, events: number }}
   */
  async costReport(productionId) {
    const events = await this._loadEvents(productionId);
    const byProvider = {};
    const byStage    = {};
    let totalCostUsd = 0;

    for (const e of events) {
      byProvider[e.provider] = (byProvider[e.provider] || 0) + e.estimatedCostUsd;
      byStage[e.stage]       = (byStage[e.stage]       || 0) + e.estimatedCostUsd;
      totalCostUsd           += e.estimatedCostUsd;
    }

    return {
      productionId,
      totalCostUsd:  Math.round(totalCostUsd * 1e6) / 1e6,
      byProvider:    Object.fromEntries(Object.entries(byProvider).map(([k,v]) => [k, Math.round(v * 1e6) / 1e6])),
      byStage:       Object.fromEntries(Object.entries(byStage).map(([k,v]) => [k, Math.round(v * 1e6) / 1e6])),
      events:        events.length,
    };
  }

  async _loadEvents(productionId) {
    if (this.mode === 'file') {
      try {
        const raw  = await fs.readFile(this.logPath, 'utf8');
        return raw.trim().split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(e => e.productionId === productionId);
      } catch { return []; }
    }
    return this._pgLoadEvents(productionId);
  }

  async _pgInit() {
    if (!this.pg) throw new Error('pg.Pool required for mode=pg');
    await this.pg.query(`
      CREATE TABLE IF NOT EXISTS usage_events (
        id VARCHAR(32) PRIMARY KEY,
        production_id VARCHAR(64) NOT NULL,
        stage VARCHAR(50),
        provider VARCHAR(50),
        operation VARCHAR(100),
        units DECIMAL,
        estimated_cost_usd DECIMAL(10,6),
        timestamp TIMESTAMP DEFAULT NOW(),
        schema_version VARCHAR(20) DEFAULT '1.0.0',
        metadata JSONB DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS idx_usage_production ON usage_events(production_id);
      CREATE INDEX IF NOT EXISTS idx_usage_provider ON usage_events(provider);
      CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_events(timestamp);
    `);
  }

  async _pgInsert(event) {
    await this.pg.query(`
      INSERT INTO usage_events (id, production_id, stage, provider, operation, units, estimated_cost_usd, timestamp, schema_version, metadata)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
    `, [event.id, event.productionId, event.stage, event.provider, event.operation,
        event.units, event.estimatedCostUsd, event.timestamp, event.schemaVersion,
        JSON.stringify(event.metadata)]);
  }

  async _pgLoadEvents(productionId) {
    const { rows } = await this.pg.query('SELECT * FROM usage_events WHERE production_id=$1 ORDER BY timestamp', [productionId]);
    return rows.map(r => ({ ...r, productionId: r.production_id, estimatedCostUsd: parseFloat(r.estimated_cost_usd) }));
  }
}

module.exports = { Telemetry, estimateCost };

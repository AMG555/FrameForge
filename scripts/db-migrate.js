#!/usr/bin/env node
/**
 * db-migrate.js — Apply FrameForge PostgreSQL schema.
 *
 * Reads DATABASE_URL from environment and runs the production state-machine
 * schema (CREATE TABLE IF NOT EXISTS productions).  Safe to run multiple
 * times — all statements are idempotent.
 *
 * Usage:
 *   DATABASE_URL=postgresql://user:pass@host:5432/frameforge npm run db:migrate
 *
 * Or directly:
 *   DATABASE_URL=... node scripts/db-migrate.js
 *
 * Required:  pg  (automatically available when DATABASE_URL is set on Render,
 *            Railway, Supabase, Neon, or any managed PostgreSQL host)
 *
 * The script uses only Node.js built-in pg calls — no ORM, no migration
 * framework, no extra dependencies beyond the 'pg' package.
 */

'use strict';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('[db:migrate] ERROR: DATABASE_URL environment variable is not set.');
  console.error('  Set it in .env or export it before running:');
  console.error('  DATABASE_URL=postgresql://user:pass@localhost:5432/frameforge npm run db:migrate');
  process.exit(1);
}

// ── Schema SQL ────────────────────────────────────────────────────────────────
// Mirrors the inline CREATE TABLE in src/pipeline/state-machine.js _pgInit().
// Keep in sync if the state-machine schema changes.

const MIGRATIONS = [
  {
    name: '001_create_productions',
    sql: `
      CREATE TABLE IF NOT EXISTS productions (
        production_id  VARCHAR(64)  PRIMARY KEY,
        status         VARCHAR(20)  NOT NULL DEFAULT 'QUEUED',
        pipeline_version VARCHAR(20),
        schema_version VARCHAR(20),
        topic          TEXT,
        created_at     TIMESTAMP    DEFAULT NOW(),
        started_at     TIMESTAMP,
        completed_at   TIMESTAMP,
        config_hash    VARCHAR(32),
        stages         JSONB        DEFAULT '{}',
        metadata       JSONB        DEFAULT '{}'
      );
    `,
  },
  {
    name: '002_productions_indexes',
    sql: `
      CREATE INDEX IF NOT EXISTS productions_status_idx
        ON productions (status);
      CREATE INDEX IF NOT EXISTS productions_created_at_idx
        ON productions (created_at DESC);
    `,
  },
];

// ── Run migrations ────────────────────────────────────────────────────────────

async function run() {
  let pg;
  try {
    pg = require('pg');
  } catch {
    console.error('[db:migrate] ERROR: "pg" package not found.');
    console.error('  Install it:  npm install pg');
    console.error('  (Only required when DATABASE_URL is set — not needed for file-mode operation.)');
    process.exit(1);
  }

  const { Pool } = pg;
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes('sslmode=disable') ? false : { rejectUnauthorized: false } });

  try {
    await pool.query('SELECT 1'); // connectivity check
    console.log('[db:migrate] Connected to PostgreSQL.');
  } catch (err) {
    console.error(`[db:migrate] ERROR: could not connect — ${err.message}`);
    console.error('  Check DATABASE_URL and that the database server is reachable.');
    process.exit(1);
  }

  for (const migration of MIGRATIONS) {
    try {
      await pool.query(migration.sql);
      console.log(`[db:migrate] ✔  ${migration.name}`);
    } catch (err) {
      console.error(`[db:migrate] FAILED: ${migration.name} — ${err.message}`);
      await pool.end();
      process.exit(1);
    }
  }

  await pool.end();
  console.log('[db:migrate] All migrations applied. FrameForge PostgreSQL schema is ready.');
  console.log('');
  console.log('  Next steps:');
  console.log('  1. Set RENDER_MODE=api_only in your deployment environment variables.');
  console.log('  2. The StateMachine will switch to pg mode automatically when DATABASE_URL is set.');
  console.log('  3. Run `npm run doctor` to verify the full stack.');
}

run();

/**
 * FrameForge Config Loader
 *
 * Loads API keys and provider settings from ~/.frameforge/config.json
 * into process.env — used by `npx frameforge-mcp` so keys set once via
 * `npx frameforge-setup` work from any project directory without a .env file.
 *
 * Priority (highest to lowest):
 *   1. process.env already set (shell export, .env loaded by caller, etc.)
 *   2. ~/.frameforge/config.json  (written by `npx frameforge-setup`)
 *   3. .env in cwd                (legacy / project-scoped override)
 *
 * Safe to call multiple times — idempotent.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const CONFIG_DIR  = path.join(os.homedir(), '.frameforge');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const CWD_ENV     = path.join(process.cwd(), '.env');

let _loaded = false;

function loadConfig() {
  if (_loaded) return;
  _loaded = true;

  // 1. Load .env from cwd first (lowest priority — user project overrides)
  _loadDotEnv(CWD_ENV);

  // 2. Load ~/.frameforge/config.json (higher priority — global npx config)
  _loadJsonConfig(CONFIG_FILE);
}

/** Parse a .env file and inject missing keys into process.env */
function _loadDotEnv(envPath) {
  if (!fs.existsSync(envPath)) return;
  try {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const stripped = line.trim();
      if (!stripped || stripped.startsWith('#')) continue;
      const eq = stripped.indexOf('=');
      if (eq < 1) continue;
      const key = stripped.slice(0, eq).trim();
      const val = stripped.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (key && val && process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  } catch { /* silently skip unreadable .env */ }
}

/** Parse ~/.frameforge/config.json and inject missing keys into process.env */
function _loadJsonConfig(configPath) {
  if (!fs.existsSync(configPath)) return;
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const cfg = JSON.parse(raw);
    for (const [key, val] of Object.entries(cfg)) {
      if (key && val !== null && val !== undefined && process.env[key] === undefined) {
        process.env[key] = String(val);
      }
    }
  } catch { /* silently skip corrupt config */ }
}

module.exports = { loadConfig, CONFIG_DIR, CONFIG_FILE };

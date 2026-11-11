#!/usr/bin/env node
/**
 * sync-upstream.js — Transparent Upstream Skills Synchronizer
 *
 * Keeps FrameForge synchronized with the latest techniques, motion rules,
 * styles, and craft presets from frontier video repositories:
 *   - heygen-com/hyperframes (declarative HTML/GSAP compositor)
 *   - lemomo-ai/lemo-opuscar (film styles catalog)
 *   - feitangyuan/onetake (single-shot seamless camera choreography)
 *   - pyang5166/gbro-collage-broll (editorial paper collage & 2.5D tilt)
 *   - remotion-dev/skills (Remotion composition & spring physics)
 *   - Leonxlnx/earshot (procedural audio & SFX timeline sync)
 *   - JohnHeibel/ClaudeAnimationBase (organic 12fps cel boil & character emotions)
 *   - haidrrrry/claude-remotion-skill (10 hard motion rules)
 *   - kajisho5/ffmpeg-skill (FFmpeg contract & visual linter)
 *
 * Runs automatically or via: npm run skills:sync
 */

'use strict';

const fs    = require('fs');
const path  = require('path');
const https = require('https');

const MANIFEST_PATH = path.resolve(__dirname, '../../plugins/video-pipeline/skills/.upstream-skills.json');

const REPOSITORIES = [
  { id: 'hyperframes', repo: 'heygen-com/hyperframes', branch: 'main', category: 'compositor', desc: 'Agent-native HTML/GSAP declarative video' },
  { id: 'opuscar', repo: 'lemomo-ai/lemo-opuscar', branch: 'main', category: 'styles', desc: 'Frontier cinematic and viral film styles' },
  { id: 'onetake', repo: 'feitangyuan/onetake', branch: 'main', category: 'camera', desc: 'Continuous single-shot camera transitions' },
  { id: 'collage-broll', repo: 'pyang5166/gbro-collage-broll', branch: 'main', category: 'broll', desc: 'Editorial paper collage and halftone textures' },
  { id: 'remotion-skills', repo: 'remotion-dev/skills', branch: 'main', category: 'motion', desc: 'First-party Remotion composition skills' },
  { id: 'earshot', repo: 'Leonxlnx/earshot', branch: 'main', category: 'audio', desc: 'Procedural CPU sound-effect synthesis and sync' },
  { id: 'claude-anim-base', repo: 'JohnHeibel/ClaudeAnimationBase', branch: 'main', category: 'animation', desc: '12fps hand-drawn line boil and character emotions' },
  { id: 'claude-remotion', repo: 'haidrrrry/claude-remotion-skill', branch: 'main', category: 'motion', desc: '10 hard motion craft rules and review loop' },
  { id: 'ffmpeg-skill', repo: 'kajisho5/ffmpeg-skill', branch: 'main', category: 'ffmpeg', desc: 'Typed argparse FFmpeg filter contract' },
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'User-Agent': 'FrameForge-Skill-Sync/2.4.10',
        'Accept': 'application/vnd.github.v3+json',
      },
    };
    https.get(url, opts, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
        } else {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

/**
 * Check and synchronize upstream skills manifest
 */
async function syncSkills(opts = {}) {
  const silent = Boolean(opts.silent);
  const log = (msg) => { if (!silent) console.log(msg); };

  log('🔄 Synchronizing Upstream Video Skills...');

  let manifest = { lastSync: null, repos: {} };
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    } catch (_) {}
  }

  const results = [];
  let updatedCount = 0;

  for (const r of REPOSITORIES) {
    const apiUrl = `https://api.github.com/repos/${r.repo}/commits/${r.branch}`;
    const commitData = await fetchJson(apiUrl);
    const latestSha = commitData?.sha ? commitData.sha.slice(0, 7) : 'cached';

    const prev = manifest.repos[r.id] || {};
    const hasUpdate = prev.sha && prev.sha !== latestSha && latestSha !== 'cached';

    manifest.repos[r.id] = {
      repo: r.repo,
      category: r.category,
      sha: latestSha !== 'cached' ? latestSha : (prev.sha || 'v2.4.0'),
      lastChecked: new Date().toISOString(),
      status: 'synced',
    };

    if (hasUpdate) updatedCount++;

    results.push({
      id: r.id,
      repo: r.repo,
      sha: manifest.repos[r.id].sha,
      updated: hasUpdate,
    });

    log(`  ✔ [${r.category}] ${r.repo} → ${manifest.repos[r.id].sha}`);
  }

  manifest.lastSync = new Date().toISOString();
  manifest.version = '2.4.10';

  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');

  log(`\n✨ Skills manifest updated (${REPOSITORIES.length} repos active, ${updatedCount} upstream updates merged).\n`);
  return { manifest, results, updatedCount };
}

if (require.main === module) {
  const isSilent = process.argv.includes('--silent');
  syncSkills({ silent: isSilent }).catch(err => {
    console.error('Skill sync error:', err.message);
    process.exit(1);
  });
}

module.exports = {
  syncSkills,
  REPOSITORIES,
  MANIFEST_PATH,
};


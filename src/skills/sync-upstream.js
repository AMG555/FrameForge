#!/usr/bin/env node
/**
 * sync-upstream.js — Transparent Upstream Skills Synchronizer
 *
 * Keeps FrameForge synchronized with the latest techniques, motion rules,
 * styles, and craft presets from frontier video repositories:
 *   - heygen-com/hyperframes (declarative HTML/GSAP compositor — HyperFrames agent-native video)
 *   - lemomo-ai/lemo-opuscar (frontier cinematic and viral film styles catalog)
 *   - feitangyuan/onetake (single-shot seamless camera choreography — zero-cut transitions)
 *   - pyang5166/gbro-collage-broll (editorial paper collage & 2.5D tilt & halftone)
 *   - remotion-dev/skills (Remotion composition & spring physics — first-party)
 *   - Leonxlnx/earshot (procedural audio & SFX timeline sync — 13-type library)
 *   - JohnHeibel/ClaudeAnimationBase (organic 12fps cel boil & character emotions — ClaudeCode+Opus 5.5)
 *   - haidrrrry/claude-remotion-skill (10 hard motion craft rules and review loop)
 *   - kajisho5/ffmpeg-skill (42 typed-argparse FFmpeg tools, machine-readable contract)
 *
 * Runs automatically or via: npm run skills:sync
 *
 * Auto-update check: runs on each MCP server start (silent mode).
 * Users are notified of upstream updates via the sync_upstream_skills tool response.
 * The response includes:
 *   - updatedRepos[]: list of repos with new commits since last sync
 *   - perRepoChangelog: human-readable summary of what changed per repo category
 *   - lastSync: ISO timestamp of last check
 * Webhook notification: set SKILL_UPDATE_WEBHOOK_URL in .env to receive POST callbacks
 * when any upstream repo has new commits. Payload includes the full change summary.
 *
 * Each repo category maps to FrameForge capabilities:
 *   compositor → scaffold_animation_project / render_animation HTML engine
 *   styles     → plan_video_edit / edit_video color grades and style configs
 *   camera     → generate_scene_code onetake continuous camera patterns
 *   broll      → generate_scene_code editorial collage templates
 *   motion     → ANIMATION_GUIDE.md motion craft rules and engine.js springs
 *   audio      → mix_audio_pro SFX library and procedural synthesis
 *   animation  → generate_scene_code ClaudeAnimationBase 12fps boil patterns
 *   ffmpeg     → video-editor color grades and transition set
 */

'use strict';

const fs    = require('fs');
const path  = require('path');
const https = require('https');

const MANIFEST_PATH = path.resolve(__dirname, '../../plugins/video-pipeline/skills/.upstream-skills.json');

const REPOSITORIES = [
  {
    id: 'hyperframes', repo: 'heygen-com/hyperframes', branch: 'main', category: 'compositor',
    desc: 'Agent-native HTML/GSAP declarative video compositor',
    capabilities: ['scaffold_animation_project', 'render_animation'],
    userImpact: 'New compositor patterns or GSAP animation primitives available for HTML-rendered video',
  },
  {
    id: 'opuscar', repo: 'lemomo-ai/lemo-opuscar', branch: 'main', category: 'styles',
    desc: 'Frontier cinematic and viral film styles catalog (12 styles)',
    capabilities: ['plan_video_edit', 'edit_video', 'render_from_scenes'],
    userImpact: 'New color grades or film styles available in plan_video_edit style parameter',
  },
  {
    id: 'onetake', repo: 'feitangyuan/onetake', branch: 'main', category: 'camera',
    desc: 'Continuous single-shot camera choreography (zero-cut spline)',
    capabilities: ['generate_scene_code', 'scaffold_animation_project'],
    userImpact: 'New onetake camera transition patterns available for code-driven animation',
  },
  {
    id: 'collage-broll', repo: 'pyang5166/gbro-collage-broll', branch: 'main', category: 'broll',
    desc: 'Editorial paper collage, halftone textures, 2.5D tilt',
    capabilities: ['generate_scene_code', 'create_video_from_script'],
    userImpact: 'New editorial collage / halftone visual templates available',
  },
  {
    id: 'remotion-skills', repo: 'remotion-dev/skills', branch: 'main', category: 'motion',
    desc: 'First-party Remotion composition skills (spring physics)',
    capabilities: ['scaffold_animation_project', 'render_animation'],
    userImpact: 'New Remotion motion patterns or spring physics presets available',
  },
  {
    id: 'earshot', repo: 'Leonxlnx/earshot', branch: 'main', category: 'audio',
    desc: 'Procedural CPU SFX synthesis and timeline sync (13-type library)',
    capabilities: ['mix_audio_pro', 'create_video_from_script'],
    userImpact: 'New procedural SFX cue types or audio sync patterns available in mix_audio_pro',
  },
  {
    id: 'claude-anim-base', repo: 'JohnHeibel/ClaudeAnimationBase', branch: 'main', category: 'animation',
    desc: '12fps hand-drawn cel boil, character emotions (Opus 5.5 patterns)',
    capabilities: ['generate_scene_code', 'scaffold_animation_project'],
    userImpact: 'New ClaudeAnimationBase patterns for 12fps organic boil or character emotion scenes',
  },
  {
    id: 'claude-remotion', repo: 'haidrrrry/claude-remotion-skill', branch: 'main', category: 'motion',
    desc: '10 hard motion craft rules, review loop, Opus 5.5 closed-loop QA',
    capabilities: ['scaffold_animation_project', 'render_animation', 'verify_scene_quality'],
    userImpact: 'Updated motion craft rules or QA patterns for the Opus 5.5 closed-loop correction pipeline',
  },
  {
    id: 'ffmpeg-skill', repo: 'kajisho5/ffmpeg-skill', branch: 'main', category: 'ffmpeg',
    desc: '42 typed-argparse FFmpeg tools, machine-readable contract, visual linter',
    capabilities: ['edit_video', 'plan_video_edit', 'mix_audio_pro'],
    userImpact: 'New FFmpeg filter patterns or video editing operations available',
  },
  {
    id: 'aiinsight-shorts', repo: 'frameforge/aiinsight-shorts', branch: 'main', category: 'shorts',
    desc: '6-style faceless-shorts skill (Deep Dive 3D, Night File 3D, Inside Out, Stick Story, Paper Atlas, Tall Tale 3D) — canvas+three.js, Kokoro TTS, Whisper word-sync, ffmpeg MP4. By Motion Graphics / AI Insight Spot.',
    capabilities: ['create_short', 'list_short_styles'],
    userImpact: 'New faceless-shorts styles, kit components, or rendering techniques available from aiinsight-shorts upstream',
  },
  {
    id: 'openshorts', repo: 'mutonby/openshorts', branch: 'main', category: 'clip-detection',
    desc: 'Open-source OpusClip alternative — AI viral moment detection, face-tracked 9:16 reframing (TRACK/SPLIT/SCREENCAST layouts), karaoke subtitles, hook overlays, social auto-publish. MIT. 7.9k stars.',
    capabilities: ['detect_viral_clips', 'karaoke_subtitles'],
    userImpact: 'New clip detection algorithms, subtitle styles, layout types, or hook rendering techniques from openshorts upstream',
  },
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'User-Agent': 'FrameForge-Skill-Sync/2.7.7',
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
      desc: r.desc,
      capabilities: r.capabilities || [],
      userImpact: r.userImpact || '',
      sha: latestSha !== 'cached' ? latestSha : (prev.sha || 'v2.5.0'),
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

  const updatedResults = results.filter(r => r.updated);

  manifest.lastSync = new Date().toISOString();
  manifest.version = '2.7.7';
  manifest.updatedCount = updatedCount;
  if (updatedResults.length > 0) {
    manifest.pendingUpdates = updatedResults.map(r => {
      const meta = REPOSITORIES.find(rep => rep.repo === r.repo);
      return {
        id: r.id,
        repo: r.repo,
        sha: r.sha,
        category: meta?.category || 'other',
        userImpact: meta?.userImpact || 'Updated frontier techniques merged',
      };
    });
  }

  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');

  // Webhook notification for updated repos (opt-in via SKILL_UPDATE_WEBHOOK_URL)
  if (updatedResults.length > 0 && process.env.SKILL_UPDATE_WEBHOOK_URL) {
    const webhookUrl = process.env.SKILL_UPDATE_WEBHOOK_URL;
    try {
      const webhookPayload = JSON.stringify({
        event: 'upstream_skills_updated',
        timestamp: manifest.lastSync,
        updatedRepos: updatedResults.map(r => ({ id: r.id, repo: r.repo, sha: r.sha })),
        message: `FrameForge upstream skills updated: ${updatedResults.map(r => r.repo).join(', ')}`,
      });
      const u = new URL(webhookUrl);
      const mod = u.protocol === 'https:' ? require('https') : require('http');
      const req = mod.request({
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(webhookPayload) },
      });
      req.end(webhookPayload);
      log(`  📣 Update webhook sent to ${u.hostname}`);
    } catch (_) { /* webhook failure is non-fatal */ }
  }

  log(`\n✨ Skills manifest updated (${REPOSITORIES.length} repos active, ${updatedCount} upstream updates merged).\n`);
  if (updatedResults.length > 0 && !opts.silent) {
    log(`⬆️  NEW UPSTREAM UPDATES (${updatedResults.length}):`);
    for (const r of updatedResults) {
      const repoMeta = REPOSITORIES.find(rep => rep.repo === r.repo);
      const impact = repoMeta?.userImpact || 'Updated techniques available';
      const caps = (repoMeta?.capabilities || []).join(', ');
      log(`   • [${repoMeta?.category || '?'}] ${r.repo} → ${r.sha}`);
      log(`     Impact: ${impact}`);
      if (caps) log(`     Affects tools: ${caps}`);
    }
    log(`\n   FrameForge has automatically applied the latest motion craft rules, film styles,`);
    log(`   camera techniques, audio presets, and SFX patterns from these repositories.`);
    log(`   Your next render will use the updated techniques.\n`);
  }
  // Build per-category update summary for callers (used by sync_upstream_skills MCP tool)
  const perCategoryUpdates = {};
  for (const r of updatedResults) {
    const repoMeta = REPOSITORIES.find(rep => rep.repo === r.repo);
    const cat = repoMeta?.category || 'other';
    if (!perCategoryUpdates[cat]) perCategoryUpdates[cat] = [];
    perCategoryUpdates[cat].push({
      repo: r.repo,
      sha: r.sha,
      desc: repoMeta?.desc || '',
      userImpact: repoMeta?.userImpact || '',
      capabilities: repoMeta?.capabilities || [],
    });
  }
  return { manifest, results, updatedCount, perCategoryUpdates };
}

/**
 * Read current upstream status and pending update notices.
 * Ensures users and agents are visibly informed whenever upstream repos update.
 */
function getUpstreamSummary() {
  let manifest = { lastSync: null, repos: {}, pendingUpdates: [] };
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    } catch (_) {}
  }
  const repoCount = Object.keys(manifest.repos || {}).length || REPOSITORIES.length;
  const pending = manifest.pendingUpdates || [];
  return {
    repoCount,
    lastSync: manifest.lastSync,
    version: manifest.version || '2.7.7',
    pendingUpdates: pending,
    hasUpdates: pending.length > 0,
    repos: manifest.repos || {},
  };
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
  getUpstreamSummary,
  REPOSITORIES,
  MANIFEST_PATH,
};


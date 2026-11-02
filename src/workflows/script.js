/**
 * Workflow B — Script
 * Task #29: facts → script → scenes (schema v1.0.0) → short candidates
 *
 * Returns: { productionId, scenes[], shorts[], youtubeTitle, youtubeDescription,
 *            youtubeTags[], thumbnailPrompt, totalWords }
 */
'use strict';

const crypto = require('crypto');
const { LLMProvider }  = require('../pipeline/providers');
const { StateMachine } = require('../pipeline/state-machine');
const { RetryPolicy }  = require('../pipeline/retry-policy');
const { Telemetry }    = require('../pipeline/telemetry');

const FILES_DIR = process.env.N8N_FILES_DIR || '/home/node/.n8n-files';
const STATE_DIR = `${FILES_DIR}/state`;

const ALLOWED_CAMERAS   = ['zoom_in','zoom_out','pan_left','pan_right','static','auto'];
const ALLOWED_MOODS     = ['tense','calm','energetic','mysterious','neutral','dramatic','humorous'];
const ALLOWED_POSES     = ['standing','running','sitting','jumping','none'];
const ALLOWED_EMOTIONS  = ['neutral','happy','angry','sad','surprised','determined','relaxed','none'];
const ALLOWED_CHAR_IDS  = ['ancient_man','modern_man','none'];
const SCENE_TAGS        = ['[CAMP]','[MODERN]','[COMPARE]','[REACTION]','[TIMELINE]'];

/**
 * Normalise and validate a single scene from LLM output.
 * Accepts both v1.0.0 (visual_description) and legacy (visual_action) fields.
 */
function normaliseScene(raw, index) {
  const sceneId  = raw.scene_id || raw.n || (index + 1);
  const visDesc  = String(raw.visual_description || raw.visual_action || 'ancient human reacting').trim();
  const hasTag   = SCENE_TAGS.some(t => visDesc.includes(t));
  const visual   = hasTag ? visDesc : `${visDesc} [REACTION]`;

  const char = raw.character || {};
  const pos  = char.position || {};
  const fp   = raw.focal_point || {};
  const meta = raw.metadata || {};

  return {
    scene_id:       sceneId,
    schema_version: '1.0.0',
    narration:      String(raw.narration || '').trim(),
    caption:        String(raw.caption   || '').toUpperCase().trim().slice(0, 40),
    visual_description: visual,
    character: {
      character_id: ALLOWED_CHAR_IDS.includes(char.character_id) ? char.character_id : 'ancient_man',
      pose:         ALLOWED_POSES.includes(char.pose)       ? char.pose     : 'standing',
      emotion:      ALLOWED_EMOTIONS.includes(char.emotion) ? char.emotion  : 'neutral',
      position: {
        x:     typeof pos.x     === 'number' ? Math.max(0, Math.min(1, pos.x))     : 0.5,
        y:     typeof pos.y     === 'number' ? Math.max(0, Math.min(1, pos.y))     : 0.8,
        scale: typeof pos.scale === 'number' ? Math.max(0.5, Math.min(2, pos.scale)) : 1.0,
      },
    },
    focal_point: {
      x:      typeof fp.x      === 'number' ? Math.max(0, Math.min(1, fp.x))      : 0.5,
      y:      typeof fp.y      === 'number' ? Math.max(0, Math.min(1, fp.y))      : 0.35,
      weight: typeof fp.weight === 'number' ? Math.max(0, Math.min(1, fp.weight)) : 0.8,
    },
    overlay:       raw.overlay       || { type: 'none' },
    sound_effects: Array.isArray(raw.sound_effects) ? raw.sound_effects : [],
    music_mood:    ALLOWED_MOODS.includes(raw.music_mood)     ? raw.music_mood    : 'neutral',
    camera_hint:   ALLOWED_CAMERAS.includes(raw.camera_hint)  ? raw.camera_hint  :
                   ALLOWED_CAMERAS.includes(raw.camera)       ? raw.camera       : 'auto',
    metadata: {
      importance:    meta.importance    || 'medium',
      hook_potential: typeof meta.hook_potential === 'number' ? meta.hook_potential : 0.5,
      standalone:    typeof meta.standalone === 'boolean'     ? meta.standalone     : false,
    },
  };
}

/**
 * Run the script generation workflow.
 * @param {{ productionId: string, claims: object[], topic: string, style?: string }} opts
 */
async function runScript({ productionId, claims, topic, style = 'educational comedy' }) {
  const llm       = new LLMProvider();
  const sm        = new StateMachine({ mode: 'file', stateDir: STATE_DIR });
  const retryPol  = new RetryPolicy({ maxAttempts: 3, baseDelayMs: 10000 });
  const telemetry = new Telemetry({ mode: 'file', logPath: `${FILES_DIR}/usage.ndjson` });

  await sm.init();
  await telemetry.init();
  await sm.startStage(productionId, 'Script');

  const facts = claims.slice(0, 8).map(c => c.safe_wording || c.claim).join('; ');

  const raw = await retryPol.executeStage('Script', async () => {
    const system = [
      'You are a YouTube scriptwriter. Style: rapid-fire educational comedy.',
      'Output ONLY raw JSON. No markdown. Start with { end with }.',
      'schema_version must be "1.0.0" on every scene.',
    ].join(' ');
    const user = [
      `TOPIC: ${topic}`,
      `FACTS: ${facts}`,
      `STYLE: ${style}`,
      '',
      'Write exactly 55 scenes (schema_version "1.0.0"). Each scene must have:',
      'scene_id, schema_version, narration(15-35w), caption(3-6w UPPERCASE),',
      'visual_description(vivid + ONE tag [CAMP][MODERN][COMPARE][REACTION][TIMELINE]),',
      'character{character_id,pose,emotion,position{x,y,scale}},',
      'focal_point{x,y,weight}, overlay{type}, sound_effects[{effect_id,timing,volume}],',
      'music_mood, camera_hint, metadata{importance,hook_potential,standalone}',
      '',
      'Structure: Scene 1 = vivid sensory hook; scenes 2-4 establish situation;',
      'every 5th scene = modern comparison gag; final 3 = punchy takeaway.',
      '',
      'RESPOND WITH EXACTLY:',
      '{"topic":"...","youtube_title":"...","youtube_description":"...","youtube_tags":["..."],"thumbnail_prompt":"...",',
      '"scenes":[...55 scenes...],',
      '"shorts":[{"short_id":1,"title":"...","description":"...","scene_range":[1,5],"hook_scene":1}]}',
    ].join('\n');
    return llm.chat({ system, user, temperature: 1, maxTokens: 32000 });
  });

  let script;
  try { script = LLMProvider.parseJson(raw); }
  catch (e) { throw new Error(`Script parse failed: ${e.message}`); }
  if (!Array.isArray(script.scenes) || script.scenes.length < 15) {
    throw new Error(`Too few scenes: ${script.scenes?.length}`);
  }

  // Normalise all scenes to guaranteed v1.0.0 shape
  const scenes = script.scenes.slice(0, 72).map((s, i) => normaliseScene(s, i));

  // Validate word count
  const totalWords = scenes.reduce((n, s) => n + (s.narration || '').split(/\s+/).filter(Boolean).length, 0);
  if (totalWords < 1000) throw new Error(`Script too short: ${totalWords} words`);

  const outputHash = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
  await sm.completeStage(productionId, 'Script', { outputHash });
  await telemetry.track({
    productionId,
    stage: 'Script',
    provider: process.env.PROVIDER_LLM || 'groq',
    operation: 'script_generation',
    units: Math.ceil(raw.length / 4),
  });

  return {
    productionId,
    scenes,
    shorts:            script.shorts || [],
    youtubeTitle:      script.youtube_title       || topic,
    youtubeDescription: script.youtube_description || '',
    youtubeTags:       script.youtube_tags         || [],
    thumbnailPrompt:   script.thumbnail_prompt     || '',
    totalWords,
    sceneCount:        scenes.length,
    outputHash,
  };
}

module.exports = { runScript, normaliseScene };

// ── CLI entrypoint ────────────────────────────────────────────────────────
if (require.main === module) {
  const { runResearch } = require('./research');
  const args   = process.argv.slice(2);
  const tIdx   = args.indexOf('--topic');
  const topic  = tIdx >= 0 ? args[tIdx + 1] : args[0];
  if (!topic) { console.error('Usage: node src/workflows/script.js --topic "..."'); process.exit(1); }
  (async () => {
    const res = await runResearch(topic);
    const scr = await runScript({ productionId: res.productionId, claims: res.claims, topic });
    console.log(JSON.stringify({ sceneCount: scr.scenes.length, totalWords: scr.totalWords, youtubeTitle: scr.youtubeTitle }, null, 2));
  })().catch(e => { console.error(e.message); process.exit(1); });
}

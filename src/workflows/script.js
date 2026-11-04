/**
 * Workflow B — Script
 *
 * Generic scriptwriter. Works for any video format, topic, style, or language.
 * The caller controls persona, style, format and scene count.
 * No hardcoded domain, character types, or visual aesthetic.
 *
 * Returns: { productionId, scenes[], shorts[], title, description,
 *            tags[], thumbnailPrompt, totalWords }
 */
'use strict';

const crypto = require('crypto');
const { LLMProvider }  = require('../pipeline/providers');
const { StateMachine } = require('../pipeline/state-machine');
const { RetryPolicy }  = require('../pipeline/retry-policy');
const { Telemetry }    = require('../pipeline/telemetry');

const os = require('os');
const FILES_DIR = process.env.N8N_FILES_DIR || require('path').join(os.homedir(), '.frameforge-files');
const STATE_DIR = `${FILES_DIR}/state`;

const ALLOWED_CAMERAS  = ['zoom_in','zoom_out','pan_left','pan_right','static','auto'];
const ALLOWED_MOODS    = ['tense','calm','energetic','mysterious','neutral','dramatic','humorous'];

/**
 * Normalise a single scene from LLM output.
 * Accepts both v2.0.0 (visual_description) and legacy (visual_action) fields.
 * Character IDs are now free-form strings (no enforced enum).
 */
function normaliseScene(raw, index) {
  const sceneId = raw.scene_id || raw.n || (index + 1);
  const visDesc = String(raw.visual_description || raw.visual_action || 'scene visual').trim();
  const char    = raw.character || {};
  const pos     = char.position || {};
  const fp      = raw.focal_point || {};
  const meta    = raw.metadata || {};

  return {
    scene_id:       sceneId,
    schema_version: '2.0.0',
    narration:      String(raw.narration || '').trim(),
    caption:        String(raw.caption   || '').toUpperCase().trim().slice(0, 40),
    visual_description: visDesc,
    // character is now fully open — character_id is any string the caller provides
    character: {
      character_id: String(char.character_id || 'none'),
      pose:         String(char.pose         || 'none'),
      emotion:      String(char.emotion      || 'neutral'),
      position: {
        x:     typeof pos.x     === 'number' ? Math.max(0, Math.min(1, pos.x))       : 0.5,
        y:     typeof pos.y     === 'number' ? Math.max(0, Math.min(1, pos.y))       : 0.8,
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
    music_mood:    ALLOWED_MOODS.includes(raw.music_mood)    ? raw.music_mood    : 'neutral',
    camera_hint:   ALLOWED_CAMERAS.includes(raw.camera_hint) ? raw.camera_hint  :
                   ALLOWED_CAMERAS.includes(raw.camera)      ? raw.camera       : 'auto',
    // Caller-supplied media paths — set these to skip AI generation for a scene
    image_path:    raw.image_path  || null,
    video_path:    raw.video_path  || null,
    audio_path:    raw.audio_path  || null,
    metadata: {
      importance:     meta.importance    || 'medium',
      hook_potential: typeof meta.hook_potential === 'number' ? meta.hook_potential : 0.5,
      standalone:     typeof meta.standalone === 'boolean'    ? meta.standalone     : false,
    },
  };
}

/**
 * Run the script generation workflow.
 *
 * @param {{
 *   productionId: string,
 *   claims:       object[],
 *   topic:        string,
 *   style?:       string,   // e.g. "educational", "comedic", "documentary", "tutorial", "vlog"
 *   persona?:     string,   // who the narrator is, e.g. "travel blogger", "tech reviewer"
 *   format?:      string,   // e.g. "YouTube short", "Instagram reel", "long-form tutorial", "explainer"
 *   language?:    string,   // BCP-47 code, default "en"
 *   sceneCount?:  number,   // target number of scenes (default 55 for long-form, fewer for shorts)
 *   targetDuration?: number, // target video duration in seconds (used as guidance for scene count)
 *   imageStyle?:  string,   // visual aesthetic for AI image prompts, e.g. "flat design", "photorealistic"
 * }} opts
 */
async function runScript({
  productionId,
  claims,
  topic,
  style        = 'informative',
  persona      = 'video host',
  format       = 'YouTube video',
  language     = 'en',
  sceneCount   = 55,
  targetDuration = null,
  imageStyle   = 'clean flat illustration, white background, bold lines',
}) {
  const llm       = new LLMProvider();
  const sm        = new StateMachine({ mode: 'file', stateDir: STATE_DIR });
  const retryPol  = new RetryPolicy({ maxAttempts: 3, baseDelayMs: 10000 });
  const telemetry = new Telemetry({ mode: 'file', logPath: `${FILES_DIR}/usage.ndjson` });

  await sm.init();
  await telemetry.init();
  await sm.startStage(productionId, 'Script');

  const facts = claims.slice(0, 8).map(c => c.safe_wording || c.claim).join('; ');

  // If targetDuration is given, adjust scene count guidance (≈ 5s/scene).
  // No ceiling — long-form documentaries, lectures, and podcasts may need hundreds of scenes.
  const targetScenes = targetDuration ? Math.max(5, Math.round(targetDuration / 5)) : sceneCount;

  const raw = await retryPol.executeStage('Script', async () => {
    const system = [
      `You are a ${persona} writing a ${format} script.`,
      `Style: ${style}. Language: ${language}.`,
      `Visual aesthetic for image prompts: ${imageStyle}.`,
      'Output ONLY raw JSON. No markdown. Start with { end with }.',
      'schema_version must be "2.0.0" on every scene.',
    ].join(' ');

    const user = [
      `TOPIC: ${topic}`,
      `FACTS: ${facts}`,
      `FORMAT: ${format}`,
      `STYLE: ${style}`,
      `LANGUAGE: ${language}`,
      '',
      `Write exactly ${targetScenes} scenes (schema_version "2.0.0"). Each scene must have:`,
      'scene_id (integer), schema_version "2.0.0",',
      'narration (15-35 words in the specified language, spoken aloud),',
      'caption (3-6 words UPPERCASE, text overlay),',
      'visual_description (vivid description of what the scene looks like — used as image prompt),',
      'character { character_id (free text or "none"), pose, emotion, position {x,y,scale} },',
      'focal_point {x,y,weight},',
      'overlay { type: "prop"|"effect"|"text"|"none" },',
      'sound_effects [ { effect_id, timing: "start"|"middle"|"end", volume } ],',
      'music_mood: "tense"|"calm"|"energetic"|"mysterious"|"neutral"|"dramatic"|"humorous",',
      'camera_hint: "zoom_in"|"zoom_out"|"pan_left"|"pan_right"|"static"|"auto",',
      'metadata { importance, hook_potential (0-1), standalone (bool) }',
      '',
      'RESPOND WITH EXACTLY:',
      '{"topic":"...","title":"...","description":"...","tags":["..."],"thumbnail_prompt":"...",',
      `"scenes":[...${targetScenes} scenes...],"shorts":[{"short_id":1,"title":"...","scene_range":[1,5],"hook_scene":1}]}`,
    ].join('\n');

    return llm.chat({ system, user, temperature: 1, maxTokens: 32000 });
  });

  let script;
  try { script = LLMProvider.parseJson(raw); }
  catch (e) { throw new Error(`Script parse failed: ${e.message}`); }
  if (!Array.isArray(script.scenes) || script.scenes.length < 5) {
    throw new Error(`Too few scenes: ${script.scenes?.length}`);
  }

  // No scene count ceiling — callers supply targetDuration / sceneCount and the
  // pipeline renders however many scenes the script produces.
  const scenes = script.scenes.map((s, i) => normaliseScene(s, i));

  const totalWords = scenes.reduce((n, s) => n + (s.narration || '').split(/\s+/).filter(Boolean).length, 0);
  if (totalWords < 50) throw new Error(`Script too short: ${totalWords} words`);

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
    shorts:      script.shorts      || [],
    title:       script.title       || topic,
    description: script.description || '',
    tags:        script.tags        || [],
    thumbnailPrompt: script.thumbnail_prompt || '',
    totalWords,
    sceneCount:  scenes.length,
    outputHash,
  };
}

module.exports = { runScript, normaliseScene };

// ── CLI entrypoint ─────────────────────────────────────────────────────────
if (require.main === module) {
  const { runResearch } = require('./research');
  const args   = process.argv.slice(2);
  const tIdx   = args.indexOf('--topic');
  const topic  = tIdx >= 0 ? args[tIdx + 1] : args[0];
  if (!topic) { console.error('Usage: node src/workflows/script.js --topic "..."'); process.exit(1); }
  (async () => {
    const res = await runResearch(topic);
    const scr = await runScript({ productionId: res.productionId, claims: res.claims, topic });
    console.log(JSON.stringify({ sceneCount: scr.scenes.length, totalWords: scr.totalWords, title: scr.title }, null, 2));
  })().catch(e => { console.error(e.message); process.exit(1); });
}

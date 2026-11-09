/**
 * Workflow: Media Ingest
 *
 * Builds a production-ready scenes.json from user-supplied media files
 * WITHOUT any LLM, research, or AI image generation.
 *
 * This is the "editor" mode entry point — the user provides:
 *   - Video clips  (B-roll, screen recordings, gameplay, talking-head, stock)
 *   - Images       (graphics, slides, photos, AI-generated images)
 *   - Audio files  (pre-recorded voiceovers, podcasts, ElevenLabs output)
 *   - Captions     (per-scene text overlays)
 *   - A manifest   (JSON or array — see below)
 *
 * Output: scenes.json compatible with runAssets() → runRender() pipeline.
 *
 * CLI usage:
 *   # Build scenes from a directory of clips
 *   node src/cli/make.js --mode edit-only --media-dir ./my-clips
 *
 *   # Build from an explicit manifest JSON
 *   node src/cli/make.js --mode edit-only --scenes-file ./my-scenes.json
 *
 *   # Supply a ready-made script JSON (skip research/script, keep AI images + TTS)
 *   node src/cli/make.js --script-file ./approved-script.json
 *
 * Manifest format (scenes-file or media-dir auto-discovered):
 * [
 *   {
 *     "narration": "The voice-over text for this scene.",  // used for TTS if no audio_path
 *     "caption":   "CAPTION TEXT",                         // on-screen overlay
 *     "video_path":  "./clips/scene1.mp4",                 // OR
 *     "image_path":  "./images/scene1.png",                // OR generate (omit both)
 *     "audio_path":  "./audio/scene1.mp3",                 // pre-recorded voiceover
 *     "camera_hint": "zoom_in",                            // zoom_in|zoom_out|pan_left|pan_right|static|auto
 *     "duration":    5.0,                                  // seconds (optional — auto-detected)
 *     "music_mood":  "energetic"                           // tense|calm|energetic|mysterious|neutral|dramatic|humorous
 *   }
 * ]
 *
 * Auto-discovery (--media-dir):
 *   Scans the directory for video/image/audio files and builds scenes automatically.
 *   Pairs files with matching names: scene01.mp4 + scene01.mp3 + scene01.txt (caption).
 *   Sorts numerically by filename. One scene per matched group.
 */

'use strict';

const fs      = require('fs');
const fsp     = require('fs').promises;
const path    = require('path');
const crypto  = require('crypto');
// ── Constants ─────────────────────────────────────────────────────────────────

const VIDEO_EXTS = new Set(['.mp4','.mov','.avi','.mkv','.webm','.m4v','.flv','.ts']);
const IMAGE_EXTS = new Set(['.png','.jpg','.jpeg','.webp','.gif','.bmp','.tiff']);
const AUDIO_EXTS = new Set(['.mp3','.m4a','.aac','.wav','.ogg','.flac','.opus']);
const TEXT_EXTS  = new Set(['.txt','.caption','.srt']);

const ALLOWED_CAMERAS = ['zoom_in','zoom_out','pan_left','pan_right','static','auto'];
const ALLOWED_MOODS   = ['tense','calm','energetic','mysterious','neutral','dramatic','humorous'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function extOf(filePath) {
  return path.extname(filePath).toLowerCase();
}

function isVideo(f) { return VIDEO_EXTS.has(extOf(f)); }
function isImage(f) { return IMAGE_EXTS.has(extOf(f)); }
function isAudio(f) { return AUDIO_EXTS.has(extOf(f)); }
function isText(f)  { return TEXT_EXTS.has(extOf(f));  }

/** Strip extension and sort index from a filename, e.g. "scene_03_voice" → "scene_03" */
function baseStem(filePath) {
  return path.basename(filePath).replace(/\.[^.]+$/, '').replace(/_(voice|audio|image|clip|video)$/i, '');
}

/** Natural-sort comparator for filenames */
function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

// ── Auto-discovery ────────────────────────────────────────────────────────────

/**
 * Scan a directory and group media files into scenes by shared base name.
 * e.g. scene01.mp4 + scene01.mp3 + scene01.txt → one scene
 */
function discoverScenesFromDir(mediaDir) {
  const absDir = path.resolve(mediaDir);
  if (!fs.existsSync(absDir)) {
    throw new Error(`Media directory not found: ${absDir}`);
  }

  const files = fs.readdirSync(absDir)
    .filter(f => {
      const ext = path.extname(f).toLowerCase();
      return VIDEO_EXTS.has(ext) || IMAGE_EXTS.has(ext) || AUDIO_EXTS.has(ext) || TEXT_EXTS.has(ext);
    })
    .sort(naturalSort);

  // Group by stem
  const groups = {};
  for (const file of files) {
    const stem = baseStem(path.join(absDir, file));
    if (!groups[stem]) groups[stem] = {};
    const full = path.join(absDir, file);
    const ext  = extOf(full);
    if (VIDEO_EXTS.has(ext))     groups[stem].video = full;
    else if (IMAGE_EXTS.has(ext)) groups[stem].image = full;
    else if (AUDIO_EXTS.has(ext)) groups[stem].audio = full;
    else if (TEXT_EXTS.has(ext)) {
      try { groups[stem].caption = fs.readFileSync(full, 'utf8').trim(); } catch {}
    }
  }

  const sorted = Object.entries(groups).sort(([a], [b]) => naturalSort(a, b));
  if (sorted.length === 0) {
    throw new Error(`No media files found in: ${absDir}`);
  }

  return sorted.map(([stem, g], i) => ({
    scene_id:    i + 1,
    narration:   g.caption || '',
    caption:     (g.caption || '').toUpperCase().slice(0, 40),
    video_path:  g.video  || null,
    image_path:  g.image  || null,
    audio_path:  g.audio  || null,
    camera_hint: 'auto',
    music_mood:  'neutral',
  }));
}

// ── Manifest normalizer ───────────────────────────────────────────────────────

/**
 * Normalise a raw scene from any input format to the FrameForge scene schema.
 * Validates media file paths exist. Resolves relative paths against baseDir.
 *
 * @param {object} raw    Raw scene from user manifest
 * @param {number} index  0-based index
 * @param {string} baseDir  Base directory for relative path resolution
 * @returns {object} Normalised scene
 */
function normaliseIngestScene(raw, index, baseDir = process.cwd()) {
  const sceneId = raw.scene_id ?? raw.n ?? (index + 1);

  function resolveMedia(p) {
    if (!p) return null;
    const resolved = path.isAbsolute(p) ? p : path.resolve(baseDir, p);
    if (!fs.existsSync(resolved)) {
      console.warn(`  ⚠️  Scene ${sceneId}: media file not found: ${resolved}`);
      return null;
    }
    return resolved;
  }

  const videoPath = resolveMedia(raw.video_path || raw.videoPath || raw.clip);
  const imagePath = resolveMedia(raw.image_path || raw.imagePath || raw.image);
  const audioPath = resolveMedia(raw.audio_path || raw.audioPath || raw.audio || raw.voiceover);

  const narration = String(raw.narration || raw.text || raw.script || '').trim();
  const caption   = String(raw.caption   || raw.overlay || narration.slice(0, 40) || '').toUpperCase().trim().slice(0, 40);

  return {
    scene_id:       sceneId,
    schema_version: '1.0.0',
    narration,
    caption,
    prompt:         String(raw.prompt || '').trim(),
    style:          String(raw.style || '').trim(),
    theme:          String(raw.theme || '').trim(),
    // visual_description used by AI image generation — blank means no AI image needed
    visual_description: String(raw.visual_description || raw.description || raw.prompt || narration || '').trim(),
    video_path:   videoPath,
    image_path:   imagePath,
    audio_path:   audioPath,
    camera_hint:  ALLOWED_CAMERAS.includes(raw.camera_hint || raw.camera) ? (raw.camera_hint || raw.camera) : 'auto',
    music_mood:   ALLOWED_MOODS.includes(raw.music_mood)   ? raw.music_mood   : 'neutral',
    // Pass through any extra fields the user provided
    character:    raw.character    || { character_id: 'none', pose: 'none', emotion: 'none' },
    focal_point:  raw.focal_point  || { x: 0.5, y: 0.5, weight: 0.8 },
    overlay:      raw.overlay      || { type: 'none' },
    sound_effects: Array.isArray(raw.sound_effects) ? raw.sound_effects : [],
    metadata:     raw.metadata     || { importance: 'medium', hook_potential: 0.5, standalone: false },
    // Duration hint — used by renderer if provided (otherwise audio-driven)
    duration:     typeof raw.duration === 'number' ? raw.duration : null,
  };
}

// ── Main ingest function ──────────────────────────────────────────────────────

/**
 * Ingest user media into a production-ready scenes manifest.
 *
 * @param {{
 *   productionId?:  string   — reuse existing production ID or auto-generate
 *   scenesFile?:    string   — path to scenes.json / manifest JSON
 *   mediaDir?:      string   — directory to auto-discover clips from
 *   rawScenes?:     object[] — inline scene array (programmatic use)
 *   outDir?:        string   — where to write the scenes manifest
 * }} opts
 * @returns {{ productionId: string, scenesFile: string, scenes: object[], sceneCount: number }}
 */
async function runIngest({ productionId, scenesFile, mediaDir, rawScenes, outDir } = {}) {
  const filesDir = outDir || process.env.N8N_FILES_DIR || './output';
  await fsp.mkdir(filesDir, { recursive: true });

  // ── Step 1: Load/discover scenes ─────────────────────────────────────────
  let rawList;
  let baseDir = process.cwd();

  if (rawScenes && Array.isArray(rawScenes) && rawScenes.length > 0) {
    rawList = rawScenes;
    console.log(`[Ingest] Using ${rawList.length} inline scenes`);
  } else if (scenesFile) {
    const absPath = path.resolve(process.cwd(), scenesFile);
    if (!fs.existsSync(absPath)) throw new Error(`Scenes file not found: ${absPath}`);
    const content = fs.readFileSync(absPath, 'utf8');
    const parsed  = JSON.parse(content);
    rawList = Array.isArray(parsed) ? parsed : (parsed.scenes || parsed.data || []);
    baseDir = path.dirname(absPath);
    console.log(`[Ingest] Loaded ${rawList.length} scene(s) from: ${absPath}`);
  } else if (mediaDir) {
    rawList = discoverScenesFromDir(mediaDir);
    baseDir = path.resolve(mediaDir);
    console.log(`[Ingest] Auto-discovered ${rawList.length} scene(s) from: ${mediaDir}`);
  } else {
    throw new Error('runIngest requires one of: scenesFile, mediaDir, or rawScenes');
  }

  if (rawList.length === 0) {
    throw new Error('No scenes found in the provided input');
  }

  // ── Step 2: Normalise ─────────────────────────────────────────────────────
  const scenes = rawList.map((raw, i) => normaliseIngestScene(raw, i, baseDir));
  const validScenes = scenes.filter(s => s.narration || s.video_path || s.image_path || s.audio_path);

  if (validScenes.length === 0) {
    throw new Error('All scenes are empty — each scene needs at least narration, a video, an image, or an audio file');
  }

  // ── Step 3: Assign productionId and register with state machine ──────────
  const pid = productionId || `ingest_${crypto.randomBytes(4).toString('hex')}_${Date.now()}`;

  // Register with the state machine so downstream stages (Assets, Render) can
  // call startStage() without hitting "Production not found".
  const stateDir = path.join(filesDir, 'state');
  await fsp.mkdir(stateDir, { recursive: true });
  const stateFile = path.join(stateDir, `${pid}.json`);
  if (!fs.existsSync(stateFile)) {
    const record = {
      productionId: pid,
      status: 'QUEUED',
      pipelineVersion: '2.0.0',
      schemaVersion:   '1.0.0',
      topic:      scenesFile || mediaDir || 'ingest',
      createdAt:  new Date().toISOString(),
      startedAt:  null,
      completedAt: null,
      configHash: crypto.createHash('sha256').update(pid).digest('hex').slice(0, 16),
      stages: {},
      metadata: {},
    };
    fs.writeFileSync(stateFile, JSON.stringify(record, null, 2), 'utf8');
  }

  // ── Step 4: Write scenes manifest ────────────────────────────────────────
  const outPath = path.join(filesDir, `${pid}-scenes.json`);
  const manifest = {
    productionId: pid,
    createdAt:    new Date().toISOString(),
    sceneCount:   validScenes.length,
    mode:         'ingest',
    scenes:       validScenes,
  };
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`[Ingest] ✅  Scenes manifest saved: ${outPath}`);

  // Print summary
  const withVideo  = validScenes.filter(s => s.video_path).length;
  const withImage  = validScenes.filter(s => s.image_path && !s.video_path).length;
  const withCodeAnim = validScenes.filter(s => !s.video_path && !s.image_path).length;
  const withAudio  = validScenes.filter(s => s.audio_path).length;
  const withTTS    = validScenes.filter(s => !s.audio_path && s.narration).length;
  console.log(`[Ingest]    Scenes: ${validScenes.length} total`);
  console.log(`[Ingest]    Video clips: ${withVideo}  |  User images: ${withImage}  |  Code-animated: ${withCodeAnim}`);
  console.log(`[Ingest]    Pre-recorded audio: ${withAudio}  |  TTS needed: ${withTTS}`);
  if (withCodeAnim > 0) console.log(`[Ingest]    ℹ️   ${withCodeAnim} scene(s) will render with code-driven animations (kinetic typography/motion graphics)`);
  if (withTTS > 0)      console.log(`[Ingest]    ℹ️   ${withTTS} scene(s) will use TTS synthesis (remove --no-tts to skip)`);

  return {
    productionId:  pid,
    scenesFile:    outPath,
    scenes:        validScenes,
    sceneCount:    validScenes.length,
    stats: { withVideo, withImage, withCodeAnim, withAI: withCodeAnim, withAudio, withTTS },
  };
}

module.exports = { runIngest, normaliseIngestScene, discoverScenesFromDir };

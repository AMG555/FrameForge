'use strict';
/**
 * integration.test.js — End-to-end pipeline dry-run tests.
 *
 * Tests the full data-flow from normalised scene schema → renderer logic
 * without network calls, FFmpeg, or real file I/O.
 *
 * Strategy:
 *   1. Normalise scenes via the real script.js normaliseScene()
 *   2. Feed them through the real VideoRenderer helpers (caption filter,
 *      scene discovery guard, assembleMain guard)
 *   3. Verify the pipeline produces correct output structures at each stage
 *
 * This catches regressions across the Stage A→D chain without requiring
 * external services or a full render.
 */

const { describe, it, before } = require('node:test');
const assert  = require('node:assert/strict');
const fs      = require('fs');
const path    = require('path');
const os      = require('os');

// ── Pull in real modules ───────────────────────────────────────────────────────
const { normaliseScene } = require('../src/workflows/script');
const { VideoRenderer }  = require('../src/video-renderer/renderer');

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal valid raw scene as an IDE agent would supply it. */
function rawScene(overrides = {}) {
  return {
    scene_id:           1,
    narration:          'The world changed forever in that moment.',
    caption:            'KEY MOMENT',
    visual_description: 'Close-up of a spinning globe against a dark background.',
    camera_hint:        'zoom_in',
    music_mood:         'tense',
    ...overrides,
  };
}

// ── Stage A: normaliseScene (Script workflow) ─────────────────────────────────

describe('Integration — Stage A: normaliseScene produces valid schema', () => {
  it('output has schema_version 2.0.0', () => {
    const s = normaliseScene(rawScene(), 0);
    assert.equal(s.schema_version, '2.0.0');
  });

  it('output has all required top-level fields', () => {
    const s = normaliseScene(rawScene(), 0);
    const required = [
      'scene_id', 'schema_version', 'narration', 'caption',
      'visual_description', 'character', 'focal_point',
      'overlay', 'sound_effects', 'music_mood', 'camera_hint', 'metadata',
    ];
    for (const key of required) {
      assert.ok(key in s, `missing field: ${key}`);
    }
  });

  it('character has character_id, pose, emotion, position', () => {
    const s = normaliseScene(rawScene(), 0);
    assert.ok('character_id' in s.character);
    assert.ok('pose'         in s.character);
    assert.ok('emotion'      in s.character);
    assert.ok('position'     in s.character);
  });

  it('focal_point x/y/weight are within [0,1]', () => {
    const s = normaliseScene(rawScene({ focal_point: { x: 0.3, y: 0.7, weight: 0.9 } }), 0);
    assert.ok(s.focal_point.x >= 0 && s.focal_point.x <= 1);
    assert.ok(s.focal_point.y >= 0 && s.focal_point.y <= 1);
    assert.ok(s.focal_point.weight >= 0 && s.focal_point.weight <= 1);
  });

  it('out-of-range position values are clamped', () => {
    const s = normaliseScene(rawScene({ character: { position: { x: 5, y: -3, scale: 0.1 } } }), 0);
    assert.equal(s.character.position.x, 1);
    assert.equal(s.character.position.y, 0);
    assert.equal(s.character.position.scale, 0.5);
  });

  it('unknown camera_hint falls back to auto', () => {
    const s = normaliseScene(rawScene({ camera_hint: 'fly_through' }), 0);
    assert.equal(s.camera_hint, 'auto');
  });

  it('unknown music_mood falls back to neutral', () => {
    const s = normaliseScene(rawScene({ music_mood: 'epic' }), 0);
    assert.equal(s.music_mood, 'neutral');
  });

  it('caller-supplied image_path/video_path/audio_path are passed through', () => {
    const s = normaliseScene(rawScene({
      image_path: '/tmp/frame.jpg',
      video_path: '/tmp/clip.mp4',
      audio_path: '/tmp/voice.m4a',
    }), 0);
    assert.equal(s.image_path, '/tmp/frame.jpg');
    assert.equal(s.video_path, '/tmp/clip.mp4');
    assert.equal(s.audio_path, '/tmp/voice.m4a');
  });

  it('caption is uppercased and capped at 40 chars', () => {
    const s = normaliseScene(rawScene({ caption: 'a'.repeat(60) }), 0);
    assert.equal(s.caption.length, 40);
    assert.equal(s.caption, 'A'.repeat(40));
  });
});

// ── Stage B: multi-scene normalisation ────────────────────────────────────────

describe('Integration — Stage B: normalise a multi-scene script', () => {
  const RAW_SCENES = [
    rawScene({ scene_id: 1, narration: 'Scene one content.' }),
    rawScene({ scene_id: 2, narration: 'Scene two content.' }),
    rawScene({ scene_id: 3, narration: 'Scene three content.', camera_hint: 'pan_left' }),
  ];

  let scenes;
  before(() => {
    scenes = RAW_SCENES.map((r, i) => normaliseScene(r, i));
  });

  it('produces the correct number of scenes', () => {
    assert.equal(scenes.length, 3);
  });

  it('all scenes have valid schema_version', () => {
    for (const s of scenes) assert.equal(s.schema_version, '2.0.0');
  });

  it('scene IDs match input', () => {
    assert.equal(scenes[0].scene_id, 1);
    assert.equal(scenes[1].scene_id, 2);
    assert.equal(scenes[2].scene_id, 3);
  });

  it('camera_hint pan_left is preserved in scene 3', () => {
    assert.equal(scenes[2].camera_hint, 'pan_left');
  });

  it('each scene has metadata with importance, hook_potential, standalone', () => {
    for (const s of scenes) {
      assert.ok('importance'     in s.metadata);
      assert.ok('hook_potential' in s.metadata);
      assert.ok('standalone'     in s.metadata);
    }
  });
});

// ── Stage C: VideoRenderer caption filter ─────────────────────────────────────

describe('Integration — Stage C: VideoRenderer caption filter', () => {
  let renderer;
  let tmpDir;

  before(() => {
    tmpDir   = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-integ-'));
    renderer = new VideoRenderer({ filesDir: tmpDir });
  });

  it('returns empty string when caption is empty', () => {
    const f = renderer._captionFilter('');
    assert.equal(f, '');
  });

  it('returns empty string when caption is whitespace', () => {
    const f = renderer._captionFilter('   ');
    assert.equal(f, '');
  });

  it('returns drawtext filter string when font exists', () => {
    // Only assert structure when a font is available; skip on machines with no fonts
    if (!renderer.font) return; // font-less CI machine — skip
    const f = renderer._captionFilter('Hello World');
    assert.ok(f.startsWith('drawtext='), `expected drawtext filter, got: ${f}`);
    assert.ok(f.includes('HELLO WORLD'));
  });

  it('strips dangerous characters from caption text', () => {
    if (!renderer.font) return;
    const f = renderer._captionFilter("DROP TABLE 'users'; -- hack");
    // The filter wraps with text='...', so extract just the content between text=' and '
    const match = f.match(/text='([^']*)'/);
    assert.ok(match, 'filter must contain text=...');
    const content = match[1];
    assert.ok(!content.includes("'"), `single quotes should be stripped from content, got: ${content}`);
    assert.ok(!content.includes(';'),  `semicolons should be stripped from content, got: ${content}`);
  });

  it('caption is truncated to 45 chars in filter', () => {
    if (!renderer.font) return;
    const f = renderer._captionFilter('A'.repeat(80));
    // The safe caption inside text='' should be at most 45 chars
    const match = f.match(/text='([^']+)'/);
    if (match) assert.ok(match[1].length <= 45);
  });
});

// ── Stage D: assembleMain guard (no FFmpeg needed) ────────────────────────────

describe('Integration — Stage D: assembleMain rejects empty scene list', () => {
  it('throws when no scene files exist', () => {
    const tmpDir  = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-empty-'));
    const r       = new VideoRenderer({ filesDir: tmpDir });
    // vdir exists but is empty → _discoverScenes returns []
    fs.mkdirSync(path.join(tmpDir, 'video_tmp'), { recursive: true });
    assert.throws(
      () => r.assembleMain({ productionId: 'test-dry-run' }),
      /Too few scenes assembled/
    );
  });
});

// ── Stage D2: render.js workflow guard (matches assembleMain guard) ───────────

describe('Integration — Stage D2: render.js scene guard consistency', () => {
  it('render.js guard file is consistent — throws at 0, warns at 1-2', () => {
    // Read render.js source and verify the guard is < 1 (not < 5)
    const renderSrc = fs.readFileSync(
      require('path').join(__dirname, 'workflows/render.js'), 'utf8'
    );
    assert.ok(
      renderSrc.includes('sceneFiles.length < 1'),
      'render.js must throw only when 0 scenes rendered (not < 5)'
    );
    assert.ok(
      !renderSrc.includes('sceneFiles.length < 5'),
      'render.js must not have the old < 5 guard'
    );
    assert.ok(
      renderSrc.includes('sceneFiles.length < 3'),
      'render.js must warn when < 3 scenes'
    );
  });
});



// ── Stage E: full pipeline data-flow (no I/O) ─────────────────────────────────

describe('Integration — Stage E: full schema pipeline data flow', () => {
  it('raw IDE scenes → normalised → renderer-ready in one pass', () => {
    // Simulate what create_video_from_script does:
    //   1. Receive raw scenes array from IDE agent
    //   2. normalise each scene
    //   3. Extract renderer inputs (image_path, audio_path, caption, camera_hint)

    const ideScenes = [
      {
        scene_id: 1,
        narration: 'A dramatic reveal of the product.',
        caption: 'the reveal',
        visual_description: 'Sleek product on a pedestal lit by a single spotlight.',
        camera_hint: 'slow_zoom_in',   // unknown → falls back to 'auto'
        image_path: '/assets/product.jpg',
        audio_path: '/assets/voice1.m4a',
      },
      {
        scene_id: 2,
        narration: 'The specs that set it apart.',
        caption: 'SPECS',
        visual_description: 'Technical diagram of the internal components.',
        camera_hint: 'pan_right',
        image_path: '/assets/diagram.jpg',
        audio_path: '/assets/voice2.m4a',
      },
    ];

    const normalised = ideScenes.map((r, i) => normaliseScene(r, i));

    // Verify structure is correct for renderer
    for (const scene of normalised) {
      assert.ok(scene.image_path || scene.video_path || scene.audio_path,
        'at least one media path present');
      assert.equal(typeof scene.camera_hint, 'string');
      assert.ok(scene.focal_point.x >= 0 && scene.focal_point.x <= 1);
    }

    // Scene 1: slow_zoom_in is not in ALLOWED_CAMERAS → falls back to 'auto'
    assert.equal(normalised[0].camera_hint, 'auto');
    // Scene 2: pan_right is valid
    assert.equal(normalised[1].camera_hint, 'pan_right');

    // Captions are uppercased
    assert.equal(normalised[0].caption, 'THE REVEAL');
    assert.equal(normalised[1].caption, 'SPECS');

    // Media bypass paths pass through unchanged
    assert.equal(normalised[0].image_path, '/assets/product.jpg');
    assert.equal(normalised[0].audio_path, '/assets/voice1.m4a');
  });
});


// ── Stage F: runIngest state-file registration ────────────────────────────────

describe('Integration — Stage F: runIngest registers state file', () => {
  const { runIngest } = require('../src/workflows/ingest');

  it('writes a state/<productionId>.json alongside the scenes manifest', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-ingest-state-'));
    const result = await runIngest({
      rawScenes: [{ narration: 'Hello world, this is a test scene.' }],
      outDir: tmpDir,
    });

    const stateFile = path.join(tmpDir, 'state', `${result.productionId}.json`);
    assert.ok(fs.existsSync(stateFile), `state file should exist at ${stateFile}`);

    const record = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    assert.equal(record.productionId, result.productionId);
    assert.equal(record.status, 'QUEUED');
    assert.ok(typeof record.createdAt === 'string');
    assert.ok('stages' in record);
  });

  it('does not overwrite an existing state file on re-run with same productionId', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-ingest-idem-'));
    const pid = 'test_idempotent_pid';

    // First run
    await runIngest({ rawScenes: [{ narration: 'Scene one.' }], outDir: tmpDir, productionId: pid });
    const stateFile = path.join(tmpDir, 'state', `${pid}.json`);
    const mtime1 = fs.statSync(stateFile).mtimeMs;

    // Tiny delay then second run with same pid
    await new Promise(r => setTimeout(r, 20));
    await runIngest({ rawScenes: [{ narration: 'Scene one.' }], outDir: tmpDir, productionId: pid });
    const mtime2 = fs.statSync(stateFile).mtimeMs;

    assert.equal(mtime1, mtime2, 'state file must not be rewritten if it already exists');
  });
});

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { normaliseScene } = require('./script');

// ── normaliseScene — field defaults ──────────────────────────────────────────

describe('normaliseScene defaults', () => {
  it('uses scene_id from raw input', () => {
    const s = normaliseScene({ scene_id: 5, narration: 'test' }, 0);
    assert.equal(s.scene_id, 5);
  });

  it('falls back to index+1 when scene_id missing', () => {
    const s = normaliseScene({ narration: 'hello' }, 3);
    assert.equal(s.scene_id, 4);
  });

  it('sets schema_version to 2.0.0', () => {
    const s = normaliseScene({ narration: 'test' }, 0);
    assert.equal(s.schema_version, '2.0.0');
  });

  it('trims narration text', () => {
    const s = normaliseScene({ narration: '  hello world  ' }, 0);
    assert.equal(s.narration, 'hello world');
  });

  it('uppercases caption and limits to 40 chars', () => {
    const s = normaliseScene({ caption: 'a very long caption that exceeds the allowed forty character maximum limit' }, 0);
    assert.equal(s.caption, s.caption.toUpperCase());
    assert.ok(s.caption.length <= 40);
  });

  it('falls back to empty string when narration missing', () => {
    const s = normaliseScene({}, 0);
    assert.equal(s.narration, '');
  });
});

// ── normaliseScene — legacy visual_action compat ──────────────────────────────

describe('normaliseScene legacy visual_action', () => {
  it('prefers visual_description over visual_action', () => {
    const s = normaliseScene({
      visual_description: 'A sunrise over mountains',
      visual_action:      'Old legacy field',
    }, 0);
    assert.equal(s.visual_description, 'A sunrise over mountains');
  });

  it('falls back to visual_action when visual_description absent', () => {
    const s = normaliseScene({ visual_action: 'Legacy scene visual' }, 0);
    assert.equal(s.visual_description, 'Legacy scene visual');
  });

  it('defaults visual_description to "scene visual" when both absent', () => {
    const s = normaliseScene({}, 0);
    assert.equal(s.visual_description, 'scene visual');
  });
});

// ── normaliseScene — position clamping ────────────────────────────────────────

describe('normaliseScene position clamping', () => {
  it('clamps character position.x to [0,1]', () => {
    const s = normaliseScene({ character: { position: { x: 1.5, y: 0.5, scale: 1 } } }, 0);
    assert.equal(s.character.position.x, 1);

    const s2 = normaliseScene({ character: { position: { x: -0.2, y: 0.5, scale: 1 } } }, 0);
    assert.equal(s2.character.position.x, 0);
  });

  it('clamps character position.y to [0,1]', () => {
    const s = normaliseScene({ character: { position: { x: 0.5, y: -1, scale: 1 } } }, 0);
    assert.equal(s.character.position.y, 0);

    const s2 = normaliseScene({ character: { position: { x: 0.5, y: 2, scale: 1 } } }, 0);
    assert.equal(s2.character.position.y, 1);
  });

  it('clamps character position.scale to [0.5, 2]', () => {
    const s = normaliseScene({ character: { position: { x: 0.5, y: 0.5, scale: 3 } } }, 0);
    assert.equal(s.character.position.scale, 2);

    const s2 = normaliseScene({ character: { position: { x: 0.5, y: 0.5, scale: 0.1 } } }, 0);
    assert.equal(s2.character.position.scale, 0.5);
  });

  it('clamps focal_point to [0,1] range', () => {
    const s = normaliseScene({ focal_point: { x: -0.5, y: 2, weight: 1.5 } }, 0);
    assert.equal(s.focal_point.x, 0);
    assert.equal(s.focal_point.y, 1);
    assert.equal(s.focal_point.weight, 1);
  });

  it('uses defaults for non-numeric position fields', () => {
    const s = normaliseScene({ character: { position: { x: 'bad', y: null } } }, 0);
    assert.equal(s.character.position.x, 0.5); // default
    assert.equal(s.character.position.y, 0.8); // default
    assert.equal(s.character.position.scale, 1.0); // default
  });
});

// ── normaliseScene — camera_hint and music_mood ────────────────────────────────

describe('normaliseScene camera_hint and music_mood', () => {
  const ALLOWED_CAMERAS = ['zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'static', 'auto'];
  const ALLOWED_MOODS   = ['tense', 'calm', 'energetic', 'mysterious', 'neutral', 'dramatic', 'humorous'];

  it('passes through valid camera_hint', () => {
    for (const hint of ALLOWED_CAMERAS) {
      const s = normaliseScene({ camera_hint: hint }, 0);
      assert.equal(s.camera_hint, hint);
    }
  });

  it('falls back to auto for unknown camera_hint', () => {
    const s = normaliseScene({ camera_hint: 'rocket_launch' }, 0);
    assert.equal(s.camera_hint, 'auto');
  });

  it('accepts legacy camera field as camera_hint', () => {
    const s = normaliseScene({ camera: 'pan_left' }, 0);
    assert.equal(s.camera_hint, 'pan_left');
  });

  it('falls back to neutral for unknown music_mood', () => {
    const s = normaliseScene({ music_mood: 'melancholic' }, 0);
    assert.equal(s.music_mood, 'neutral');
  });

  it('passes through valid music_mood', () => {
    for (const mood of ALLOWED_MOODS) {
      const s = normaliseScene({ music_mood: mood }, 0);
      assert.equal(s.music_mood, mood);
    }
  });
});

// ── normaliseScene — optional caller-supplied paths ───────────────────────────

describe('normaliseScene caller-supplied media paths', () => {
  it('passes through image_path when set', () => {
    const s = normaliseScene({ image_path: '/my/photo.jpg' }, 0);
    assert.equal(s.image_path, '/my/photo.jpg');
  });

  it('passes through video_path when set', () => {
    const s = normaliseScene({ video_path: '/my/clip.mp4' }, 0);
    assert.equal(s.video_path, '/my/clip.mp4');
  });

  it('passes through audio_path when set', () => {
    const s = normaliseScene({ audio_path: '/my/voice.m4a' }, 0);
    assert.equal(s.audio_path, '/my/voice.m4a');
  });

  it('defaults media paths to null when absent', () => {
    const s = normaliseScene({}, 0);
    assert.equal(s.image_path, null);
    assert.equal(s.video_path, null);
    assert.equal(s.audio_path, null);
  });
});

// ── normaliseScene — metadata ─────────────────────────────────────────────────

describe('normaliseScene metadata', () => {
  it('defaults importance to medium', () => {
    const s = normaliseScene({}, 0);
    assert.equal(s.metadata.importance, 'medium');
  });

  it('defaults hook_potential to 0.5', () => {
    const s = normaliseScene({}, 0);
    assert.equal(s.metadata.hook_potential, 0.5);
  });

  it('defaults standalone to false', () => {
    const s = normaliseScene({}, 0);
    assert.equal(s.metadata.standalone, false);
  });

  it('preserves metadata.importance if provided', () => {
    const s = normaliseScene({ metadata: { importance: 'high' } }, 0);
    assert.equal(s.metadata.importance, 'high');
  });

  it('preserves boolean standalone values', () => {
    const s1 = normaliseScene({ metadata: { standalone: true } }, 0);
    assert.equal(s1.metadata.standalone, true);

    const s2 = normaliseScene({ metadata: { standalone: false } }, 0);
    assert.equal(s2.metadata.standalone, false);
  });
});

// ── normaliseScene — character_id is free-form ────────────────────────────────

describe('normaliseScene character_id free-form', () => {
  it('accepts any string as character_id', () => {
    const s = normaliseScene({ character: { character_id: 'my_custom_host_2024' } }, 0);
    assert.equal(s.character.character_id, 'my_custom_host_2024');
  });

  it('defaults character_id to "none"', () => {
    const s = normaliseScene({}, 0);
    assert.equal(s.character.character_id, 'none');
  });
});

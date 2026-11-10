'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseMarkdownScript, normaliseIngestScene } = require('./ingest');

describe('parseMarkdownScript', () => {
  it('parses multi-scene markdown script with time ranges and prompts', () => {
    const md = `
# മനുഷ്യൻ എന്തിനാണ് വസ്ത്രം ധരിക്കാൻ തുടങ്ങിയത്?

**5-Minute Malayalam Animated History Documentary**

## SCENE 01 — THE OPENING HOOK

**Time: 00:00–00:12**

**ANIMATION PROMPT (ENGLISH):**

Draw a modern human opening a wardrobe.

**MALAYALAM VOICE OVER:**

നിങ്ങൾ ഇന്ന് രാവിലെ ധരിച്ച ഈ വസ്ത്രം.

## SCENE 02 — MODERN VS ANCIENT HUMAN

**Time: 00:12–00:23**

**ANIMATION PROMPT (ENGLISH):**

Split screen comparison of humans.

**MALAYALAM VOICE OVER:**

ഇന്ന് ഫാഷനും സൗകര്യവും നോക്കി നമ്മൾ വസ്ത്രം തിരഞ്ഞെടുക്കുന്നു.
`;

    const res = parseMarkdownScript(md);
    assert.equal(res.scenes.length, 2);
    assert.equal(res.title, 'മനുഷ്യൻ എന്തിനാണ് വസ്ത്രം ധരിക്കാൻ തുടങ്ങിയത്?');

    const s1 = res.scenes[0];
    assert.equal(s1.scene_id, 1);
    assert.equal(s1.title, 'THE OPENING HOOK');
    assert.equal(s1.duration, 12);
    assert.equal(s1.start_time, 0);
    assert.equal(s1.end_time, 12);
    assert.equal(s1.visual_description, 'Draw a modern human opening a wardrobe.');
    assert.equal(s1.narration, 'നിങ്ങൾ ഇന്ന് രാവിലെ ധരിച്ച ഈ വസ്ത്രം.');
    assert.equal(s1.camera_hint, 'auto');

    const s2 = res.scenes[1];
    assert.equal(s2.scene_id, 2);
    assert.equal(s2.duration, 11);
    assert.equal(s2.start_time, 12);
    assert.equal(s2.end_time, 23);
  });

  it('handles empty or non-markdown string gracefully', () => {
    assert.deepEqual(parseMarkdownScript(''), { title: '', scenes: [] });
    assert.deepEqual(parseMarkdownScript(null), { title: '', scenes: [] });
  });
});

describe('normaliseIngestScene duration and camera', () => {
  it('preserves explicit duration and time boundaries', () => {
    const raw = {
      scene_id: 1,
      narration: 'Test narration',
      duration: 14.5,
      startTime: 10,
      endTime: 24.5,
    };
    const norm = normaliseIngestScene(raw, 0);
    assert.equal(norm.duration, 14.5);
    assert.equal(norm.start_time, 10);
    assert.equal(norm.end_time, 24.5);
    assert.equal(norm.camera_hint, 'auto');
  });
});

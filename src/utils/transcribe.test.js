'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { detectWhisper, snapCutToPause, formatTimestampSrt, formatAsSrt, formatAsNdjson } = require('./transcribe');

test('detectWhisper', () => {
  const res = detectWhisper();
  assert.equal(typeof res.available, 'boolean');
  assert.equal(typeof res.engine, 'string');
});

test('snapCutToPause', async (t) => {
  const pauses = [
    { start: 1.8, end: 2.4, duration: 0.6 },
    { start: 4.9, end: 5.5, duration: 0.6 },
    { start: 8.0, end: 8.8, duration: 0.8 },
  ];

  await t.test('snaps time to nearest pause midpoint within tolerance', () => {
    // 2.0 is close to mid 2.1
    const snapped = snapCutToPause(2.0, pauses, 0.5);
    assert.equal(snapped, 2.1);
  });

  await t.test('leaves time unchanged if outside tolerance', () => {
    const snapped = snapCutToPause(3.5, pauses, 0.5);
    assert.equal(snapped, 3.5);
  });

  await t.test('handles empty pauses array safely', () => {
    const snapped = snapCutToPause(3.5, []);
    assert.equal(snapped, 3.5);
  });
});

test('formatTimestampSrt', () => {
  assert.equal(formatTimestampSrt(0), '00:00:00,000');
  assert.equal(formatTimestampSrt(65.45), '00:01:05,450');
  assert.equal(formatTimestampSrt(3661.123), '01:01:01,123');
});

test('formatAsSrt', () => {
  const segments = [
    { start: 0.5, end: 2.1, text: 'Hello world' },
    { start: 2.5, end: 4.0, text: 'FrameForge video' },
  ];
  const srt = formatAsSrt(segments);
  assert.match(srt, /1\r?\n00:00:00,500 --> 00:00:02,100\r?\nHello world/);
  assert.match(srt, /2\r?\n00:00:02,500 --> 00:00:04,000\r?\nFrameForge video/);
});

test('formatAsNdjson', () => {
  const segments = [
    { start: 0.5, end: 2.1, text: 'Hello world' },
  ];
  const ndjson = formatAsNdjson(segments);
  const parsed = JSON.parse(ndjson.trim());
  assert.equal(parsed.start, 0.5);
  assert.equal(parsed.end, 2.1);
  assert.equal(parsed.text, 'Hello world');
});



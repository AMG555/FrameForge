'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { detectWhisper, snapCutToPause } = require('./transcribe');

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


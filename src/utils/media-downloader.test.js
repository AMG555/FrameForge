'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isWebUrl, detectYtDlp } = require('./media-downloader');

test('isWebUrl', async (t) => {
  await t.test('detects valid https URLs', () => {
    assert.equal(isWebUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), true);
    assert.equal(isWebUrl('http://example.com/video.mp4'), true);
    assert.equal(isWebUrl('https://youtu.be/dQw4w9WgXcQ'), true);
  });

  await t.test('rejects local file paths and non-urls', () => {
    assert.equal(isWebUrl('/path/to/video.mp4'), false);
    assert.equal(isWebUrl('C:\\Videos\\clip.mp4'), false);
    assert.equal(isWebUrl('relative/clip.mp4'), false);
    assert.equal(isWebUrl(''), false);
    assert.equal(isWebUrl(null), false);
    assert.equal(isWebUrl(undefined), false);
  });
});

test('detectYtDlp', () => {
  const isAvailable = detectYtDlp();
  assert.equal(typeof isAvailable, 'boolean');
});


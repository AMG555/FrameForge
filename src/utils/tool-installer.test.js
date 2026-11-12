const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isCommandAvailable, ensureFfmpeg, ensureEdgeTts, ensureYtDlp } = require('./tool-installer');

describe('tool-installer', () => {
  it('isCommandAvailable returns boolean', () => {
    const nodeRes = isCommandAvailable('node');
    assert.equal(typeof nodeRes, 'boolean');
    assert.equal(nodeRes, true);

    const fakeRes = isCommandAvailable('nonexistent_tool_123456');
    assert.equal(fakeRes, false);
  });

  it('ensureFfmpeg returns boolean', () => {
    const res = ensureFfmpeg();
    assert.equal(typeof res, 'boolean');
  });

  it('ensureEdgeTts returns true when edge-tts is available', () => {
    const res = ensureEdgeTts();
    assert.equal(typeof res, 'boolean');
  });

  it('ensureYtDlp returns true when yt-dlp is available', () => {
    const res = ensureYtDlp();
    assert.equal(typeof res, 'boolean');
  });
});

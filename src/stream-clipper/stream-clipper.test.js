const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  validateClip,
  cutAndReframeClip,
  captureVod,
  scoreChatVelocity,
  obsCommand,
} = require('./stream-clipper');

describe('StreamClipper — Unit Tests', () => {

  describe('captureVod validation', () => {
    it('throws when url is missing', () => {
      assert.throws(() => {
        captureVod({ outputPath: 'test.mp4' });
      }, /url is required/);
    });

    it('throws when outputPath is missing', () => {
      assert.throws(() => {
        captureVod({ url: 'https://youtube.com/watch?v=123' });
      }, /outputPath is required/);
    });
  });

  describe('cutAndReframeClip validation', () => {
    it('throws when sourcePath does not exist', () => {
      assert.throws(() => {
        cutAndReframeClip({
          sourcePath: 'non_existent_file_xyz.mp4',
          outputPath: 'out.mp4',
        });
      }, /Source video not found/);
    });
  });

  describe('validateClip checks', () => {
    it('returns pass: false when file does not exist', () => {
      const res = validateClip('non_existent_clip.mp4');
      assert.strictEqual(res.pass, false);
      assert.strictEqual(res.hard_asserts.file_exists, false);
    });
  });

  describe('scoreChatVelocity test with fixture', () => {
    it('processes sample chat json lines and detects peaks', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-test-'));
      const chatFile = path.join(tmpDir, 'test_chat.jsonl');

      // Create 30 chat messages with a spike at t=20s
      const lines = [];
      // baseline
      for (let i = 0; i < 5; i++) {
        lines.push(JSON.stringify({
          replayChatItemAction: {
            videoOffsetTimeMsec: i * 2000,
            actions: [{
              addChatItemAction: {
                item: {
                  liveChatTextMessageRenderer: {
                    message: { runs: [{ text: 'hey chat' }] }
                  }
                }
              }
            }]
          }
        }));
      }
      // burst at 20-30s
      for (let i = 0; i < 25; i++) {
        lines.push(JSON.stringify({
          replayChatItemAction: {
            videoOffsetTimeMsec: 21000 + (i * 300),
            actions: [{
              addChatItemAction: {
                item: {
                  liveChatTextMessageRenderer: {
                    message: { runs: [{ text: 'LMAO POG OMG WTFFFF' }] }
                  }
                }
              }
            }]
          }
        }));
      }

      fs.writeFileSync(chatFile, lines.join('\n'));

      try {
        const result = scoreChatVelocity(chatFile, { bucketSec: 10, spikeMult: 2.0 });
        assert.ok(result.total_messages >= 25);
        assert.ok(result.max_velocity_mps > 0);
        assert.ok(Array.isArray(result.spikes));
        if (result.spikes.length > 0) {
          const sp = result.spikes[0];
          assert.ok(sp.spike_ratio >= 1.5);
        }
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

});

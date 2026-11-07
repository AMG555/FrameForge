import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeRgbBuffer } from './pixels.mjs';

describe('pixels.mjs', () => {
  const W = 100;
  const H = 100;

  it('flags a blank frame (all black)', () => {
    const buf = Buffer.alloc(W * H * 3, 0);
    const res = analyzeRgbBuffer(buf, W, H);
    assert.equal(res.isBlank, true);
    assert.ok(res.flags.includes('blank_frame'));
  });

  it('flags a blown frame (all white)', () => {
    const buf = Buffer.alloc(W * H * 3, 255);
    const res = analyzeRgbBuffer(buf, W, H);
    assert.equal(res.isBlown, true);
    assert.ok(res.flags.includes('blown_frame'));
  });

  it('flags content confined to one corner', () => {
    const buf = Buffer.alloc(W * H * 3, 10); // dark bg
    // Draw bright square in top-left (0..20, 0..20)
    for (let y = 5; y < 20; y++) {
      for (let x = 5; x < 20; x++) {
        const idx = (y * W + x) * 3;
        buf[idx] = 240;
        buf[idx + 1] = 240;
        buf[idx + 2] = 240;
      }
    }
    const res = analyzeRgbBuffer(buf, W, H);
    assert.equal(res.isCornerConfined, true);
    assert.ok(res.flags.includes('corner_confined'));
  });

  it('passes normal centered framed content', () => {
    const buf = Buffer.alloc(W * H * 3, 20); // dark bg
    // Draw centered circle/box (30..70, 30..70)
    for (let y = 30; y < 70; y++) {
      for (let x = 30; x < 70; x++) {
        const idx = (y * W + x) * 3;
        buf[idx] = 180;
        buf[idx + 1] = 220;
        buf[idx + 2] = 250;
      }
    }
    const res = analyzeRgbBuffer(buf, W, H);
    assert.equal(res.isBlank, false);
    assert.equal(res.isBlown, false);
    assert.equal(res.isCornerConfined, false);
    assert.equal(res.flags.length, 0);
  });
});


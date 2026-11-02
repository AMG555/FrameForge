'use strict';
/**
 * AudioMixer unit tests
 *
 * FFmpeg calls require actual media files, so we test:
 *  1. Constructor / configuration
 *  2. detectPauses — returns [] gracefully for a non-existent file
 *  3. mixWithDucking / mixVideo — throw for missing input files rather than silently failing
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('fs');
const os     = require('os');
const path   = require('path');

const { AudioMixer } = require('./mixer');

describe('AudioMixer instantiation', () => {
  it('creates an instance with default filesDir', () => {
    const mixer = new AudioMixer();
    assert.ok(mixer.filesDir);
    assert.equal(typeof mixer.filesDir, 'string');
  });

  it('accepts a custom filesDir', () => {
    const mixer = new AudioMixer({ filesDir: '/tmp/audio-test' });
    assert.equal(mixer.filesDir, '/tmp/audio-test');
  });
});

describe('AudioMixer.detectPauses', () => {
  it('returns an empty array for a non-existent audio file', () => {
    const mixer  = new AudioMixer();
    const pauses = mixer.detectPauses('/tmp/__nonexistent_audio_mixer_test.mp3');
    assert.ok(Array.isArray(pauses));
    assert.equal(pauses.length, 0);
  });

  it('returns an array (possibly empty) without throwing', () => {
    const mixer = new AudioMixer();
    assert.doesNotThrow(() => mixer.detectPauses('/tmp/__no_audio_file.m4a'));
  });
});

describe('AudioMixer.mixWithDucking — no music path', () => {
  it('falls through to _normaliseVoice when musicPath is null', () => {
    const mixer = new AudioMixer();
    // No music → calls _normaliseVoice which calls ffmpeg; file missing → throws
    assert.throws(
      () => mixer.mixWithDucking({
        voicePath:  '/tmp/__no_voice.m4a',
        musicPath:  null,
        outputPath: '/tmp/__out_mixer_test.m4a',
      }),
      (err) => err instanceof Error
    );
  });

  it('falls through to _normaliseVoice when music file is < 5 KB', () => {
    const mixer    = new AudioMixer();
    const tmpMusic = path.join(os.tmpdir(), '__tiny_music_frameforge.mp3');
    fs.writeFileSync(tmpMusic, Buffer.alloc(100)); // 100 bytes < 5000
    try {
      assert.throws(
        () => mixer.mixWithDucking({
          voicePath:  '/tmp/__no_voice.m4a',
          musicPath:  tmpMusic,
          outputPath: '/tmp/__out_mixer_test2.m4a',
        }),
        (err) => err instanceof Error
      );
    } finally {
      fs.unlinkSync(tmpMusic);
    }
  });
});

describe('AudioMixer.mixWithDucking — with music', () => {
  it('attempts sidechain mix when music file is big enough and throws (no real media)', () => {
    const mixer    = new AudioMixer();
    const tmpMusic = path.join(os.tmpdir(), '__big_music_frameforge.mp3');
    fs.writeFileSync(tmpMusic, Buffer.alloc(6000)); // > 5000 bytes
    try {
      assert.throws(
        () => mixer.mixWithDucking({
          voicePath:  '/tmp/__no_voice.m4a',
          musicPath:  tmpMusic,
          outputPath: '/tmp/__out_sidechain.m4a',
        }),
        (err) => err instanceof Error
      );
    } finally {
      fs.unlinkSync(tmpMusic);
    }
  });
});

describe('AudioMixer.mixVideo', () => {
  it('throws for non-existent video input (no music)', () => {
    const mixer = new AudioMixer();
    assert.throws(
      () => mixer.mixVideo({
        videoPath:  '/tmp/__no_video_frameforge.mp4',
        outputPath: '/tmp/__out_video_mixer.mp4',
      }),
      (err) => err instanceof Error
    );
  });

  it('throws for non-existent video input (with music path)', () => {
    const mixer = new AudioMixer();
    assert.throws(
      () => mixer.mixVideo({
        videoPath:  '/tmp/__no_video_frameforge.mp4',
        musicPath:  '/tmp/__no_music_frameforge.mp3',
        outputPath: '/tmp/__out_video_music.mp4',
      }),
      (err) => err instanceof Error
    );
  });
});

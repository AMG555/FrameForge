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

describe('AudioMixer._getVideoDuration', () => {
  it('returns 0 for a non-existent file', () => {
    const mixer = new AudioMixer();
    const dur   = mixer._getVideoDuration('/tmp/__no_video_duration_test.mp4');
    assert.equal(dur, 0);
  });

  it('returns 0 for a dummy non-video buffer file', () => {
    const tmpFile = path.join(os.tmpdir(), '__duration_dummy_frameforge.mp4');
    fs.writeFileSync(tmpFile, Buffer.alloc(1024));
    try {
      const mixer = new AudioMixer();
      const dur   = mixer._getVideoDuration(tmpFile);
      assert.equal(dur, 0, 'Non-MP4 dummy file should return 0 duration');
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });
});

describe('AudioMixer — Earshot Forge DSP primitives', () => {
  it('forgeModalResonator returns a valid ffmpeg equalizer filter string', () => {
    const mixer = new AudioMixer();
    const filter = mixer.forgeModalResonator(200, 6, 2);
    assert.ok(filter.startsWith('equalizer='), `Expected equalizer filter, got: ${filter}`);
    assert.ok(filter.includes('f=200'), 'Must include frequency');
    assert.ok(filter.includes('g=2'), 'Must include gain');
    assert.ok(filter.includes('width_type=q'), 'Must include Q width type');
  });

  it('forgeModalResonator uses default params without throwing', () => {
    const mixer = new AudioMixer();
    assert.doesNotThrow(() => {
      const f = mixer.forgeModalResonator();
      assert.equal(typeof f, 'string');
    });
  });

  it('forgeSVFilter lp returns lowpass filter', () => {
    const mixer = new AudioMixer();
    const f = mixer.forgeSVFilter('lp', 1000, 0.707);
    assert.ok(f.includes('lowpass'), `Expected lowpass, got: ${f}`);
    assert.ok(f.includes('f=1000'), 'Must include cutoff freq');
  });

  it('forgeSVFilter hp returns highpass filter', () => {
    const mixer = new AudioMixer();
    const f = mixer.forgeSVFilter('hp', 80, 0.5);
    assert.ok(f.includes('highpass'), `Expected highpass, got: ${f}`);
  });

  it('forgeSVFilter bp returns bandpass filter', () => {
    const mixer = new AudioMixer();
    const f = mixer.forgeSVFilter('bp', 500, 2);
    assert.ok(f.includes('bandpass'), `Expected bandpass, got: ${f}`);
  });

  it('forgeSVFilter notch returns deep notch equalizer', () => {
    const mixer = new AudioMixer();
    const f = mixer.forgeSVFilter('notch', 300, 4);
    assert.ok(f.includes('equalizer'), `Expected equalizer for notch, got: ${f}`);
    assert.ok(f.includes('g=-24'), 'Notch must cut 24dB');
  });

  it('forgeComputedRoom returns aecho filter string with three delay/decay pairs', () => {
    const mixer = new AudioMixer();
    const f = mixer.forgeComputedRoom(8, 0.5, 15);
    assert.ok(f.startsWith('aecho='), `Expected aecho filter, got: ${f}`);
    assert.ok(f.includes('in_gain='), 'Must include in_gain');
    assert.ok(f.includes('out_gain='), 'Must include out_gain');
    assert.ok(f.includes('delays='), 'Must include delays');
    assert.ok(f.includes('decays='), 'Must include decays');
    // Three delay/decay pairs: two pipe separators
    const delayPart = f.match(/delays=([^:]+)/)?.[1] || '';
    assert.equal((delayPart.match(/\|/g) || []).length, 2, 'Must have 3 delay values (2 pipes)');
  });

  it('forgeComputedRoom clamps rt60 to minimum 0.05s for small rooms', () => {
    const mixer = new AudioMixer();
    // Very small dry room (2m, 0.99 damp) — rt60 should not be negative
    const f = mixer.forgeComputedRoom(2, 0.99, 5);
    assert.ok(f.startsWith('aecho='), 'Should still produce valid aecho');
    assert.ok(!f.includes('NaN'), 'No NaN values in filter');
  });

  it('forgeKitSoundBank maps air+entrance to whoosh', () => {
    const mixer = new AudioMixer();
    assert.equal(mixer.forgeKitSoundBank('air', 'entrance'), 'whoosh');
  });

  it('forgeKitSoundBank maps wood+beat to punch', () => {
    const mixer = new AudioMixer();
    assert.equal(mixer.forgeKitSoundBank('wood', 'beat'), 'punch');
  });

  it('forgeKitSoundBank maps glass+accent to sparkle', () => {
    const mixer = new AudioMixer();
    assert.equal(mixer.forgeKitSoundBank('glass', 'accent'), 'sparkle');
  });

  it('forgeKitSoundBank maps sub+entrance to deep_boom', () => {
    const mixer = new AudioMixer();
    assert.equal(mixer.forgeKitSoundBank('sub', 'entrance'), 'deep_boom');
  });

  it('forgeKitSoundBank maps bubble+entrance to pop', () => {
    const mixer = new AudioMixer();
    assert.equal(mixer.forgeKitSoundBank('bubble', 'entrance'), 'pop');
  });

  it('forgeKitSoundBank falls back to air kit (whoosh) for unknown material', () => {
    const mixer = new AudioMixer();
    // Unknown materials default to kitMap.air; air.entrance = 'whoosh'
    assert.equal(mixer.forgeKitSoundBank('titanium', 'entrance'), 'whoosh');
  });

  it('computed: room string is accepted by _buildVoiceChainFilter without throwing', () => {
    const mixer = new AudioMixer();
    // Should produce a filter string containing aecho (computed room)
    assert.doesNotThrow(() => {
      const chain = mixer._buildVoiceChainFilter(false, 'computed:8:0.5:15', false);
      assert.equal(typeof chain, 'string');
      assert.ok(chain.length > 0);
    });
  });
});

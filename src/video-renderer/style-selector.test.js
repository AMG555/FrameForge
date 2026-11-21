'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseDiscourse,
  analyzeProsody,
  calculateAdjacencyScore,
  scoreStyleCandidate,
  verifyStyleContrastAndSafeZone,
  selectOptimalSceneStyle,
  assignOptimalStylesToScenes,
} = require('./style-selector');

describe('Analytic Style Selector — 5-Layer Intelligence', () => {

  describe('Layer 1: Discourse Parsing & Cognitive Load', () => {
    it('classifies opening curiosity question as hook', () => {
      const scene = { narration: 'What if everything you knew about space travel was completely wrong?' };
      const parsed = parseDiscourse(scene, 0, 5);
      assert.equal(parsed.discourseRole, 'hook');
      assert.ok(parsed.confidence >= 0.5);
    });

    it('classifies numeric percentage and metrics as evidence_metric', () => {
      const scene = { narration: 'Over 84% of startups fail within their first three years due to cash depletion.' };
      const parsed = parseDiscourse(scene, 2, 5);
      assert.equal(parsed.discourseRole, 'evidence_metric');
    });

    it('classifies comparison and trade-offs as contrast_dilemma', () => {
      const scene = { narration: 'Compare that versus modern lithium battery storage, however, and the difference is obvious.' };
      const parsed = parseDiscourse(scene, 3, 6);
      assert.equal(parsed.discourseRole, 'contrast_dilemma');
    });

    it('classifies step-by-step logic as mechanism_process', () => {
      const scene = { narration: 'Here is how the algorithm works: step 1 compiles the syntax tree, then executes.' };
      const parsed = parseDiscourse(scene, 2, 5);
      assert.equal(parsed.discourseRole, 'mechanism_process');
    });

    it('classifies final takeaway as climax_resolution', () => {
      const scene = { narration: 'The key takeaway: start small today and subscribe for part two.' };
      const parsed = parseDiscourse(scene, 4, 5);
      assert.equal(parsed.discourseRole, 'climax_resolution');
    });

    it('computes higher cognitive load for dense technical jargon and formulas', () => {
      const complexScene = { narration: 'The asynchronous cryptographic algorithm evaluates stochastic quantum matrix equilibrium.' };
      const simpleScene = { narration: 'This makes life much easier.' };
      const complexParsed = parseDiscourse(complexScene, 1, 4);
      const simpleParsed = parseDiscourse(simpleScene, 1, 4);
      assert.ok(complexParsed.cognitiveLoad > simpleParsed.cognitiveLoad);
    });
  });

  describe('Layer 2: Prosody & Waveform Coupling', () => {
    it('detects staccato fast speech rate above 145 WPM', () => {
      // 30 words in 10 seconds = 180 WPM
      const narration = 'One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twenty-one twenty-two twenty-three twenty-four twenty-five twenty-six twenty-seven twenty-eight twenty-nine thirty';
      const prosody = analyzeProsody({ narration, duration: 10, musicMood: 'energetic' });
      assert.equal(prosody.tempoCategory, 'staccato_fast');
      assert.ok(prosody.wpm >= 145);
      assert.ok(prosody.energyScore >= 0.7);
    });

    it('detects measured slow speech rate below 110 WPM', () => {
      // 10 words in 10 seconds = 60 WPM
      const narration = 'In the quiet depth of ancient forests, time stops.';
      const prosody = analyzeProsody({ narration, duration: 10, musicMood: 'calm' });
      assert.equal(prosody.tempoCategory, 'measured_slow');
      assert.ok(prosody.wpm <= 110);
      assert.ok(prosody.energyScore <= 0.4);
    });
  });

  describe('Layer 3: Style Adjacency Transition Graph', () => {
    it('imposes severe penalty on consecutive identical styles', () => {
      const penalty = calculateAdjacencyScore('clean-tech', 'clean-tech', 'claim');
      assert.ok(penalty < -20);
    });

    it('rewards complementary transition from kinetic hook to data story', () => {
      const bonus = calculateAdjacencyScore('creator-motion', 'data-story', 'evidence_metric');
      assert.ok(bonus >= 15);
    });
  });

  describe('Layer 4: 3-Perspective Scoring Tournament', () => {
    it('favors data-story and chart styles for evidence_metric discourse', () => {
      const context = {
        discourseRole: 'evidence_metric',
        cognitiveLoad: 0.6,
        prosody: { energyScore: 0.5, wpm: 125 },
        orientation: 'landscape',
        prevStyle: 'creator-motion',
      };
      const dataScore = scoreStyleCandidate('data-story', context);
      const doodleScore = scoreStyleCandidate('pop-info', context);
      assert.ok(dataScore.totalScore > doodleScore.totalScore);
    });

    it('favors clean-tech over noisy styles when cognitive load is high', () => {
      const context = {
        discourseRole: 'claim',
        cognitiveLoad: 0.85,
        prosody: { energyScore: 0.5, wpm: 120 },
        orientation: 'landscape',
        prevStyle: 'creator-motion',
      };
      const cleanScore = scoreStyleCandidate('clean-tech', context);
      assert.ok(cleanScore.architectScore >= 80);
    });
  });

  describe('Layer 5: Closed-Loop Contrast & Safe-Zone QC', () => {
    it('flags low contrast risk styles', () => {
      const check = verifyStyleContrastAndSafeZone('white-model', 'landscape');
      assert.equal(check.passed, false);
      assert.ok(check.reason.includes('Contrast'));
    });

    it('flags horizontal-only tickers in 9:16 portrait viewport', () => {
      const check = verifyStyleContrastAndSafeZone('market-tape', 'portrait');
      assert.equal(check.passed, false);
      assert.ok(check.reason.includes('Safe-zone'));
    });

    it('passes high-contrast responsive styles', () => {
      const checkLandscape = verifyStyleContrastAndSafeZone('creator-motion', 'landscape');
      const checkPortrait = verifyStyleContrastAndSafeZone('swiss-grid', 'portrait');
      assert.equal(checkLandscape.passed, true);
      assert.equal(checkPortrait.passed, true);
    });
  });

  describe('End-to-End Style Assignment across Full Script', () => {
    it('assigns dynamic non-monotonous styles matching narrative roles across scenes', () => {
      const scenes = [
        { narration: 'Did you know 90% of all data was created in the last two years?' }, // Hook
        { narration: 'Every day humanity produces 2.5 quintillion bytes of information.' }, // Evidence
        { narration: 'Traditional hard drives struggle compared against distributed cloud clusters.' }, // Contrast
        { narration: 'Here is how edge data routing functions under the hood.' }, // Mechanism
        { narration: 'Ultimately, decentralized networks will power tomorrow. Start building now.' }, // Climax
      ];

      const assigned = assignOptimalStylesToScenes(scenes, { orientation: 'landscape', topic: 'Big Data' });

      assert.equal(assigned.length, 5);
      // All scenes must have a style string
      for (const s of assigned) {
        assert.ok(typeof s.style === 'string' && s.style.length > 0);
        assert.ok(s._style_analytics);
      }

      // Check that at least 3 distinct styles are used (dynamic rule enforcement)
      const uniqueStyles = new Set(assigned.map(s => s.style));
      assert.ok(uniqueStyles.size >= 3, `Expected >= 3 unique styles, got ${uniqueStyles.size}: ${[...uniqueStyles].join(', ')}`);

      // Opening scene should get a high-retention hook style
      assert.ok(['creator-motion', 'headline-backdrop', 'punch-captions', 'aurora-glass'].includes(assigned[0].style));
    });

    it('preserves user explicit scene styles when specified', () => {
      const scenes = [
        { narration: 'Intro scene', style: 'custom-explicit-style' },
        { narration: 'Second scene without style' },
      ];
      const assigned = assignOptimalStylesToScenes(scenes);
      assert.equal(assigned[0].style, 'custom-explicit-style');
      assert.ok(assigned[1].style !== 'custom-explicit-style');
    });
  });
});

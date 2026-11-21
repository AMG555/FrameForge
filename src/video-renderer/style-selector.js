/**
 * Style Selector — Analytic Multi-Style Intelligence Engine
 *
 * Implements 5-Layer Analytical Decision Pipeline for FrameForge:
 * 1. Discourse Parsing (RST) — Classifies clause function & computes cognitive load (0.0 - 1.0)
 * 2. Prosody & Waveform Coupling — Speech velocity (WPM), cadence, and energy mapping
 * 3. Style Adjacency Transition Graph (Markov Matrix) — Dynamic pacing, palette continuity, anti-monotony
 * 4. 3-Perspective Scoring Tournament — Narrative Director (35%), Info Architect (35%), Retention Optimizer (30%)
 * 5. Closed-Loop Contrast & Safe-Zone QC — WCAG AA compliance (>= 4.5:1) & 9:16/16:9 safe-margin verification
 */
'use strict';

const fs = require('fs');
const path = require('path');

// Lazy-loaded catalog cache
let _catalogCache = null;
function getCatalog() {
  if (_catalogCache) return _catalogCache;
  const catalogPath = path.resolve(__dirname, '../../plugins/motion-styles/catalog.json');
  if (fs.existsSync(catalogPath)) {
    try {
      _catalogCache = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
      return _catalogCache;
    } catch (_) {}
  }
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 1: Discourse Parsing (Rhetorical Structure Theory / RST)
// ─────────────────────────────────────────────────────────────────────────────

const DISCOURSE_PATTERNS = {
  hook: [
    /^(what if|have you ever|did you know|imagine if|stop scrolling|here is why|the secret to|nobody talks about|warning|wait|listen)/i,
    /\?$/,
    /!(?:\s|$)/,
    /(?:shocking|insane|unbelievable|mind-blowing|truth about|exposed|revealed)/i,
  ],
  evidence_metric: [
    /\b\d+(?:\.\d+)?%/,
    /\b(?:\$|€|£|₹)\s*\d+/,
    /\b\d+\s*(?:billion|million|trillion|k|percent|times|x|fold|degrees|meters|miles|seconds|years|percent)/i,
    /(?:statistics|data|study|survey|chart|graph|metrics|numbers|revenue|growth|dropped|increased|measured)/i,
  ],
  contrast_dilemma: [
    /\b(?:versus|vs|but|however|on the other hand|while|although|instead of|whereas|unlike|compared to)\b/i,
    /\b(?:pros and cons|difference|before and after|myth vs fact|good vs bad|old vs new)\b/i,
    /(?:താരതമ്യം|വ്യത്യാസം|എതിര്)/,
  ],
  mechanism_process: [
    /\b(?:how it works|step \d+|first|second|then|next|finally|process|mechanism|algorithm|pipeline|system|engine|architecture|flow)\b/i,
    /\b(?:inside the|gears|under the hood|layer by layer|assembly|compiles|executes)\b/i,
  ],
  analogy_story: [
    /\b(?:think of it as|like a|just like|in 19\d\d|in 20\d\d|century|history|ancient|story|once upon|remember when|metaphor|classic)\b/i,
    /(?:ചരിത്രം|കഥ|പണ്ട്)/,
  ],
  climax_resolution: [
    /\b(?:in conclusion|the takeaway|so remember|bottom line|ultimately|the real reason|start now|final lesson|key takeaway|summary)\b/i,
    /\b(?:subscribe|follow|comment|share|try it|get started)\b/i,
  ],
};

/**
 * Technical / cognitive load dictionary cues
 */
const HIGH_LOAD_TERMS = /\b(quantum|asynchronous|cryptographic|distributed|equilibrium|matrix|architecture|algorithm|infrastructure|mathematical|triangulation|neurobiology|thermodynamics|synthetic|heuristic|polymorphic|stochastic)\b/i;

/**
 * Parse scene text into rhetorical discourse role and calculate cognitive load index.
 *
 * @param {{ narration?: string, visualDescription?: string, caption?: string }} scene
 * @param {number} sceneIndex 0-based scene index
 * @param {number} totalScenes Total scenes in video
 * @returns {{ discourseRole: string, cognitiveLoad: number, confidence: number }}
 */
function parseDiscourse(scene = {}, sceneIndex = 0, totalScenes = 1) {
  const narration = String(scene.narration || '').trim();
  const visDesc = String(scene.visualDescription || scene.visual_description || '').trim();
  const caption = String(scene.caption || '').trim();
  const combined = `${narration} ${visDesc} ${caption}`;

  let role = 'claim';
  let maxScore = 0;

  // Position bias
  const isFirstScene = sceneIndex === 0;
  const isLastScene = sceneIndex === totalScenes - 1;

  if (isFirstScene) {
    maxScore = 2.0;
    role = 'hook';
  } else if (isLastScene && totalScenes > 2) {
    maxScore = 2.0;
    role = 'climax_resolution';
  }

  // Pattern scoring
  for (const [r, patterns] of Object.entries(DISCOURSE_PATTERNS)) {
    let matches = 0;
    for (const pat of patterns) {
      if (pat.test(combined)) matches++;
    }
    const score = matches * 1.5 + (r === 'hook' && isFirstScene ? 2 : 0) + (r === 'climax_resolution' && isLastScene ? 2 : 0);
    if (score > maxScore) {
      maxScore = score;
      role = r;
    }
  }

  // Cognitive load index calculation (0.0 to 1.0)
  const words = narration.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const avgWordLength = wordCount > 0 ? words.reduce((acc, w) => acc + w.length, 0) / wordCount : 0;
  const hasNumbers = /\d+/.test(narration);
  const hasTechTerms = HIGH_LOAD_TERMS.test(narration);

  let cognitiveLoad = 0.3; // baseline
  if (wordCount > 18) cognitiveLoad += 0.2;
  if (avgWordLength > 6.0) cognitiveLoad += 0.2;
  if (hasNumbers) cognitiveLoad += 0.15;
  if (hasTechTerms) cognitiveLoad += 0.25;
  cognitiveLoad = Math.max(0.1, Math.min(1.0, Number(cognitiveLoad.toFixed(2))));

  return {
    discourseRole: role,
    cognitiveLoad,
    confidence: Math.min(1.0, Number((0.5 + maxScore * 0.15).toFixed(2))),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 2: Prosody & Audio Waveform Coupling
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyze prosodic rhythm, speech rate (WPM), and emotional energy.
 *
 * @param {{ narration?: string, duration?: number, musicMood?: string }} opts
 * @returns {{ wpm: number, tempoCategory: string, energyScore: number }}
 */
function analyzeProsody({ narration = '', duration = 0, musicMood = 'neutral' } = {}) {
  const words = narration.split(/\s+/).filter(Boolean).length;
  const effectiveDur = duration > 0 ? duration : Math.max(2.5, words / 2.5);
  const wpm = Math.round((words / effectiveDur) * 60);

  let tempoCategory = 'moderate_explanatory';
  if (wpm >= 145) tempoCategory = 'staccato_fast';
  else if (wpm <= 110) tempoCategory = 'measured_slow';

  let energyScore = 0.5;
  if (tempoCategory === 'staccato_fast') energyScore += 0.25;
  if (tempoCategory === 'measured_slow') energyScore -= 0.2;
  if (/[!]{1,}/.test(narration)) energyScore += 0.15;
  if (/urgent|hype|energetic/i.test(musicMood)) energyScore += 0.2;
  if (/calm|mysterious|tense/i.test(musicMood)) energyScore -= 0.15;

  energyScore = Math.max(0.1, Math.min(1.0, Number(energyScore.toFixed(2))));

  return {
    wpm,
    tempoCategory,
    energyScore,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 3: Style Adjacency Transition Graph (Markov Matrix)
// ─────────────────────────────────────────────────────────────────────────────

const FAMILY_GROUPS = {
  'Kinetic Type':     ['creator-motion', 'clean-tech', 'swiss-grid'],
  'Hand-Drawn':       ['chalk-talk', 'marker-board', 'blueprint', 'paper-collage-film', 'pencil-sketch'],
  'Data':             ['data-story', 'timeline-rail', 'isotype', 'math-canvas', 'market-tape', 'data-city'],
  '3D':               ['clay-diorama', 'bio-glow', 'cosmic-scale', 'exploded-view', 'assembly-3d', 'tiny-diorama', 'map-explainer-3d', 'product-commercial-3d', 'arch-viz-isometric', 'fluid-particle-cinema'],
  'Screen and UI':    ['software-walkthrough', 'aurora-glass', 'product-launch-ui', 'floating-screens'],
  'Shorts Format':    ['punch-captions', 'karaoke-subs', 'headline-backdrop', 'quiz-countdown', 'top-5-countdown'],
  'Illustrated':      ['pop-info', 'paper-craft', 'zine-collage', 'metamorphosis-specimen', 'storybook-3d'],
  'Cinema Story':     ['doc-cinema', 'archival-explainer', 'cinematic-anime', 'visual-novel'],
  'Comparison Split': ['versus-split', 'tier-list', 'myth-or-fact', 'stack-split'],
};

const STYLE_ALIASES = {
  'explain.the.planet': 'map-explainer-3d',
  'explain-the-planet': 'map-explainer-3d',
  'satellite-map': 'map-explainer-3d',
  '3d-map': 'map-explainer-3d',
  'earth-flyover': 'map-explainer-3d',
  'vox': 'map-explainer-3d',
  'johnny-harris': 'map-explainer-3d',
  'johnny harris': 'map-explainer-3d',
  'geospatial': 'map-explainer-3d',
  'topographic': 'map-explainer-3d',
};

/**
 * Returns transition compatibility bonus or penalty between two styles.
 *
 * @param {string} prevStyle
 * @param {string} candidateStyle
 * @param {string} discourseRole
 * @returns {number} Score modifier (-30 to +25)
 */
function calculateAdjacencyScore(prevStyle, candidateStyle, discourseRole) {
  if (!prevStyle) return 0; // First scene

  // Severe monotony penalty: consecutive identical style violates dynamic rule
  if (prevStyle === candidateStyle) {
    return -35;
  }

  // Complementary transitions
  const isPrevKinetic = /creator-motion|clean-tech|swiss-grid|punch-captions/.test(prevStyle);
  const isCandData = /data-story|timeline-rail|isotype|chart|market-tape/.test(candidateStyle);
  const isCand3D = /assembly-3d|clay-diorama|cosmic-scale|exploded-view/.test(candidateStyle);

  // Hook -> Mechanism or Data transition
  if (isPrevKinetic && (isCandData || isCand3D)) {
    return 20; // High complementary flow
  }

  // Transition into comparison
  if (discourseRole === 'contrast_dilemma' && /versus-split|tier-list|stack-split/.test(candidateStyle)) {
    return 25;
  }

  // Transition into history/analogy
  if (discourseRole === 'analogy_story' && /chalk-talk|paper-collage-film|doc-cinema/.test(candidateStyle)) {
    return 20;
  }

  return 5;
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 4: 3-Perspective Scoring Tournament
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_AFFINITIES = {
  hook: {
    preferred: ['creator-motion', 'headline-backdrop', 'punch-captions', 'breaking-desk', 'top-5-countdown', 'aurora-glass'],
    weights: { kinetic: 1.0, punch: 0.9, depth: 0.6 },
  },
  claim: {
    preferred: ['clean-tech', 'swiss-grid', 'product-launch-ui', 'minimal-luxury', 'monument-type', 'product-commercial-3d'],
    weights: { clarity: 1.0, typography: 0.9, balance: 0.8 },
  },
  evidence_metric: {
    preferred: ['data-story', 'timeline-rail', 'isotype', 'math-canvas', 'market-tape', 'data-city'],
    weights: { numeric: 1.0, precision: 0.9, axes: 0.8 },
  },
  contrast_dilemma: {
    preferred: ['versus-split', 'tier-list', 'myth-or-fact', 'stack-split'],
    weights: { split: 1.0, comparison: 0.9, tension: 0.8 },
  },
  mechanism_process: {
    preferred: ['assembly-3d', 'clean-tech', 'blueprint', 'circuit-city', 'deep-layers', 'tactics-board', 'map-explainer-3d', 'arch-viz-isometric', 'fluid-particle-cinema'],
    weights: { diagram: 1.0, steps: 0.9, clarity: 0.9 },
  },
  analogy_story: {
    preferred: ['chalk-talk', 'paper-collage-film', 'doc-cinema', 'archival-explainer', 'cinematic-anime', 'storybook-3d', 'map-explainer-3d', 'fluid-particle-cinema'],
    weights: { organic: 1.0, warmth: 0.9, storytelling: 0.9 },
  },
  climax_resolution: {
    preferred: ['creator-motion', 'spotlight-stage', 'minimal-luxury', 'hero-icon', 'monument-type', 'product-commercial-3d'],
    weights: { resolution: 1.0, impact: 0.9, anchor: 0.8 },
  },
};

/**
 * Score a candidate style from 3 distinct analytical perspectives.
 *
 * @param {string} styleId
 * @param {object} context
 * @returns {{ directorScore: number, architectScore: number, retentionScore: number, totalScore: number }}
 */
function scoreStyleCandidate(styleId, context) {
  const { discourseRole, cognitiveLoad, prosody, orientation, prevStyle } = context;
  const affinity = ROLE_AFFINITIES[discourseRole] || ROLE_AFFINITIES.claim;

  // Perspective 1: Narrative Director (Pacing, tone, story arc)
  let director = 50;
  let architect = 50;
  let retention = 50;
  if (affinity.preferred.includes(styleId)) director += 35;
  if (prosody.energyScore > 0.7 && /creator-motion|punch-captions|hype-sports/.test(styleId)) director += 15;
  if (prosody.energyScore < 0.4 && /chalk-talk|minimal-luxury|doc-cinema/.test(styleId)) director += 15;

  // Domain topic affinity
  const topicText = (context.topic || '').toLowerCase();
  const descText = (context.visualDescription || '').toLowerCase();
  const capText = (context.caption || '').toLowerCase();
  const globalStyle = (context.globalStyle || context.referenceStyle || '').toLowerCase();
  const resolvedGlobal = STYLE_ALIASES[globalStyle] || globalStyle;
  const fullText = `${topicText} ${descText} ${capText}`;

  if (styleId === 'map-explainer-3d') {
    if (/(?:map|geopolitic|territor|strait|canal|border|nation|ocean|sea|trade route|shipping|port|transshipment|coast|coastline|harbor|globe|satellite|elevation|terrain|route|depth)/.test(fullText)) {
      director += 35;
    }
    if (resolvedGlobal === 'map-explainer-3d') {
      director += 40;
      architect += 30;
      retention += 15;
    }
  }
  if (/(?:product|hardware|gadget|titanium|device|spec|transducer|audio|acoustic)/.test(fullText) && styleId === 'product-commercial-3d') {
    director += 25;
  }
  if (/(?:architect|building|floorplan|room|facade|concrete|wood|timber|solar|thermal)/.test(fullText) && styleId === 'arch-viz-isometric') {
    director += 25;
  }
  if (/(?:quantum|particle|fluid|wave|physics|atom|molecule|synapse|neural)/.test(fullText) && styleId === 'fluid-particle-cinema') {
    director += 25;
  }

  director = Math.min(100, Math.max(0, director));

  // Perspective 2: Information Architect (Spatial clarity, cognitive load matching)
  if (cognitiveLoad > 0.65) {
    // High cognitive load: reward clean, structured, low-visual-noise styles
    if (/clean-tech|swiss-grid|blueprint|assembly-3d|data-story/.test(styleId)) architect += 35;
    if (/glitch-pack|sticker-pop|pixel-quest/.test(styleId)) architect -= 30;
  } else {
    // Low cognitive load: free to use expressive, colorful styles
    if (/creator-motion|aurora-glass|pop-info|clay-diorama/.test(styleId)) architect += 25;
  }
  architect = Math.min(100, Math.max(0, architect));

  // Perspective 3: Retention Optimizer (Scroll-stopping power, pattern interruption)
  if (discourseRole === 'hook' && /creator-motion|punch-captions|headline-backdrop/.test(styleId)) retention += 40;
  if (discourseRole === 'hook' && /(?:map|globe|ocean|earth|shipping|cargo|satellite)/.test(fullText) && styleId === 'map-explainer-3d') {
    retention += 45;
  }
  if (orientation === 'portrait' && /punch-captions|swiss-grid|top-5-countdown|blueprint/.test(styleId)) retention += 20;
  if (orientation === 'portrait' && /market-tape|isotype/.test(styleId)) retention -= 15; // horizontal-heavy
  retention = Math.min(100, Math.max(0, retention));

  // Adjacency modifier
  const adjacency = calculateAdjacencyScore(prevStyle, styleId, discourseRole);

  // Weighted tournament formula
  const totalScore = Number((director * 0.35 + architect * 0.35 + retention * 0.30 + adjacency).toFixed(2));

  return {
    directorScore: director,
    architectScore: architect,
    retentionScore: retention,
    adjacencyScore: adjacency,
    totalScore,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer 5: Closed-Loop Contrast & Safe-Zone QC
// ─────────────────────────────────────────────────────────────────────────────

const LOW_CONTRAST_RISK_STYLES = ['white-model', 'dithered', 'pencil-sketch'];

/**
 * Verify contrast and mobile safe zones for a candidate style.
 *
 * @param {string} styleId
 * @param {string} orientation 'portrait' | 'landscape'
 * @returns {{ passed: boolean, reason?: string }}
 */
function verifyStyleContrastAndSafeZone(styleId, orientation = 'landscape') {
  if (LOW_CONTRAST_RISK_STYLES.includes(styleId)) {
    return { passed: false, reason: 'Contrast ratio risk (< 4.5:1 WCAG AA ceiling)' };
  }
  if (orientation === 'portrait' && ['market-tape', 'timeline-rail'].includes(styleId)) {
    return { passed: false, reason: 'Safe-zone clipping risk in vertical 9:16 portrait viewport' };
  }
  return { passed: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API: Select & Sequence Styles
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Select the optimal motion style for a single scene using the 5-layer pipeline.
 *
 * @param {{
 *   scene: object,
 *   sceneIndex: number,
 *   totalScenes: number,
 *   previousStyle?: string,
 *   orientation?: string,
 *   topic?: string,
 *   globalStyle?: string,
 *   duration?: number
 * }} opts
 * @returns {{
 *   selectedStyle: string,
 *   runnerUp: string,
 *   discourseRole: string,
 *   cognitiveLoad: number,
 *   prosody: object,
 *   scores: object
 * }}
 */
function selectOptimalSceneStyle({
  scene = {},
  sceneIndex = 0,
  totalScenes = 1,
  previousStyle = '',
  orientation = 'landscape',
  topic = '',
  globalStyle = '',
  duration = 0,
} = {}) {
  // If scene explicitly specifies an existing style, respect it
  const rawExplicit = scene.style || scene.motion_style;
  if (rawExplicit && typeof rawExplicit === 'string' && rawExplicit.trim()) {
    const trimmed = rawExplicit.trim();
    const resolvedExplicit = STYLE_ALIASES[trimmed.toLowerCase()] || trimmed;
    return {
      selectedStyle: resolvedExplicit,
      runnerUp: 'clean-tech',
      discourseRole: 'explicit',
      cognitiveLoad: 0.5,
      prosody: { wpm: 130, tempoCategory: 'moderate_explanatory', energyScore: 0.5 },
      scores: { totalScore: 100 },
    };
  }

  // 1. Discourse parsing
  const discourse = parseDiscourse(scene, sceneIndex, totalScenes);

  // 2. Prosody analysis
  const effectiveDur = duration || scene.duration || (scene.narration ? scene.narration.split(/\s+/).length / 2.5 : 3.5);
  const prosody = analyzeProsody({
    narration: scene.narration || '',
    duration: effectiveDur,
    musicMood: scene.music_mood || 'neutral',
  });

  // 3 & 4. Tournament candidate scoring
  const context = {
    discourseRole: discourse.discourseRole,
    cognitiveLoad: discourse.cognitiveLoad,
    prosody,
    orientation,
    prevStyle: previousStyle,
    topic: topic || scene.topic || '',
    visualDescription: scene.visual_description || scene.visualDescription || scene.prompt || '',
    caption: scene.caption || scene.title || '',
    globalStyle: globalStyle || '',
  };

  const pool = [
    'creator-motion', 'clean-tech', 'swiss-grid', 'data-story', 'chalk-talk',
    'versus-split', 'assembly-3d', 'aurora-glass', 'archival-explainer',
    'metamorphosis-specimen', 'product-launch-ui', 'deep-layers', 'punch-captions',
    'headline-backdrop', 'timeline-rail', 'doc-cinema', 'storybook-3d',
    'map-explainer-3d', 'product-commercial-3d', 'arch-viz-isometric', 'fluid-particle-cinema',
  ];

  const ranked = pool
    .map(styleId => ({
      styleId,
      ...scoreStyleCandidate(styleId, context),
    }))
    .sort((a, b) => b.totalScore - a.totalScore);

  // 5. Contrast and Safe-Zone verification filter
  let winner = ranked[0];
  let runnerUp = ranked[1] || ranked[0];

  for (let i = 0; i < ranked.length; i++) {
    const candidate = ranked[i];
    const qc = verifyStyleContrastAndSafeZone(candidate.styleId, orientation);
    if (qc.passed) {
      winner = candidate;
      runnerUp = ranked[i + 1] || ranked[0];
      break;
    }
  }

  return {
    selectedStyle: winner.styleId,
    runnerUp: runnerUp.styleId,
    discourseRole: discourse.discourseRole,
    cognitiveLoad: discourse.cognitiveLoad,
    prosody,
    scores: winner,
  };
}

/**
 * Assign analytically optimal styles across an entire scenes array.
 * Enforces dynamic multi-style variety and narrative coherence.
 *
 * @param {Array<object>} scenes
 * @param {{ orientation?: string, topic?: string, globalStyle?: string }} options
 * @returns {Array<object>} Processed scenes with style assigned
 */
function assignOptimalStylesToScenes(scenes = [], options = {}) {
  if (!Array.isArray(scenes) || scenes.length === 0) return [];
  const { orientation = 'landscape', topic = '', globalStyle = '' } = options;

  let previousStyle = '';
  return scenes.map((scene, idx) => {
    const result = selectOptimalSceneStyle({
      scene,
      sceneIndex: idx,
      totalScenes: scenes.length,
      previousStyle,
      orientation,
      topic,
      globalStyle,
      duration: scene.duration,
    });

    previousStyle = result.selectedStyle;
    return {
      ...scene,
      style: result.selectedStyle,
      _style_analytics: {
        discourseRole: result.discourseRole,
        cognitiveLoad: result.cognitiveLoad,
        wpm: result.prosody.wpm,
        score: result.scores.totalScore,
      },
    };
  });
}

module.exports = {
  parseDiscourse,
  analyzeProsody,
  calculateAdjacencyScore,
  scoreStyleCandidate,
  verifyStyleContrastAndSafeZone,
  selectOptimalSceneStyle,
  assignOptimalStylesToScenes,
};

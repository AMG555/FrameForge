'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  generateSceneHtml,
  wrapCodeInHarnessHtml,
  detectAesthetic,
  detectComponentTheme,
  detectCaptionsRequested,
  getScriptFontStack,
  AESTHETICS,
  REGIONAL_FONTS,
} = require('./scene-animator');

describe('scene-animator detectAesthetic', () => {
  it('detects cinematic_documentary for history and cultural topics', () => {
    assert.equal(detectAesthetic({ topic: 'Ancient temples and history of Kerala' }), 'cinematic_documentary');
    assert.equal(detectAesthetic({ style: 'documentary' }), 'cinematic_documentary');
  });

  it('detects finance_executive for market and crypto topics', () => {
    assert.equal(detectAesthetic({ topic: 'Stock market investing and bitcoin trading' }), 'finance_executive');
    assert.equal(detectAesthetic({ style: 'financial' }), 'finance_executive');
  });

  it('detects cyber_tech for coding, AI, and developer tools', () => {
    assert.equal(detectAesthetic({ topic: 'Python compiler and neural network architecture' }), 'cyber_tech');
    assert.equal(detectAesthetic({ style: 'cyberpunk' }), 'cyber_tech');
  });

  it('detects retro_synthwave for 80s, arcade, and synthwave keywords', () => {
    assert.equal(detectAesthetic({ topic: '80s arcade neon nights retrowave' }), 'retro_synthwave');
  });

  it('detects nature_organic for biology and environmental topics', () => {
    assert.equal(detectAesthetic({ topic: 'Forest wildlife and climate conservation' }), 'nature_organic');
  });

  it('detects hype_sports for fitness and action topics', () => {
    assert.equal(detectAesthetic({ topic: 'Extreme sports championship speed workout' }), 'hype_sports');
  });

  it('detects minimal_luxury for premium architectural design', () => {
    assert.equal(detectAesthetic({ topic: 'Modern luxury architectural minimalism' }), 'minimal_luxury');
  });

  it('detects breaking_news for urgent reports and alerts', () => {
    assert.equal(detectAesthetic({ topic: 'Breaking news urgent alert investigation' }), 'breaking_news');
  });

  it('detects cosmic_space for astronomy and quantum physics', () => {
    assert.equal(detectAesthetic({ topic: 'Deep space galaxy exploration and quantum universe' }), 'cosmic_space');
  });
});

describe('scene-animator getScriptFontStack', () => {
  it('resolves Malayalam font stack for Malayalam language or text', () => {
    const stack1 = getScriptFontStack('', 'ml');
    assert.ok(stack1.includes('Noto Sans Malayalam'));
    assert.ok(stack1.includes('Nirmala UI'));

    const stack2 = getScriptFontStack('കേരള ചരിത്രം');
    assert.ok(stack2.includes('Noto Sans Malayalam'));
  });

  it('resolves Devanagari font stack for Hindi', () => {
    const stack = getScriptFontStack('भारत का इतिहास', 'hi');
    assert.ok(stack.includes('Noto Sans Devanagari'));
  });

  it('returns null for standard Latin text without language hint', () => {
    assert.equal(getScriptFontStack('Hello World', 'en'), null);
  });
});

describe('scene-animator detectComponentTheme', () => {
  it('detects code component', () => {
    assert.equal(detectComponentTheme({ visualDescription: 'Code editor typing javascript API function' }), 'code');
  });

  it('detects chart component', () => {
    assert.equal(detectComponentTheme({ visualDescription: 'Animated bar chart and analytics statistics' }), 'chart');
  });

  it('detects quote component', () => {
    assert.equal(detectComponentTheme({ visualDescription: 'Historical quote from the author' }), 'quote');
  });

  it('detects metric component', () => {
    assert.equal(detectComponentTheme({ visualDescription: 'Key performance metric percentage counter' }), 'metric');
  });

  it('detects timeline component', () => {
    assert.equal(detectComponentTheme({ visualDescription: 'Evolution timeline milestone phases' }), 'timeline');
  });

  it('detects celestial_orbit component for orbital and satellite science', () => {
    assert.equal(detectComponentTheme({ visualDescription: 'Earth rotating with 4 satellite orbits and microwave beams' }), 'celestial_orbit');
  });

  it('detects dna_helix component for genetics and biology', () => {
    assert.equal(detectComponentTheme({ visualDescription: 'DNA double helix rotating with base pairs' }), 'dna_helix');
  });

  it('detects radar_globe component for world tactical navigation', () => {
    assert.equal(detectComponentTheme({ visualDescription: 'Global map radar sweep locating incident' }), 'radar_globe');
  });

  it('detects speed_action component for high energy sports', () => {
    assert.equal(detectComponentTheme({ visualDescription: 'High velocity athletic speed streaks' }), 'speed_action');
  });

  it('detects doodle character components for human action and evolution stories', () => {
    assert.equal(detectComponentTheme({ visualDescription: 'Person choosing shirt from wardrobe rack', language: 'ml' }), 'doodle_dressing');
    assert.equal(detectComponentTheme({ caption: 'Freezing cold wind shivering naked early human' }), 'doodle_shiver_cold');
    assert.equal(detectComponentTheme({ narration: 'സൂചിയും മൃഗങ്ങളുടെ തോൽ തുന്നാനുള്ള ഉപകരണങ്ങളും' }), 'doodle_sewing_needle');
    assert.equal(detectComponentTheme({ caption: 'African savannah hunter walking with spear' }), 'doodle_hunter_savannah');
    assert.equal(detectComponentTheme({ caption: 'Looking in water reflection blush theory of mind' }), 'doodle_shame_reflection');
    assert.equal(detectComponentTheme({ narration: 'അപരിചിതരായ ആളുകൾ തമ്മിൽ കാണാൻ തുടങ്ങി രണ്ടു ഗോത്രങ്ങൾ' }), 'doodle_tribe_meeting');
    assert.equal(detectComponentTheme({ caption: 'Planning for tomorrow thinking by campfire' }), 'doodle_thinking_future');
    assert.equal(detectComponentTheme({ caption: 'Lice evolution microscope 170,000 years ago' }), 'doodle_microscope_lice');
  });

  it('prioritizes image when imagePath is given', () => {
    assert.equal(detectComponentTheme({ imagePath: '/path/to/img.png' }), 'image');
  });
});

describe('scene-animator generateSceneHtml', () => {
  it('generates unique HTML customized for documentary aesthetic with Malayalam fonts', () => {
    const html = generateSceneHtml({
      topic: 'കേരള ചരിത്രം',
      caption: 'പുരാതന സാമ്രാജ്യങ്ങൾ',
      narration: 'കേരളത്തിന്റെ പുരാതന ചരിത്രത്തിലേക്ക് ഒരു യാത്ര',
      language: 'ml',
      duration: 3,
    });
    assert.ok(html.includes('AESTHETIC = "cinematic_documentary"'));
    assert.ok(html.includes('Noto Sans Malayalam'));
    assert.ok(html.includes('window.DURATION = 3;'));
    assert.ok(html.includes('window.seek = async (t) =>'));
    assert.ok(html.includes('പുരാതന സാമ്രാജ്യങ്ങൾ'));
  });

  it('generates unique HTML customized for finance aesthetic', () => {
    const html = generateSceneHtml({
      topic: 'Bitcoin market investing and stocks',
      caption: 'MARKET TRENDS',
      duration: 2.5,
    });
    assert.ok(html.includes('AESTHETIC = "finance_executive"'));
    assert.ok(html.includes('BG_TYPE = "candlestick_charts"'));
    assert.ok(html.includes('MARKET TRENDS'));
  });

  it('cycles color palettes across scene indexes', () => {
    const html0 = generateSceneHtml({ topic: 'AI software', sceneIndex: 0 });
    const html1 = generateSceneHtml({ topic: 'AI software', sceneIndex: 1 });
    assert.notEqual(html0, html1);
  });

  it('disables on-screen subtitles by default unless requested in prompt or options', () => {
    const htmlNoCap = generateSceneHtml({
      topic: 'Space Exploration',
      narration: 'The rocket lifts off into the night sky.',
    });
    assert.ok(htmlNoCap.includes('SHOW_CAPTIONS = false'));

    const htmlWithCap = generateSceneHtml({
      topic: 'Space Exploration with subtitles',
      narration: 'The rocket lifts off into the night sky.',
    });
    assert.ok(htmlWithCap.includes('SHOW_CAPTIONS = true'));

    const htmlExplicit = generateSceneHtml({
      topic: 'Space Exploration',
      narration: 'The rocket lifts off into the night sky.',
      showCaptions: true,
    });
    assert.ok(htmlExplicit.includes('SHOW_CAPTIONS = true'));
  });
});

describe('scene-animator detectCaptionsRequested', () => {
  it('returns true when prompt asks for captions or subtitles', () => {
    assert.equal(detectCaptionsRequested('video with subtitles'), true);
    assert.equal(detectCaptionsRequested('show captions please'), true);
    assert.equal(detectCaptionsRequested('include captions'), true);
    assert.equal(detectCaptionsRequested('subtitles: true'), true);
  });

  it('returns false when no captions requested', () => {
    assert.equal(detectCaptionsRequested('Ancient Human Clothing Evolution'), false);
    assert.equal(detectCaptionsRequested(''), false);
    assert.equal(detectCaptionsRequested(null), false);
  });
});

describe('scene-animator wrapCodeInHarnessHtml', () => {
  it('wraps agent custom canvas code into a pure-t harness page', () => {
    const customCode = 'ctx.fillStyle = "#fff"; ctx.arc(100, 100, 20, 0, Math.PI * 2); ctx.fill();';
    const html = wrapCodeInHarnessHtml({
      code: customCode,
      duration: 4.5,
      width: 1920,
      height: 1080,
      language: 'ml',
    });
    assert.ok(html.includes('window.DURATION = 4.5;'));
    assert.ok(html.includes('window.seek = async (t) =>'));
    assert.ok(html.includes(customCode));
    assert.ok(html.includes('Noto Sans Malayalam'));
    assert.ok(html.includes('function spring('));
    assert.ok(html.includes('function lerp('));
    assert.ok(html.includes('function clamp('));
    assert.ok(html.includes('function easeIn('));
    assert.ok(html.includes('function easeOut('));
    assert.ok(html.includes('function easeInOut('));
    assert.ok(html.includes('function boilSeed('));
  });
});

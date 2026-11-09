'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { generateSceneHtml, detectTheme, FONT_STACK } = require('./scene-animator');

describe('scene-animator detectTheme', () => {
  it('detects code theme from visual description keywords', () => {
    assert.equal(detectTheme({ visualDescription: 'Code editor typing javascript API endpoint' }), 'code');
    assert.equal(detectTheme({ caption: 'Terminal npm run deploy' }), 'code');
  });

  it('detects chart theme from analytics keywords', () => {
    assert.equal(detectTheme({ visualDescription: 'Animated bar chart and metric statistics' }), 'chart');
    assert.equal(detectTheme({ caption: 'Revenue growth percent' }), 'chart');
  });

  it('detects nodes theme from network / architecture keywords', () => {
    assert.equal(detectTheme({ visualDescription: 'Connected neural nodes and cloud pipeline' }), 'nodes');
  });

  it('detects diagram theme from process keywords', () => {
    assert.equal(detectTheme({ visualDescription: 'Step by step workflow cycle' }), 'diagram');
  });

  it('prioritizes image theme when imagePath is provided', () => {
    assert.equal(detectTheme({ visualDescription: 'Code editor', imagePath: '/path/to/img.png' }), 'image');
  });

  it('falls back to kinetic theme for general concepts', () => {
    assert.equal(detectTheme({ visualDescription: 'Futuristic motion graphics' }), 'kinetic');
  });
});

describe('scene-animator generateSceneHtml', () => {
  it('includes Malayalam font stack in FONT_STACK', () => {
    assert.ok(FONT_STACK.includes('Nirmala UI'));
    assert.ok(FONT_STACK.includes('Noto Sans Malayalam'));
  });

  it('generates HTML containing window.DURATION and window.seek', () => {
    const html = generateSceneHtml({
      caption: 'മലയാളം ശീർഷകം',
      narration: 'വിവരണ ടെക്സ്റ്റ്',
      duration: 4.5,
      width: 1920,
      height: 1080,
    });
    assert.ok(html.includes('window.DURATION = 4.5;'));
    assert.ok(html.includes('window.seek = async (t) =>'));
    assert.ok(html.includes('മലയാളം ശീർഷകം'));
    assert.ok(html.includes('വിവരണ ടെക്സ്റ്റ്'));
  });

  it('embeds font-family stack in canvas typography', () => {
    const html = generateSceneHtml({ caption: 'Test' });
    assert.ok(html.includes('Noto Sans Malayalam'));
    assert.ok(html.includes('Nirmala UI'));
  });

  it('clamps minimum duration to 1 second', () => {
    const html = generateSceneHtml({ duration: 0.2 });
    assert.ok(html.includes('window.DURATION = 1;'));
  });
});

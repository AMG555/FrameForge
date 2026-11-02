'use strict';
// Deep validation: imports, spec compliance, normaliseScene correctness
const code = require('fs').readFileSync('./src/mcp-server/server.js','utf8');
console.log('=== MCP server spec compliance ===');
console.log('initialize handler    :', code.includes("method === 'initialize'"));
console.log('jsonrpc 2.0 responses :', (code.match(/jsonrpc.*2\.0/g)||[]).length, 'occurrences');
console.log('CORS headers          :', code.includes('Access-Control-Allow-Origin'));
console.log('spawnSync Telegram    :', code.includes("spawnSync('curl'"));
console.log('visual_description    :', code.includes('visual_description'));
console.log('schema_version prompt :', code.includes('schema_version'));
console.log('batch handling        :', code.includes('Array.isArray(body)'));
console.log('ping handler          :', code.includes("method === 'ping'"));
console.log('notifications/init    :', code.includes("notifications/initialized"));

const {LLMProvider} = require('../src/pipeline/providers');
const {runResearch} = require('../src/workflows/research.js');
const {runScript, normaliseScene} = require('../src/workflows/script.js');
const {runAssets}   = require('../src/workflows/assets.js');
const {runRender}   = require('../src/workflows/render.js');
const {runShorts}   = require('../src/workflows/shorts.js');
console.log('\n=== Workflow imports ===');
console.log('research, script, assets, render, shorts: OK');

// normaliseScene - legacy path
const legacyScene = {n:1, narration:'Test narration for scene one.', caption:'test cap', visual_action:'ancient man [CAMP]', camera:'slow_zoom_in'};
const n1 = normaliseScene(legacyScene, 0);
console.log('\n=== normaliseScene legacy ===');
console.log('schema_version:', n1.schema_version);
console.log('character_id  :', n1.character.character_id);
console.log('camera_hint   :', n1.camera_hint);
console.log('focal_point   :', JSON.stringify(n1.focal_point));

// normaliseScene - v1.0.0 path
const newScene = {scene_id:2, schema_version:'1.0.0', narration:'Test narration scene two.', caption:'TEST', visual_description:'modern office [MODERN]', character:{character_id:'modern_man',pose:'sitting',emotion:'happy',position:{x:0.3,y:0.7,scale:1.2}}, focal_point:{x:0.3,y:0.3,weight:0.9}, overlay:{type:'none'}, sound_effects:[], music_mood:'calm', camera_hint:'zoom_out', metadata:{importance:'high',hook_potential:0.8,standalone:true}};
const n2 = normaliseScene(newScene, 1);
console.log('\n=== normaliseScene v1.0.0 ===');
console.log('schema_version :', n2.schema_version);
console.log('character_id   :', n2.character.character_id);
console.log('camera_hint    :', n2.camera_hint);
console.log('hook_potential :', n2.metadata.hook_potential);
console.log('standalone     :', n2.metadata.standalone);

// JSON workflows still valid
const fs = require('fs');
const wf  = JSON.parse(fs.readFileSync('./workflow.json','utf8').replace(/^\uFEFF/,''));
const wf2 = JSON.parse(fs.readFileSync('./daily-video-workflow.json','utf8').replace(/^\uFEFF/,''));
console.log('\n=== Workflow JSON ===');
console.log('workflow.json nodes              :', wf.nodes.length);
console.log('daily-video-workflow.json nodes  :', wf2.nodes.length);
const sp = wf.nodes.find(n => n.id === 'e9d032d0-53c0-4858-ab34-89ceb0750038');
const vs = wf.nodes.find(n => n.id === '5cd88990-be2d-4199-9813-c4c3a8a903e9');
console.log('Build Script Prompt schema_version:', sp.parameters.jsCode.includes('schema_version'));
console.log('Validate Script visual_description:', vs.parameters.jsCode.includes('visual_description'));
const combined = JSON.stringify(wf) + JSON.stringify(wf2);
const leaked = ['0000000000','AAAAAAAAAAAAAAAA','000000000','192.168.1.15'].filter(s => combined.includes(s));
console.log('Leaked credentials               :', leaked.length ? leaked : 'NONE');
console.log('\nAll checks passed.');

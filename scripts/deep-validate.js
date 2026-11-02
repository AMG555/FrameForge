'use strict';
// Deep validation: imports, spec compliance, normaliseScene correctness, new modules
const fs = require('fs');
let failures = 0;
function check(label, value, expected = true) {
  const ok = value === expected;
  if (!ok) { console.error(`  FAIL: ${label} — got ${JSON.stringify(value)}, expected ${JSON.stringify(expected)}`); failures++; }
  else console.log(`  OK  : ${label}`);
}

// ── MCP server spec compliance ─────────────────────────────────────────────
const code = fs.readFileSync('./src/mcp-server/server.js','utf8');
console.log('\n=== MCP server spec compliance ===');
check('initialize handler',     code.includes("method === 'initialize'"));
check('jsonrpc 2.0 responses',  (code.match(/jsonrpc.*2\.0/g)||[]).length >= 8);
check('CORS headers',           code.includes('Access-Control-Allow-Origin'));
check('spawnSync Telegram',     code.includes("spawnSync('curl'"));
check('visual_description',     code.includes('visual_description'));
check('schema_version prompt',  code.includes('schema_version'));
check('batch handling',         code.includes('Array.isArray(body)'));
check('ping handler',           code.includes("method === 'ping'"));
check('notifications/init',     code.includes("notifications/initialized"));

// ── No execSync with shell strings in renderer or extractor ───────────────
console.log('\n=== Shell injection check ===');
const renderer  = fs.readFileSync('./src/video-renderer/renderer.js','utf8');
const extractor = fs.readFileSync('./src/shorts-extractor/extractor.js','utf8');
const mixer     = fs.readFileSync('./src/audio-mixer/mixer.js','utf8');
check('renderer uses spawnSync not execSync', !renderer.includes('execSync'));
check('extractor uses spawnSync not execSync', !extractor.includes('execSync'));
check('mixer uses spawnSync not execSync',    !mixer.includes('execSync'));

// ── Animation System ───────────────────────────────────────────────────────
console.log('\n=== Animation System (Task #11) ===');
const { buildCameraFilter, selectCameraHint, MAX_ZOOM, FPS } = require('../src/animation/animation-system');
check('buildCameraFilter slow_zoom_in contains zoompan', buildCameraFilter('slow_zoom_in').includes('zoompan'));
check('buildCameraFilter slow_zoom_out contains zoompan', buildCameraFilter('slow_zoom_out').includes('zoompan'));
check('buildCameraFilter pan_left returns zoompan',       buildCameraFilter('pan_left').includes('zoompan'));
check('buildCameraFilter pan_right returns zoompan',      buildCameraFilter('pan_right').includes('zoompan'));
check('buildCameraFilter tilt_up returns zoompan',        buildCameraFilter('tilt_up').includes('zoompan'));
check('buildCameraFilter static returns scale',           buildCameraFilter('static').includes('scale'));
check('buildCameraFilter ken_burns returns zoompan',      buildCameraFilter('ken_burns').includes('zoompan'));
check('buildCameraFilter auto does not throw',            typeof buildCameraFilter('auto') === 'string');
check('MAX_ZOOM is 1.12',                                 MAX_ZOOM, 1.12);
check('FPS is 24',                                        FPS, 24);
const hint = selectCameraHint(0);
check('selectCameraHint returns string',                  typeof hint === 'string');
check('camera filter does not exceed MAX_ZOOM',           !buildCameraFilter('slow_zoom_in').includes('1.13'));

// ── Artifact Manifest (Task #24) ───────────────────────────────────────────
console.log('\n=== Artifact Manifest (Task #24) ===');
const { ArtifactManifest } = require('../src/pipeline/artifact-manifest');
const os   = require('os');
const path = require('path');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-test-'));
const mf = new ArtifactManifest({ productionId: 'test_prod_001', artifactsDir: tmpDir });
const data = mf.create({ narrationText: 'hello world test narration', scenes: [{narration:'s1',caption:'c1'},{narration:'s2',caption:'c2'}] });
check('manifest created',                data.production_id === 'test_prod_001');
check('schema_version 1.0.0',            data.schema_version === '1.0.0');
check('two scenes',                      data.scenes.length, 2);
check('narration_hash is sha256',        data.narration_hash.length, 64);
check('manifest.json written to disk',   fs.existsSync(path.join(tmpDir, 'test_prod_001', 'manifest.json')));
check('isSceneComplete false initially', !mf.isSceneComplete(0));
check('isMasterComplete false initially',!mf.isMasterComplete());
// loadOrCreate resume test
const mf2 = new ArtifactManifest({ productionId: 'test_prod_001', artifactsDir: tmpDir });
const { resumed } = mf2.loadOrCreate({ narrationText: 'hello world test narration' });
check('loadOrCreate same narration resumes', resumed, true);
const { resumed: notResumed } = mf2.loadOrCreate({ narrationText: 'completely different text' });
check('loadOrCreate different narration does not resume', notResumed, false);
// cleanup
fs.rmSync(tmpDir, { recursive: true, force: true });

// ── Vertical Reformatting (Task #14) ─────────────────────────────────────
console.log('\n=== Vertical Reformatting (Task #14) ===');
const { ShortsExtractor } = require('../src/shorts-extractor/extractor');
const sx = new ShortsExtractor();
// _focalToFFmpegX correctness
check('focalX=0.5 centers crop (608px wide in 1920)', sx._focalToFFmpegX(0.5), 656);  // 0.5*1920 - 608/2 = 960-304 = 656
check('focalX=0.0 clamps to 0',  sx._focalToFFmpegX(0.0), 0);
check('focalX=1.0 clamps to 1312', sx._focalToFFmpegX(1.0), 1312); // 1920-608=1312
check('focalX=0.3 is even pixel', sx._focalToFFmpegX(0.3) % 2 === 0);
check('focalX=0.7 is even pixel', sx._focalToFFmpegX(0.7) % 2 === 0);
// _focalToFFmpegY always 0
check('focalToFFmpegY is always 0', sx._focalToFFmpegY(), 0);
// _defaultFocalY
check('defaultFocalY with no scenes = 0.35', sx._defaultFocalY([]), 0.35);
check('defaultFocalY uses focal_point.y from scenes', sx._defaultFocalY([{focal_point:{y:0.25}}]), 0.25);
// _focalPointForSegment
const fp = sx._focalPointForSegment({ coveredScenes: [] }, []);
check('focalPointForSegment default x=0.5', fp.x, 0.5);
check('focalPointForSegment default y=0.35 (safe-zone bias)', fp.y, 0.35);
const fp2 = sx._focalPointForSegment({ coveredScenes: [{ focal_point: { x: 0.3, y: 0.2 } }] }, []);
check('focalPointForSegment uses scene focal_point.x', fp2.x, 0.3);
check('focalPointForSegment uses scene focal_point.y', fp2.y, 0.2);

// ── Artifact Retention (Task #27) ─────────────────────────────────────────
console.log('\n=== Artifact Retention (Task #27) ===');
const { classifyRetention } = require('../src/pipeline/artifact-retention');
check('final_video is permanent',      classifyRetention('final_video_prod123.mp4'), 'permanent');
check('short is permanent',            classifyRetention('short_clip.mp4'), 'permanent');
check('manifest.json is permanent',    classifyRetention('manifest.json'), 'permanent');
check('scene render is 30_day',        classifyRetention('scene_3_out.mp4'), '30_day');
check('concat txt is 30_day',          classifyRetention('concat_main.txt'), '30_day');
check('raw_concat is 30_day',          classifyRetention('raw_concat_123.mp4'), '30_day');
check('_raw.mp3 is temp',              classifyRetention('voice_raw.mp3'), 'temp');

// ── Fact-check Validation Set (Task #20) + Review Gate (Task #21) ────────
console.log('\n=== Fact-check Validation Set + Review Gate (Tasks #20, #21) ===');
const { VALIDATION_SET } = require('../src/fact-checker/validation-set');
const { FactCheckerReviewGate } = require('../src/fact-checker/review-gate');
check('validation set has ≥100 claims',   VALIDATION_SET.length >= 100);
check('every entry has claim_text',        VALIDATION_SET.every(c => typeof c.claim_text === 'string'));
check('every entry has gold_label',        VALIDATION_SET.every(c => ['SUPPORTED','UNSUPPORTED','DISPUTED','UNVERIFIABLE'].includes(c.gold_label)));
check('every entry has risk_level',        VALIDATION_SET.every(c => ['TRIVIAL','NUMERICAL','CONTROVERSIAL'].includes(c.risk_level)));
check('every entry has expected_decision', VALIDATION_SET.every(c => ['AUTO_APPROVE','HUMAN_REVIEW','REJECT'].includes(c.expected_decision)));
// Count dangerous claims that must REJECT
const mustReject = VALIDATION_SET.filter(c => c.expected_decision === 'REJECT');
check('≥3 dangerous claims marked REJECT', mustReject.length >= 3);
// Verify known claim decisions
const vaccineAutism = VALIDATION_SET.find(c => c.claim_text.includes('Vaccines cause autism'));
check('vaccines-autism is REJECT',         vaccineAutism?.expected_decision === 'REJECT');
const earthFlat = VALIDATION_SET.find(c => c.claim_text.includes('Earth is flat'));
check('flat-earth is REJECT',              earthFlat?.expected_decision === 'REJECT');
// Review gate: classifyDecisions pure function
const gate = new FactCheckerReviewGate({});
const mockReport = {
  results: [
    { rawClaim: 'safe trivial fact',   claim_risk: 'TRIVIAL',       evidence_strength: 'STRONG',      status: 'VERIFIED',             sources: [] },
    { rawClaim: 'disputed stat',       claim_risk: 'NUMERICAL',     evidence_strength: 'WEAK',        status: 'DISPUTED',             sources: [] },
    { rawClaim: 'dangerous claim',     claim_risk: 'CONTROVERSIAL', evidence_strength: 'INSUFFICIENT', status: 'UNSUPPORTED',         sources: [] },
  ],
};
const { autoApproved: aa, needsReview: nr, rejected: rj } = gate.classifyDecisions(mockReport);
check('trivial auto-approved',          aa.length, 1);
check('disputed numerical needs review', nr.length, 1);
check('dangerous controversial rejected', rj.length, 1);
// formatReviewRequest produces Telegram message
const msg = gate.formatReviewRequest(mockReport.results.slice(1, 2), 'prod_test');
check('review request contains production id', msg.includes('prod_test'));
check('review request contains approve command', msg.includes('/approve'));
check('review request contains reject command', msg.includes('/reject'));

// ── TTS voice selection (Task #17) ────────────────────────────────────────
console.log('\n=== TTS Voice Selection (Task #17) ===');
const { TTSProvider } = require('../src/pipeline/providers');
const tts = new TTSProvider();
check('selectNarratorVoice uses explicit override', tts.selectNarratorVoice('my-voice') === 'my-voice');
const autoVoice = tts.selectNarratorVoice();
check('selectNarratorVoice returns string',          typeof autoVoice === 'string');
check('no artificial bass boost in edge-tts filter', !fs.readFileSync('./src/pipeline/providers.js','utf8').includes('bass=g=3'));

// ── Renderer imports AnimationSystem (Task #11 integration) ──────────────
console.log('\n=== Renderer ← AnimationSystem integration ===');
check('renderer imports animation-system',   renderer.includes("require('../animation/animation-system')"));
check('renderer imports AudioMixer',         renderer.includes("require('../audio-mixer/mixer')"));
check('renderer calls buildCameraFilter',    renderer.includes('buildCameraFilter'));
check('renderer calls selectCameraHint',     renderer.includes('selectCameraHint'));
check('renderer calls mixer.mixVideo',       renderer.includes('mixer.mixVideo'));

// ── Workflow imports ───────────────────────────────────────────────────────
console.log('\n=== Workflow imports ===');
const {runResearch} = require('../src/workflows/research.js');
const {runScript, normaliseScene} = require('../src/workflows/script.js');
const {runAssets}   = require('../src/workflows/assets.js');
const {runRender}   = require('../src/workflows/render.js');
const {runShorts}   = require('../src/workflows/shorts.js');
check('all workflow modules import OK', true);

// ── normaliseScene ────────────────────────────────────────────────────────
console.log('\n=== normaliseScene ===');
const legacyScene = {n:1, narration:'Test narration for scene one.', caption:'test cap', visual_action:'ancient man [CAMP]', camera:'slow_zoom_in'};
const n1 = normaliseScene(legacyScene, 0);
check('legacy: schema_version 1.0.0',   n1.schema_version, '1.0.0');
check('legacy: character_id resolved',  n1.character.character_id === 'ancient_man');
check('legacy: camera_hint auto',       n1.camera_hint === 'auto');
check('legacy: focal_point present',    typeof n1.focal_point === 'object');

const newScene = {scene_id:2, schema_version:'1.0.0', narration:'Test narration scene two.', caption:'TEST', visual_description:'modern office [MODERN]', character:{character_id:'modern_man',pose:'sitting',emotion:'happy',position:{x:0.3,y:0.7,scale:1.2}}, focal_point:{x:0.3,y:0.3,weight:0.9}, overlay:{type:'none'}, sound_effects:[], music_mood:'calm', camera_hint:'zoom_out', metadata:{importance:'high',hook_potential:0.8,standalone:true}};
const n2 = normaliseScene(newScene, 1);
check('v1.0.0: schema_version 1.0.0',  n2.schema_version, '1.0.0');
check('v1.0.0: character_id preserved', n2.character.character_id, 'modern_man');
check('v1.0.0: camera_hint preserved',  n2.camera_hint, 'zoom_out');
check('v1.0.0: hook_potential',         n2.metadata.hook_potential, 0.8);
check('v1.0.0: standalone',             n2.metadata.standalone, true);

// ── Workflow JSON ─────────────────────────────────────────────────────────
console.log('\n=== Workflow JSON ===');
const wf  = JSON.parse(fs.readFileSync('./workflow.json','utf8').replace(/^\uFEFF/,''));
const wf2 = JSON.parse(fs.readFileSync('./daily-video-workflow.json','utf8').replace(/^\uFEFF/,''));
check('workflow.json has 49 nodes',              wf.nodes.length, 49);
check('daily-video-workflow.json has 35 nodes',  wf2.nodes.length, 35);
const sp = wf.nodes.find(n => n.id === 'e9d032d0-53c0-4858-ab34-89ceb0750038');
const vs = wf.nodes.find(n => n.id === '5cd88990-be2d-4199-9813-c4c3a8a903e9');
check('Build Script Prompt has schema_version',  sp.parameters.jsCode.includes('schema_version'));
check('Validate Script has visual_description',  vs.parameters.jsCode.includes('visual_description'));
const combined = JSON.stringify(wf) + JSON.stringify(wf2);
const leaked = ['0000000000','AAAAAAAAAAAAAAAA','000000000','192.168.1.15'].filter(s => combined.includes(s));
check('No leaked credentials in workflows',      leaked.length, 0);

// ── Final result ──────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(48)}`);
if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
} else {
  console.log('\nAll checks passed.');
}

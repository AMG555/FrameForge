#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dest = process.argv[2];
if (!dest) {
  console.error('Usage: node new_cinematic.mjs <project-folder>');
  process.exit(1);
}

const templateDir = path.resolve(__dirname, '../template');
const outDir = path.resolve(dest);

if (fs.existsSync(path.join(outDir, 'src', 'beats.json'))) {
  console.log(`${outDir} already has a project; not overwriting`);
  process.exit(1);
}

fs.cpSync(templateDir, outDir, { recursive: true });
console.log(`Scaffolded cinematic animation project at ${outDir}`);

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
spawnSync(npmCmd, ['install', '--silent', '--no-audit', '--no-fund'], { cwd: outDir, stdio: 'inherit' });

console.log(`Ready: ${outDir} (edit src/beats.json, src/10_example.js, audio/audio.py)`);

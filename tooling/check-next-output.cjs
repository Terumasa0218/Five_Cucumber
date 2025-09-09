#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const ok = path.join(ROOT, 'apps', 'hub', '.next', 'routes-manifest.json');
const badDir = path.join(ROOT, 'apps', 'hub', 'apps', 'hub', '.next');

const hasOk = fs.existsSync(ok);
const hasBad = fs.existsSync(badDir) || fs.existsSync(path.join(badDir, 'routes-manifest.json'));

if (hasBad) {
  console.error('[FAIL] Duplicated output path detected:', badDir);
  process.exit(2);
}
if (!hasOk) {
  console.error('[FAIL] Missing file:', ok);
  const guess = path.join(ROOT, '.next', 'routes-manifest.json');
  if (fs.existsSync(guess)) console.error('Hint: Found .next at repo root:', guess);
  process.exit(1);
}
console.log('[OK]', ok);
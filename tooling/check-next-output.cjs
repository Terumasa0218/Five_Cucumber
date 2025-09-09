#!/usr/bin/env node

/**
 * Next.js build output verification script
 * Checks for correct .next directory structure and prevents double-path issues
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OK = path.join(ROOT, 'apps', 'hub', '.next', 'routes-manifest.json');
const BAD_DIR = path.join(ROOT, 'apps', 'hub', 'apps', 'hub', '.next');

const exists = fs.existsSync(OK);
const badExists = fs.existsSync(BAD_DIR) || fs.existsSync(path.join(BAD_DIR, 'routes-manifest.json'));

if (badExists) {
  console.error('[FAIL] Detected duplicated output path:', BAD_DIR);
  process.exit(2);
}

if (!exists) {
  console.error('[FAIL] Missing file:', OK);
  // 近い場所に誤って出ていないかヒントを出す
  const guess = path.join(ROOT, '.next', 'routes-manifest.json');
  if (fs.existsSync(guess)) {
    console.error('Hint: Found .next at repo root:', guess);
  }
  process.exit(1);
}

console.log('[OK]', OK);
process.exit(0);
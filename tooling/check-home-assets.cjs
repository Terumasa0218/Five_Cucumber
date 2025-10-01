#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const assets = [
  {
    path: path.join(projectRoot, 'apps/hub/public/home/home13-1.png'),
    recommend: '/home/home13-1.webp',
  },
];

let missing = false;

for (const asset of assets) {
  try {
    fs.accessSync(asset.path, fs.constants.R_OK);
  } catch (error) {
    missing = true;
    const relativePath = path.relative(projectRoot, asset.path);
    console.warn(
      `WARN  Missing asset: ${relativePath}. Consider adding the file or replacing it with ${asset.recommend}.`
    );
  }
}

if (!missing) {
  console.log('Assets check passed: required home assets are present.');
}



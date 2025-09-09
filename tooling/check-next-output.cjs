#!/usr/bin/env node

/**
 * Next.js build output verification script
 * Checks for correct .next directory structure and prevents double-path issues
 */

const fs = require('fs');
const path = require('path');

const EXPECTED_NEXT_DIR = path.join('apps', 'hub', '.next');
const ROUTES_MANIFEST = path.join(EXPECTED_NEXT_DIR, 'routes-manifest.json');

// Check for double-path issues (e.g., apps/hub/apps/hub/.next)
const DOUBLE_PATH_PATTERNS = [
  path.join('apps', 'hub', 'apps', 'hub', '.next'),
  path.join('apps', 'hub', 'apps', 'hub', 'apps', 'hub', '.next')
];

function checkForDoublePaths() {
  console.log('🔍 Checking for double-path issues...');
  
  for (const pattern of DOUBLE_PATH_PATTERNS) {
    if (fs.existsSync(pattern)) {
      console.error(`❌ Found double-path directory: ${pattern}`);
      console.error('   This indicates a misconfiguration in build settings.');
      return false;
    }
  }
  
  console.log('✅ No double-path issues found');
  return true;
}

function checkExpectedOutput() {
  console.log('🔍 Checking for expected Next.js output...');
  
  if (!fs.existsSync(EXPECTED_NEXT_DIR)) {
    console.error(`❌ Expected .next directory not found: ${EXPECTED_NEXT_DIR}`);
    console.error('   Run "pnpm build" first to generate the build output.');
    return false;
  }
  
  if (!fs.existsSync(ROUTES_MANIFEST)) {
    console.error(`❌ routes-manifest.json not found: ${ROUTES_MANIFEST}`);
    console.error('   This indicates the Next.js build did not complete successfully.');
    return false;
  }
  
  console.log('✅ Expected Next.js output found');
  console.log(`   📁 .next directory: ${EXPECTED_NEXT_DIR}`);
  console.log(`   📄 routes-manifest.json: ${ROUTES_MANIFEST}`);
  return true;
}

function checkBuildArtifacts() {
  console.log('🔍 Checking for essential build artifacts...');
  
  const requiredFiles = [
    'routes-manifest.json',
    'build-manifest.json',
    'prerender-manifest.json'
  ];
  
  const missingFiles = [];
  
  for (const file of requiredFiles) {
    const filePath = path.join(EXPECTED_NEXT_DIR, file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  }
  
  if (missingFiles.length > 0) {
    console.warn(`⚠️  Some build artifacts are missing: ${missingFiles.join(', ')}`);
    console.warn('   This might indicate an incomplete build.');
    return false;
  }
  
  console.log('✅ All essential build artifacts found');
  return true;
}

function main() {
  console.log('🚀 Next.js Build Output Verification');
  console.log('=====================================\n');
  
  const checks = [
    checkForDoublePaths,
    checkExpectedOutput,
    checkBuildArtifacts
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    if (!check()) {
      allPassed = false;
    }
    console.log(''); // Add spacing between checks
  }
  
  if (allPassed) {
    console.log('🎉 All checks passed! Build output is correctly configured.');
    console.log('   Ready for Vercel deployment with Root Directory: apps/hub');
    process.exit(0);
  } else {
    console.log('💥 Some checks failed. Please fix the issues above.');
    console.log('   See docs/deploy/vercel.md for troubleshooting guidance.');
    process.exit(1);
  }
}

// Run the verification
main();

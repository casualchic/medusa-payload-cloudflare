#!/usr/bin/env node
/**
 * Patch middleware handler.mjs to handle undefined import.meta.url in Cloudflare Workers
 * Wraps createRequire(import.meta.url) in a try-catch with fallback
 */

const fs = require('fs');
const path = require('path');

const handlerPath = path.join(__dirname, '../.open-next/middleware/handler.mjs');

if (!fs.existsSync(handlerPath)) {
  console.log('⚠️  Middleware handler not found, skipping patch');
  process.exit(0);
}

let content = fs.readFileSync(handlerPath, 'utf8');

// Check if already patched
if (content.includes('// PATCHED: createRequire fallback')) {
  console.log('✓ Middleware handler already patched for createRequire');
  process.exit(0);
}

// Find and replace the createRequire call
// The pattern is typically: createRequire(import.meta.url)
const createRequirePattern = /createRequire\(import\.meta\.url\)/g;

if (content.match(createRequirePattern)) {
  // Replace with a safe version that handles undefined import.meta.url
  content = content.replace(
    createRequirePattern,
    '// PATCHED: createRequire fallback for Cloudflare Workers\n' +
    '(typeof import.meta.url !== "undefined" ? createRequire(import.meta.url) : (() => { throw new Error("require not available"); }))'
  );

  fs.writeFileSync(handlerPath, content, 'utf8');
  console.log('✓ Patched middleware handler.mjs to handle undefined import.meta.url');
} else {
  console.log('⚠️  Could not find createRequire pattern to patch');
}

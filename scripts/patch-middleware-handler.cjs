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
if (content.includes('// PATCHED: Handle undefined import.meta.url')) {
  console.log('✓ Middleware handler already patched for import.meta.url');
  process.exit(0);
}

// Find and replace the topLevelCreateRequire call
// The pattern might have variable whitespace, so be more flexible
const topLevelCreateRequirePattern = /const\s+require\s*=\s*topLevelCreateRequire\s*\(\s*import\.meta\.url\s*\)\s*;/;

if (content.match(topLevelCreateRequirePattern)) {
  // Replace with a safe version that handles undefined import.meta.url
  content = content.replace(
    topLevelCreateRequirePattern,
    '// PATCHED: Handle undefined import.meta.url in Cloudflare Workers\n' +
    'const require = typeof import.meta.url !== "undefined" ? topLevelCreateRequire(import.meta.url) : (() => { const notAvailable = () => { throw new Error("require() is not available in Cloudflare Workers"); }; notAvailable.resolve = notAvailable; return notAvailable; })();'
  );

  fs.writeFileSync(handlerPath, content, 'utf8');
  console.log('✓ Patched middleware handler.mjs to handle undefined import.meta.url');
} else {
  // Try alternative: maybe it's all on one line without line breaks
  const inlinePattern = /topLevelCreateRequire\(import\.meta\.url\)/;
  if (content.match(inlinePattern)) {
    content = content.replace(
      inlinePattern,
      '(typeof import.meta.url !== "undefined" ? topLevelCreateRequire(import.meta.url) : (() => { const n = () => { throw new Error("require not available"); }; n.resolve = n; return n; })())'
    );
    fs.writeFileSync(handlerPath, content, 'utf8');
    console.log('✓ Patched middleware handler.mjs with inline pattern');
  } else {
    console.log('⚠️  Could not find any createRequire pattern to patch');
    console.log('First 300 chars:', content.substring(0, 300));
  }
}

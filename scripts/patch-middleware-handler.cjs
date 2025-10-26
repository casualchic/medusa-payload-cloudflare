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
// The actual pattern in the handler is: const require = topLevelCreateRequire(import.meta.url);
const topLevelCreateRequirePattern = /const require = topLevelCreateRequire\(import\.meta\.url\);/;

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
  console.log('⚠️  Could not find topLevelCreateRequire pattern to patch');
  // Log first 500 chars to help debug
  console.log('First 500 chars of handler.mjs:', content.substring(0, 500));
}

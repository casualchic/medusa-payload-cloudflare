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

// Find and replace all import.meta.url usages
let patched = false;

// 1. Patch topLevelCreateRequire
const topLevelCreateRequirePattern = /topLevelCreateRequire\(import\.meta\.url\)/g;
if (content.match(topLevelCreateRequirePattern)) {
  content = content.replace(
    topLevelCreateRequirePattern,
    '(typeof import.meta.url !== "undefined" ? topLevelCreateRequire(import.meta.url) : (() => { const n = () => { throw new Error("require not available"); }; n.resolve = n; return n; })())'
  );
  patched = true;
}

// 2. Patch new URL('.', import.meta.url) for __dirname
const urlPattern = /new URL\(['"]\.['"],\s*import\.meta\.url\)/g;
if (content.match(urlPattern)) {
  content = content.replace(
    urlPattern,
    '(typeof import.meta.url !== "undefined" ? new URL(".", import.meta.url) : { href: "file:///", pathname: "/" })'
  );
  patched = true;
}

// 3. Patch any other import.meta.url references
const anyImportMetaUrl = /import\.meta\.url/g;
if (content.match(anyImportMetaUrl)) {
  content = content.replace(
    anyImportMetaUrl,
    '(import.meta.url || "file:///")'
  );
  patched = true;
}

if (patched) {
  fs.writeFileSync(handlerPath, content, 'utf8');
  console.log('✓ Patched middleware handler.mjs to handle undefined import.meta.url');
} else {
  console.log('⚠️  No import.meta.url patterns found to patch');
  console.log('First 300 chars:', content.substring(0, 300));
}

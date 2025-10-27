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

// Find and replace all import.meta.url usages - specific patterns first!
let patched = false;

// 1. Patch topLevelCreateRequire(import.meta.url)
const topLevelCreateRequirePattern = /topLevelCreateRequire\(import\.meta\.url\)/g;
if (content.match(topLevelCreateRequirePattern)) {
  content = content.replace(
    topLevelCreateRequirePattern,
    'topLevelCreateRequire(typeof import.meta.url !== "undefined" ? import.meta.url : "file:///")'
  );
  patched = true;
}

// 2. Patch new URL('.', import.meta.url) for __dirname
const urlPattern = /new URL\(['"]\.['"]\s*,\s*import\.meta\.url\)/g;
if (content.match(urlPattern)) {
  content = content.replace(
    urlPattern,
    'new URL(".", typeof import.meta.url !== "undefined" ? import.meta.url : "file:///")'
  );
  patched = true;
}

// 3. Patch fileURLToPath(import.meta.url) if present
const fileURLToPathPattern = /fileURLToPath\(import\.meta\.url\)/g;
if (content.match(fileURLToPathPattern)) {
  content = content.replace(
    fileURLToPathPattern,
    'fileURLToPath(typeof import.meta.url !== "undefined" ? import.meta.url : "file:///")'
  );
  patched = true;
}

// 4. Create virtual filesystem for Cloudflare Workers
// Cloudflare Workers can't read files at runtime, so we inline all needed files
const nextDir = path.join(__dirname, '../.open-next/middleware/.next');
const virtualFs = {};

// Read all necessary files and store in virtual filesystem
const filesToInline = [
  'required-server-files.json',
  'BUILD_ID',
  'routes-manifest.json',
  'prerender-manifest.json',
  'app-path-routes-manifest.json'
];

filesToInline.forEach(file => {
  const filePath = path.join(nextDir, file);
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    virtualFs[`.next/${file}`] = fileContent;
  }
});

// Inject virtual filesystem at the top of the file
const virtualFsCode = `
// PATCHED: Virtual filesystem for Cloudflare Workers
const __virtualFs = ${JSON.stringify(virtualFs, null, 2)};
const __originalReadFileSync = fs.readFileSync;
fs.readFileSync = function(filePath, encoding) {
  const normalizedPath = filePath.replace(/\\\\/g, '/').replace(/^.*\\.next\\//, '.next/');
  if (__virtualFs[normalizedPath]) {
    return __virtualFs[normalizedPath];
  }
  // Fallback to original for other files
  return __originalReadFileSync(filePath, encoding);
};
`;

// Insert after fs import
const fsImportPattern = /(import fs from "node:fs";)/;
if (content.match(fsImportPattern)) {
  content = content.replace(fsImportPattern, `$1${virtualFsCode}`);
  patched = true;
  console.log('✓ Injected virtual filesystem for Cloudflare Workers');
}

// 5. Fix NEXT_DIR and OPEN_NEXT_DIR to use relative paths in Cloudflare Workers
// __dirname can be "/" or "/bundle" depending on Wrangler's bundling context
const nextDirPattern = /var NEXT_DIR = path2\.join\(__dirname, ".next"\);/g;
if (content.match(nextDirPattern)) {
  content = content.replace(
    nextDirPattern,
    'var NEXT_DIR = __dirname.startsWith("/") ? ".next" : path2.join(__dirname, ".next");'
  );
  patched = true;
}

const openNextDirPattern = /var OPEN_NEXT_DIR = path2\.join\(__dirname, ".open-next"\);/g;
if (content.match(openNextDirPattern)) {
  content = content.replace(
    openNextDirPattern,
    'var OPEN_NEXT_DIR = __dirname.startsWith("/") ? ".open-next" : path2.join(__dirname, ".open-next");'
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

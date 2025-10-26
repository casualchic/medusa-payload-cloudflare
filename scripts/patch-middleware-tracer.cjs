#!/usr/bin/env node
/**
 * Post-OpenNext-build script to patch tracer.js in the middleware bundle
 * This wraps the require('@opentelemetry/api') in a try-catch to prevent bundling errors
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find the tracer.js file in the .open-next/middleware directory
const middlewareDir = path.join(__dirname, '../.open-next/middleware');

if (!fs.existsSync(middlewareDir)) {
  console.log('⚠️  Middleware directory not found, skipping OpenTelemetry patch');
  process.exit(0);
}

// Find the tracer.js file using find command
let tracerPath;
try {
  const findResult = execSync(
    `find "${middlewareDir}" -type f -path "*/lib/trace/tracer.js"`,
    { encoding: 'utf8' }
  ).trim();

  if (!findResult) {
    console.log('⚠️  Tracer file not found in middleware bundle');
    process.exit(0);
  }

  tracerPath = findResult.split('\n')[0]; // Use first match
  console.log(`Found tracer at: ${tracerPath}`);
} catch (error) {
  console.log('⚠️  Could not locate tracer file:', error.message);
  process.exit(0);
}

let content = fs.readFileSync(tracerPath, 'utf8');

// Check if already patched
if (content.includes('// PATCHED: OpenTelemetry API')) {
  console.log('✓ Tracer already patched for OpenTelemetry');
  process.exit(0);
}

// Replace the require statement with a try-catch wrapped version
const originalRequire = "api = require('@opentelemetry/api');";
const patchedRequire = `// PATCHED: OpenTelemetry API optional for Cloudflare Workers
try {
  api = require('@opentelemetry/api');
} catch (e) {
  // OpenTelemetry API not available, tracing will be disabled
  api = null;
}`;

if (content.includes(originalRequire)) {
  content = content.replace(originalRequire, patchedRequire);
  fs.writeFileSync(tracerPath, content, 'utf8');
  console.log('✓ Patched middleware tracer.js to handle missing @opentelemetry/api');
} else {
  console.log('⚠️  Could not find OpenTelemetry require statement to patch');
}

#!/usr/bin/env node
/**
 * Post-build script to patch Next.js tracer.js to handle missing @opentelemetry/api
 * This wraps the require('@opentelemetry/api') in a try-catch to prevent bundling errors
 */

const fs = require('fs');
const path = require('path');

// Path to the tracer file in the .next build output
const tracerPath = path.join(__dirname, '../.next/server/lib/trace/tracer.js');

if (!fs.existsSync(tracerPath)) {
  console.log('⚠️  Tracer file not found, skipping OpenTelemetry patch');
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
  console.log('✓ Patched Next.js tracer.js to handle missing @opentelemetry/api');
} else {
  console.log('⚠️  Could not find OpenTelemetry require statement to patch');
}

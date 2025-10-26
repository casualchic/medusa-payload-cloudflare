# Build Pipeline & Bundler Architecture

## Overview

This document explains the build tools, bundlers, and deployment pipeline for the Casual Chic Boutique storefront running on Cloudflare Workers with Next.js 16 and Payload CMS.

## 🎯 Tech Stack Summary

| Component | Tool | Purpose |
|-----------|------|---------|
| **Framework** | Next.js 16 | React framework with SSR/SSG |
| **CMS** | Payload CMS 3.61 | Headless CMS |
| **Database** | Cloudflare D1 | SQLite on the edge |
| **Runtime** | Cloudflare Workers | Serverless edge compute |
| **Dev Bundler** | Turbopack (default in Next.js 16) | Fast development builds |
| **Prod Bundler** | Webpack (CI) / Turbopack (local) | Production builds (CI uses --webpack for drizzle-kit compatibility) |
| **Adapter** | @opennextjs/cloudflare | Adapts Next.js for Workers |
| **Test Runner** | Vitest (powered by Vite) | Unit/integration tests |
| **Deployment** | Wrangler + OpenNext CLI | Cloudflare deployment |

---

## 📦 Build Tools Deep Dive

### 1. Turbopack (Default in Next.js 16)

**Role:** Primary bundler for both development and production

**When it runs:**
- `pnpm dev` - Development server
- `pnpm build` - Production builds

**What it does:**
- Bundles JavaScript/TypeScript for client and server
- Handles Hot Module Replacement (HMR) in dev
- 2-5× faster production builds vs Webpack
- Up to 10× faster Fast Refresh

**Configuration:**
```typescript
// next.config.ts
turbopack: {}, // Minimal config needed
```

**Note:** Turbopack is the default. To use Webpack as a fallback, add `--webpack` flag explicitly.

---

### 2. Webpack (Fallback Only)

**Role:** Fallback bundler if Turbopack has issues

**When it runs:**
- Only when explicitly using `next dev --webpack` or `next build --webpack`

**Configuration:**
```typescript
// next.config.ts
webpack: (webpackConfig) => {
  // Cloudflare-specific file extension resolution
  webpackConfig.resolve.extensionAlias = {
    '.cjs': ['.cts', '.cjs'],
    '.js': ['.ts', '.tsx', '.js', '.jsx'],
    '.mjs': ['.mts', '.mjs'],
  }
  return webpackConfig
}
```

**Why keep it?**
- Provides fallback if Turbopack encounters issues
- Required for some edge cases in Cloudflare Workers

---

### 3. esbuild

**Role:** Ultra-fast JavaScript/TypeScript bundler used internally by other tools

**When it runs:**
- During `opennextjs-cloudflare build` (re-bundles for Workers runtime)
- During `vitest` (transpiles test files)
- As a transitive dependency of `drizzle-kit`, `vite`, `tsx`, etc.

**What it does:**
- Re-bundles Next.js server code for Cloudflare Workers V8 runtime
- Transpiles TypeScript in tests (via Vitest)
- Handles module resolution and tree-shaking

**Version:** Locked to `^0.25.11` via `package.json` overrides
- Fixes Turbopack compatibility with `drizzle-kit`
- Ensures consistent version across all tools

```json
// package.json
"resolutions": {
  "esbuild": "^0.25.11"
},
"overrides": {
  "esbuild": "^0.25.11"
}
```

---

### 4. OpenNext Cloudflare (@opennextjs/cloudflare)

**Role:** Adapter that transforms Next.js builds for Cloudflare Workers

**When it runs:**
- `pnpm preview` - Local Cloudflare Workers testing
- `pnpm deploy:app` - Production deployment

**What it does:**
1. Takes the Next.js build output (from Turbopack)
2. Re-bundles server code using esbuild for Workers runtime
3. Splits routes into separate Workers functions
4. Generates Cloudflare-compatible deployment artifacts
5. Handles D1 database bindings and environment variables

**Configuration:**
```typescript
// open-next.config.ts
import { defineCloudflareConfig } from '@opennextjs/cloudflare/config'

export default defineCloudflareConfig({
  // Using default configuration
  // OpenNext handles bundling and external dependencies automatically
})
```

**Development Integration:**
```typescript
// next.config.ts
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

if (process.env.NODE_ENV === 'development') {
  initOpenNextCloudflareForDev() // Integrates dev server with Cloudflare adapter
}
```

---

### 5. Vite (Test Infrastructure Only)

**Role:** Build tool powering Vitest test runner

**When it runs:**
- `pnpm test:unit` - Unit tests
- `pnpm test:int` - Integration tests

**What it does:**
- Provides fast test execution environment
- Uses esbuild internally for TypeScript transpilation
- **NOT used for production app bundling**

**Why not use Vite for the main app?**
- Next.js is an opinionated framework with its own bundlers
- Payload CMS is tightly integrated with Next.js architecture
- Vite is designed for different frameworks (React SPA, Vue, Svelte, etc.)

**Configuration:**
```typescript
// vitest.config.mts & vitest.unit.config.mts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Vitest-specific test configuration
})
```

---

### 6. Wrangler (Cloudflare CLI)

**Role:** Cloudflare Workers deployment and management tool

**When it runs:**
- `pnpm deploy:database` - D1 database migrations
- `pnpm generate:types:cloudflare` - Generate Cloudflare types
- Implicitly during `opennextjs-cloudflare deploy`

**What it does:**
- Deploys Workers to Cloudflare
- Manages D1 database (migrations, queries)
- Generates TypeScript types for Cloudflare environment
- **NOT a bundler** - it's a deployment/management CLI

**Example usage:**
```bash
wrangler d1 execute D1 --command 'PRAGMA optimize' --env=production
wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts
```

---

## 🚀 Build Pipeline Workflows

### Development Workflow

```text
You write code
    ↓
next dev (Turbopack - default)
    ↓
initOpenNextCloudflareForDev() integrates Cloudflare bindings
    ↓
Hot Module Replacement (HMR)
    ↓
View in browser at localhost:3000
```

**Commands:**
```bash
pnpm dev         # Start dev server (default port 3000)
pnpm dev:local   # Start dev server on port 8000
pnpm dev:cloud   # Start with production env vars
```

**Bundler:** Turbopack (default, no flags needed)

---

### Production Build Workflow

```text
next build (Turbopack - default)
    ↓
Creates .next/ folder with optimized bundles
    ↓
Client bundles: JavaScript, CSS, static assets
    ↓
Server bundles: API routes, pages, Payload CMS
```

**Commands:**
```bash
pnpm build        # Production build
pnpm build:local  # Build with local config
pnpm build:cloud  # Build with production env vars
```

**Output:** `.next/` directory with production-ready artifacts

---

### Preview Workflow (Test Cloudflare Workers Locally)

```text
next build (Turbopack)
    ↓
opennextjs-cloudflare build
    ↓
esbuild re-bundles for Workers runtime
    ↓
Creates .open-next/ directory
    ↓
opennextjs-cloudflare preview
    ↓
Local Cloudflare Workers simulator
    ↓
Test at localhost with Workers environment
```

**Commands:**
```bash
pnpm preview        # Preview with CLOUDFLARE_ENV
pnpm preview:local  # Preview without env
```

**Purpose:** Test your app in a local Cloudflare Workers environment before deploying

---

### Deployment Workflow

```text
Database Migration:
  payload migrate
      ↓
  wrangler d1 execute (PRAGMA optimize)

Application Deployment:
  next build (Turbopack)
      ↓
  opennextjs-cloudflare build (esbuild)
      ↓
  Creates Workers-compatible bundles
      ↓
  opennextjs-cloudflare deploy
      ↓
  wrangler uploads to Cloudflare
      ↓
  App runs on Cloudflare Workers
```

**Commands:**
```bash
pnpm deploy               # Full deployment (DB + app)
pnpm deploy:database      # Database migrations only
pnpm deploy:app           # Application deployment only
```

**Environment:** Uses `$CLOUDFLARE_ENV` to target staging/production

---

### Testing Workflow

```text
Test files (.test.ts)
    ↓
Vitest (powered by Vite)
    ↓
esbuild transpiles TypeScript
    ↓
Tests run in Node.js environment
    ↓
Results displayed in terminal
```

**Commands:**
```bash
pnpm test        # Run all tests (unit + int + e2e)
pnpm test:unit   # Unit tests only
pnpm test:int    # Integration tests only
pnpm test:e2e    # End-to-end tests (Playwright)
```

**Bundler:** esbuild (via Vite/Vitest)

---

## 🔧 Common Questions

### Q: Why multiple bundlers?

**A:** Each serves a non-overlapping purpose:
- **Turbopack**: Fast dev + production builds for Next.js
- **esbuild**: Workers runtime adaptation + test transpilation
- **Vite**: Test infrastructure only

### Q: Can I switch to Webpack?

**A:** Yes, add `--webpack` flag to dev/build commands:
```bash
pnpm dev --webpack
pnpm build --webpack
```

But Turbopack is recommended for better performance.

### Q: Why not use Vite instead of Next.js?

**A:**
- Next.js provides full-stack framework with SSR/SSG
- Payload CMS requires Next.js architecture
- Vite is better for SPAs, not full-stack CMS apps

### Q: Do I need to configure esbuild?

**A:** No, esbuild is configured automatically by:
- OpenNext Cloudflare (for Workers bundling)
- Vitest (for test transpilation)

Just ensure version is locked to `^0.25.11` in `package.json`.

### Q: What is `initOpenNextCloudflareForDev()`?

**A:** It integrates the Next.js dev server with Cloudflare bindings:
- Provides access to D1 database in development
- Simulates Cloudflare environment variables
- Enables testing Workers-specific features locally

### Q: When should I use `pnpm preview`?

**A:** Use `preview` when you want to:
- Test the app in a Cloudflare Workers environment
- Verify production build before deployment
- Debug Workers-specific issues

---

## 📊 Dependency Chart

```text
Your Application
    │
    ├── Development
    │   ├── Next.js dev (Turbopack)
    │   └── initOpenNextCloudflareForDev()
    │
    ├── Production Build
    │   └── Next.js build (Turbopack)
    │
    ├── Cloudflare Adaptation
    │   ├── OpenNext Cloudflare (esbuild)
    │   └── Wrangler (deployment)
    │
    └── Testing
        └── Vitest (Vite + esbuild)
```

---

## ✅ Optimization Checklist

- [x] Turbopack enabled by default (Next.js 16)
- [x] Redundant `--turbopack` flags removed
- [x] `initOpenNextCloudflareForDev()` integrated
- [x] Webpack config kept as fallback
- [x] esbuild version locked to `^0.25.11`
- [x] Preview scripts configured
- [x] OpenNext Cloudflare properly configured
- [x] Vite used only for testing

---

## 🎓 Learn More

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [Turbopack Documentation](https://turbo.build/pack/docs)
- [OpenNext Cloudflare Guide](https://opennext.js.org/cloudflare)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Vite Documentation](https://vite.dev/)
- [Vitest Documentation](https://vitest.dev/)

---

**Last Updated:** 2025-10-24
**Next.js Version:** 16.0.0
**OpenNext Cloudflare Version:** 1.11.0

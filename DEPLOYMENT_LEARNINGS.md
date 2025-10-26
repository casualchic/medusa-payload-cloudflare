# 🚀 Cloudflare Workers Deployment Learnings

## 📋 **Project Overview**
- **Storefront**: Next.js + Medusa e-commerce frontend
- **Admin Panel**: Payload CMS for content management
- **Backend**: Medusa.js hosted on Medusa Cloud
- **Deployment**: Cloudflare Workers with D1 Database and R2 Storage

## 🔑 **Critical Learnings**

### 1. **Publishable Keys vs Secrets**
**❌ WRONG**: Treating publishable keys as Cloudflare secrets
```bash
# Don't do this
wrangler secret put NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
```

**✅ CORRECT**: Configure as regular environment variables
```json
// wrangler.jsonc
{
  "env": {
    "production": {
      "vars": {
        "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY": "pk_..."
      }
    }
  }
}
```

**Why**: Publishable keys are meant to be public and accessible to client-side code.

### 2. **Environment Variable Access in Cloudflare Workers**

**Required Compatibility Flags:**
```json
{
  "compatibility_flags": [
    "nodejs_compat",
    "nodejs_compat_populate_process_env", // ← Critical!
    "global_fetch_strictly_public"
  ]
}
```

**Issue**: Even with `nodejs_compat_populate_process_env`, `process.env` variables weren't accessible at runtime.

**Temporary Solution**: Hardcode publishable key in data files:
```typescript
// src/lib/data/regions.ts
const PUBLISHABLE_KEY = 'pk_f086d3c7cf6026676f9eef829d75bfcfdc8ca77ae1eeafbb2e06d367938ac456'
```

### 3. **Database Binding Configuration**

**Critical**: Database binding names must match between `wrangler.jsonc` and `payload.config.ts`:

```json
// wrangler.jsonc
{
  "d1_databases": [
    {
      "binding": "DB", // ← Must match payload config
      "database_id": "ff3f3e29-01bf-4ffa-9826-3897676844b2",
      "database_name": "cc3-payload-db"
    }
  ]
}
```

```typescript
// src/payload.config.ts
adapter: sqliteD1Adapter({
  cloudflare: {
    env: cloudflare.env.DB // ← Must match wrangler binding
  }
})
```

### 4. **Payload CMS Secret Configuration**

**Working Configuration:**
```typescript
// src/payload.config.ts
secret: cloudflare.env?.PAYLOAD_SECRET || process.env.PAYLOAD_SECRET || 'fallback-secret-key'
```

**Cloudflare Secret Setup:**
```bash
wrangler secret put PAYLOAD_SECRET
```

### 5. **Middleware Edge Runtime Compatibility**

**Issue**: Dynamic code generation (`eval()`) not allowed in Edge Runtime

**Solution**: Simplified middleware without dynamic imports:
```typescript
// src/middleware.ts - Simplified version
export async function middleware(request: NextRequest) {
  // Simple redirect logic without dynamic code generation
}
```

### 6. **Build Process & Dependencies**

**Updated Versions:**
- Next.js: `^16.0.0` (latest)
- Payload CMS: `^3.61.1` (latest)

**Workspace Configuration:**
```typescript
// next.config.ts
const nextConfig = {
  outputFileTracingRoot: __dirname, // ← Fixes multiple lockfiles warning
}
```

**Critical: OpenTelemetry API Externalization**

**Issue**: Next.js 16 middleware includes OpenTelemetry tracing that requires `@opentelemetry/api`. This package has platform-specific code incompatible with Cloudflare Workers V8 runtime.

**Error During Deployment:**
```
✘ [ERROR] Could not resolve "@opentelemetry/api"
  .open-next/middleware/.next/server/lib/trace/tracer.js:46:18
```

**Solution**: Mark as external in `serverExternalPackages`:
```typescript
// next.config.ts
serverExternalPackages: ['drizzle-kit', 'esbuild-register', 'esbuild', '@opentelemetry/api']
```

**How It Works:**
1. Next.js has try/catch: attempts `require('@opentelemetry/api')`, falls back to compiled version
2. By marking as external, bundler skips the package
3. At runtime, require fails (not bundled), Next.js uses its built-in fallback
4. No platform-specific code needs resolution → deployment succeeds

**⚠️ IMPORTANT**: Do NOT remove `@opentelemetry/api` from `serverExternalPackages`
- Regression test in `tests/unit/dependencies.test.ts` prevents accidental removal
- PR builds may pass but main branch deployment will fail without it
- Related PRs: #36, #45, #46

**Alternative Attempted (Failed):**
Installing `@opentelemetry/api` as dependency causes new bundling errors with platform-specific code. Externalization is the only working solution.

**Final Solution (PR #48):**
Prevent pnpm from auto-installing the peer dependency:
```json
// package.json
"pnpm": {
  "peerDependencyRules": {
    "ignoreMissing": ["@opentelemetry/api"]
  }
}
```

**Why This Was Needed:**
- Even after removing @opentelemetry/api from devDependencies (PR #46)
- And adding serverExternalPackages config (PR #46, #47)
- pnpm was still auto-installing it as a peer dependency of next@16 and drizzle-orm
- This caused the package to appear in `.open-next/middleware/node_modules/`
- Leading to the same platform resolution errors during Wrangler bundling

**Complete Solution Stack:**
1. ✅ `serverExternalPackages: ['@opentelemetry/api']` - Runtime externalization
2. ✅ `peerDependencyRules.ignoreMissing` - Prevent auto-installation
3. ✅ NOT in devDependencies - Explicit removal
Result: Package never installed → Never bundled → Deployment succeeds

**Verification:**
```bash
# Verify the package is not installed
pnpm install && test ! -d node_modules/@opentelemetry/api && echo "✅ Not installed"
```

**Test Coverage:**
- Regression tests in `tests/unit/dependencies.test.ts` prevent accidental removal of configuration
- Tests verify serverExternalPackages, peerDependencyRules, and package absence in lockfile
- CI workflow validates successful build without the package (integration test)

**Future Monitoring:**
If Next.js or Drizzle ORM make `@opentelemetry/api` a required (non-optional) peer dependency:
- Unit tests will continue passing (package correctly excluded)
- Build may fail if package becomes truly required
- Solution: Re-evaluate externalization approach or investigate Cloudflare Workers OpenTelemetry support

### 7. **Turbopack Build Support (Drizzle ORM Compatibility)**

**Issue**: Next.js Turbopack (experimental bundler) fails when parsing Drizzle ORM's libSQL driver dependencies.

**Error When Using `--turbopack`:**
```
Error: Turbopack build failed with 1 errors:
./node_modules/libsql/hrana-client/LICENSE
Parsing ecmascript source code failed
> 1 | MIT License
    | ^^^^^^^
```

**Root Cause:**
- Turbopack's file tracing (NFT) step attempts to parse non-JavaScript files (LICENSE, binaries) as JavaScript modules
- The libsql-js v0.5.x package uses dynamic `require()` that confuses Turbopack's static module resolution
- Webpack does not have this issue because it handles file resolution differently

**Solution: Force libsql v0.6.0+**
```json
// package.json
{
  "resolutions": {
    "libsql": "^0.6.0"
  },
  "overrides": {
    "libsql": "^0.6.0"
  }
}
```

**Why This Works:**
- libsql v0.6.0-pre.18+ contains fixes for the dynamic import issues
- The v0.6.0 stable release eliminates problematic dynamic imports that confused Turbopack
- This allows using `next build --turbopack` for faster builds

**Alternative Workarounds (Not Recommended):**
1. ❌ Remove LICENSE file before build: `rm -f ./node_modules/libsql/hrana-client/LICENSE && next build --turbopack`
2. ❌ Use isolated linker: `bun install --linker isolated`
3. ✅ **Recommended**: Use libsql v0.6.0+ override + pnpm (current setup)

**Status:**
- ✅ libsql v0.6.0+ override added to package.json (fixes libSQL/Turbopack parsing issue)
- ✅ Using pnpm package manager (recommended for this issue)
- ❌ **Turbopack currently incompatible with Payload CMS + Drizzle stack**

**Additional Turbopack Limitation Discovered:**

After resolving the libsql issue, Turbopack encounters another blocker with Payload CMS's Drizzle adapter:

```
Error: Turbopack build failed with 2 errors:
./node_modules/@esbuild/darwin-arm64/README.md - Unknown module type
./node_modules/@esbuild/darwin-arm64/bin/esbuild - Reading source code for parsing failed
```

**Root Cause:**
- Payload CMS's D1/SQLite adapter requires `drizzle-kit` at build time
- `drizzle-kit` has a dependency chain: `drizzle-kit → esbuild-register → esbuild`
- Turbopack attempts to parse binary files (`.node` executables) and non-JS files (READMEs) as JavaScript
- `serverExternalPackages` only affects runtime, not Turbopack's build-time file tracing

**Current Recommendation:**
- ✅ **Use Webpack for all builds** - Added `--webpack` flag to build scripts
- ⚠️ **Next.js 16 made Turbopack the default bundler** - Must explicitly opt-in to Webpack
- ⏳ **Wait for Turbopack maturity** - This is a known limitation tracked in Next.js issues

**Updated Build Scripts (package.json):**
```json
{
  "scripts": {
    "build": "next build --webpack",
    "build:local": "next build --webpack",
    "build:cloud": "next build --webpack"
  }
}
```

**Why --webpack Flag is Required:**
- Next.js 16.0.0 made Turbopack the default bundler for both dev and production
- Without `--webpack` flag, builds will fail with Drizzle/esbuild binary parsing errors
- The flag explicitly opts out of Turbopack and uses the stable Webpack bundler
- This is the officially recommended approach for projects with custom webpack configs or incompatible dependencies

**When Turbopack Will Work:**
- When Turbopack adds better support for binary dependencies
- When Payload CMS/Drizzle move away from build-time `drizzle-kit` requirement
- Estimated: Next.js 17+ (Turbopack will become stable default)

**Related GitHub Issues:**
- Vercel Next.js: #82881
- libsql-js: Merged fixes for v0.6.0 stable release

**Benefits of Turbopack:**
- Faster incremental builds
- Better tree-shaking
- Improved development experience
- Future-proof for Next.js (will become default)

### 8. **Static Generation Resilience**

**Issue**: Build failures when Medusa backend unavailable during static generation

**Solution**: Wrap `generateStaticParams` in try-catch blocks:
```typescript
export async function generateStaticParams() {
  try {
    // Fetch data from Medusa
    return params
  } catch (error) {
    console.error('Error in generateStaticParams:', error)
    return [] // Return empty array to make page dynamic
  }
}
```

### 9. **Fallback Data for Offline Resilience**

**Added fallback data in data fetching functions:**
```typescript
// src/lib/data/collections.ts
export const listCollections = async () => {
  try {
    // Fetch from Medusa
    return data
  } catch (error) {
    console.error('Error in listCollections:', error)
    // Return fallback data
    return { collections: fallbackCollections, count: fallbackCollections.length }
  }
}
```

## 🛠️ **Current Working Configuration**

### Environment Variables (wrangler.jsonc)
```json
{
  "vars": {
    "NODE_ENV": "production"
  },
  "env": {
    "production": {
      "name": "cc3-storefront",
      "vars": {
        "NODE_ENV": "production",
        "MEDUSA_BACKEND_URL": "https://casual-chic.medusajs.app",
        "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY": "pk_f086d3c7cf6026676f9eef829d75bfcfdc8ca77ae1eeafbb2e06d367938ac456"
      },
      "d1_databases": [
        {
          "binding": "DB",
          "database_id": "ff3f3e29-01bf-4ffa-9826-3897676844b2",
          "database_name": "cc3-payload-db",
          "remote": true
        }
      ],
      "services": [],
      "r2_buckets": [
        {
          "binding": "R2",
          "bucket_name": "cc3-media"
        }
      ]
    }
  }
}
```

### Compatibility Flags
```json
{
  "compatibility_flags": [
    "nodejs_compat",
    "nodejs_compat_populate_process_env",
    "global_fetch_strictly_public"
  ]
}
```

## 🚀 **Deployment Commands**

### Manual Deployment
```bash
CLOUDFLARE_ENV=production pnpm run deploy:app
```

### GitHub Actions CI/CD
- Workflow: `.github/workflows/deploy.yml`
- Triggers: Push to main branch
- Secrets required: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

## 🏗️ **Architectural Decisions & Trade-offs**

### Webpack vs Turbopack/Vite Consolidation

**Context:**
- Medusa Backend (Cloud): Uses Vite ⚡
- Vitest (Testing): Uses Vite ⚡
- Next.js Frontend: Uses Webpack ⚙️ (forced by Payload + Drizzle)

**Why We Can't Consolidate to Vite/Turbopack:**
1. Payload CMS 3.x uses Drizzle ORM for all SQL adapters (PostgreSQL, SQLite, D1)
2. Drizzle requires `drizzle-kit` at build time → requires `esbuild-register` → has binary files
3. Turbopack/Vite cannot parse esbuild's binary files
4. Only the MongoDB adapter avoids Drizzle (but loses D1 integration)

**Decision:** Continue using Webpack until:
- Vercel offers capabilities Cloudflare cannot match, OR
- Payload CMS needs features not available in D1 adapter, OR
- D1 SQLite vs Medusa PostgreSQL interface complexity causes operational issues

**Current Database Architecture:**
- **Medusa Backend:** PostgreSQL (Medusa Cloud)
- **Payload CMS:** D1 SQLite (Cloudflare)
- **Trade-off:** Different SQL dialects, but acceptable for current needs

**Future Migration Paths (If Needed):**
1. **All-Cloudflare:** Migrate Medusa to Workers + D1 (unified SQLite stack)
2. **All-Vercel:** Migrate storefront to Vercel + Vercel Postgres (unified PostgreSQL, enables Turbopack)
3. **Payload MongoDB:** Switch to MongoDB adapter (enables Turbopack, loses D1)

**Status:** Webpack solution is acceptable and stable. Migration only justified by business/technical requirements, not developer convenience.

## 🎯 **Next Steps**

### 1. **Proper Environment Variable Access**
- Investigate why `process.env` isn't populated at runtime
- Find correct way to access Cloudflare environment variables in Next.js
- Replace hardcoded publishable keys with proper environment variable access

### 2. **GitHub Integration**
- Set up GitHub repository
- Configure secrets in GitHub repository settings
- Enable automated deployments

### 3. **Content Setup**
- Add products and collections to Medusa backend
- Configure sales channels
- Set up proper product data

## 📊 **Current Status**
- ✅ **Admin Panel**: Fully functional (Payload CMS)
- ✅ **Storefront**: Fully functional (Next.js + Medusa)
- ✅ **Database**: Working (D1)
- ✅ **Storage**: Working (R2)
- ✅ **Environment Variables**: Configured (with hardcoded fallbacks)
- ⚠️ **Environment Access**: Temporary hardcoded solution
- ⚠️ **CI/CD**: Workflow created, needs GitHub setup

## 🔗 **Important URLs**
- **Storefront**: https://cc3-storefront.ian-rothfuss.workers.dev/us
- **Admin Panel**: https://cc3-storefront.ian-rothfuss.workers.dev/admin
- **Medusa Backend**: https://casual-chic.medusajs.app

## 📝 **Key Commands**
```bash
# Install dependencies
pnpm install

# Local development
pnpm run dev

# Build and deploy
CLOUDFLARE_ENV=production pnpm run deploy:app

# Check logs
pnpm wrangler tail cc3-storefront --format=pretty

# Set secrets
wrangler secret put PAYLOAD_SECRET
```

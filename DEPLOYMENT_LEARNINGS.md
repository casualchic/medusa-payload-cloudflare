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
- Next.js: `^15.5.6` (from 15.4.4)
- Payload CMS: `^3.60.0` (from 3.59.1)

**Workspace Configuration:**
```typescript
// next.config.ts
const nextConfig = {
  outputFileTracingRoot: __dirname, // ← Fixes multiple lockfiles warning
}
```

### 7. **Static Generation Resilience**

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

### 8. **Fallback Data for Offline Resilience**

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

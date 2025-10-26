# GitHub Actions Workflow Optimization Analysis

## Current vs Recommended Setup

### Your Current Setup (.github/workflows/deploy.yml)

```yaml
steps:
  - uses: actions/checkout@v4

  - name: Setup Node.js
    uses: actions/setup-node@v4
    with:
      node-version: '20'

  - name: Setup pnpm
    uses: pnpm/action-setup@41ff72655975bd51cab0327fa583b6e92b6d3061 # v4
    with:
      version: 9.15.9

  - name: Get pnpm store directory
    shell: bash
    run: |
      echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

  - name: Setup pnpm cache
    uses: actions/cache@v4
    with:
      path: ${{ env.STORE_PATH }}
      key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
      restore-keys: |
        ${{ runner.os }}-pnpm-store-

  - name: Install dependencies
    run: pnpm install --frozen-lockfile
```

### Recommended Setup (pnpm docs)

```yaml
steps:
  - uses: actions/checkout@v4

  - name: Install pnpm
    uses: pnpm/action-setup@v4
    with:
      version: 10

  - name: Use Node.js ${{ matrix.node-version }}
    uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node-version }}
      cache: "pnpm"  # ← Built-in caching!

  - name: Install dependencies
    run: pnpm install
```

## Key Differences

| Aspect | Your Setup | Recommended Setup | Verdict |
|--------|------------|-------------------|---------|
| **pnpm setup order** | After Node.js | Before Node.js | ⚠️ Order matters |
| **Cache mechanism** | Manual with `actions/cache@v4` | Built-in `cache: "pnpm"` | ⚠️ Simpler approach available |
| **pnpm version** | 9.15.9 | 10 (latest) | ⚠️ Consider upgrading |
| **Commit SHA pinning** | ✅ Yes (security best practice) | ❌ No | ✅ Your approach better |
| **Extra caches** | Next.js + Vitest | None | ✅ Your approach better |

## Detailed Analysis

### 1. ⚠️ Setup Order Issue

**Problem**: You set up Node.js BEFORE pnpm

**Recommended**: Set up pnpm BEFORE Node.js

**Why?**
```yaml
# Recommended order:
1. pnpm/action-setup      # Sets up pnpm
2. actions/setup-node     # Discovers pnpm and enables built-in caching
   with:
     cache: "pnpm"         # ← This only works if pnpm was set up first
```

When `actions/setup-node` runs:
- It looks for `package-manager` in `package.json` or detects lock files
- If pnpm is already installed, it can use built-in caching via `cache: "pnpm"`
- If pnpm isn't installed yet, built-in caching won't work

**Your current order prevents the built-in cache from working.**

### 2. 🤔 Manual Cache vs Built-in Cache

#### Your Current Manual Cache

```yaml
- name: Get pnpm store directory
  run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

- name: Setup pnpm cache
  uses: actions/cache@v4
  with:
    path: ${{ env.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
```

**Pros**:
- ✅ Full control over cache configuration
- ✅ Explicit cache path
- ✅ Works reliably

**Cons**:
- ❌ More verbose (2 extra steps)
- ❌ Requires manual maintenance
- ❌ Duplicates what `actions/setup-node` can do

#### Recommended Built-in Cache

```yaml
- name: Use Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: "pnpm"  # ← Automatic!
```

**Pros**:
- ✅ Simple (1 line)
- ✅ Maintained by actions/setup-node
- ✅ Handles cache keys automatically

**Cons**:
- ❌ Less control over cache behavior
- ❌ Requires pnpm to be installed BEFORE this step

### 3. ✅ Your Advanced Caching Strategy

You have **additional caches** that the recommended setup doesn't:

```yaml
- name: Cache Next.js build
  uses: actions/cache@v4
  with:
    path: .next/cache
    # ... smart cache keys

- name: Cache Vitest
  uses: actions/cache@v4
  with:
    path: node_modules/.vitest
    # ... smart cache keys
```

**This is EXCELLENT** - keep these! The pnpm docs example is minimal and doesn't include these optimizations.

### 4. ⚠️ pnpm Version: 9.15.9 vs 10

**Your choice**: `version: 9.15.9`
**Recommended**: `version: 10`

**pnpm v10 was released in November 2024** with:
- Faster installs
- Better workspace support
- Improved cache efficiency
- No breaking changes for most projects

**Should you upgrade?**
- Check package.json: `"pnpm": "^9 || ^10"` ✅ Already compatible!
- Test locally first: `pnpm --version` (you're on 9.15.9)
- Upgrade when convenient, not urgent

### 5. ✅ Commit SHA Pinning (Security Best Practice)

**Your approach**:
```yaml
uses: pnpm/action-setup@41ff72655975bd51cab0327fa583b6e92b6d3061 # v4
```

**Recommended approach**:
```yaml
uses: pnpm/action-setup@v4
```

**Winner**: Your approach is MORE secure!

**Why?**
- Pinning to SHA prevents supply chain attacks
- If the `v4` tag is moved maliciously, you're protected
- This is a [GitHub Actions security best practice](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions#using-third-party-actions)

**Keep your approach** - it's better than the docs example.

## Recommendations

### Option A: Minimal Changes (Recommended) ✅

**Goal**: Fix setup order, keep advanced caching

```yaml
steps:
  - uses: actions/checkout@v4

  # 1. Setup pnpm FIRST (moved up)
  - name: Setup pnpm
    uses: pnpm/action-setup@41ff72655975bd51cab0327fa583b6e92b6d3061 # v4
    with:
      version: 9.15.9

  # 2. Setup Node.js with built-in cache
  - name: Setup Node.js
    uses: actions/setup-node@v4
    with:
      node-version: '20'
      cache: 'pnpm'  # ← Add this!

  # 3. Remove manual pnpm cache steps (no longer needed)
  # DELETE:
  # - name: Get pnpm store directory
  # - name: Setup pnpm cache

  # 4. Keep advanced caches
  - name: Cache Next.js build
    uses: actions/cache@v4
    with:
      path: .next/cache
      # ... existing config

  - name: Cache Vitest
    uses: actions/cache@v4
    with:
      path: node_modules/.vitest
      # ... existing config

  - name: Install dependencies
    run: pnpm install --frozen-lockfile
```

**Benefits**:
- ✅ Simpler (2 fewer steps)
- ✅ Uses built-in cache (maintained by GitHub)
- ✅ Keeps advanced Next.js + Vitest caching
- ✅ Maintains security (SHA pinning)

### Option B: Stay with Current Setup

**If you prefer**:
- Keep current manual caching approach
- It works fine, just more verbose
- Both approaches have similar performance

**Only change**: Fix the order (pnpm before Node.js)

```yaml
# Just swap these two:
- name: Setup pnpm          # ← Move this BEFORE Node.js
- name: Setup Node.js       # ← This comes AFTER pnpm
```

### Option C: Upgrade to pnpm v10

**After testing locally**:

```yaml
- name: Setup pnpm
  uses: pnpm/action-setup@41ff72655975bd51cab0327fa583b6e92b6d3061 # v4
  with:
    version: 10  # ← Update from 9.15.9
```

**Test first**:
```bash
# Locally:
pnpm --version  # Check current version
npx pnpm@10 install  # Test v10
pnpm run build  # Verify everything works
pnpm run test   # Verify tests pass
```

## Medusa Compatibility Note

### Your .npmrc

```ini
legacy-peer-deps=true
```

**Context**: You mentioned Medusa had transitive dependency issues.

**Analysis**:
- ✅ `legacy-peer-deps=true` is correct for Medusa compatibility
- ✅ This is NOT related to `nodeLinker` (hoisting)
- ✅ This tells pnpm to be lenient with peer dependencies
- ✅ Medusa has some packages with mismatched peer deps

**Do you need `public-hoist-pattern`?** ❌ NO

Some projects add:
```ini
public-hoist-pattern[]=@medusajs/*
```

**You DON'T need this because**:
- Your code is bundled (esbuild resolves everything)
- You're not having import issues
- `legacy-peer-deps=true` already solves the Medusa compatibility

**Keep your current `.npmrc`** - it's correct!

## Performance Impact

### Current Setup Performance

```text
Workflow Run Time Breakdown (estimated):
- Checkout code: ~3s
- Setup Node.js: ~2s
- Setup pnpm: ~1s
- Cache restore (manual): ~2s
- pnpm install: ~15-30s (first run) / ~5-10s (cached)
- Cache Next.js: ~1s
- Cache Vitest: ~1s
```

### Optimized Setup Performance

```text
Workflow Run Time Breakdown (estimated):
- Checkout code: ~3s
- Setup pnpm: ~1s
- Setup Node.js + cache restore: ~2s (combined)
- pnpm install: ~15-30s (first run) / ~5-10s (cached)
- Cache Next.js: ~1s
- Cache Vitest: ~1s
```

**Time saved**: ~2-3 seconds per run (minimal, but cleaner)

**Cache hit rate**: Should be identical between both approaches

## Migration Plan

### Step 1: Test Locally (Optional)

```bash
# Test pnpm v10
npx pnpm@10 install
pnpm run build
pnpm run test
```

### Step 2: Update Workflow

Apply Option A changes to `.github/workflows/deploy.yml`

### Step 3: Create PR

```bash
git checkout -b optimize-github-actions-workflow
# Edit .github/workflows/deploy.yml
git add .github/workflows/deploy.yml
git commit -m "Optimize GitHub Actions workflow caching"
git push
```

### Step 4: Verify in CI

- First PR build will be slower (cold cache)
- Second build should be fast (warm cache)
- Check Actions logs for cache hits

## Comparison Matrix

| Feature | Your Current Setup | Recommended Setup | Winner |
|---------|-------------------|-------------------|---------|
| **Setup order** | ❌ Node → pnpm | ✅ pnpm → Node | Recommended |
| **pnpm caching** | ✅ Manual (works) | ✅ Built-in (simpler) | Tie (built-in slightly better) |
| **Next.js caching** | ✅ Yes | ❌ No | Your setup |
| **Vitest caching** | ✅ Yes | ❌ No | Your setup |
| **Security (SHA pinning)** | ✅ Yes | ❌ No | Your setup |
| **pnpm version** | ⚠️ 9.15.9 | ⚠️ 10 (latest) | Consider upgrading |
| **Verbosity** | ⚠️ More steps | ✅ Fewer steps | Recommended |

**Overall verdict**: Your setup is VERY good, just needs minor tweaks!

## Final Recommendation

### ✅ Apply Option A: Fix Order + Use Built-in Cache

**Changes needed**:
1. Move pnpm setup BEFORE Node.js setup
2. Add `cache: 'pnpm'` to `actions/setup-node`
3. Remove manual pnpm cache steps (2 steps deleted)
4. Keep advanced Next.js + Vitest caches
5. Keep SHA pinning for security

**Result**:
- Simpler workflow
- Maintained security
- Same or better performance
- Keeps your advanced optimizations

### Optional Future Upgrade

When you have time:
- Test pnpm v10 locally
- Update `version: 9.15.9` → `version: 10`
- No rush - v9 works great

## References

- [pnpm CI Docs](https://pnpm.io/continuous-integration)
- [actions/setup-node caching](https://github.com/actions/setup-node#caching-global-packages-data)
- [GitHub Actions Security](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)

---

**Last Updated**: 2025-10-25
**pnpm Version**: 9.15.9
**Node.js Version**: 20
**Workflow**: `.github/workflows/deploy.yml`

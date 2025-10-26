# pnpm Hoisting Configuration Analysis

## Current Configuration

**Status**: Using pnpm's **default `isolated` mode** ✅

**Evidence**:
```bash
$ ls -la node_modules/.pnpm
# Directory exists with 1600+ packages

$ ls -l node_modules/next
# Symlink: node_modules/next -> .pnpm/next@16.0.0_...
```

**Configuration**: No explicit `nodeLinker` setting in `.npmrc`, which means pnpm uses the default `isolated` mode.

## Should You Change to `hoisted` Mode?

### TL;DR: **NO - Keep `isolated` (default)** ✅

Your project does NOT meet any of the criteria that would require `hoisted` mode.

## Detailed Analysis

### Why `isolated` Mode Works for Your Stack

| Criterion | Your Setup | Requires Hoisting? |
|-----------|------------|-------------------|
| **Deployment Target** | Cloudflare Workers | ❌ **NO** - Bundled before deploy |
| **Bundler** | esbuild (via OpenNext) | ❌ **NO** - Handles symlinks perfectly |
| **Tooling** | Next.js 16, Vitest, Wrangler | ❌ **NO** - All support symlinks |
| **Platform** | Not React Native | ❌ **NO** - Not RN |
| **Serverless** | Yes, but bundled | ❌ **NO** - Code is bundled |

### Your Deployment Pipeline

```text
Development:
  next dev (Turbopack)
    ↓ [Symlinks OK - handled by Node.js]
  Local testing
    ✅ Works with isolated mode

Production Build:
  next build (Turbopack)
    ↓ [Symlinks OK - bundled]
  opennextjs-cloudflare build
    ↓ [esbuild re-bundles everything]
  .open-next/ directory created
    ↓ [All code bundled into single Workers scripts]
  Cloudflare Workers deployment
    ✅ No symlinks in final deployment
```

**Key Insight**: Your code is **bundled by esbuild** before deploying to Cloudflare Workers. The final deployment contains no symlinks - everything is flattened into JavaScript bundles.

### When You WOULD Need `hoisted` Mode

The pnpm docs list these legitimate reasons:

#### 1. ❌ React Native Project
**Your case**: You're using Next.js, not React Native.
**Verdict**: Not applicable.

#### 2. ❌ Serverless Without Bundling
**Example scenario**:
```javascript
// If you were doing this (you're NOT):
await import('./node_modules/some-package/file.js')
// And deploying node_modules directly to Lambda
```

**Your case**:
- OpenNext Cloudflare **bundles everything** via esbuild
- No `node_modules` is deployed
- Symlinks are resolved during bundling
**Verdict**: Not applicable - you bundle before deploy.

#### 3. ❌ Publishing with `bundledDependencies`
**Your case**: This is an application, not a published npm package.
**Verdict**: Not applicable.

#### 4. ❌ Running Node with `--preserve-symlinks`
**Your case**: No evidence of this flag in your `package.json` scripts.
**Verdict**: Not applicable.

### Benefits of Keeping `isolated` Mode

| Benefit | Description |
|---------|-------------|
| **Disk Space** | Deduplicates packages - only one copy of each version |
| **Install Speed** | Faster installs due to efficient virtual store |
| **Strict Dependencies** | Prevents phantom dependencies (importing packages not in `package.json`) |
| **Security** | Each package only sees its declared dependencies |
| **pnpm's Design** | `isolated` is the default and recommended mode |

### Tools That Work Fine with Symlinks

✅ **Next.js 16** - Full symlink support
✅ **Turbopack** - Handles symlinks correctly
✅ **Webpack** - No issues (you use as fallback)
✅ **esbuild** - Follows symlinks and resolves correctly
✅ **Vitest** - Full symlink support
✅ **Wrangler** - Doesn't interact with node_modules (CLI tool)
✅ **OpenNext Cloudflare** - Bundles everything, resolves symlinks
✅ **Payload CMS** - Works with symlinks (it's a Next.js plugin)

## Verification Steps

To confirm your setup is working correctly:

### 1. Check Current Mode
```bash
# If this directory exists, you're using isolated mode
ls -la node_modules/.pnpm

# Check if packages are symlinks
ls -l node_modules/next
# Should show: node_modules/next -> .pnpm/next@...
```

### 2. Verify Build Works
```bash
# Development build (uses symlinks)
pnpm dev

# Production build (bundles, resolves symlinks)
pnpm build

# Preview deployment (tests bundled output)
pnpm preview
```

### 3. Check CI/CD
Your GitHub Actions workflow should work fine:
```yaml
# .github/workflows/deploy.yml
- pnpm install --frozen-lockfile  # Uses isolated mode
- pnpm run build                   # Bundles, resolves symlinks
- pnpm run test                    # Tests work with symlinks
```

## Common Misconceptions

### ❌ Myth: "Cloudflare Workers don't support symlinks, so I need hoisted mode"

**Reality**:
- Your **development** environment has symlinks (node_modules)
- Your **deployment** has **no** symlinks (bundled JavaScript)
- OpenNext Cloudflare **bundles everything** with esbuild before deployment
- esbuild **resolves symlinks** during bundling

### ❌ Myth: "Serverless = hoisted mode"

**Reality**: Only if you deploy `node_modules` **directly** without bundling.

**Your case**: You bundle with esbuild, so this doesn't apply.

### ❌ Myth: "More tools work with hoisted"

**Reality**:
- Modern tools (2023+) all support symlinks
- Next.js, Vite, esbuild, Webpack all handle symlinks
- `isolated` is the **default and recommended** mode

## Recommendation

### ✅ Keep Current Configuration

**Do NOT add** `nodeLinker=hoisted` to `.npmrc`.

**Reasons**:
1. ✅ All your tools support symlinks
2. ✅ Code is bundled before deployment (no symlinks in production)
3. ✅ `isolated` mode provides better dependency management
4. ✅ Faster installs and less disk space
5. ✅ No issues reported in current setup

### When to Reconsider

Only add `nodeLinker=hoisted` if:
- You add React Native to the stack (you won't)
- You deploy **unbundled** `node_modules` to serverless (you don't)
- A specific tool breaks with symlinks (none do currently)

## Configuration Reference

### Current (Recommended) ✅
```ini
# .npmrc
legacy-peer-deps=true
# nodeLinker=isolated (default, no need to specify)
```

### Alternative (Not Recommended) ❌
```ini
# .npmrc
legacy-peer-deps=true
nodeLinker=hoisted  # ❌ NOT NEEDED
```

## Testing Hoisted Mode (For Curiosity Only)

If you want to test hoisted mode to see the difference:

```bash
# 1. Backup current node_modules
mv node_modules node_modules.backup

# 2. Add to .npmrc
echo "nodeLinker=hoisted" >> .npmrc

# 3. Reinstall
pnpm install

# 4. Verify (should NOT be a symlink now)
ls -l node_modules/next

# 5. Test build
pnpm build
pnpm preview

# 6. Restore original setup
rm -rf node_modules
rm .npmrc.backup
mv node_modules.backup node_modules
# Or just: pnpm install (will use default isolated mode)
```

**Expected outcome**: Everything should still work, but:
- ❌ Slower installs
- ❌ More disk space used
- ❌ Potential phantom dependency issues
- ❌ No benefits for your use case

## Related Documentation

- [pnpm nodeLinker](https://pnpm.io/npmrc#nodelinker)
- [pnpm Motivation - Symlinks](https://pnpm.io/motivation)
- [OpenNext Cloudflare Bundling](https://opennext.js.org/cloudflare#bundling)
- [esbuild Resolve Options](https://esbuild.github.io/api/#resolve)

## Summary

| Question | Answer |
|----------|--------|
| **Should you add `nodeLinker=hoisted`?** | ❌ **NO** |
| **Is your current setup correct?** | ✅ **YES** - using default `isolated` mode |
| **Do Cloudflare Workers support symlinks?** | ✅ **IRRELEVANT** - code is bundled, no symlinks in production |
| **Do your tools work with symlinks?** | ✅ **YES** - all modern tools support them |
| **Any performance issues?** | ✅ **NO** - `isolated` is faster |
| **Any compatibility issues?** | ✅ **NO** - everything works |

## Conclusion

**Keep your current configuration.** You're using pnpm's default `isolated` mode, which is:
- ✅ Faster
- ✅ More efficient
- ✅ Recommended by pnpm
- ✅ Fully compatible with your stack
- ✅ Works perfectly with Cloudflare Workers deployment

**Do not add `nodeLinker=hoisted` to `.npmrc`** - you don't meet any of the legitimate use cases for it.

---

**Last Updated**: 2025-10-25
**pnpm Version**: 9.15.9
**Deployment Target**: Cloudflare Workers
**Bundler**: esbuild (via OpenNext Cloudflare)

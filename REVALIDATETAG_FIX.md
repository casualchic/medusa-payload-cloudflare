# revalidateTag API Fix

## Issue
CodeRabbit identified incorrect usage of `revalidateTag` with an undocumented second parameter `'default'`.

## Root Cause
The codebase was using:
```typescript
revalidateTag(tag, 'default')
```

However, according to Next.js 16 documentation, the second parameter should be `'max'` for stale-while-revalidate semantics.

## Fix Applied
Changed all occurrences from `'default'` to `'max'`:
```typescript
// Before
await revalidateTag(cartCacheTag, 'default')

// After  
await revalidateTag(cartCacheTag, 'max')
```

## Files Modified
- `src/lib/data/cart.ts` - 17 occurrences fixed
- `src/lib/data/customer.ts` - 9 occurrences fixed

**Total**: 26 fixes

## API Reference
According to Next.js documentation:

```typescript
revalidateTag(tag: string, profile?: string | { expire?: number }): void
```

Valid profile values:
- `'max'` (recommended) - Stale-while-revalidate semantics
- Custom profile strings defined in cacheLife
- Object with `expire` property

## Behavior with 'max'
- Tag entry is marked as stale
- Next request serves stale content while fetching fresh data in background
- Optimal for user experience (no loading states)

## Verification
✅ 26 occurrences fixed
✅ 0 'default' values remaining
✅ TypeScript compilation passes (no new errors)
✅ All revalidateTag calls now use recommended 'max' profile

## Impact
**Positive**: Better cache behavior with stale-while-revalidate semantics
**Breaking**: None - 'max' is the recommended value
**Performance**: Improved UX (serves stale while revalidating)

---

**Status**: ✅ Fixed
**Date**: October 25, 2025
**Files Changed**: 2
**Lines Changed**: 26

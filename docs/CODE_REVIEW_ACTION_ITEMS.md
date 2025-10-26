# Code Review Action Items & Future Enhancements

This document tracks recommendations from comprehensive code reviews, organized by priority and effort.

## ✅ Completed Items

### High Priority
- [x] **Password validation documentation** - Added comments explaining why login accepts any non-empty password (backward compatibility)
- [x] **Workflow test updates** - Updated tests to match optimized GitHub Actions workflow
- [x] **Case-insensitive email test** - Added test verifying Medusa SDK handles email case variations
- [x] **Email validation (RFC 5321)** - Added length limits and pattern validation for both signup and login
- [x] **Phone validation enhancements** - Added digit requirements, format checks, and consecutive special char rejection
- [x] **Enhanced error handling** - Improved getAnonymousUserId() with structured logging and development mode errors
- [x] **CI/CD secret validation** - Added entropy checks and common test pattern detection
- [x] **Cloudflare init tracking** - Added global flag for runtime availability checks
- [x] **Test secret migration** - Moved hardcoded test secret to GitHub repository variables with fallback
- [x] **Phone consecutive chars validation** - Expanded validation to reject consecutive special characters
- [x] **Password trimming documentation** - Added detailed rationale for password handling approach
- [x] **Anonymous ID monitoring** - Added TODO with example for error tracking service integration

---

## 🚀 High Priority (Next Sprint)

### 1. Unit Tests for Authentication Functions
**Status**: Not started
**Effort**: 2-3 days
**Priority**: HIGH

**Current gap**: `signup()` and `login()` functions lack unit tests. Integration tests cover flows, but unit tests would:
- Test validation logic in isolation
- Verify error messages
- Test edge cases without SDK mocking

**Tasks**:
```typescript
// tests/unit/auth.test.ts (NEW FILE)
describe('signup validation', () => {
  it('should reject password shorter than 8 characters')
  it('should reject password longer than 128 characters')
  it('should reject invalid email formats')
  it('should reject names longer than 255 characters')
  it('should accept valid signup data')
  it('should trim whitespace from names')
  it('should preserve password whitespace')
})

describe('login validation', () => {
  it('should accept any non-empty password') // backward compatibility
  it('should reject empty password')
  it('should reject invalid email format')
  it('should accept valid login data')
})
```

**Files to create**:
- `tests/unit/auth.test.ts`

**References**:
- Current integration tests: `tests/int/auth.int.spec.ts`
- Implementation: `src/lib/data/customer.ts:167-352`

---

### 2. Unit Tests for Anonymous ID Generation
**Status**: Not started
**Effort**: 1 day
**Priority**: HIGH

**Current gap**: `getAnonymousUserId()` function (customer.ts:45-87) lacks tests

**Why important**:
- GDPR-compliant logging depends on this
- Uses Web Crypto API with Node.js fallback
- Critical for privacy compliance

**Tasks**:
```typescript
// tests/unit/anonymous-id.test.ts (NEW FILE)
describe('getAnonymousUserId', () => {
  describe('Web Crypto API path', () => {
    it('should generate consistent hash for same email')
    it('should generate different hashes for different emails')
    it('should return 64-character hex string')
  })

  describe('Node.js crypto fallback', () => {
    it('should use Node.js crypto when Web Crypto unavailable')
    it('should generate same hash as Web Crypto for same input')
  })

  describe('Error handling', () => {
    it('should return undefined when LOG_SECRET missing')
    it('should return undefined when hashing fails')
    it('should log error when hashing fails')
  })

  describe('GDPR compliance', () => {
    it('should not include email in output')
    it('should be deterministic (same input = same output)')
  })
})
```

**Files to create**:
- `tests/unit/anonymous-id.test.ts`

**References**:
- Implementation: `src/lib/data/customer.ts:45-87`
- Used in error logging: customer.ts:267-272, 277-282, 318-323

---

### 3. Extract Shared Logging Utility
**Status**: Not started
**Effort**: 4 hours
**Priority**: MEDIUM-HIGH

**Current duplication**:
```typescript
// Pattern repeated 3+ times in customer.ts
const anonymousId = await getAnonymousUserId(email)
console.error('Operation failed:', {
  error,
  ...(anonymousId && { userId: anonymousId }),
  timestamp: new Date().toISOString(),
})
```

**Proposed solution**:
```typescript
// src/lib/util/privacy-logger.ts (NEW FILE)
export async function logPrivacyCompliantError(
  message: string,
  error: unknown,
  email?: string
): Promise<void> {
  const logEntry: Record<string, unknown> = {
    error,
    timestamp: new Date().toISOString(),
  }

  if (email) {
    const anonymousId = await getAnonymousUserId(email)
    if (anonymousId) {
      logEntry.userId = anonymousId
    }
  }

  console.error(message, logEntry)
}

// Usage:
await logPrivacyCompliantError('Signup failed:', error, email)
```

**Benefits**:
- Reduces duplication (DRY principle)
- Consistent logging format
- Easier to add log aggregation later (Sentry, Datadog)
- Single place to configure log levels

**Files to create**:
- `src/lib/util/privacy-logger.ts`
- `tests/unit/privacy-logger.test.ts`

**Files to update**:
- `src/lib/data/customer.ts` (3-4 call sites)

---

### 4. Phone Validation Edge Case Tests
**Status**: Not started
**Effort**: 2 hours
**Priority**: MEDIUM

**Current gap**: Phone validation regex (customer.ts:235) could allow edge cases

**Potential edge cases to test**:
```typescript
// tests/unit/phone-validation.test.ts (NEW FILE)
describe('phone validation', () => {
  it('should reject "ext" without digits')
  it('should reject "+1--555-1234" (consecutive hyphens)')
  it('should reject "555.....1234" (excessive dots)')
  it('should accept "+1-555-1234 ext. 123"')
  it('should accept "(555) 123-4567"')
  it('should accept "555.123.4567"')
  it('should accept "555-1234 #123"')
  it('should require minimum 7 digits')
  it('should allow maximum 15 digits')
})
```

**Note**: Current implementation already rejects consecutive dots/hyphens (line 239), but should add tests to verify.

**Files to create**:
- `tests/unit/phone-validation.test.ts`

**References**:
- Implementation: `src/lib/data/customer.ts:215-242`

---

## 📋 Medium Priority (Future Sprints)

### 5. Improve Production Secret Validation
**Status**: Not started
**Effort**: 1 hour
**Priority**: MEDIUM

**Current validation** (deploy.yml:116-128):
```yaml
- name: Validate Production Secrets
  run: |
    if [[ -z "${{ secrets.PAYLOAD_SECRET }}" ]]; then
      echo "ERROR: PAYLOAD_SECRET is not set"
      exit 1
    fi
    if [[ "${{ secrets.PAYLOAD_SECRET }}" == *"test"* ]]; then
      echo "ERROR: PAYLOAD_SECRET contains 'test'"
      exit 1
    fi
```

**Weakness**: Could be bypassed if someone sets production secret to "my-super-secret-password" (contains "test")

**Improved validation**:
```yaml
- name: Validate Production Secrets
  run: |
    SECRET="${{ secrets.PAYLOAD_SECRET }}"

    # Check not empty
    if [[ -z "$SECRET" ]]; then
      echo "❌ ERROR: PAYLOAD_SECRET is not set"
      exit 1
    fi

    # Check minimum length (production secrets should be 32+ chars)
    if [[ ${#SECRET} -lt 32 ]]; then
      echo "❌ ERROR: PAYLOAD_SECRET too short (${#SECRET} chars, minimum 32)"
      exit 1
    fi

    # Check doesn't match test secret patterns
    if [[ "$SECRET" == *"test-secret-for-ci"* ]]; then
      echo "❌ ERROR: PAYLOAD_SECRET matches test secret pattern"
      exit 1
    fi

    # Check has sufficient entropy (basic check)
    if [[ "$SECRET" =~ ^[a-z]+$ ]]; then
      echo "❌ ERROR: PAYLOAD_SECRET lacks entropy (lowercase only)"
      exit 1
    fi

    echo "✅ Production secrets validated"
```

**Additional checks to consider**:
- Validate format (hex, base64, etc.)
- Check against list of common weak secrets
- Validate LOG_SECRET similarly

---

### 6. E2E Tests for Auth Flows
**Status**: Not started
**Effort**: 3-4 days
**Priority**: MEDIUM

**Current gap**: No end-to-end tests using Playwright

**Proposed tests**:
```typescript
// tests/e2e/auth.e2e.spec.ts (NEW FILE)
describe('Authentication E2E', () => {
  test('complete signup → login → logout flow', async ({ page }) => {
    // Visit signup page
    await page.goto('/us/signup')

    // Fill form with unique email
    const email = `test-${Date.now()}@example.com`
    await page.fill('[name="email"]', email)
    await page.fill('[name="password"]', 'SecurePass123')
    await page.fill('[name="first_name"]', 'Test')
    await page.fill('[name="last_name"]', 'User')

    // Submit and verify redirect
    await page.click('[type="submit"]')
    await page.waitForURL('/us/account')

    // Verify logged in state
    await expect(page.locator('text=Test User')).toBeVisible()

    // Logout
    await page.click('text=Sign out')
    await page.waitForURL('/')

    // Login with same credentials
    await page.goto('/us/login')
    await page.fill('[name="email"]', email)
    await page.fill('[name="password"]', 'SecurePass123')
    await page.click('[type="submit"]')
    await page.waitForURL('/us/account')
  })

  test('cart persistence after login', async ({ page }) => {
    // Add item to cart as guest
    // Login
    // Verify cart items preserved
  })

  test('country-specific redirects', async ({ page }) => {
    // Test /ca/signup → /ca/account
    // Test /gb/login → /gb/account
  })
})
```

**Files to create**:
- `tests/e2e/auth.e2e.spec.ts`
- `playwright.config.ts` (may already exist)

---

### 7. Async ID Generation Optimization
**Status**: Not started
**Effort**: 2-3 hours
**Priority**: LOW-MEDIUM

**Current behavior**: `getAnonymousUserId()` called multiple times, each time performing crypto operations

**Optimization strategies**:

#### Option A: Memoization per request
```typescript
// src/lib/util/request-context.ts (NEW FILE)
import { AsyncLocalStorage } from 'async_hooks'

const requestContext = new AsyncLocalStorage<Map<string, unknown>>()

export function getRequestContext(): Map<string, unknown> {
  return requestContext.getStore() || new Map()
}

// In getAnonymousUserId():
const cache = getRequestContext()
const cacheKey = `anonymousId:${email}`
if (cache.has(cacheKey)) {
  return cache.get(cacheKey) as string
}
const id = await computeHash(...)
cache.set(cacheKey, id)
return id
```

#### Option B: Pre-compute for known users
```typescript
// For authenticated requests, user ID is known
// Could pre-compute hash at login time and store in session
```

#### Option C: Make optional based on log level
```typescript
// Only compute anonymous ID in production, skip in development
if (process.env.NODE_ENV === 'development') {
  return undefined // Skip hashing in dev
}
```

**Trade-off**: Complexity vs. performance gain (likely minimal impact)

---

### 8. Cache Invalidation Optimization
**Status**: Not started
**Effort**: 4-6 hours
**Priority**: LOW

**Current strategy**: Broad cache invalidation
```typescript
const customerCacheTag = await getCacheTag('customers')
await revalidateTag(customerCacheTag, 'default') // Invalidates ALL customers
```

**Proposed granular tagging**:
```typescript
// Option 1: Per-customer tags
await revalidateTag(`customer:${customerId}`, 'default')

// Option 2: Hierarchical tags
await revalidateTag(['customers', `customer:${customerId}`], 'default')

// Option 3: TTL-based caching for read-heavy endpoints
cache: {
  tags: [`customer:${customerId}`],
  revalidate: 60, // 60 second TTL
}
```

**Benefits**:
- Better performance at scale
- Reduced cache churn
- More efficient CDN usage

**Trade-off**: Increased complexity, potential for stale data bugs

---

## 📝 Documentation Needed

### 9. ADR (Architecture Decision Records)
**Status**: Not started
**Effort**: 2-3 hours per ADR
**Priority**: MEDIUM

**Decisions to document**:

#### ADR-001: Turbopack vs Webpack
```markdown
# ADR-001: Use Turbopack for Development, Webpack for CI

## Context
Next.js 16 includes Turbopack as default bundler...

## Decision
- Local dev: Turbopack (2-5× faster)
- CI builds: Webpack (drizzle-kit compatibility)

## Consequences
- Different bundlers in different environments
- Must test with both
- Webpack kept as fallback
```

#### ADR-002: Email Enumeration Trade-off
```markdown
# ADR-002: Accept Email Enumeration for Better UX

## Context
"Email already exists" error reveals account existence...

## Decision
Accept enumeration risk for e-commerce UX benefit

## Mitigations
- Rate limiting (future)
- CAPTCHA on repeated failures (future)
```

#### ADR-003: Test Secrets in CI/CD
```markdown
# ADR-003: Hardcode Test Secrets in Public Workflow

## Context
PR builds need secrets but can't access GitHub Secrets...

## Decision
Hardcode test-only secrets in workflow file

## Validation
Production secret validation prevents deployment
```

#### ADR-004: No Email Lowercasing
```markdown
# ADR-004: Preserve Email Case, Rely on Medusa SDK

## Context
Email addresses are case-insensitive per RFC 5321...

## Decision
- Do NOT lowercase in our code
- Pass to Medusa SDK as-is
- Medusa performs case-insensitive lookups

## Rationale
- Avoids breaking existing accounts
- Respects user input
- Medusa already handles it
```

**Files to create**:
- `docs/adr/001-turbopack-vs-webpack.md`
- `docs/adr/002-email-enumeration.md`
- `docs/adr/003-test-secrets-ci.md`
- `docs/adr/004-no-email-lowercasing.md`

---

### 10. API Documentation for Server Actions
**Status**: Not started
**Effort**: 2-3 hours
**Priority**: LOW

**Current gap**: Server actions lack formal API documentation

**Proposed**:
```typescript
/**
 * @api {post} /actions/signup Customer Signup
 * @apiName Signup
 * @apiGroup Authentication
 *
 * @apiParam {String} email Customer email address
 * @apiParam {String} password Password (8-128 characters)
 * @apiParam {String} first_name First name (max 255 chars)
 * @apiParam {String} last_name Last name (max 255 chars)
 * @apiParam {String} [phone] Phone number (optional)
 * @apiParam {String} countryCode Country code (us|ca|gb)
 *
 * @apiSuccess {Redirect} /[country]/account Redirects to account page
 *
 * @apiError {String} error Error message
 *
 * @apiExample {typescript} Example Usage:
 *   const formData = new FormData()
 *   formData.set('email', 'user@example.com')
 *   formData.set('password', 'SecurePass123')
 *   await signup(null, formData)
 */
```

**Tools to consider**:
- TypeDoc for generating docs
- OpenAPI spec for REST API-like documentation
- JSDoc comments with examples

---

## 🔮 Low Priority / Future Optimizations

### 11. Phone Validation Library
**Status**: Deferred
**Effort**: 1 day
**Priority**: LOW
**Trade-off**: 320KB bundle size

**When to reconsider**:
- International expansion beyond US/CA/GB
- Customer complaints about phone validation
- Compliance requirements for phone verification

**Library**: `libphonenumber-js`

**References**: RECOMMENDATIONS.md already documents this

---

### 12. Monitoring/Alerting for Auth Failures
**Status**: Not started
**Effort**: 2-3 days
**Priority**: LOW (before high-traffic launch)

**Metrics to track**:
- Failed login attempts (by email, by IP)
- HMAC generation errors
- Signup conversion rate
- Cart transfer failures

**Tools**:
- Cloudflare Workers Analytics
- Sentry for error tracking
- Custom middleware for metrics

**References**: Already documented in `MONITORING_SETUP.md` and `SECURITY_ENHANCEMENTS.md`

---

### 13. Password Strength Indicator
**Status**: Not started
**Effort**: 1 day
**Priority**: LOW (UX enhancement)

**Client-side improvement**:
```typescript
import { zxcvbn } from 'zxcvbn'

function PasswordStrength({ password }: { password: string }) {
  const result = zxcvbn(password)
  return (
    <div className="password-strength">
      <ProgressBar value={result.score} max={4} />
      <span>{result.feedback.warning}</span>
    </div>
  )
}
```

**Trade-off**: 800KB bundle size (can be lazy-loaded)

---

## 📊 Tracking

| Priority | Category | Estimated Effort | Blocking? |
|----------|----------|------------------|-----------|
| 🔴 HIGH | Unit tests for auth functions | 2-3 days | No |
| 🔴 HIGH | Unit tests for anonymousUserId | 1 day | No |
| 🟡 MEDIUM-HIGH | Extract logging utility | 4 hours | No |
| 🟡 MEDIUM | Phone validation tests | 2 hours | No |
| 🟡 MEDIUM | Improve secret validation | 1 hour | No |
| 🟡 MEDIUM | E2E tests for auth | 3-4 days | No |
| 🟡 MEDIUM | ADR documentation | 2-3 hours each | No |
| 🟢 LOW | Async ID optimization | 2-3 hours | No |
| 🟢 LOW | Cache optimization | 4-6 hours | No |
| 🟢 LOW | API documentation | 2-3 hours | No |
| 🟢 LOW | Phone library evaluation | 1 day | No |
| 🟢 LOW | Monitoring/alerting | 2-3 days | Before high-traffic |
| 🟢 LOW | Password strength UI | 1 day | No |

**Total estimated effort**: ~2-3 weeks of work

---

## ✅ Implementation Strategy

### Sprint 1: Testing Foundation (Week 1)
1. Unit tests for auth functions
2. Unit tests for anonymousUserId
3. Phone validation edge case tests

### Sprint 2: Code Quality (Week 2)
4. Extract shared logging utility
5. Improve production secret validation
6. ADR documentation (2-3 docs)

### Sprint 3: E2E & Docs (Week 3)
7. E2E tests for auth flows
8. API documentation
9. Remaining ADR docs

### Future: Optimizations (As Needed)
10. Async ID optimization (if performance issues)
11. Cache optimization (if scaling issues)
12. Phone library (if international expansion)
13. Monitoring (before high-traffic launch)
14. Password strength UI (UX improvement)

---

## 📚 References

- **Code Review Feedback**: See attached review comments
- **Security Enhancements**: `docs/SECURITY_ENHANCEMENTS.md`
- **Monitoring Setup**: `docs/MONITORING_SETUP.md`
- **Recommendations**: `docs/RECOMMENDATIONS.md`
- **Current Test Coverage**: 148 tests (60 unit + 35 integration + 53 workflow)

---

**Last Updated**: 2025-10-25
**Status**: In Progress
**Next Review**: After Sprint 1 completion

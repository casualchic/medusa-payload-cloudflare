# Security Enhancements Roadmap

This document outlines security features that should be implemented before high-traffic production deployment.

## Critical (Required Before High-Traffic Deployment)

### 1. Rate Limiting ⚠️ **HIGH PRIORITY**

**Current State**: No rate limiting implemented on authentication endpoints

**Risk**:
- Brute force password attacks
- Account enumeration attacks
- Credential stuffing attacks
- Denial of Service (DoS)

**Recommended Implementation**:

#### Option A: Cloudflare Workers KV (Recommended for this stack)
```typescript
// src/middleware/rate-limit.ts
import type { NextRequest } from 'next/server'

const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_ATTEMPTS_PER_WINDOW = 5

export async function checkRateLimit(
  request: NextRequest,
  endpoint: string
): Promise<boolean> {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown'
  const key = `rate-limit:${endpoint}:${ip}`

  // Implementation depends on Cloudflare Workers KV binding
  // See: https://developers.cloudflare.com/kv/

  // Pseudocode:
  // 1. Get current count from KV
  // 2. If count >= MAX_ATTEMPTS, return false
  // 3. Increment count with TTL = RATE_LIMIT_WINDOW
  // 4. Return true

  return true // Placeholder
}
```

**Recommended Limits**:
- **Signup**: 3 attempts per 15 minutes per IP
- **Login**: 5 attempts per 15 minutes per email/IP
- **Password Reset**: 3 attempts per hour per email

#### Option B: Upstash Redis (Alternative)
- Use `@upstash/ratelimit` package
- Serverless-friendly Redis alternative
- Built-in sliding window algorithms

**Reference**: https://upstash.com/docs/oss/sdks/ts/ratelimit/overview

### 2. Account Lockout Mechanism

**Current State**: No failed login attempt tracking

**Risk**:
- Unlimited brute force attempts
- No protection against persistent attackers

**Recommended Implementation**:

```typescript
// Track failed attempts in database or KV store
interface FailedAttempts {
  email: string
  count: number
  lockedUntil?: Date
  lastAttempt: Date
}

// Lock account after N failed attempts
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION = 30 * 60 * 1000 // 30 minutes

// Unlock mechanism:
// - Automatic after LOCKOUT_DURATION
// - Manual via email verification link
// - Admin intervention
```

**Note**: Verify if Medusa backend already handles this. If so, document reliance on backend.

## High Priority (Before Production Launch)

### 3. Email Verification

**Current State**: New accounts are not verified

**Risk**:
- Typo emails cannot be recovered
- Spam account creation
- Invalid email addresses stored

**Recommended Implementation**:
1. Send verification email on signup
2. Account in "pending" state until verified
3. Resend verification option
4. Expiring verification tokens (24 hours)

**Libraries**: `nodemailer`, `@sendgrid/mail`, or Medusa's built-in email system

### 4. Session Management Enhancements

**Current State**:
- 7-day session with no refresh mechanism
- No concurrent session limits
- No device fingerprinting

**Recommendations**:

#### Short-lived Access Tokens + Refresh Tokens
```typescript
// Access token: 15 minutes (stored in httpOnly cookie)
// Refresh token: 7 days (stored in separate httpOnly cookie)
// Rotate refresh token on each use
```

#### Device Fingerprinting
```typescript
// Track: IP, User-Agent, Accept-Language
// Alert user on login from new device
// Provide "This wasn't me" option
```

#### Concurrent Session Limits
```typescript
// Max 3 active sessions per user
// Display active sessions in account settings
// Allow users to revoke individual sessions
```

### 5. Password Policy Documentation

**Current State**:
- 8-128 character requirement
- No complexity requirements
- Not documented

**Recommendation**:
Document password policy rationale following NIST SP 800-63B guidelines:
- Length is more important than complexity
- No mandatory character class requirements
- No mandatory periodic password changes
- Block common/compromised passwords (check against Have I Been Pwned API)

**Reference**: https://pages.nist.gov/800-63-3/sp800-63b.html

## Medium Priority (Follow-up PRs)

### 6. CSRF Protection Documentation

**Current State**: Implicit reliance on Next.js Server Actions

**Recommendation**:
Document that Next.js 13+ automatically provides CSRF protection for Server Actions via:
- Origin header checking
- Same-site cookies
- Built-in token validation

**Reference**: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations#security

### 7. Input Validation Enhancements

#### Email Validation
**Current**: Custom regex (line 94 of customer.ts)

**Limitation**: Doesn't handle all RFC 5322 edge cases:
- Quoted strings: `"user name"@example.com`
- IP addresses: `user@[192.0.2.1]`
- IDN domains: `user@münchen.de`
- Plus-addressing variants: `user+tag+subtag@example.com`

**Options**:
- ✅ **Keep current** (acceptable for most e-commerce)
- Migrate to `validator.js` (~5KB bundle size)
- Migrate to `email-validator` (~2KB bundle size)

#### Phone Validation
**Current**: Basic regex with digit count check

**Enhancement Done**: ✅ Added consecutive dot/hyphen rejection

**Future**: Consider `libphonenumber-js` for strict international validation
- **Trade-off**: ~320KB bundle size vs current lightweight approach
- **Decision**: Document as future enhancement if needed

### 8. Security Headers

**Recommendation**: Add security headers in Next.js config or Cloudflare Workers:

```typescript
// next.config.ts
export default {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}
```

## Low Priority (Future Enhancements)

### 9. Multi-Factor Authentication (MFA)

- Time-based One-Time Passwords (TOTP)
- SMS verification
- Backup codes
- Recovery email

### 10. Security Monitoring & Alerting

- Failed login attempt monitoring
- Unusual activity detection (login from new country)
- Slack/email alerts for security events
- Integration with Sentry for error tracking

### 11. Penetration Testing

Before production launch with customer data:
- Professional security audit
- Automated vulnerability scanning
- OWASP Top 10 compliance check

## Implementation Priority

```
Priority    | Feature                    | Estimated Effort | Blocking?
------------|----------------------------|------------------|----------
🔴 Critical | Rate Limiting              | 2-3 days         | Yes
🔴 Critical | Account Lockout            | 1 day            | Yes
🟡 High     | Email Verification         | 2-3 days         | No
🟡 High     | Session Management         | 3-4 days         | No
🟡 High     | Password Policy Docs       | 1 hour           | No
🟢 Medium   | CSRF Documentation         | 1 hour           | No
🟢 Medium   | Security Headers           | 2 hours          | No
🟢 Low      | MFA                        | 1 week           | No
🟢 Low      | Security Monitoring        | 2-3 days         | No
```

## Trade-offs Documented

The following security trade-offs are **intentionally accepted** and documented:

### ✅ Email Enumeration
**File**: `src/lib/data/customer.ts:340`
```typescript
// "An account with this email already exists. Please sign in instead."
```
**Rationale**: UX benefit outweighs security risk for e-commerce context. Guides users to correct action (login vs signup).

**Mitigation**: Rate limiting will prevent bulk enumeration attacks.

### ✅ Test Secrets in CI/CD
**File**: `.github/workflows/deploy.yml:113`

**Validation Added**: ✅ Pre-deployment secret validation prevents test secrets in production

**Rationale**: Enables PR testing without exposing production secrets.

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)
- [Cloudflare Workers KV](https://developers.cloudflare.com/kv/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/security)

## Status

**Last Updated**: 2025-10-25
**Review Status**: Initial Draft
**Next Review**: Before production deployment

---

**Note**: This is a living document. Update as security features are implemented or requirements change.

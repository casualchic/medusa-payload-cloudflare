# Runbook: Handling Orphaned Auth Identities

## 📋 Overview

**Problem**: Auth registration succeeds but customer profile creation fails, leaving an orphaned auth identity in Medusa that cannot be used for login or account access.

**Impact**:
- User cannot complete signup (email already registered)
- User cannot login (no customer profile exists)
- Auth identity exists but is unusable ("zombie account")

**Root Cause**: Two-step signup process:
1. `sdk.auth.register()` creates auth identity ✅
2. `sdk.store.customer.create()` fails ❌ → Orphan created

---

## 🚨 Detection

### Automated Monitoring

**Log Pattern** (see src/lib/data/customer.ts:267-271):
```javascript
console.error('Customer profile creation failed after auth registration:', {
  error: customerCreateError,
  userId: '<hashed-email>',  // HMAC-SHA256 hash
  timestamp: '2025-10-25T15:11:53.084Z'
})
```

**Alert Triggers**:
- Error message contains: `"Customer profile creation failed after auth registration"`
- Frequency: >3 occurrences in 5 minutes
- Severity: HIGH (blocks user signup)

**Monitoring Queries** (Cloudflare Logs / Sentry / DataDog):
```sql
-- Find orphaned auth events in last 24h
SELECT timestamp, userId, error
FROM logs
WHERE message LIKE '%Customer profile creation failed%'
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC
```

### Manual Detection

**Symptoms**:
1. User reports: "Email already exists" during signup
2. User cannot login with same credentials
3. Database query shows auth identity without customer profile

**Verification Steps**:
```bash
# 1. Check if auth identity exists
curl -X POST https://casual-chic.medusajs.app/auth/customer/emailpass \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "test123"}'

# Response: 401 Unauthorized (customer profile missing)

# 2. Check if email is registered
curl -X POST https://casual-chic.medusajs.app/auth/customer/emailpass/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "test123"}'

# Response: 400 "Email already exists" (auth identity exists)
```

---

## 🔧 Resolution

### Option 1: Manual Cleanup (Recommended for Single Users)

#### Step 1: Identify Orphaned Auth Identity
```bash
# Using Medusa Admin API
curl -X GET https://casual-chic.medusajs.app/admin/auth/providers \
  -H "Authorization: Bearer <admin-token>" \
  -H "x-medusa-access-token: <admin-token>"
```

#### Step 2: Delete Orphaned Auth Identity
```bash
# Contact Medusa support or use admin panel
# Medusa currently doesn't expose direct auth deletion via API
# Requires database-level cleanup:

# PostgreSQL query (run with caution):
DELETE FROM auth_identity
WHERE provider_identity_id = 'user@example.com'
  AND provider = 'emailpass'
  AND NOT EXISTS (
    SELECT 1 FROM customer
    WHERE customer.email = auth_identity.provider_identity_id
  );
```

#### Step 3: Verify Cleanup
```bash
# User should now be able to register
curl -X POST https://casual-chic.medusajs.app/auth/customer/emailpass/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "test123"
  }'

# Response: 201 Created
```

### Option 2: Automated Cleanup Script (Recommended for Multiple Users)

```typescript
// scripts/cleanup-orphaned-auth.ts
import { sdk } from '@lib/config'

interface OrphanedAuth {
  email: string
  created_at: Date
}

async function findOrphanedAuthIdentities(): Promise<OrphanedAuth[]> {
  // Query database for auth identities without customer profiles
  const orphans = await db.query(`
    SELECT ai.provider_identity_id as email, ai.created_at
    FROM auth_identity ai
    LEFT JOIN customer c ON c.email = ai.provider_identity_id
    WHERE ai.provider = 'emailpass'
      AND c.id IS NULL
      AND ai.created_at < NOW() - INTERVAL '24 hours'
  `)

  return orphans.rows
}

async function cleanupOrphan(email: string): Promise<void> {
  console.log(`Cleaning up orphaned auth for: ${email}`)

  // Delete auth identity (requires admin access)
  await db.query(`
    DELETE FROM auth_identity
    WHERE provider_identity_id = $1
      AND provider = 'emailpass'
  `, [email])

  console.log(`✅ Cleaned up: ${email}`)
}

async function main() {
  const orphans = await findOrphanedAuthIdentities()

  console.log(`Found ${orphans.length} orphaned auth identities`)

  for (const orphan of orphans) {
    await cleanupOrphan(orphan.email)
  }

  console.log('✅ Cleanup complete')
}

main().catch(console.error)
```

**Run Script**:
```bash
# Dry run (find orphans without deleting)
pnpm tsx scripts/cleanup-orphaned-auth.ts --dry-run

# Execute cleanup
pnpm tsx scripts/cleanup-orphaned-auth.ts --execute
```

### Option 3: Preventive Fix (Long-term Solution)

**Implement Transaction Rollback** (src/lib/data/customer.ts):
```typescript
export async function signup(_currentState: FormActionState, formData: FormData): Promise<string> {
  let authToken: string | undefined

  try {
    // Step 1: Register auth identity
    authToken = await sdk.auth.register('customer', 'emailpass', {
      email: customerForm.email,
      password: password,
    })

    await setAuthToken(authToken as string)

    const headers = { ...(await getAuthHeaders()) }

    // Step 2: Create customer profile (CRITICAL)
    try {
      await sdk.store.customer.create(customerForm, {}, headers)
    } catch (customerCreateError: unknown) {
      // ⚠️ Customer creation failed - MUST cleanup auth identity

      // Option A: Delete auth identity (if Medusa supports it)
      await sdk.auth.deleteIdentity(email) // Hypothetical API

      // Option B: Log for manual cleanup
      await removeAuthToken()
      const anonymousId = await getAnonymousUserId(email)
      console.error('ORPHANED_AUTH_IDENTITY', {
        email: anonymousId,  // Hashed for GDPR
        timestamp: new Date().toISOString(),
        action: 'REQUIRES_MANUAL_CLEANUP',
      })

      throw new Error('Registration failed. Please try again.')
    }

    // Success path...
    redirect(`/${countryCode}/account`)
  } catch (error: unknown) {
    // Error handling...
  }
}
```

---

## 📊 Monitoring Dashboard

### Key Metrics

1. **Orphan Creation Rate**
   - Metric: `orphaned_auth_identities_created_per_hour`
   - Alert: >5 per hour
   - Dashboard: Plot over 7 days

2. **Orphan Cleanup Rate**
   - Metric: `orphaned_auth_identities_cleaned_per_day`
   - Target: >95% cleaned within 24h

3. **Signup Success Rate**
   - Metric: `(successful_signups / total_signup_attempts) * 100`
   - Target: >98%
   - Alert: <90%

### Sample Queries

**Cloudflare Workers Analytics**:
```sql
-- Orphan creation events (last 7 days)
SELECT
  DATE(timestamp) as date,
  COUNT(*) as orphan_count
FROM logs
WHERE message LIKE '%Customer profile creation failed%'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC
```

**Sentry Alert Rule**:
```yaml
name: Orphaned Auth Identity Alert
conditions:
  - event.message contains "Customer profile creation failed"
  - event.level = error
  - count > 3 in 5 minutes
actions:
  - notify: slack-channel-alerts
  - notify: email-oncall
```

---

## 🔍 Troubleshooting

### Q: How do I know if a user has an orphaned auth identity?

**A**: Check for these symptoms:
1. `sdk.auth.register()` → 400 "Email already exists"
2. `sdk.auth.login()` → 401 "Invalid credentials" or "Customer not found"
3. Database query shows auth_identity without matching customer row

### Q: Can users recover their account after orphaned auth is deleted?

**A**: Yes! After cleanup:
1. User can register again with same email
2. New auth identity + customer profile will be created
3. Previous orphaned identity is permanently removed

### Q: What if customer creation keeps failing?

**A**: Investigate root cause:
1. **Database issues**: Check Medusa backend logs
2. **Validation errors**: Review customer data schema
3. **Network timeouts**: Increase timeout limits
4. **Permission issues**: Verify auth token permissions

### Q: How do I prevent orphans in the future?

**A**: Implement one of these strategies:
1. **Transactional approach**: Rollback auth if customer creation fails
2. **Retry logic**: Automatically retry customer creation 3x
3. **Idempotency**: Allow customer creation with existing auth identity
4. **Monitoring**: Alert on orphan creation, manual cleanup

---

## 📚 Related Documentation

- [Medusa Auth Documentation](https://docs.medusajs.com/resources/authentication)
- [Customer Management Guide](https://docs.medusajs.com/resources/storefront-development/customers)
- [Error Handling Best Practices](./ERROR_HANDLING.md)
- [Monitoring & Alerting Setup](./MONITORING.md)

---

## 📞 Escalation

**Severity: HIGH**
**SLA**: Resolve within 4 hours

**Contact**:
- **On-call Engineer**: Check PagerDuty rotation
- **Medusa Support**: support@medusajs.com
- **Database Admin**: dba-team@company.com

**Escalation Path**:
1. Individual orphan → On-call engineer (resolve manually)
2. >10 orphans/hour → Engineering team + Medusa support
3. >50 orphans/hour → All-hands incident, disable signups temporarily

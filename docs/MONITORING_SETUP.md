# Monitoring & Alerting Setup

## 📊 Overview

This document describes the monitoring and alerting strategy for orphaned auth identities and other critical system failures.

---

## 🎯 Monitoring Goals

1. **Detect orphaned auth identities** within 5 minutes of creation
2. **Alert on-call engineer** for critical failures
3. **Track metrics** for signup success rate and system health
4. **Enable proactive debugging** with structured logging

---

## 🔍 Log Structure

### Orphaned Auth Identity Log

**Location**: `src/lib/data/customer.ts:267-271`

**Format**:
```javascript
console.error('Customer profile creation failed after auth registration:', {
  error: customerCreateError,
  userId: '<hmac-sha256-hash>',  // Anonymized email
  timestamp: '2025-10-25T15:11:53.084Z',
})
```

**Fields**:
- `message`: Fixed string for pattern matching
- `error`: Full error object with stack trace
- `userId`: HMAC-SHA256 hash of email (GDPR-compliant)
- `timestamp`: ISO 8601 format

### Signup Error Log

**Location**: `src/lib/data/customer.ts:314-318`

**Format**:
```javascript
console.error('Signup failed:', {
  error,
  userId: '<hmac-sha256-hash>',
  timestamp: '2025-10-25T15:11:53.084Z',
})
```

### Cart Transfer Error Log

**Location**: `src/lib/data/customer.ts:409-415`

**Format**:
```javascript
console.error('Cart transfer failed after login:', {
  error: cartError,
  userId: '<hmac-sha256-hash>',
  timestamp: '2025-10-25T15:11:53.084Z',
})
```

---

## 📈 Cloudflare Workers Analytics

### Setup

1. **Enable Logpush** to send logs to external service:
```bash
# Create Logpush job (send to S3, Datadog, or Splunk)
wrangler logpush create \
  --name="cc3-storefront-logs" \
  --destination="s3://my-bucket/logs" \
  --fields="ScriptName,Outcome,Logs,Exceptions"
```

2. **Create Custom Metrics** in wrangler.jsonc:
```json
{
  "analytics_engine_datasets": [
    {
      "binding": "ANALYTICS",
      "dataset": "cc3_storefront_metrics"
    }
  ]
}
```

3. **Instrument Code** to send metrics:
```typescript
// src/lib/data/customer.ts (add to signup function)
export async function signup(_currentState: FormActionState, formData: FormData): Promise<string> {
  try {
    // Existing signup logic...

  } catch (customerCreateError: unknown) {
    // Log orphaned auth identity
    const anonymousId = await getAnonymousUserId(email)
    console.error('Customer profile creation failed after auth registration:', {
      error: customerCreateError,
      ...(anonymousId && { userId: anonymousId }),
      timestamp: new Date().toISOString(),
    })

    // Send metric to Analytics Engine
    if (env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: ['orphaned_auth_identity'],
        doubles: [1], // Count
        indexes: [anonymousId || 'unknown'],
      })
    }

    throw customerCreateError
  }
}
```

### Queries

**Orphaned Auth Identities (Last 24h)**:
```sql
SELECT
  toStartOfHour(timestamp) AS hour,
  COUNT(*) AS orphan_count
FROM analytics
WHERE blob1 = 'orphaned_auth_identity'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC
```

**Signup Success Rate**:
```sql
SELECT
  DATE(timestamp) AS date,
  SUM(CASE WHEN blob1 = 'signup_success' THEN double1 ELSE 0 END) AS successful_signups,
  SUM(CASE WHEN blob1 = 'signup_failed' THEN double1 ELSE 0 END) AS failed_signups,
  (SUM(CASE WHEN blob1 = 'signup_success' THEN double1 ELSE 0 END) /
   (SUM(CASE WHEN blob1 = 'signup_success' THEN double1 ELSE 0 END) +
    SUM(CASE WHEN blob1 = 'signup_failed' THEN double1 ELSE 0 END))) * 100 AS success_rate
FROM analytics
WHERE blob1 IN ('signup_success', 'signup_failed')
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY date
ORDER BY date DESC
```

---

## 🚨 Sentry Integration

### Setup

1. **Install Sentry SDK**:
```bash
pnpm add @sentry/nextjs
```

2. **Configure Sentry** (`sentry.server.config.ts`):
```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,

  // Capture specific error types
  beforeSend(event, hint) {
    const error = hint.originalException

    // Tag orphaned auth errors
    if (error && error.message?.includes('Customer profile creation failed')) {
      event.tags = {
        ...event.tags,
        orphaned_auth: true,
        severity: 'high',
      }
    }

    return event
  },
})
```

3. **Instrument Signup Function**:
```typescript
// src/lib/data/customer.ts
import * as Sentry from '@sentry/nextjs'

export async function signup(_currentState: FormActionState, formData: FormData): Promise<string> {
  try {
    // Existing signup logic...

  } catch (customerCreateError: unknown) {
    // Capture in Sentry
    Sentry.captureException(customerCreateError, {
      tags: {
        orphaned_auth: true,
        severity: 'high',
      },
      extra: {
        userId: await getAnonymousUserId(email), // HMAC hash
        email_domain: email.split('@')[1], // Non-PII
        timestamp: new Date().toISOString(),
      },
    })

    // Existing error handling...
  }
}
```

### Alert Rules

**Sentry Alert: Orphaned Auth Identity**
```yaml
Rule Name: Orphaned Auth Identity Alert
Conditions:
  - error.tags.orphaned_auth = true
  - count > 3 in 5 minutes
Actions:
  - Send notification to: #engineering-alerts (Slack)
  - Email: oncall@company.com
  - Create PagerDuty incident (severity: high)
Escalation:
  - If unresolved for 30 minutes → Page engineering lead
```

---

## 📊 Datadog Integration

### Setup

1. **Install Datadog Agent** (for log collection):
```bash
# Forward Cloudflare logs to Datadog
wrangler logpush create \
  --name="cc3-datadog" \
  --destination="datadog://?service=cc3-storefront&ddsource=cloudflare"
```

2. **Create Custom Metrics**:
```typescript
// src/lib/monitoring/datadog.ts
import { StatsD } from 'hot-shots'

const statsd = new StatsD({
  host: 'datadog-agent.internal',
  port: 8125,
  prefix: 'cc3.storefront.',
})

export function trackOrphanedAuth(userId: string) {
  statsd.increment('orphaned_auth.created', 1, {
    userId: userId.substring(0, 8), // First 8 chars of hash
  })
}

export function trackSignupSuccess() {
  statsd.increment('signup.success', 1)
}

export function trackSignupFailure(reason: string) {
  statsd.increment('signup.failure', 1, { reason })
}
```

3. **Instrument Code**:
```typescript
// src/lib/data/customer.ts
import { trackOrphanedAuth, trackSignupSuccess } from '@lib/monitoring/datadog'

export async function signup(_currentState: FormActionState, formData: FormData): Promise<string> {
  try {
    // Step 1: Register auth
    const token = await sdk.auth.register(...)

    // Step 2: Create customer
    try {
      await sdk.store.customer.create(...)
      trackSignupSuccess() // ✅ Success metric
    } catch (customerCreateError: unknown) {
      const anonymousId = await getAnonymousUserId(email)
      if (anonymousId) {
        trackOrphanedAuth(anonymousId) // ⚠️ Orphan metric
      }
      throw customerCreateError
    }

    redirect(`/${countryCode}/account`)
  } catch (error: unknown) {
    // Handle redirect errors...
  }
}
```

### Dashboards

**Orphaned Auth Dashboard**:
```yaml
Dashboard Name: Orphaned Auth Identities
Widgets:
  - Timeseries Graph:
      title: Orphaned Auth Creations (Last 24h)
      query: sum:cc3.storefront.orphaned_auth.created{*}.as_count()
      alert: >5 per hour

  - Query Value:
      title: Total Orphans (Last 7 Days)
      query: sum:cc3.storefront.orphaned_auth.created{*}.as_count().rollup(sum, 604800)

  - Heatmap:
      title: Orphans by Hour of Day
      query: sum:cc3.storefront.orphaned_auth.created{*} by {hour}
```

**Signup Success Rate Dashboard**:
```yaml
Dashboard Name: Signup Health
Widgets:
  - Timeseries Graph:
      title: Signup Success Rate (%)
      query: |
        (sum:cc3.storefront.signup.success{*} /
         (sum:cc3.storefront.signup.success{*} + sum:cc3.storefront.signup.failure{*})) * 100
      alert: <95%

  - Top List:
      title: Top Signup Failure Reasons
      query: sum:cc3.storefront.signup.failure{*} by {reason}
```

---

## 🔔 Alert Channels

### Slack Integration

**Setup**:
```bash
# 1. Create Slack webhook
# https://api.slack.com/messaging/webhooks

# 2. Add to GitHub Secrets
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX

# 3. Create notification function
```

**Notification Function** (`src/lib/monitoring/slack.ts`):
```typescript
export async function sendSlackAlert(message: string, severity: 'low' | 'medium' | 'high') {
  const webhook = process.env.SLACK_WEBHOOK_URL
  if (!webhook) return

  const color = {
    low: '#36a64f',
    medium: '#ff9900',
    high: '#ff0000',
  }[severity]

  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attachments: [
        {
          color,
          title: '🚨 CC3 Storefront Alert',
          text: message,
          footer: 'Casual Chic Monitoring',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    }),
  })
}
```

**Usage**:
```typescript
// src/lib/data/customer.ts
import { sendSlackAlert } from '@lib/monitoring/slack'

export async function signup(...) {
  try {
    // ...
  } catch (customerCreateError: unknown) {
    const anonymousId = await getAnonymousUserId(email)

    // Send Slack alert
    await sendSlackAlert(
      `Orphaned auth identity detected!\n` +
      `User ID: ${anonymousId?.substring(0, 8)}...\n` +
      `Error: ${customerCreateError}`,
      'high'
    )

    // Continue error handling...
  }
}
```

### Email Alerts

**Setup** (using SendGrid):
```typescript
// src/lib/monitoring/email.ts
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '')

export async function sendEmailAlert(subject: string, body: string) {
  const oncallEmail = process.env.ONCALL_EMAIL

  if (!oncallEmail) return

  await sgMail.send({
    to: oncallEmail,
    from: 'alerts@casualchic.com',
    subject: `[CC3 Alert] ${subject}`,
    text: body,
    html: `<pre>${body}</pre>`,
  })
}
```

---

## 📋 Monitoring Checklist

- [ ] **Cloudflare Logpush** configured to send logs to external service
- [ ] **Analytics Engine** dataset created for custom metrics
- [ ] **Sentry** installed and configured with error tracking
- [ ] **Datadog** (or similar APM) set up for metrics and dashboards
- [ ] **Slack webhook** created for real-time alerts
- [ ] **Email alerts** configured for on-call engineer
- [ ] **Runbook** documented for handling orphaned auth (see RUNBOOK_ORPHANED_AUTH.md)
- [ ] **Alert thresholds** tuned based on baseline traffic
- [ ] **Test alerts** verified by triggering intentional errors
- [ ] **Escalation policy** defined in PagerDuty or similar

---

## 🧪 Testing Monitoring

### 1. Trigger Orphaned Auth Error

```bash
# Create orphaned auth by failing customer creation
curl -X POST https://cc3-storefront.ian-rothfuss.workers.dev/api/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-orphan@example.com",
    "password": "Test123!",
    "first_name": "<script>alert(1)</script>",  // Triggers validation error
    "last_name": "User"
  }'
```

### 2. Verify Logs

**Cloudflare Logs**:
```bash
wrangler tail --format=pretty | grep "Customer profile creation failed"
```

**Sentry**:
- Navigate to Sentry dashboard
- Filter by tag: `orphaned_auth:true`
- Verify error captured with anonymized userId

**Datadog**:
- Navigate to Metrics Explorer
- Query: `cc3.storefront.orphaned_auth.created`
- Verify count increased by 1

### 3. Verify Alerts

**Slack**:
- Check #engineering-alerts channel
- Should see message: "🚨 Orphaned auth identity detected!"

**Email**:
- Check oncall@company.com inbox
- Subject: "[CC3 Alert] Orphaned Auth Identity"

---

## 📚 Related Documentation

- [Runbook: Orphaned Auth Identities](./RUNBOOK_ORPHANED_AUTH.md)
- [Error Handling Best Practices](./ERROR_HANDLING.md)
- [Cloudflare Workers Analytics](https://developers.cloudflare.com/analytics/analytics-engine/)
- [Sentry Next.js Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

---

## 🔄 Maintenance

**Weekly**:
- Review alert thresholds and adjust for traffic changes
- Check for false positives and tune filters

**Monthly**:
- Audit orphaned auth cleanup rate (target: >95% within 24h)
- Review signup success rate trends
- Update runbook with new learnings

**Quarterly**:
- Conduct monitoring drill (simulate orphaned auth incident)
- Review escalation policy and update contacts
- Optimize log retention and storage costs

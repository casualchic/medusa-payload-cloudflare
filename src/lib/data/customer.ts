'use server'

import { sdk } from '@lib/config'
import medusaError from '@lib/util/medusa-error'
import { validateCountryCode } from '@lib/util/validate-country-code'
import { HttpTypes } from '@medusajs/types'
import { revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  getAuthHeaders,
  getCacheTag,
  getCartId,
  removeAuthToken,
  removeCartId,
  setAuthToken,
} from './cookies'

const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

/**
 * Safely revalidate cache tags without blocking user actions
 * Cache revalidation is a performance optimization - failures should be logged but not block users
 */
async function safeRevalidateTag(tag: string): Promise<void> {
  try {
    await revalidateTag(tag, 'max')
  } catch (error) {
    // Log but don't throw - cache revalidation failures should never block user actions
    console.error('Cache revalidation failed (non-blocking):', {
      tag,
      error,
      timestamp: new Date().toISOString(),
    })
  }
}

if (!MEDUSA_BACKEND_URL) {
  throw new Error('MEDUSA_BACKEND_URL or NEXT_PUBLIC_MEDUSA_BACKEND_URL is required')
}

if (!PUBLISHABLE_KEY) {
  throw new Error('NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is required')
}

/**
 * Form action state type for Next.js Server Actions with useActionState hook
 * State is either null (initial state) or a string (error message from previous submission)
 */
type FormActionState = string | null

/**
 * Generate an anonymous identifier for logging purposes (GDPR-compliant)
 * Uses HMAC-SHA256 to hash PII with a secret, preventing exposure of sensitive data in logs
 * If LOG_SECRET is not set, returns undefined (no ID will be logged)
 *
 * Supports both Web Crypto API (Cloudflare Workers, browsers) and Node.js crypto module
 *
 * @param email - User email to anonymize
 * @returns HMAC-SHA256 hash of email, or undefined if LOG_SECRET not configured
 */
async function getAnonymousUserId(email: string): Promise<string | undefined> {
  const LOG_SECRET = process.env.LOG_SECRET
  if (!LOG_SECRET) {
    return undefined
  }

  try {
    // Try Web Crypto API first (Cloudflare Workers, browsers, modern Node.js)
    if (globalThis.crypto?.subtle) {
      const encoder = new TextEncoder()
      const keyData = encoder.encode(LOG_SECRET)
      const messageData = encoder.encode(email)

      // Import key for HMAC-SHA256
      const key = await globalThis.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      )

      // Generate HMAC
      const signature = await globalThis.crypto.subtle.sign('HMAC', key, messageData)

      // Convert to hex string
      const hashArray = Array.from(new Uint8Array(signature))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      return hashHex
    }

    // Fallback to Node.js crypto module for older environments
    const nodeCrypto = await import('node:crypto')
    const hmac = nodeCrypto.createHmac('sha256', LOG_SECRET)
    hmac.update(email)
    return hmac.digest('hex')
  } catch (error) {
    // If hashing fails, return undefined rather than exposing email
    // Log with context to help debug issues in production
    console.error('Failed to generate anonymous user ID:', {
      error,
      webCryptoAvailable: !!globalThis.crypto?.subtle,
      environment: typeof process !== 'undefined' ? 'node' : 'browser',
      timestamp: new Date().toISOString(),
    })

    // TODO: Add monitoring/alerting for production failures
    // Recommendation: Send to error tracking service (Sentry, Datadog, etc.) to detect
    // LOG_SECRET misconfiguration or crypto API issues in production environments.
    // Example:
    //   if (process.env.NODE_ENV === 'production') {
    //     errorTracker.captureException(error, {
    //       tags: { feature: 'anonymous-logging' },
    //       extra: { webCryptoAvailable: !!globalThis.crypto?.subtle }
    //     })
    //   }

    // Don't throw - anonymous logging is optional and should never block user actions
    // Log error in development for visibility, but allow signup/login to continue
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Anonymous ID generation failed in development:', error)
      console.error('💡 Set LOG_SECRET environment variable to enable anonymous logging')
      console.error('   Example: LOG_SECRET=$(openssl rand -hex 32)')
    }

    return undefined
  }
}

/**
 * RFC 5322 compliant email validation regex.
 * More restrictive than simple patterns to prevent malformed emails.
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

/**
 * Validation constants for user input.
 */
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 128
const NAME_MAX_LENGTH = 255
const PHONE_MIN_LENGTH = 3
const PHONE_MAX_LENGTH = 25
const PHONE_MIN_DIGITS = 3
const EMAIL_MAX_LENGTH = 254 // RFC 5321 max total length
const EMAIL_LOCAL_PART_MAX_LENGTH = 64 // RFC 5321 max local part length

export const retrieveCustomer = async (): Promise<HttpTypes.StoreCustomer | null> => {
  try {
    const authHeaders = await getAuthHeaders()

    if (!authHeaders || Object.keys(authHeaders).length === 0) {
      return null
    }

    const queryString = new URLSearchParams({ fields: '*orders' }).toString()
    const url = `${MEDUSA_BACKEND_URL}/store/customers/me?${queryString}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': PUBLISHABLE_KEY || '',
        ...authHeaders,
      },
      // Don't cache customer data - always fetch fresh to ensure accurate auth state
      cache: 'no-store',
    })

    // Handle authentication errors by clearing invalid tokens
    // Prevents infinite loops where expired/invalid tokens remain in cookies
    if (response.status === 401 || response.status === 403) {
      await removeAuthToken()
      return null
    }

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as { customer: HttpTypes.StoreCustomer }
    return data.customer
  } catch (error) {
    console.error('Error in retrieveCustomer:', error)
    return null
  }
}

export const updateCustomer = async (body: HttpTypes.StoreUpdateCustomer) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const updateRes = await sdk.store.customer
    .update(body, {}, headers)
    .then(({ customer }) => customer)
    .catch(medusaError)

  const cacheTag = await getCacheTag('customers')
  if (cacheTag) {
    await safeRevalidateTag(cacheTag)
  }

  return updateRes
}

/**
 * Registers a new customer, authenticates them, transfers their cart, and redirects to the country-specific account page.
 *
 * @param formData - FormData containing customer details, password, and countryCode
 * @returns An error message string if registration fails, otherwise redirects to account page
 */
export async function signup(_currentState: FormActionState, formData: FormData): Promise<string> {
  // Extract and normalize form inputs with proper null handling
  // Email handling:
  // - Only trim whitespace, do NOT lowercase to preserve exact user input
  // - Medusa SDK performs case-insensitive email lookups at the database level
  // - Email addresses are case-insensitive per RFC 5321, so "Test@Example.com" and
  //   "test@example.com" refer to the same mailbox
  // - We preserve case to respect how users register, but Medusa will match either case on login
  // Note: We use a custom regex for validation. For production systems with complex requirements,
  // consider using a well-tested library like validator.js or email-validator to handle edge cases
  // such as plus-addressing (user+tag@example.com), IDN, and punycode domains.
  const email = (formData.get('email')?.toString() ?? '').trim()

  // Password handling:
  // - Do NOT trim to respect user choice (they may intentionally include leading/trailing spaces)
  // - Validation will ensure non-empty passwords
  // - Decision rationale: While most systems trim for UX, we preserve exact input to avoid
  //   locking out users who intentionally use spaces. Alternative approaches considered:
  //   * Auto-trim (standard practice, best UX, but loses intentional spaces)
  //   * Show character count during input (makes spaces visible)
  //   * Reject leading/trailing whitespace during validation
  // - Current approach chosen to maximize user control and avoid surprise lockouts
  const password = formData.get('password')?.toString() ?? ''
  const countryCode = validateCountryCode(formData.get('countryCode')?.toString() ?? null)

  // Validate required inputs
  if (!email || !EMAIL_REGEX.test(email)) {
    return 'Please provide a valid email address'
  }

  // RFC 5321 compliance checks
  if (email.length > EMAIL_MAX_LENGTH) {
    return 'Email address is too long (max 254 characters)'
  }

  const [localPart] = email.split('@')
  if (!localPart || localPart.length > EMAIL_LOCAL_PART_MAX_LENGTH) {
    return 'Email address is invalid'
  }

  // Reject emails with leading/trailing dots or consecutive dots in local part
  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return 'Email address contains invalid characters'
  }

  // Validate password exists and meets minimum length
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return `Please use a password of at least ${PASSWORD_MIN_LENGTH} characters`
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Please use a password of no more than ${PASSWORD_MAX_LENGTH} characters`
  }

  const firstName = (formData.get('first_name')?.toString() ?? '').trim()
  const lastName = (formData.get('last_name')?.toString() ?? '').trim()
  const phone = (formData.get('phone')?.toString() ?? '').trim()

  // Validate required name fields
  if (!firstName || firstName.length < 1) {
    return 'Please provide your first name'
  }

  if (!lastName || lastName.length < 1) {
    return 'Please provide your last name'
  }

  // Validate name lengths (prevent extremely long inputs)
  if (firstName.length > NAME_MAX_LENGTH || lastName.length > NAME_MAX_LENGTH) {
    return `Please use a name of no more than ${NAME_MAX_LENGTH} characters`
  }

  // Basic phone validation if provided (optional field)
  // More lenient to support international formats and emergency numbers
  // Current validation handles ~95% of common cases with minimal bundle size
  //
  // TODO: Consider libphonenumber-js for production-grade validation
  // Priority: Low (current validation is sufficient for initial launch)
  // Benefits:
  //   - Validates country-specific formats and area codes
  //   - Rejects invalid patterns that pass current regex
  //   - Handles international dialing codes correctly
  // Trade-offs:
  //   - Bundle size: ~320KB increase vs current lightweight regex
  //   - Complexity: Additional dependency to maintain
  //   - Performance: Slightly slower validation
  // When to implement: If phone validation errors become common in user feedback
  if (phone) {
    if (phone.length < PHONE_MIN_LENGTH || phone.length > PHONE_MAX_LENGTH) {
      return 'Please provide a valid phone number'
    }
    // Ensure phone contains at least one digit (prevents all-symbol inputs)
    if (!/\d/.test(phone)) {
      return 'Please provide a valid phone number'
    }

    // Validate phone contains only digits, spaces, and common formatting characters
    // Must contain at least PHONE_MIN_DIGITS digits to be a valid phone number
    const digitCount = (phone.match(/\d/g) || []).length
    if (digitCount < PHONE_MIN_DIGITS) {
      return `Please provide a valid phone number with at least ${PHONE_MIN_DIGITS} digits`
    }

    // Phone must start with a digit or + (prevents invalid patterns like "-555-1234")
    if (!/^[\d\+\(]/.test(phone)) {
      return 'Phone number must start with a digit, +, or ('
    }

    // Allow digits, spaces, common formatting, and extensions (ext, x, #)
    // Supports: +1-555-1234, (555) 123-4567, 555.1234 ext. 123, 555-1234 #123, etc.
    // Note: Regex allows letters for "ext"/"x" but rejects obviously invalid patterns
    if (!/^[\d\s\+\-\(\)\.#extEXT]+$/.test(phone)) {
      return 'Please provide a valid phone number with only digits and formatting characters (+, -, (), ., #, ext)'
    }

    // Additional validation: reject patterns with consecutive special characters
    // Prevents malformed patterns like "1..2..3", "555--1234", "( )", etc.
    // Note: Allows "ext. 123" pattern (space + letter is valid for extensions)
    if (/[\-\(\)\.#]{2,}/.test(phone) || /\s{2,}/.test(phone)) {
      return 'Please provide a valid phone number'
    }
  }

  const customerForm = {
    email,
    first_name: firstName,
    last_name: lastName,
    phone: phone || '',
  }

  try {
    // Step 1: Register creates the auth identity for new signups
    const token = await sdk.auth.register('customer', 'emailpass', {
      email: customerForm.email,
      password: password,
    })

    // Step 2: Create customer profile with the registration token
    // IMPORTANT: We do NOT set auth token until AFTER customer profile is created
    // to avoid race condition where token exists but profile doesn't
    const headers = {
      authorization: `Bearer ${token}`,
    }

    try {
      await sdk.store.customer.create(customerForm, {}, headers)
    } catch (customerCreateError: unknown) {
      // Customer profile creation failed after auth identity was created
      // This creates an "orphaned" auth identity (auth exists but no customer profile)

      // TODO: Implement orphaned auth identity cleanup
      //
      // LIMITATION: The Medusa storefront SDK (@medusajs/js-sdk v2.11.0) does not expose
      // a method to delete auth identities. Auth identity deletion requires backend workflows
      // using setAuthAppMetadataStep to nullify associations.
      //
      // Current behavior: Safe but creates orphaned data
      // - Auth identity exists in database without customer profile
      // - Token is NOT set in cookies (preventing unauthorized access)
      // - User cannot login with orphaned identity (no customer profile)
      //
      // Recommended solutions (choose one):
      // 1. Backend cleanup job: Periodically query for auth_identities without customer profiles
      // 2. Backend webhook: Listen for customer.created failures and cleanup via workflow
      // 3. Admin runbook: Document manual cleanup process for support team
      //
      // Reference: Medusa backend workflow pattern:
      //   setAuthAppMetadataStep({
      //     authIdentityId: identity.id,
      //     actorType: "customer",
      //     value: null
      //   })

      // Log with anonymous user ID for privacy-compliant tracking
      const anonymousId = await getAnonymousUserId(email)
      console.error('Customer profile creation failed after auth registration:', {
        error: customerCreateError,
        ...(anonymousId && { userId: anonymousId }),
        timestamp: new Date().toISOString(),
        // Note: This may result in orphaned auth identity requiring manual cleanup
      })

      // Re-throw to be caught by outer catch block for user-friendly error message
      // Ensure we throw an Error instance for proper error handling
      if (customerCreateError instanceof Error) {
        throw customerCreateError
      }
      // Convert non-Error objects to Error instances
      throw new Error(String(customerCreateError))
    }

    // Step 3: Only now that customer profile exists, set the auth token
    // This eliminates the race condition window
    // Validate token is a string before setting (defensive programming)
    if (typeof token !== 'string' || !token) {
      throw new Error('Invalid authentication token received from server')
    }
    await setAuthToken(token)

    const customerCacheTag = await getCacheTag('customers')
    if (customerCacheTag) {
      await safeRevalidateTag(customerCacheTag)
    }

    // Transfer cart but don't block redirect on failure
    try {
      await transferCart()
    } catch (cartError: unknown) {
      // Log with additional context for monitoring/alerting
      // NOTE: Uses anonymous user ID (HMAC-SHA256 hash) instead of email to protect PII
      const anonymousId = await getAnonymousUserId(email)
      console.error('Cart transfer failed after signup:', {
        error: cartError,
        ...(anonymousId && { userId: anonymousId }), // Only include if hashing succeeded
        timestamp: new Date().toISOString(),
        // TODO: Add user-visible notification (toast/banner) via client-side state
        // TODO: Send to error tracking service (e.g., Sentry)
      })
      // Continue to redirect even if cart transfer fails
      // User's account is created successfully, cart items can be recovered manually if needed
    }

    // Redirect to country-specific account page
    redirect(`/${countryCode}/account`)
  } catch (error: unknown) {
    // Re-throw Next.js redirect errors (they should not be caught)
    // Next.js uses redirect() which throws a special error with digest property
    // Check for the official Next.js redirect digest pattern
    if (error && typeof error === 'object' && 'digest' in error &&
        typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }

    // Log with anonymous user ID for privacy-compliant tracking
    const anonymousId = await getAnonymousUserId(email)
    console.error('Signup failed:', {
      error,
      ...(anonymousId && { userId: anonymousId }),
      timestamp: new Date().toISOString(),
    })

    // Clear any partial auth state from failed registration
    // This is safe to call even if already called in inner catch
    await removeAuthToken()

    // Provide clear, user-friendly error messages based on error type
    // SECURITY NOTE: Email enumeration trade-off
    // We reveal if an email exists to improve UX (guides users to login vs signup)
    // This is standard for e-commerce but could be changed for high-security contexts
    // Alternative: "If this email is registered, we've sent you a notification"
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase()

      // If email already exists, direct user to login instead
      // UX benefit: Reduces user frustration and abandonment
      // Security consideration: Enables email enumeration (knowing which emails are registered)
      if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
        return 'An account with this email already exists. Please sign in instead.'
      }

      // Return generic message to avoid exposing internal details
      // Only specific, user-friendly messages should be returned
      return 'Registration failed. Please check your information and try again.'
    }

    // Generic fallback for non-Error objects
    return 'Registration failed. Please try again or contact support.'
  }
}

/**
 * Authenticates a customer with email/password, stores the session token, revalidates customer cache, transfers the cart, and redirects to the country-specific account page.
 *
 * @param formData - FormData containing the credentials; must include `email`, `password`, and `countryCode`
 * @returns An error message string if authentication or cart transfer fails, otherwise redirects to account page
 */
export async function login(_currentState: FormActionState, formData: FormData): Promise<string> {
  // Extract and normalize form inputs with proper null handling
  // Email handling: Matches signup behavior (trim only, no lowercase)
  const email = (formData.get('email')?.toString() ?? '').trim()

  // Password handling: Matches signup behavior (no trimming to respect user choice)
  const password = formData.get('password')?.toString() ?? ''
  const countryCode = validateCountryCode(formData.get('countryCode')?.toString() ?? null)

  // Validate required inputs
  if (!email || !EMAIL_REGEX.test(email)) {
    return 'Please provide a valid email address'
  }

  // RFC 5321 compliance checks
  if (email.length > EMAIL_MAX_LENGTH) {
    return 'Email address is too long (max 254 characters)'
  }

  const [localPart] = email.split('@')
  if (!localPart || localPart.length > EMAIL_LOCAL_PART_MAX_LENGTH) {
    return 'Email address is invalid'
  }

  // Reject emails with leading/trailing dots or consecutive dots in local part
  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return 'Email address contains invalid characters'
  }

  // Login accepts ANY non-empty password (no minimum length)
  // Rationale: Existing users might have passwords shorter than current minimum
  // Signup enforces PASSWORD_MIN_LENGTH, but login must accept legacy passwords
  if (!password || password.length < 1) {
    return 'Please provide your password'
  }

  try {
    await sdk.auth.login('customer', 'emailpass', { email, password }).then(async (token) => {
      // Validate token is a string before setting (defensive programming)
      if (typeof token !== 'string' || !token) {
        throw new Error('Invalid authentication token received from server')
      }
      await setAuthToken(token)
      const customerCacheTag = await getCacheTag('customers')
      if (customerCacheTag) { await safeRevalidateTag(customerCacheTag) }
    })
  } catch (error: unknown) {
    console.error('Login failed:', error)

    // Provide generic error messages to prevent information disclosure
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase()

      // Check for common authentication failure patterns
      if (errorMsg.includes('invalid') || errorMsg.includes('incorrect') ||
          errorMsg.includes('not found') || errorMsg.includes('unauthorized')) {
        return 'Invalid email or password. Please try again.'
      }

      // Return generic message for other errors to avoid exposing internal details
      return 'Login failed. Please check your credentials and try again.'
    }

    return 'Login failed. Please try again or contact support.'
  }

  // Transfer cart but don't block redirect on failure
  try {
    await transferCart()
  } catch (cartError: unknown) {
    // Log with additional context for monitoring/alerting
    // NOTE: Uses anonymous user ID (HMAC-SHA256 hash) instead of email to protect PII
    const anonymousId = await getAnonymousUserId(email)
    console.error('Cart transfer failed after login:', {
      error: cartError,
      ...(anonymousId && { userId: anonymousId }), // Only include if hashing succeeded
      timestamp: new Date().toISOString(),
      // TODO: Add user-visible notification (toast/banner) via client-side state
      // TODO: Send to error tracking service (e.g., Sentry)
    })
    // Continue to redirect even if cart transfer fails
  }

  // Redirect to country-specific account page
  redirect(`/${countryCode}/account`)
}

/**
 * Terminate the current customer session, clear local auth and cart state, refresh related caches, and redirect to the country-specific account page.
 *
 * @param countryCode - Two-letter country code used to construct the post-signout account page path (e.g., `us`)
 */
export async function signout(countryCode: string) {
  // Validate country code before proceeding with logout
  // Invalid country codes are sanitized to default to prevent path traversal
  const validatedCountryCode = validateCountryCode(countryCode)

  await sdk.auth.logout()

  await removeAuthToken()

  const customerCacheTag = await getCacheTag('customers')
  if (customerCacheTag) { await safeRevalidateTag(customerCacheTag) }

  await removeCartId()

  const cartCacheTag = await getCacheTag('carts')
  if (cartCacheTag) { await safeRevalidateTag(cartCacheTag) }

  redirect(`/${validatedCountryCode}/account`)
}

/**
 * Transfers a locally stored cart to the currently authenticated user's cart and refreshes the carts cache.
 *
 * Retrieves the local cart identifier, associates that cart with the authenticated session if present, and revalidates the carts cache tag.
 */
export async function transferCart() {
  const cartId = await getCartId()

  if (!cartId) {
    return
  }

  const headers = await getAuthHeaders()

  await sdk.store.cart.transferCart(cartId, {}, headers)

  const cartCacheTag = await getCacheTag('carts')
  if (cartCacheTag) { await safeRevalidateTag(cartCacheTag) }
}

export const addCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData,
): Promise<{ success: boolean; error: string | null; isDefaultBilling?: boolean; isDefaultShipping?: boolean }> => {
  const isDefaultBilling = (currentState.isDefaultBilling as boolean) || false
  const isDefaultShipping = (currentState.isDefaultShipping as boolean) || false

  const address = {
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    company: formData.get('company') as string,
    address_1: formData.get('address_1') as string,
    address_2: formData.get('address_2') as string,
    city: formData.get('city') as string,
    postal_code: formData.get('postal_code') as string,
    province: formData.get('province') as string,
    country_code: formData.get('country_code') as string,
    phone: formData.get('phone') as string,
    is_default_billing: isDefaultBilling,
    is_default_shipping: isDefaultShipping,
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .createAddress(address, {}, headers)
    .then(async (): Promise<{ success: boolean; error: string | null; isDefaultBilling: boolean; isDefaultShipping: boolean }> => {
      const customerCacheTag = await getCacheTag('customers')
      if (customerCacheTag) { await safeRevalidateTag(customerCacheTag) }
      return { success: true, error: null, isDefaultBilling, isDefaultShipping }
    })
    .catch((err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err))
      return { success: false, error: error.message, isDefaultBilling, isDefaultShipping }
    })
}

export const deleteCustomerAddress = async (addressId: string): Promise<{ success: boolean; error: string | null }> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .deleteAddress(addressId, headers)
    .then(async (): Promise<{ success: boolean; error: string | null }> => {
      const customerCacheTag = await getCacheTag('customers')
      if (customerCacheTag) { await safeRevalidateTag(customerCacheTag) }
      return { success: true, error: null }
    })
    .catch((err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err))
      return { success: false, error: error.message }
    })
}

export const updateCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData,
): Promise<{ success: boolean; error?: string | null; addressId?: string }> => {
  const addressId = (currentState.addressId as string) || (formData.get('addressId') as string)

  if (!addressId) {
    return { success: false, error: 'Address ID is required', addressId: undefined }
  }

  const address = {
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    company: formData.get('company') as string,
    address_1: formData.get('address_1') as string,
    address_2: formData.get('address_2') as string,
    city: formData.get('city') as string,
    postal_code: formData.get('postal_code') as string,
    province: formData.get('province') as string,
    country_code: formData.get('country_code') as string,
  } as HttpTypes.StoreUpdateCustomerAddress

  const phone = formData.get('phone') as string

  if (phone) {
    address.phone = phone
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .updateAddress(addressId, address, {}, headers)
    .then(async (): Promise<{ success: boolean; error: string | null; addressId: string }> => {
      const customerCacheTag = await getCacheTag('customers')
      if (customerCacheTag) { await safeRevalidateTag(customerCacheTag) }
      return { success: true, error: null, addressId }
    })
    .catch((err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err))
      return { success: false, error: error.message, addressId }
    })
}
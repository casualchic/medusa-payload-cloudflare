'use server'

import { sdk } from '@lib/config'
import medusaError from '@lib/util/medusa-error'
import { validateCountryCode } from '@lib/util/validate-country-code'
import { HttpTypes } from '@medusajs/types'
import { revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import * as nodeCrypto from 'crypto'
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

if (!MEDUSA_BACKEND_URL) {
  throw new Error('MEDUSA_BACKEND_URL or NEXT_PUBLIC_MEDUSA_BACKEND_URL is required')
}

if (!PUBLISHABLE_KEY) {
  throw new Error('NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is required')
}

/**
 * Creates a GDPR-compliant anonymized user identifier for logging.
 * Uses HMAC-SHA256 to hash the email when LOG_SECRET is set.
 * Returns undefined when LOG_SECRET is not set (for maximum privacy).
 */
function hashUserId(email: string): string | undefined {
  const logSecret = process.env.LOG_SECRET
  if (!logSecret) {
    return undefined
  }

  try {
    return nodeCrypto.createHmac('sha256', logSecret).update(email).digest('hex')
  } catch (error: unknown) {
    // If hashing fails, log the error and return undefined to prevent logging PII
    console.error('Failed to generate anonymous user ID:', {
      error,
      nodeCryptoAvailable: typeof nodeCrypto !== 'undefined' && typeof nodeCrypto.createHmac === 'function',
      environment: process.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString(),
    })
    return undefined
  }
}

export const retrieveCustomer = async (): Promise<HttpTypes.StoreCustomer | null> => {
  try {
    const authHeaders = await getAuthHeaders()

    if (!authHeaders || Object.keys(authHeaders).length === 0) {
      return null
    }

    // Customer "me" endpoint is user-specific; use no-store to prevent PII leaks
    // Caching authenticated responses risks serving one user's data to another user
    const queryString = new URLSearchParams({ fields: '*orders' }).toString()
    const url = `${MEDUSA_BACKEND_URL}/store/customers/me?${queryString}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': PUBLISHABLE_KEY || '',
        ...authHeaders,
      },
      cache: 'no-store',
    })

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
  if (cacheTag) await revalidateTag(cacheTag, 'max')

  return updateRes
}

export async function signup(_currentState: unknown, formData: FormData) {
  const password = formData.get('password') as string
  const email = (formData.get('email') as string)?.trim()
  const firstName = formData.get('first_name') as string
  const phone = formData.get('phone') as string
  const countryCode = validateCountryCode(formData.get('countryCode') as string)

  // Validation
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Please provide a valid email address'
  }
  if (!password || password.length < 8) {
    return 'Please use a password of at least 8 characters'
  }
  if (password.length > 128) {
    return 'Please use a password of no more than 128 characters'
  }
  if (!firstName) {
    return 'Please provide your first name'
  }
  if (phone) {
    // Phone must have at least 3 digits and can contain numbers, spaces, hyphens, parentheses, plus sign, and letters (for extensions)
    const digitCount = (phone.match(/\d/g) || []).length
    if (digitCount < 3) {
      return 'Please provide a valid phone number'
    }
  }

  const customerForm = {
    email,
    first_name: firstName,
    last_name: formData.get('last_name') as string,
    phone,
  }

  try {
    // Step 1: Register auth account
    const token = await sdk.auth.register('customer', 'emailpass', {
      email: customerForm.email,
      password: password,
    })

    // Step 2: Create customer profile
    const headers = {
      authorization: `Bearer ${token}`,
    }

    try {
      await sdk.store.customer.create(customerForm, {}, headers)

      // Step 3: Set auth token ONLY after successful customer creation
      await setAuthToken(token as string)

      // Step 4: Revalidate customer cache
      const customerCacheTag = await getCacheTag('customers')
      if (customerCacheTag) await revalidateTag(customerCacheTag, 'max')

      // Step 5: Transfer cart (log errors but don't fail signup)
      try {
        await transferCart()
      } catch (cartError: unknown) {
        const userId = hashUserId(email)
        const logData: { error: unknown; timestamp: string; userId?: string } = {
          error: cartError,
          timestamp: new Date().toISOString(),
        }
        if (userId !== undefined) {
          logData.userId = userId
        }
        console.error('Cart transfer failed after signup:', logData)
        // Continue with signup - cart transfer is not critical
      }

      // Step 6: Redirect to account page
      redirect(`/${countryCode}/account`)
    } catch (customerError: unknown) {
      // Re-throw redirect errors (Next.js redirects should propagate)
      if (customerError instanceof Error && (customerError.name === 'NEXT_REDIRECT' || customerError.message.startsWith('NEXT_REDIRECT'))) {
        throw customerError
      }

      // Customer creation failed - clean up auth token
      await removeAuthToken()
      throw new Error('Registration failed: Could not create customer profile')
    }
  } catch (error: unknown) {
    // Re-throw redirect errors (Next.js redirects should propagate)
    if (error instanceof Error && (error.name === 'NEXT_REDIRECT' || error.message.startsWith('NEXT_REDIRECT'))) {
      throw error
    }

    // Auth registration failed
    await removeAuthToken()

    const errorMessage = error instanceof Error ? error.message : String(error)

    // Handle specific error cases
    if (errorMessage.includes('already exists') || errorMessage.includes('duplicate') || errorMessage.includes('Email already exists')) {
      return 'An account with this email already exists. Please sign in instead.'
    }

    return errorMessage
  }
}

/**
 * Authenticates a customer with email/password, stores the session token, revalidates customer cache, and attempts to transfer the local cart to the authenticated session.
 *
 * @param formData - FormData containing the credentials; must include `email` and `password`
 * @returns An error message string if authentication fails, otherwise redirects to account page
 */
export async function login(_currentState: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const countryCode = validateCountryCode(formData.get('countryCode') as string)

  // Validation
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Please provide a valid email address'
  }
  if (!password) {
    return 'Please provide your password'
  }

  try {
    // Step 1: Authenticate
    const token = await sdk.auth.login('customer', 'emailpass', { email, password })

    // Step 2: Set auth token
    await setAuthToken(token as string)

    // Step 3: Revalidate customer cache
    const customerCacheTag = await getCacheTag('customers')
    if (customerCacheTag) await revalidateTag(customerCacheTag, 'max')

    // Step 4: Transfer cart (log errors but don't fail login)
    try {
      await transferCart()
    } catch (cartError: unknown) {
      console.error('Cart transfer failed after login:', {
        error: cartError,
        timestamp: new Date().toISOString(),
      })
      // Continue with login - cart transfer is not critical
    }

    // Step 5: Redirect to account page
    redirect(`/${countryCode}/account`)
  } catch (error: unknown) {
    // Re-throw redirect errors (Next.js redirects should propagate)
    if (error instanceof Error && (error.name === 'NEXT_REDIRECT' || error.message.startsWith('NEXT_REDIRECT'))) {
      throw error
    }

    const errorMessage = error instanceof Error ? error.message : String(error)

    // Handle specific error cases
    if (errorMessage.includes('Invalid credentials') || errorMessage.includes('Unauthorized')) {
      return 'Invalid email or password. Please try again.'
    }

    return errorMessage
  }
}

/**
 * Terminate the current customer session, clear local auth and cart state, refresh related caches, and redirect to the country-specific account page.
 *
 * @param countryCode - Two-letter country code used to construct the post-signout account page path (e.g., `us`)
 */
export async function signout(countryCode: string) {
  // Validate and sanitize country code
  const validatedCountryCode = validateCountryCode(countryCode)

  await sdk.auth.logout()

  await removeAuthToken()

  const customerCacheTag = await getCacheTag('customers')
  if (customerCacheTag) await revalidateTag(customerCacheTag, 'max')

  await removeCartId()

  const cartCacheTag = await getCacheTag('carts')
  if (cartCacheTag) await revalidateTag(cartCacheTag, 'max')

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
  if (cartCacheTag) await revalidateTag(cartCacheTag, 'max')
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
      if (customerCacheTag) await revalidateTag(customerCacheTag, 'max')
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
      if (customerCacheTag) await revalidateTag(customerCacheTag, 'max')
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
      if (customerCacheTag) await revalidateTag(customerCacheTag, 'max')
      return { success: true, error: null, addressId }
    })
    .catch((err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err))
      return { success: false, error: error.message, addressId }
    })
}
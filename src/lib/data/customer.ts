'use server'

import { sdk } from '@lib/config'
import medusaError from '@lib/util/medusa-error'
import { HttpTypes } from '@medusajs/types'
import { revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  getAuthHeaders,
  getCacheOptions,
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

export const retrieveCustomer = async (): Promise<HttpTypes.StoreCustomer | null> => {
  try {
    const authHeaders = await getAuthHeaders()

    if (!authHeaders || Object.keys(authHeaders).length === 0) {
      return null
    }

    const cacheOptions = await getCacheOptions('customers')

    const queryString = new URLSearchParams({ fields: '*orders' }).toString()
    const url = `${MEDUSA_BACKEND_URL}/store/customers/me?${queryString}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': PUBLISHABLE_KEY || '',
        ...authHeaders,
      },
      next: {
        ...cacheOptions,
        revalidate: 0,
      },
      cache: 'force-cache',
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
  await revalidateTag(cacheTag, 'default')

  return updateRes
}

export async function signup(_currentState: unknown, formData: FormData) {
  const password = formData.get('password') as string
  const customerForm = {
    email: formData.get('email') as string,
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    phone: formData.get('phone') as string,
  }

  try {
    const token = await sdk.auth.register('customer', 'emailpass', {
      email: customerForm.email,
      password: password,
    })

    await setAuthToken(token as string)

    const headers = {
      ...(await getAuthHeaders()),
    }

    const { customer: createdCustomer } = await sdk.store.customer.create(customerForm, {}, headers)

    const loginToken = await sdk.auth.login('customer', 'emailpass', {
      email: customerForm.email,
      password,
    })

    await setAuthToken(loginToken as string)

    const customerCacheTag = await getCacheTag('customers')
    await revalidateTag(customerCacheTag, 'default')

    await transferCart()

    return createdCustomer
  } catch (error: unknown) {
    return error instanceof Error ? error.message : String(error)
  }
}

/**
 * Authenticates a customer with email/password, stores the session token, revalidates customer cache, and attempts to transfer the local cart to the authenticated session.
 *
 * @param formData - FormData containing the credentials; must include `email` and `password`
 * @returns An error message string if authentication or cart transfer fails, otherwise `undefined`
 */
export async function login(_currentState: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  try {
    await sdk.auth.login('customer', 'emailpass', { email, password }).then(async (token) => {
      await setAuthToken(token as string)
      const customerCacheTag = await getCacheTag('customers')
      await revalidateTag(customerCacheTag, 'default')
    })
  } catch (error: unknown) {
    return error instanceof Error ? error.message : String(error)
  }

  try {
    await transferCart()
  } catch (error: unknown) {
    return error instanceof Error ? error.message : String(error)
  }
}

/**
 * Terminate the current customer session, clear local auth and cart state, refresh related caches, and redirect to the country-specific account page.
 *
 * @param countryCode - Two-letter country code used to construct the post-signout account page path (e.g., `us`)
 */
export async function signout(countryCode: string) {
  await sdk.auth.logout()

  await removeAuthToken()

  const customerCacheTag = await getCacheTag('customers')
  await revalidateTag(customerCacheTag, 'default')

  await removeCartId()

  const cartCacheTag = await getCacheTag('carts')
  await revalidateTag(cartCacheTag, 'default')

  redirect(`/${countryCode}/account`)
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
  await revalidateTag(cartCacheTag, 'default')
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
      await revalidateTag(customerCacheTag, 'default')
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
      await revalidateTag(customerCacheTag, 'default')
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
      await revalidateTag(customerCacheTag, 'default')
      return { success: true, error: null, addressId }
    })
    .catch((err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err))
      return { success: false, error: error.message, addressId }
    })
}
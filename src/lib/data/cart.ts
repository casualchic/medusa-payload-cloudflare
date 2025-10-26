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
  removeCartId,
  setCartId,
} from './cookies'
import { getRegion } from './regions'

const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

if (!MEDUSA_BACKEND_URL) {
  throw new Error('MEDUSA_BACKEND_URL or NEXT_PUBLIC_MEDUSA_BACKEND_URL is required')
}

if (!PUBLISHABLE_KEY) {
  throw new Error('NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is required')
}

/**
 * Fetches a cart by ID (or the cart ID from cookies when omitted) and returns the cart data.
 *
 * @param fields - Optional comma-separated fields to include in the cart response
 * @returns The cart object if found, `null` otherwise.
 */
export async function retrieveCart(cartId?: string, fields?: string) {
  try {
    const id = cartId || (await getCartId())
    fields ??=
      '*items, *region, *items.product, *items.variant, *items.thumbnail, *items.metadata, +items.total, *promotions, +shipping_methods.name'

    if (!id) {
      return null
    }

    const authHeaders = await getAuthHeaders()
    const cacheOptions = await getCacheOptions('carts')

    const queryString = new URLSearchParams({ fields }).toString()
    const url = `${MEDUSA_BACKEND_URL}/store/carts/${id}?${queryString}`

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
      // Cart might not exist, return null
      return null
    }

    const data = (await response.json()) as { cart: HttpTypes.StoreCart }
    return data.cart
  } catch (error) {
    console.error('Error in retrieveCart:', error)
    return null
  }
}

/**
 * Ensures a cart exists for the region inferred from the given country code and returns that cart.
 *
 * @param countryCode - The ISO country code used to resolve the region for the cart
 * @returns The store cart associated with the resolved region; created or updated as needed
 * @throws Error if no region can be resolved for the provided country code
 */
export async function getOrSetCart(countryCode: string) {
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  let cart = await retrieveCart(undefined, 'id,region_id')

  const headers = {
    ...(await getAuthHeaders()),
  }

  if (!cart) {
    const cartResp = await sdk.store.cart.create({ region_id: region.id }, {}, headers)
    cart = cartResp.cart

    await setCartId(cart.id)

    const cartCacheTag = await getCacheTag('carts')
    if (cartCacheTag) {
      await revalidateTag(cartCacheTag, 'max')
    }
  }

  if (cart && cart?.region_id !== region.id) {
    await sdk.store.cart.update(cart.id, { region_id: region.id }, {}, headers)
    const cartCacheTag = await getCacheTag('carts')
    if (cartCacheTag) {
      await revalidateTag(cartCacheTag, 'max')
    }
  }

  return cart
}

/**
 * Updates the current cart with the provided fields and revalidates cart and fulfillment cache tags.
 *
 * @param data - Fields to apply to the current cart update
 * @returns The updated cart
 * @throws Error if no existing cart is found
 */
export async function updateCart(data: HttpTypes.StoreUpdateCart) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error('No existing cart found, please create one before updating')
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .update(cartId, data, {}, headers)
    .then(async ({ cart }: { cart: HttpTypes.StoreCart }) => {
      // Revalidate cache tags in parallel for better performance
      const [cartCacheTag, fulfillmentCacheTag] = await Promise.all([
        getCacheTag('carts'),
        getCacheTag('fulfillment'),
      ])

      const tagsToRevalidate = [cartCacheTag, fulfillmentCacheTag].filter(tag => tag)
      if (tagsToRevalidate.length > 0) {
        await Promise.all(tagsToRevalidate.map(tag => revalidateTag(tag, 'max')))
      }

      return cart
    })
    .catch(medusaError)
}

/**
 * Adds a product variant to the current cart, creating or selecting a regional cart as needed.
 *
 * Revalidates cache tags for carts and fulfillment after successfully adding the line item.
 *
 * @param variantId - The ID of the product variant to add to the cart
 * @param quantity - The number of units to add
 * @param countryCode - ISO country code used to resolve the cart's region
 * @throws When `variantId` is missing
 * @throws When the cart cannot be retrieved or created
 */
export async function addToCart({
  variantId,
  quantity,
  countryCode,
}: {
  variantId: string
  quantity: number
  countryCode: string
}) {
  if (!variantId) {
    throw new Error('Missing variant ID when adding to cart')
  }

  const cart = await getOrSetCart(countryCode)

  if (!cart) {
    throw new Error('Error retrieving or creating cart')
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .createLineItem(
      cart.id,
      {
        variant_id: variantId,
        quantity,
      },
      {},
      headers,
    )
    .then(async () => {
      // Revalidate cache tags in parallel for better performance
      const [cartCacheTag, fulfillmentCacheTag] = await Promise.all([
        getCacheTag('carts'),
        getCacheTag('fulfillment'),
      ])

      const tagsToRevalidate = [cartCacheTag, fulfillmentCacheTag].filter(tag => tag)
      if (tagsToRevalidate.length > 0) {
        await Promise.all(tagsToRevalidate.map(tag => revalidateTag(tag, 'max')))
      }
    })
    .catch(medusaError)
}

/**
 * Update the quantity of a specific line item in the current cart and revalidate related caches.
 *
 * @param lineId - The ID of the cart line item to update
 * @param quantity - The target quantity for the line item
 * @throws Error if `lineId` is missing
 * @throws Error if there is no current cart ID available
 */
export async function updateLineItem({ lineId, quantity }: { lineId: string; quantity: number }) {
  if (!lineId) {
    throw new Error('Missing lineItem ID when updating line item')
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error('Missing cart ID when updating line item')
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .updateLineItem(cartId, lineId, { quantity }, {}, headers)
    .then(async () => {
      // Revalidate cache tags in parallel for better performance
      const [cartCacheTag, fulfillmentCacheTag] = await Promise.all([
        getCacheTag('carts'),
        getCacheTag('fulfillment'),
      ])

      const tagsToRevalidate = [cartCacheTag, fulfillmentCacheTag].filter(tag => tag)
      if (tagsToRevalidate.length > 0) {
        await Promise.all(tagsToRevalidate.map(tag => revalidateTag(tag, 'max')))
      }
    })
    .catch(medusaError)
}

/**
 * Removes a line item from the current cart and revalidates cart and fulfillment cache tags.
 *
 * @param lineId - The ID of the line item to remove
 * @throws Error if `lineId` is not provided
 * @throws Error if no cart ID can be resolved from storage
 */
export async function deleteLineItem(lineId: string) {
  if (!lineId) {
    throw new Error('Missing lineItem ID when deleting line item')
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error('Missing cart ID when deleting line item')
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .deleteLineItem(cartId, lineId, {}, headers)
    .then(async () => {
      // Revalidate cache tags in parallel for better performance
      const [cartCacheTag, fulfillmentCacheTag] = await Promise.all([
        getCacheTag('carts'),
        getCacheTag('fulfillment'),
      ])

      const tagsToRevalidate = [cartCacheTag, fulfillmentCacheTag].filter(tag => tag)
      if (tagsToRevalidate.length > 0) {
        await Promise.all(tagsToRevalidate.map(tag => revalidateTag(tag, 'max')))
      }
    })
    .catch(medusaError)
}

/**
 * Adds a shipping method to the specified cart and revalidates the carts cache.
 *
 * @param cartId - The ID of the cart to update
 * @param shippingMethodId - The ID of the shipping option to attach to the cart
 * @returns The response from the store API after adding the shipping method
 */
export async function setShippingMethod({
  cartId,
  shippingMethodId,
}: {
  cartId: string
  shippingMethodId: string
}) {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .addShippingMethod(cartId, { option_id: shippingMethodId }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag('carts')
      if (cartCacheTag) {
        await revalidateTag(cartCacheTag, 'max')
      }
    })
    .catch(medusaError)
}

/**
 * Initiates a payment session for the given cart and payment initialization data.
 *
 * Also revalidates the carts cache tag after successfully initiating the session.
 *
 * @param cart - The cart for which the payment session will be created
 * @param data - Payment session initialization payload
 * @returns The response from the payment session initiation
 */
export async function initiatePaymentSession(
  cart: HttpTypes.StoreCart,
  data: HttpTypes.StoreInitializePaymentSession,
) {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.payment
    .initiatePaymentSession(cart, data, {}, headers)
    .then(async (resp) => {
      const cartCacheTag = await getCacheTag('carts')
      if (cartCacheTag) {
        await revalidateTag(cartCacheTag, 'max')
      }
      return resp
    })
    .catch(medusaError)
}

/**
 * Applies promotion codes to the current cart and revalidates related caches.
 *
 * @param codes - Promotion codes to apply to the cart
 * @returns `void` after promotions are applied and related caches are revalidated
 * @throws Error - If there is no existing cart
 */
export async function applyPromotions(codes: string[]) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error('No existing cart found')
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .update(cartId, { promo_codes: codes }, {}, headers)
    .then(async () => {
      // Revalidate cache tags in parallel for better performance
      const [cartCacheTag, fulfillmentCacheTag] = await Promise.all([
        getCacheTag('carts'),
        getCacheTag('fulfillment'),
      ])

      const tagsToRevalidate = [cartCacheTag, fulfillmentCacheTag].filter(tag => tag)
      if (tagsToRevalidate.length > 0) {
        await Promise.all(tagsToRevalidate.map(tag => revalidateTag(tag, 'max')))
      }
    })
    .catch(medusaError)
}

/**
 * Placeholder for applying a gift card to the current cart; currently a no-op.
 *
 * @param _code - The gift card code (unused)
 */
export async function applyGiftCard(_code: string) {
  //   const cartId = getCartId()
  //   if (!cartId) return "No cartId cookie found"
  //   try {
  //     await updateCart(cartId, { gift_cards: [{ code }] }).then(() => {
  //       revalidateTag("cart", "default")
  //     })
  //   } catch (error: any) {
  //     throw error
  //   }
}

/**
 * Placeholder that would remove a discount code from the current cart; currently inactive and performs no action.
 *
 * @param _code - Discount code (ignored in the current implementation)
 */
export async function removeDiscount(_code: string) {
  // const cartId = getCartId()
  // if (!cartId) return "No cartId cookie found"
  // try {
  //   await deleteDiscount(cartId, code)
  //   revalidateTag("cart", "default")
  // } catch (error: any) {
  //   throw error
  // }
}

/**
 * Placeholder for removing a gift card from the current cart; currently a no-op.
 *
 * @param _codeToRemove - Gift card code intended for removal (currently unused)
 * @param _giftCards - Array of gift card objects from which `_codeToRemove` would be removed (currently unused)
 */
export async function removeGiftCard(
  _codeToRemove: string,
  _giftCards: unknown[],
  // giftCards: GiftCard[]
) {
  //   const cartId = getCartId()
  //   if (!cartId) return "No cartId cookie found"
  //   try {
  //     await updateCart(cartId, {
  //       gift_cards: [...giftCards]
  //         .filter((gc) => gc.code !== codeToRemove)
  //         .map((gc) => ({ code: gc.code })),
  //     }).then(() => {
  //       revalidateTag("cart", "default")
  //     })
  //   } catch (error: any) {
  //     throw error
  //   }
}

export async function submitPromotionForm(currentState: unknown, formData: FormData) {
  const code = formData.get('code') as string
  try {
    await applyPromotions([code])
  } catch (e: unknown) {
    return e instanceof Error ? e.message : String(e)
  }
}

// TODO: Pass a POJO instead of a form entity here
export async function setAddresses(currentState: unknown, formData: FormData) {
  try {
    if (!formData) {
      throw new Error('No form data found when setting addresses')
    }
    const cartId = getCartId()
    if (!cartId) {
      throw new Error('No existing cart found when setting addresses')
    }

    const data: {
      shipping_address: Record<string, FormDataEntryValue | null>
      billing_address?: Record<string, FormDataEntryValue | null>
      email: string | null
    } = {
      shipping_address: {
        first_name: formData.get('shipping_address.first_name'),
        last_name: formData.get('shipping_address.last_name'),
        address_1: formData.get('shipping_address.address_1'),
        address_2: '',
        company: formData.get('shipping_address.company'),
        postal_code: formData.get('shipping_address.postal_code'),
        city: formData.get('shipping_address.city'),
        country_code: formData.get('shipping_address.country_code'),
        province: formData.get('shipping_address.province'),
        phone: formData.get('shipping_address.phone'),
      },
      email: formData.get('email') as string | null,
    }

    const sameAsBilling = formData.get('same_as_billing')
    if (sameAsBilling === 'on') data.billing_address = data.shipping_address

    if (sameAsBilling !== 'on')
      data.billing_address = {
        first_name: formData.get('billing_address.first_name'),
        last_name: formData.get('billing_address.last_name'),
        address_1: formData.get('billing_address.address_1'),
        address_2: '',
        company: formData.get('billing_address.company'),
        postal_code: formData.get('billing_address.postal_code'),
        city: formData.get('billing_address.city'),
        country_code: formData.get('billing_address.country_code'),
        province: formData.get('billing_address.province'),
        phone: formData.get('billing_address.phone'),
      }
    await updateCart(data)
  } catch (e: unknown) {
    return e instanceof Error ? e.message : String(e)
  }

  redirect(`/${formData.get('shipping_address.country_code')}/checkout?step=delivery`)
}

/**
 * Completes checkout for a cart and returns the resulting cart; if the completion results in an order, navigates to the order confirmation page.
 *
 * Attempts to complete the cart identified by `cartId` (or the cart id stored in cookies if omitted). If the completion response is an order, the function removes the cart id cookie, revalidates order and cart caches, and redirects the user to the order confirmation page.
 *
 * @param cartId - Optional cart ID to place the order for; when omitted the cart id from cookies is used
 * @returns The cart object from the completion response, or `undefined` if the response does not include a cart
 */
export async function placeOrder(cartId?: string) {
  const id = cartId || (await getCartId())

  if (!id) {
    throw new Error('No existing cart found when placing an order')
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const cartRes = await sdk.store.cart
    .complete(id, {}, headers)
    .then(async (cartRes) => {
      const cartCacheTag = await getCacheTag('carts')
      if (cartCacheTag) {
        await revalidateTag(cartCacheTag, 'max')
      }
      return cartRes
    })
    .catch(medusaError)

  if (cartRes?.type === 'order') {
    const countryCode = cartRes.order.shipping_address?.country_code?.toLowerCase()

    const orderCacheTag = await getCacheTag('orders')
    if (orderCacheTag) {
      await revalidateTag(orderCacheTag, 'max')
    }

    removeCartId()
    redirect(`/${countryCode}/order/${cartRes?.order.id}/confirmed`)
  }

  return cartRes.cart
}

/**
 * Update the active region from a country code, revalidate related caches, and redirect to the provided path.
 *
 * If a cart exists, its region will be updated before cache revalidation. After revalidating regions, products,
 * and (when applicable) carts cache tags, the user is redirected to `/{countryCode}{currentPath}`.
 *
 * @param countryCode - ISO country code used to resolve the target region
 * @param currentPath - The path to redirect to after updating the region (preserves existing pathname)
 * @throws Error when no region can be resolved for the provided `countryCode`
 */
export async function updateRegion(countryCode: string, currentPath: string) {
  const cartId = await getCartId()
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  if (cartId) {
    await updateCart({ region_id: region.id })
  }

  // Revalidate all affected cache tags in parallel
  const cacheTagPromises = [getCacheTag('regions'), getCacheTag('products')]
  if (cartId) {
    cacheTagPromises.push(getCacheTag('carts'))
  }

  const cacheTags = (await Promise.all(cacheTagPromises)).filter(tag => tag)
  if (cacheTags.length > 0) {
    await Promise.all(cacheTags.map(tag => revalidateTag(tag, 'max')))
  }

  redirect(`/${countryCode}${currentPath}`)
}

/**
 * Retrieves available shipping options for the current cart.
 *
 * Returns the cart's shipping options; if there is no cart, the backend returns a non-OK response, or an error occurs, an empty `shipping_options` array is returned.
 *
 * @returns An object with `shipping_options` containing an array of shipping option objects for the current cart (empty if unavailable)
 */
export async function listCartOptions() {
  try {
    const cartId = await getCartId()

    if (!cartId) {
      return { shipping_options: [] }
    }

    const authHeaders = await getAuthHeaders()
    const cacheOptions = await getCacheOptions('shippingOptions')

    const queryString = new URLSearchParams({ cart_id: cartId }).toString()
    const url = `${MEDUSA_BACKEND_URL}/store/shipping-options?${queryString}`

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
      return { shipping_options: [] }
    }

    const data = (await response.json()) as { shipping_options: HttpTypes.StoreCartShippingOption[] }
    return {
      shipping_options: data.shipping_options,
    }
  } catch (error) {
    console.error('Error in listCartOptions:', error)
    return { shipping_options: [] }
  }
}
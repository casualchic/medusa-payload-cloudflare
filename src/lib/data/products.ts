'use server'

import { sortProducts } from '@lib/util/sort-products'
import { HttpTypes } from '@medusajs/types'
import { SortOptions } from '@modules/store/components/refinement-list/sort-products'
import { getAuthHeaders, getCacheOptions } from './cookies'
import { getRegion, retrieveRegion } from './regions'

const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

if (!MEDUSA_BACKEND_URL) {
  throw new Error('MEDUSA_BACKEND_URL or NEXT_PUBLIC_MEDUSA_BACKEND_URL is required')
}

if (!PUBLISHABLE_KEY) {
  throw new Error('NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is required')
}

export const listProducts = async ({
  pageParam = 1,
  queryParams,
  countryCode,
  regionId,
}: {
  pageParam?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductListParams
  countryCode?: string
  regionId?: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductListParams
}> => {
  try {
    if (!countryCode && !regionId) {
      throw new Error('Country code or region ID is required')
    }

    const limit = queryParams?.limit || 12
    const _pageParam = Math.max(pageParam, 1)
    const offset = _pageParam === 1 ? 0 : (_pageParam - 1) * limit

    let region: HttpTypes.StoreRegion | undefined | null

    if (countryCode) {
      region = await getRegion(countryCode)
    } else {
      region = await retrieveRegion(regionId!)
    }

    if (!region) {
      return {
        response: { products: [], count: 0 },
        nextPage: null,
      }
    }

    const authHeaders = await getAuthHeaders()
    const cacheOptions = await getCacheOptions('products')

    // Build query parameters properly
    const params: Record<string, string> = {
      limit: String(limit),
      offset: String(offset),
      region_id: region.id,
    }

    // Add additional query params if provided, excluding complex fields
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          value !== '' &&
          key !== 'fields' &&
          key !== 'limit' &&
          key !== 'offset'
        ) {
          // Handle arrays by joining with commas
          if (Array.isArray(value)) {
            const filtered = value.filter((v) => v !== '' && v !== null && v !== undefined)
            if (filtered.length > 0) {
              params[key] = filtered.join(',')
            }
          } else {
            params[key] = String(value)
          }
        }
      })
    }

    // Add fields last, from queryParams if provided, otherwise use default
    if (queryParams?.fields) {
      params.fields = String(queryParams.fields)
    } else {
      params.fields = '*variants.calculated_price,+variants.inventory_quantity,+metadata,+tags'
    }

    const query = new URLSearchParams(params)
    const url = `${MEDUSA_BACKEND_URL}/store/products?${query.toString()}`

    if (process.env.NODE_ENV === 'development') {
      console.log('Fetching products from:', url)
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': PUBLISHABLE_KEY || '',
        ...authHeaders,
      },
      next: {
        ...cacheOptions,
        revalidate: 3600,
      },
      cache: 'force-cache',
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error body')
      console.error('Error fetching products:', response.status, response.statusText)
      console.error('URL:', url)
      console.error('Response body:', errorText)
      throw new Error(`Failed to fetch products: ${response.statusText}`)
    }

    const data = await response.json()
    const products = data.products as HttpTypes.StoreProduct[]
    const count = data.count || products.length

    const nextPage = count > offset + limit ? pageParam + 1 : null

    return {
      response: {
        products,
        count,
      },
      nextPage: nextPage,
      queryParams,
    }
  } catch (error) {
    console.error('Error in listProducts:', error)
    throw error
  }
}

/**
 * This will fetch 100 products to the Next.js cache and sort them based on the sortBy parameter.
 * It will then return the paginated products based on the page and limit parameters.
 */
export const listProductsWithSort = async ({
  page = 0,
  queryParams,
  sortBy = 'created_at',
  countryCode,
}: {
  page?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
  sortBy?: SortOptions
  countryCode: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
}> => {
  const limit = queryParams?.limit || 12

  const {
    response: { products, count },
  } = await listProducts({
    pageParam: 0,
    queryParams: {
      ...queryParams,
      limit: 100,
    },
    countryCode,
  })

  const sortedProducts = sortProducts(products, sortBy)

  const pageParam = (page - 1) * limit

  const nextPage = count > pageParam + limit ? pageParam + limit : null

  const paginatedProducts = sortedProducts.slice(pageParam, pageParam + limit)

  return {
    response: {
      products: paginatedProducts,
      count,
    },
    nextPage,
    queryParams,
  }
}

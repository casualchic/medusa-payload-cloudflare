'use server'

import { HttpTypes } from '@medusajs/types'
import { getCacheOptions } from './cookies'

const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

if (!MEDUSA_BACKEND_URL) {
  throw new Error('MEDUSA_BACKEND_URL or NEXT_PUBLIC_MEDUSA_BACKEND_URL is required')
}

if (!PUBLISHABLE_KEY) {
  throw new Error('NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is required')
}

export const retrieveCollection = async (id: string) => {
  try {
    const cacheOptions = await getCacheOptions('collections')

    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/collections/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': PUBLISHABLE_KEY || '',
      },
      next: {
        ...cacheOptions,
        revalidate: 3600,
      },
      cache: 'force-cache',
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch collection: ${response.statusText}`)
    }

    const data = await response.json()
    return data.collection as HttpTypes.StoreCollection
  } catch (error) {
    console.error(`Error in retrieveCollection(${id}):`, error)
    throw error
  }
}

export const listCollections = async (
  queryParams: Record<string, string> = {},
): Promise<{ collections: HttpTypes.StoreCollection[]; count: number }> => {
  try {
    const cacheOptions = await getCacheOptions('collections')

    queryParams.limit = queryParams.limit || '100'
    queryParams.offset = queryParams.offset || '0'

    const queryString = new URLSearchParams(queryParams).toString()
    const url = `${MEDUSA_BACKEND_URL}/store/collections${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': PUBLISHABLE_KEY || '',
      },
      next: {
        ...cacheOptions,
        revalidate: 3600,
      },
      cache: 'force-cache',
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch collections: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      collections: data.collections as HttpTypes.StoreCollection[],
      count: data.collections?.length || 0,
    }
  } catch (error) {
    console.error('Error in listCollections:', error)

    // Return fallback collections when backend is not accessible
    const fallbackCollections: HttpTypes.StoreCollection[] = [
      {
        id: 'fallback-1',
        title: 'Featured Products',
        handle: 'featured',
        description: 'Our featured products',
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        type: null,
        discount_condition_id: null,
        products: [],
      },
      {
        id: 'fallback-2',
        title: 'New Arrivals',
        handle: 'new-arrivals',
        description: 'Latest additions to our store',
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        type: null,
        discount_condition_id: null,
        products: [],
      },
    ]

    return {
      collections: fallbackCollections,
      count: fallbackCollections.length,
    }
  }
}

export const getCollectionByHandle = async (handle: string): Promise<HttpTypes.StoreCollection> => {
  try {
    const cacheOptions = await getCacheOptions('collections')

    const queryString = new URLSearchParams({ handle, fields: '*products' }).toString()
    const url = `${MEDUSA_BACKEND_URL}/store/collections?${queryString}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': PUBLISHABLE_KEY || '',
      },
      next: {
        ...cacheOptions,
        revalidate: 3600,
      },
      cache: 'force-cache',
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch collection: ${response.statusText}`)
    }

    const data = await response.json()
    return data.collections[0] as HttpTypes.StoreCollection
  } catch (error) {
    console.error(`Error in getCollectionByHandle(${handle}):`, error)
    throw error
  }
}

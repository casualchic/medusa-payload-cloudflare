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

    const data = (await response.json()) as { collection: HttpTypes.StoreCollection }
    return data.collection
  } catch (error) {
    // Sanitize ID for logging to prevent log injection
    console.error('Error in retrieveCollection', {
      id: String(id).substring(0, 50),
      error
    })
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

    const data = (await response.json()) as { collections: HttpTypes.StoreCollection[] }
    return {
      collections: data.collections,
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
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        products: [],
      },
      {
        id: 'fallback-2',
        title: 'New Arrivals',
        handle: 'new-arrivals',
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        products: [],
      },
    ]

    return {
      collections: fallbackCollections,
      count: fallbackCollections.length,
    }
  }
}

export const getCollectionByHandle = async (handle: string): Promise<HttpTypes.StoreCollection | null> => {
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

    const data = (await response.json()) as { collections: HttpTypes.StoreCollection[] }

    if (!data.collections || data.collections.length === 0) {
      // Sanitize handle for logging to prevent log injection
      console.warn('No collection found with handle', {
        handle: String(handle).substring(0, 100)
      })
      return null
    }

    return data.collections[0]
  } catch (error) {
    // Sanitize handle for logging
    console.error('Error in getCollectionByHandle', {
      handle: String(handle).substring(0, 100),
      error
    })
    throw error
  }
}

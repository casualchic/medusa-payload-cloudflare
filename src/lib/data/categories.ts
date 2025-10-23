import { HttpTypes } from '@medusajs/types'
import { getCacheOptions } from './cookies'

const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

export const listCategories = async (query?: Record<string, any>) => {
  try {
    const cacheOptions = await getCacheOptions('categories')
    const limit = query?.limit || 100

    const params: Record<string, string> = {
      fields: '*category_children, *products, *parent_category, *parent_category.parent_category',
      limit: String(limit),
    }

    // Add additional query params if provided
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'limit') {
          params[key] = String(value)
        }
      })
    }

    const queryString = new URLSearchParams(params).toString()
    const url = `${MEDUSA_BACKEND_URL}/store/product-categories?${queryString}`

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
      throw new Error(`Failed to fetch categories: ${response.statusText}`)
    }

    const data = await response.json()
    return data.product_categories as HttpTypes.StoreProductCategory[]
  } catch (error) {
    console.error('Error in listCategories:', error)

    // Return fallback categories when backend is not accessible
    const fallbackCategories: HttpTypes.StoreProductCategory[] = [
      {
        id: 'cat-1',
        name: 'Clothing',
        handle: 'clothing',
        description: 'Browse our clothing collection',
        is_active: true,
        is_internal: false,
        rank: 1,
        category_children: [],
        parent_category: null,
        products: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        metadata: {},
      },
      {
        id: 'cat-2',
        name: 'Accessories',
        handle: 'accessories',
        description: 'Find the perfect accessories',
        is_active: true,
        is_internal: false,
        rank: 2,
        category_children: [],
        parent_category: null,
        products: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        metadata: {},
      },
    ]

    return fallbackCategories
  }
}

export const getCategoryByHandle = async (categoryHandle: string[]) => {
  try {
    const handle = `${categoryHandle.join('/')}`
    const cacheOptions = await getCacheOptions('categories')

    const queryString = new URLSearchParams({
      fields: '*category_children, *products',
      handle,
    }).toString()

    const url = `${MEDUSA_BACKEND_URL}/store/product-categories?${queryString}`

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
      throw new Error(`Failed to fetch category: ${response.statusText}`)
    }

    const data = await response.json()
    return data.product_categories[0] as HttpTypes.StoreProductCategory
  } catch (error) {
    console.error(`Error in getCategoryByHandle(${categoryHandle}):`, error)

    // Return a fallback category when backend is not accessible
    const fallbackCategory: HttpTypes.StoreProductCategory = {
      id: `cat-${categoryHandle.join('-')}`,
      name: categoryHandle.join(' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      handle: categoryHandle.join('/'),
      description: `Browse our ${categoryHandle.join(' ')} collection`,
      is_active: true,
      is_internal: false,
      rank: 1,
      category_children: [],
      parent_category: null,
      products: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      metadata: {},
    }

    return fallbackCategory
  }
}

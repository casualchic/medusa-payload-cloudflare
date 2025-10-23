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

export const listRegions = async () => {
  try {
    const cacheOptions = await getCacheOptions('regions')

    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/regions`, {
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
      const errorData = await response.json().catch(() => ({}))
      console.error('Error fetching regions:', response.status, errorData)
      throw new Error(`Failed to fetch regions: ${response.statusText}`)
    }

    const data = (await response.json()) as { regions: HttpTypes.StoreRegion[] }
    return data.regions
  } catch (error) {
    console.error('Error in listRegions:', error)
    throw error
  }
}

export const retrieveRegion = async (id: string) => {
  try {
    const cacheOptions = await getCacheOptions(['regions', id].join('-'))

    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/regions/${id}`, {
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
      const errorData = await response.json().catch(() => ({}))
      // Sanitize ID for logging to prevent log injection
      console.error('Error fetching region', {
        id: String(id).substring(0, 50),
        status: response.status,
        errorData
      })
      throw new Error(`Failed to fetch region: ${response.statusText}`)
    }

    const data = (await response.json()) as { region: HttpTypes.StoreRegion }
    return data.region
  } catch (error) {
    // Sanitize ID for logging
    console.error('Error in retrieveRegion', {
      id: String(id).substring(0, 50),
      error
    })
    throw error
  }
}

export const getRegion = async (countryCode: string) => {
  try {
    const regions = await listRegions()

    if (!regions || regions.length === 0) {
      console.error('No regions available')
      return null
    }

    // Find region by country code
    for (const region of regions) {
      const hasCountry = region.countries?.some((c) => c?.iso_2 === countryCode)
      if (hasCountry) {
        return region
      }
    }

    // Fallback to first region if country code not found
    // Sanitize country code for logging to prevent log injection
    console.warn('Region not found for country code, using first available region', {
      countryCode: String(countryCode).substring(0, 10) // Limit length and convert to string
    })
    return regions[0]
  } catch (e: any) {
    console.error('Error in getRegion:', e)

    // Return a fallback region when backend is not accessible
    return {
      id: countryCode,
      name: countryCode === 'us' ? 'United States' : countryCode.toUpperCase(),
      countries: [
        {
          id: countryCode,
          iso_2: countryCode,
          // Map common 2-letter codes to proper ISO 3166-1 alpha-3 codes
          iso_3: countryCode === 'us' ? 'usa' : countryCode === 'gb' ? 'gbr' : countryCode === 'ca' ? 'can' : countryCode.toUpperCase(),
          name: countryCode === 'us' ? 'United States' : countryCode.toUpperCase(),
        },
      ],
      currency_code: 'usd',
      tax_rate: 0,
      tax_code: null,
      gift_cards_taxable: false,
      automatic_taxes: false,
      includes_tax: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      metadata: {},
    } as HttpTypes.StoreRegion
  }
}

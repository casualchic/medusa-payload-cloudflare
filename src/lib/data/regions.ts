'use server'

import { HttpTypes } from '@medusajs/types'
import { getCacheOptions } from './cookies'

const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

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

    const data = await response.json()
    return data.regions as HttpTypes.StoreRegion[]
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
      console.error(`Error fetching region ${id}:`, response.status, errorData)
      throw new Error(`Failed to fetch region: ${response.statusText}`)
    }

    const data = await response.json()
    return data.region as HttpTypes.StoreRegion
  } catch (error) {
    console.error(`Error in retrieveRegion(${id}):`, error)
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
    console.warn(`Region for country code ${countryCode} not found, using first available region`)
    return regions[0]
  } catch (e: any) {
    console.error('Error in getRegion:', e)

    // Return a fallback region when backend is not accessible
    return {
      id: countryCode,
      name: countryCode === 'us' ? 'United States' : countryCode.toUpperCase(),
      countries: [
        {
          iso_2: countryCode,
          iso_3: countryCode,
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

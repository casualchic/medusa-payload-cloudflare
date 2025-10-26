/**
 * Valid country codes for the storefront.
 * Must match Medusa backend region iso_2 codes.
 *
 * To add a new country:
 * 1. Ensure the region exists in Medusa backend
 * 2. Add the iso_2 code to this array
 * 3. Update routing configuration if needed
 */
export const VALID_COUNTRY_CODES = ['us', 'ca', 'gb'] as const

/**
 * Type representing a valid country code
 */
export type CountryCode = (typeof VALID_COUNTRY_CODES)[number]

/**
 * Default country code when validation fails
 *
 * TODO: Consider IP-based geolocation for smarter default
 * Priority: Low (simple default works for initial launch)
 * Current approach: Always defaults to 'us'
 * Enhanced approach:
 *   - Use Cloudflare's cf.country property from request headers
 *   - Fallback to 'us' if geolocation unavailable or country not supported
 *   - Example: const country = request.cf?.country?.toLowerCase() || 'us'
 * Trade-offs:
 *   - Pros: Better UX (users see correct country automatically)
 *   - Cons: Adds complexity, requires request context, may need caching
 * When to implement: If user feedback indicates country selection is friction point
 */
export const DEFAULT_COUNTRY_CODE: CountryCode = 'us'

/**
 * Set of valid country codes for O(1) lookup performance
 */
const VALID_COUNTRY_CODES_SET = new Set<string>(VALID_COUNTRY_CODES)

/**
 * Validates and normalizes a country code from form data or route params.
 * Ensures the country code matches a valid region in the Medusa backend.
 *
 * This is a synchronous utility function that can be used in both client
 * and server components without server action constraints.
 *
 * @param code - The country code string to validate (can be null or undefined)
 * @returns A valid country code from VALID_COUNTRY_CODES, defaulting to 'us' if invalid
 *
 * @example
 * validateCountryCode('CA') // returns 'ca'
 * validateCountryCode('invalid') // returns 'us'
 * validateCountryCode(null) // returns 'us'
 * validateCountryCode(undefined) // returns 'us'
 */
export function validateCountryCode(code?: string | null): CountryCode {
  const normalized = (code ?? DEFAULT_COUNTRY_CODE).toLowerCase().trim()
  return (VALID_COUNTRY_CODES_SET.has(normalized) ? normalized : DEFAULT_COUNTRY_CODE) as CountryCode
}

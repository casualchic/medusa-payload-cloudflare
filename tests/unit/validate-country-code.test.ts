import { describe, it, expect } from 'vitest'
import { validateCountryCode, VALID_COUNTRY_CODES, DEFAULT_COUNTRY_CODE, type CountryCode } from '@lib/util/validate-country-code'

describe('validateCountryCode', () => {
  describe('Valid country codes', () => {
    it('should return normalized lowercase country code for valid uppercase input', () => {
      expect(validateCountryCode('US')).toBe('us')
      expect(validateCountryCode('CA')).toBe('ca')
      expect(validateCountryCode('GB')).toBe('gb')
    })

    it('should return normalized lowercase country code for valid lowercase input', () => {
      expect(validateCountryCode('us')).toBe('us')
      expect(validateCountryCode('ca')).toBe('ca')
      expect(validateCountryCode('gb')).toBe('gb')
    })

    it('should return normalized lowercase country code for valid mixed case input', () => {
      expect(validateCountryCode('Us')).toBe('us')
      expect(validateCountryCode('Ca')).toBe('ca')
      expect(validateCountryCode('Gb')).toBe('gb')
    })

    it('should trim whitespace from valid country codes', () => {
      expect(validateCountryCode('  us  ')).toBe('us')
      expect(validateCountryCode('\tca\t')).toBe('ca')
      expect(validateCountryCode('\ngb\n')).toBe('gb')
    })
  })

  describe('Invalid country codes', () => {
    it('should return default country code for invalid country codes', () => {
      expect(validateCountryCode('invalid')).toBe(DEFAULT_COUNTRY_CODE)
      expect(validateCountryCode('XX')).toBe(DEFAULT_COUNTRY_CODE)
      expect(validateCountryCode('fr')).toBe(DEFAULT_COUNTRY_CODE)
      expect(validateCountryCode('de')).toBe(DEFAULT_COUNTRY_CODE)
    })

    it('should return default country code for empty string', () => {
      expect(validateCountryCode('')).toBe(DEFAULT_COUNTRY_CODE)
    })

    it('should return default country code for null', () => {
      expect(validateCountryCode(null)).toBe(DEFAULT_COUNTRY_CODE)
    })

    it('should return default country code for undefined', () => {
      expect(validateCountryCode(undefined)).toBe(DEFAULT_COUNTRY_CODE)
      expect(validateCountryCode()).toBe(DEFAULT_COUNTRY_CODE)
    })

    it('should return default country code for whitespace-only string', () => {
      expect(validateCountryCode('   ')).toBe(DEFAULT_COUNTRY_CODE)
      expect(validateCountryCode('\t\t')).toBe(DEFAULT_COUNTRY_CODE)
      expect(validateCountryCode('\n')).toBe(DEFAULT_COUNTRY_CODE)
    })

    it('should return default country code for numeric strings', () => {
      expect(validateCountryCode('123')).toBe(DEFAULT_COUNTRY_CODE)
      expect(validateCountryCode('01')).toBe(DEFAULT_COUNTRY_CODE)
    })

    it('should return default country code for special characters', () => {
      expect(validateCountryCode('us!')).toBe(DEFAULT_COUNTRY_CODE)
      expect(validateCountryCode('u$')).toBe(DEFAULT_COUNTRY_CODE)
      expect(validateCountryCode('../us')).toBe(DEFAULT_COUNTRY_CODE)
    })
  })

  describe('Edge cases', () => {
    it('should handle numeric input', () => {
      expect(validateCountryCode('123')).toBe(DEFAULT_COUNTRY_CODE)
    })

    it('should handle special characters', () => {
      expect(validateCountryCode('u$')).toBe(DEFAULT_COUNTRY_CODE)
      expect(validateCountryCode('c@')).toBe(DEFAULT_COUNTRY_CODE)
    })

    it('should handle longer strings', () => {
      expect(validateCountryCode('usa')).toBe(DEFAULT_COUNTRY_CODE)
      expect(validateCountryCode('canada')).toBe(DEFAULT_COUNTRY_CODE)
    })

    it('should handle single character input', () => {
      expect(validateCountryCode('u')).toBe(DEFAULT_COUNTRY_CODE)
      expect(validateCountryCode('c')).toBe(DEFAULT_COUNTRY_CODE)
    })
  })

  describe('Type safety', () => {
    it('should return a valid CountryCode', () => {
      const result: CountryCode = validateCountryCode('us')
      expect(result).toBe('us')
    })

    it('should ensure all valid country codes are in the array', () => {
      expect(VALID_COUNTRY_CODES).toContain('us')
      expect(VALID_COUNTRY_CODES).toContain('ca')
      expect(VALID_COUNTRY_CODES).toContain('gb')
    })

    it('should have default country code in valid array', () => {
      expect(VALID_COUNTRY_CODES).toContain(DEFAULT_COUNTRY_CODE)
    })

    it('should have exactly 3 valid country codes', () => {
      expect(VALID_COUNTRY_CODES).toHaveLength(3)
    })
  })

  describe('Security', () => {
    it('should prevent path injection attempts', () => {
      expect(validateCountryCode('../us')).toBe(DEFAULT_COUNTRY_CODE)
      expect(validateCountryCode('../../etc/passwd')).toBe(DEFAULT_COUNTRY_CODE)
      expect(validateCountryCode('us/../ca')).toBe(DEFAULT_COUNTRY_CODE)
    })

    it('should handle URL-like input', () => {
      expect(validateCountryCode('http://example.com')).toBe(DEFAULT_COUNTRY_CODE)
      expect(validateCountryCode('//example.com')).toBe(DEFAULT_COUNTRY_CODE)
    })

    it('should handle SQL-like input', () => {
      expect(validateCountryCode("us' OR '1'='1")).toBe(DEFAULT_COUNTRY_CODE)
      expect(validateCountryCode('us; DROP TABLE countries;')).toBe(DEFAULT_COUNTRY_CODE)
    })
  })

  describe('Performance', () => {
    it('should handle repeated calls efficiently', () => {
      const iterations = 10000
      const start = performance.now()

      for (let i = 0; i < iterations; i++) {
        validateCountryCode('us')
        validateCountryCode('invalid')
        validateCountryCode(null)
      }

      const duration = performance.now() - start
      // Should complete 30k validations in under 250ms (Set lookup is O(1))
      // Threshold increased from 100ms to 250ms for CI environment stability
      expect(duration).toBeLessThan(250)
    })
  })
})

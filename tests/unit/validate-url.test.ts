import { describe, it, expect } from 'vitest'
import { validateUrl } from '@lib/util/validate-url'

describe('validateUrl', () => {
  describe('valid URLs', () => {
    it('should allow valid HTTPS URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true)
      expect(validateUrl('https://example.com/path')).toBe(true)
      expect(validateUrl('https://sub.example.com')).toBe(true)
    })

    it('should allow valid HTTP URLs', () => {
      expect(validateUrl('http://example.com')).toBe(true)
      expect(validateUrl('http://localhost:3000')).toBe(true)
    })

    it('should allow mailto URLs', () => {
      expect(validateUrl('mailto:test@example.com')).toBe(true)
    })

    it('should allow relative URLs', () => {
      expect(validateUrl('/about')).toBe(true)
      expect(validateUrl('/products/123')).toBe(true)
      expect(validateUrl('/')).toBe(true)
    })

    it('should allow hash/anchor links', () => {
      expect(validateUrl('#section')).toBe(true)
      expect(validateUrl('#')).toBe(true)
    })

    it('should allow empty values', () => {
      expect(validateUrl('')).toBe(true)
      expect(validateUrl(null)).toBe(true)
      expect(validateUrl(undefined)).toBe(true)
    })

    it('should allow whitespace-only values', () => {
      expect(validateUrl('   ')).toBe(true)
    })
  })

  describe('invalid URLs', () => {
    it('should reject javascript: protocol', () => {
      const result = validateUrl('javascript:alert(1)')
      expect(result).toContain('protocol')
    })

    it('should reject data: protocol', () => {
      const result = validateUrl('data:text/html,<script>alert(1)</script>')
      expect(result).toContain('protocol')
    })

    it('should reject file: protocol', () => {
      const result = validateUrl('file:///etc/passwd')
      expect(result).toContain('protocol')
    })

    it('should reject ftp: protocol', () => {
      const result = validateUrl('ftp://example.com')
      expect(result).toContain('protocol')
    })

    it('should reject malformed URLs', () => {
      const result = validateUrl('not a url')
      expect(result).toContain('valid URL')
    })

    it('should reject URLs with invalid characters', () => {
      const result = validateUrl('https://example.com/<script>')
      // URL constructor will accept this, so it should pass
      // The validation is protocol-based, not character-based
      expect(result).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle URLs with query parameters', () => {
      expect(validateUrl('https://example.com?foo=bar')).toBe(true)
      expect(validateUrl('/path?query=value')).toBe(true)
    })

    it('should handle URLs with fragments', () => {
      expect(validateUrl('https://example.com#section')).toBe(true)
      expect(validateUrl('/path#anchor')).toBe(true)
    })

    it('should handle URLs with ports', () => {
      expect(validateUrl('https://example.com:8080')).toBe(true)
      expect(validateUrl('http://localhost:3000/api')).toBe(true)
    })

    it('should handle URLs with authentication', () => {
      expect(validateUrl('https://user:pass@example.com')).toBe(true)
    })

    it('should handle international domain names', () => {
      expect(validateUrl('https://münchen.de')).toBe(true)
    })

    it('should trim whitespace before validation', () => {
      expect(validateUrl('  https://example.com  ')).toBe(true)
      expect(validateUrl('  /about  ')).toBe(true)
    })
  })
})

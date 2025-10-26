import { describe, it, expect } from 'vitest'

/**
 * Replicates the slug generation logic from src/collections/Pages.ts
 * for unit testing edge cases
 */
function generateSlug(title: string): string {
  try {
    let slug = title
      .toLowerCase()
      // Handle Nordic characters before normalization
      .replace(/ø/g, 'o')
      .replace(/å/g, 'a')
      .replace(/æ/g, 'ae')
      .normalize('NFKD') // Normalize Unicode (strip diacritics)
      .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
      .replace(/[^a-z0-9\s-]/g, '') // Keep only lowercase letters, digits, space, hyphen
      .trim() // Trim whitespace from edges
      .replace(/\s+/g, '-') // Convert spaces to hyphens
      .replace(/-+/g, '-') // Collapse multiple hyphens
      .replace(/^-+|-+$/g, '') // Trim leading/trailing hyphens

    // Handle edge case: empty slug after sanitization (e.g., title: "!!!")
    if (!slug || slug.length === 0) {
      // Use randomUUID for guaranteed uniqueness (avoids timestamp race conditions)
      const uuid = crypto.randomUUID().split('-')[0] // Use first segment for brevity
      slug = `untitled-page-${uuid}`
    }

    // Truncate if too long (max 255 chars for database compatibility)
    if (slug.length > 255) {
      slug = slug.substring(0, 255).replace(/-+$/, '') // Trim trailing hyphen after truncation
    }

    return slug
  } catch (error) {
    console.error('Slug generation failed:', error)
    return `page-${Date.now()}`
  }
}

describe('Slug Generation', () => {
  describe('Basic Transformations', () => {
    it('should convert title to lowercase slug', () => {
      expect(generateSlug('My Test Page')).toBe('my-test-page')
    })

    it('should replace spaces with hyphens', () => {
      expect(generateSlug('multiple  spaces   here')).toBe('multiple-spaces-here')
    })

    it('should trim leading and trailing whitespace', () => {
      expect(generateSlug('  trim me  ')).toBe('trim-me')
    })

    it('should remove special characters', () => {
      expect(generateSlug('Hello! @World# $Test%')).toBe('hello-world-test')
    })

    it('should collapse multiple hyphens', () => {
      expect(generateSlug('test---page')).toBe('test-page')
    })

    it('should remove leading hyphens', () => {
      expect(generateSlug('-leading-hyphen')).toBe('leading-hyphen')
    })

    it('should remove trailing hyphens', () => {
      expect(generateSlug('trailing-hyphen-')).toBe('trailing-hyphen')
    })
  })

  describe('Unicode and Diacritics', () => {
    it('should handle French accented characters', () => {
      expect(generateSlug('Café Français')).toBe('cafe-francais')
    })

    it('should handle German umlauts', () => {
      expect(generateSlug('Café Münchën')).toBe('cafe-munchen')
    })

    it('should handle Spanish tildes', () => {
      expect(generateSlug('Año Niño')).toBe('ano-nino')
    })

    it('should handle Portuguese cedilla', () => {
      expect(generateSlug('Açúcar')).toBe('acucar')
    })

    it('should handle Nordic characters', () => {
      expect(generateSlug('Ålesund Øl')).toBe('alesund-ol')
    })

    it('should handle mixed Unicode characters', () => {
      expect(generateSlug('Crème Brûlée à la Mode')).toBe('creme-brulee-a-la-mode')
    })
  })

  describe('Edge Cases', () => {
    it('should generate fallback for empty title', () => {
      const result = generateSlug('')
      expect(result).toMatch(/^untitled-page-[0-9a-f]{8}$/)
    })

    it('should generate fallback for title with only special characters', () => {
      const result = generateSlug('!!!')
      expect(result).toMatch(/^untitled-page-[0-9a-f]{8}$/)
    })

    it('should generate fallback for title with only emojis', () => {
      const result = generateSlug('🎉🎊🎈')
      expect(result).toMatch(/^untitled-page-[0-9a-f]{8}$/)
    })

    it('should handle title with only whitespace', () => {
      const result = generateSlug('   ')
      expect(result).toMatch(/^untitled-page-[0-9a-f]{8}$/)
    })

    it('should handle title with only hyphens', () => {
      const result = generateSlug('---')
      expect(result).toMatch(/^untitled-page-[0-9a-f]{8}$/)
    })
  })

  describe('Length Constraints', () => {
    it('should not truncate titles under 255 characters', () => {
      const title = 'a'.repeat(200)
      const result = generateSlug(title)
      expect(result.length).toBe(200)
    })

    it('should truncate titles at exactly 255 characters', () => {
      const title = 'a'.repeat(300)
      const result = generateSlug(title)
      expect(result.length).toBeLessThanOrEqual(255)
      expect(result.length).toBe(255)
    })

    it('should truncate very long titles correctly', () => {
      const title = 'a'.repeat(1000)
      const result = generateSlug(title)
      expect(result.length).toBeLessThanOrEqual(255)
      expect(result.length).toBe(255)
    })

    it('should remove trailing hyphen after truncation', () => {
      // Create a title that will have a hyphen at position 255
      const title = 'a'.repeat(253) + ' b'.repeat(100)
      const result = generateSlug(title)
      expect(result.length).toBeLessThanOrEqual(255)
      expect(result).not.toMatch(/-$/)
    })

    it('should handle title with spaces resulting in truncation at hyphen boundary', () => {
      const words = Array(100).fill('word').join(' ')
      const result = generateSlug(words)
      expect(result.length).toBeLessThanOrEqual(255)
      expect(result).not.toMatch(/-$/)
    })
  })

  describe('Real-World Examples', () => {
    it('should handle typical e-commerce page titles', () => {
      expect(generateSlug('Summer Sale 2024')).toBe('summer-sale-2024')
      expect(generateSlug('Women\'s Dresses - New Arrivals')).toBe('womens-dresses-new-arrivals')
      expect(generateSlug('About Us | Casual Chic Boutique')).toBe('about-us-casual-chic-boutique')
    })

    it('should handle product category names', () => {
      expect(generateSlug('Men\'s Casual Wear')).toBe('mens-casual-wear')
      expect(generateSlug('Kids & Toddlers')).toBe('kids-toddlers')
      expect(generateSlug('Sale: Up to 50% Off!')).toBe('sale-up-to-50-off')
    })

    it('should handle blog post titles', () => {
      expect(generateSlug('10 Tips for Summer Fashion')).toBe('10-tips-for-summer-fashion')
      expect(generateSlug('How to Style a Little Black Dress')).toBe('how-to-style-a-little-black-dress')
    })

    it('should handle landing page titles', () => {
      expect(generateSlug('Free Shipping on Orders Over $50')).toBe('free-shipping-on-orders-over-50')
      expect(generateSlug('Sign Up & Get 20% Off Your First Order')).toBe('sign-up-get-20-off-your-first-order')
    })
  })

  describe('Numeric Handling', () => {
    it('should preserve numbers in slug', () => {
      expect(generateSlug('iPhone 15 Pro Max')).toBe('iphone-15-pro-max')
    })

    it('should handle titles starting with numbers', () => {
      expect(generateSlug('2024 Fashion Trends')).toBe('2024-fashion-trends')
    })

    it('should handle titles with only numbers', () => {
      expect(generateSlug('123456')).toBe('123456')
    })
  })

  describe('Case Sensitivity', () => {
    it('should handle mixed case titles consistently', () => {
      expect(generateSlug('CamelCaseTitle')).toBe('camelcasetitle')
      expect(generateSlug('UPPERCASE TITLE')).toBe('uppercase-title')
      expect(generateSlug('MiXeD CaSe TiTLe')).toBe('mixed-case-title')
    })
  })

  describe('Whitespace Variations', () => {
    it('should handle tabs', () => {
      expect(generateSlug('title\twith\ttabs')).toBe('title-with-tabs')
    })

    it('should handle newlines', () => {
      expect(generateSlug('title\nwith\nnewlines')).toBe('title-with-newlines')
    })

    it('should handle mixed whitespace', () => {
      expect(generateSlug('title \t\n with \r\n mixed')).toBe('title-with-mixed')
    })
  })
})

import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, afterAll, expect } from 'vitest'

let payload: Payload
const testPageIds: string[] = []

// Skip this test suite in CI (NODE_ENV=test) because it requires D1 database
// which needs wrangler authentication in CI environments
describe.skipIf(process.env.NODE_ENV === 'test')('Pages Collection', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  afterAll(async () => {
    // Cleanup: Delete all test pages created during this test run
    for (const id of testPageIds) {
      try {
        await payload.delete({
          collection: 'pages',
          id,
        })
      } catch {
        // Ignore errors during cleanup
      }
    }
  })

  describe('Create', () => {
    it('should create a page with auto-generated slug', async () => {
      const page = await payload.create({
        collection: 'pages',
        data: {
          title: 'Test Page',
          status: 'draft',
          content: [
            {
              blockType: 'text',
              content: {
                root: {
                  type: 'root',
                  version: 1,
                  children: [
                    {
                      type: 'paragraph',
                      children: [
                        {
                          type: 'text',
                          text: 'Test content',
                        },
                      ],
                    },
                  ],
                },
              },
            },
          ],
        },
      })

      testPageIds.push(page.id)
      expect(page.slug).toBe('test-page')
      expect(page.status).toBe('draft')
    })

    it('should create a page with custom slug', async () => {
      const page = await payload.create({
        collection: 'pages',
        data: {
          title: 'Custom Slug Page',
          slug: 'my-custom-slug',
          status: 'draft',
          content: [],
        },
      })

      testPageIds.push(page.id)
      expect(page.slug).toBe('my-custom-slug')
    })

    it('should generate fallback slug for empty title', async () => {
      const page = await payload.create({
        collection: 'pages',
        data: {
          title: '',
          status: 'draft',
          content: [],
        },
      })

      testPageIds.push(page.id)
      expect(page.slug).toMatch(/^untitled-page-[0-9a-f]{8}$/)
    })

    it('should normalize Unicode characters in slug', async () => {
      const page = await payload.create({
        collection: 'pages',
        data: {
          title: 'Café Münchën',
          status: 'draft',
          content: [],
        },
      })

      testPageIds.push(page.id)
      expect(page.slug).toBe('cafe-munchen')
    })

    it('should set publishedAt when status is published', async () => {
      const beforeCreate = Date.now()
      const page = await payload.create({
        collection: 'pages',
        data: {
          title: 'Published Page',
          status: 'published',
          content: [],
        },
      })
      const afterCreate = Date.now()

      testPageIds.push(page.id)
      expect(page.publishedAt).toBeDefined()

      const publishedTime = new Date(page.publishedAt as string).getTime()
      expect(publishedTime).toBeGreaterThanOrEqual(beforeCreate)
      expect(publishedTime).toBeLessThanOrEqual(afterCreate)
    })

    it('should create page with HeroBlock', async () => {
      const page = await payload.create({
        collection: 'pages',
        data: {
          title: 'Hero Block Test',
          status: 'draft',
          content: [
            {
              blockType: 'hero',
              heading: 'Welcome to Our Store',
              subheading: 'Discover amazing products',
              ctaText: 'Shop Now',
              ctaLink: '/products',
            },
          ],
        },
      })

      testPageIds.push(page.id)
      expect(page.content).toHaveLength(1)
      expect(page.content[0].blockType).toBe('hero')
    })
  })

  describe('Read', () => {
    it('should find pages by slug', async () => {
      // Create a page first
      const created = await payload.create({
        collection: 'pages',
        data: {
          title: 'Findable Page',
          status: 'published',
          content: [],
        },
      })
      testPageIds.push(created.id)

      // Find by slug
      const result = await payload.find({
        collection: 'pages',
        where: {
          slug: {
            equals: 'findable-page',
          },
        },
      })

      expect(result.docs).toHaveLength(1)
      expect(result.docs[0].slug).toBe('findable-page')
    })

    it('should filter by status', async () => {
      const result = await payload.find({
        collection: 'pages',
        where: {
          status: {
            equals: 'published',
          },
        },
      })

      expect(result.docs).toBeDefined()
      result.docs.forEach((doc) => {
        expect(doc.status).toBe('published')
      })
    })
  })

  describe('Update', () => {
    it('should update page title and regenerate slug', async () => {
      const page = await payload.create({
        collection: 'pages',
        data: {
          title: 'Original Title',
          status: 'draft',
          content: [],
        },
      })
      testPageIds.push(page.id)

      const updated = await payload.update({
        collection: 'pages',
        id: page.id,
        data: {
          title: 'Updated Title',
        },
      })

      expect(updated.title).toBe('Updated Title')
      expect(updated.slug).toBe('updated-title')
    })

    it('should set publishedAt when changing status to published', async () => {
      const page = await payload.create({
        collection: 'pages',
        data: {
          title: 'Draft to Published',
          status: 'draft',
          content: [],
        },
      })
      testPageIds.push(page.id)

      expect(page.publishedAt).toBeUndefined()

      const updated = await payload.update({
        collection: 'pages',
        id: page.id,
        data: {
          status: 'published',
        },
      })

      expect(updated.publishedAt).toBeDefined()
    })
  })

  describe('Delete', () => {
    it('should delete a page', async () => {
      const page = await payload.create({
        collection: 'pages',
        data: {
          title: 'Page to Delete',
          status: 'draft',
          content: [],
        },
      })

      const deleted = await payload.delete({
        collection: 'pages',
        id: page.id,
      })

      expect(deleted.id).toBe(page.id)

      // Verify it's gone
      await expect(
        payload.findByID({
          collection: 'pages',
          id: page.id,
        })
      ).rejects.toThrow()
    })
  })

  describe('Validation', () => {
    it('should validate slug format', async () => {
      await expect(
        payload.create({
          collection: 'pages',
          data: {
            title: 'Invalid Slug Test',
            slug: 'invalid slug!@#',
            status: 'draft',
            content: [],
          },
        })
      ).rejects.toThrow()
    })

    it('should enforce unique slugs', async () => {
      const page1 = await payload.create({
        collection: 'pages',
        data: {
          title: 'Unique Slug Test',
          slug: 'unique-test-slug',
          status: 'draft',
          content: [],
        },
      })
      testPageIds.push(page1.id)

      await expect(
        payload.create({
          collection: 'pages',
          data: {
            title: 'Duplicate Slug Test',
            slug: 'unique-test-slug',
            status: 'draft',
            content: [],
          },
        })
      ).rejects.toThrow()
    })
  })
})

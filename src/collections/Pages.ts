import type { CollectionConfig } from 'payload'
import {
  HeroBlock,
  FeaturedProductsBlock,
  TextBlock,
  ImageGalleryBlock,
  CTABlock,
  VideoBlock,
  TestimonialsBlock,
} from '../blocks'
import { validateUrl } from '@lib/util/validate-url'
import { revalidatePath } from 'next/cache'

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: {
    singular: 'Page',
    plural: 'Pages',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'status', 'updatedAt'],
    group: 'Content',
    livePreview: {
      url: ({ data }) => {
        // Generate preview URL for live editing
        const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
        const slug = typeof data?.slug === 'string' && data.slug.trim() ? data.slug : 'new'
        return `${baseUrl}/preview/pages/${encodeURIComponent(slug)}`
      },
    },
  },
  versions: {
    drafts: {
      autosave: {
        interval: 2000, // Auto-save every 2 seconds (balances UX with database load)
      },
    },
    maxPerDoc: 50, // Keep up to 50 versions per page
  },
  access: {
    read: ({ req: { user } }) => {
      // Public read for published pages, authenticated read for drafts
      if (user) return true
      return {
        status: {
          equals: 'published',
        },
      }
    },
  },
  hooks: {
    beforeChange: [
      ({ data }): typeof data => {
        // Auto-set publishedAt when status changes to published
        if (data?.status === 'published' && !data?.publishedAt) {
          data.publishedAt = new Date().toISOString()
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation }): Promise<void> => {
        // Revalidate the page and preview routes after create/update
        if (operation === 'create' || operation === 'update') {
          try {
            // Configurable base path for pages (defaults to /pages)
            // Set PAGES_BASE_PATH env var to override (e.g., "/" for root-level pages)
            const pagesBasePath = process.env.PAGES_BASE_PATH || '/pages'

            // Revalidate the public page route
            if (doc.slug) {
              revalidatePath(`${pagesBasePath}/${doc.slug}`)
            }
            // Revalidate the preview route (path only, no base URL)
            const slug = doc.slug || 'new'
            revalidatePath(`/preview/pages/${slug}`)
          } catch (error) {
            // Log but don't fail the operation if revalidation fails
            console.error('Page cache revalidation failed:', error)
          }
        }
      },
    ],
    beforeValidate: [
      ({ data, operation }): typeof data => {
        // Auto-generate slug from title if not provided (only for new pages)
        if (operation === 'create' && data?.title && !data?.slug) {
          try {
            data.slug = data.title
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
            if (!data.slug || data.slug.length === 0) {
              // Use randomUUID for guaranteed uniqueness (avoids timestamp race conditions)
              const uuid = crypto.randomUUID().split('-')[0] // Use first segment for brevity
              data.slug = `untitled-page-${uuid}`
            }

            // Truncate if too long (max 255 chars for database compatibility)
            if (data.slug.length > 255) {
              data.slug = data.slug.substring(0, 255).replace(/-+$/, '') // Trim trailing hyphen after truncation
            }
          } catch (error) {
            console.error('Slug generation failed:', error)
            // Fallback with UUID to ensure uniqueness even on error
            const uuid = crypto.randomUUID().split('-')[0]
            data.slug = `page-${uuid}`
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'Page title (used in browser tab and navigation)',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true, // Index for fast lookups
      maxLength: 255,
      validate: (value: string) => {
        if (!value || value.length < 1) {
          return 'Slug must not be empty'
        }
        if (!/^[a-z0-9-]+$/.test(value)) {
          return 'Slug must only contain lowercase letters, numbers, and hyphens'
        }
        if (value.startsWith('-') || value.endsWith('-')) {
          return 'Slug cannot start or end with a hyphen'
        }
        return true
      },
      admin: {
        description: 'URL-friendly identifier (auto-generated from title if empty)',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
      index: true, // Index for filtering by status
      admin: {
        position: 'sidebar',
        description: 'Page publication status',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        description: 'Publication date (auto-set when first published)',
        readOnly: true,
      },
    },
    {
      name: 'content',
      type: 'blocks',
      required: true,
      minRows: 1,
      blocks: [
        HeroBlock,
        FeaturedProductsBlock,
        TextBlock,
        ImageGalleryBlock,
        CTABlock,
        VideoBlock,
        TestimonialsBlock,
      ],
      admin: {
        description: 'Build your page with flexible content blocks',
      },
    },
    // SEO Tab
    {
      type: 'tabs',
      tabs: [
        {
          label: 'SEO',
          fields: [
            {
              name: 'seo',
              type: 'group',
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  admin: {
                    description: 'Override default page title for search engines (50-60 chars)',
                  },
                  maxLength: 70,
                },
                {
                  name: 'description',
                  type: 'textarea',
                  admin: {
                    description: 'Meta description for search results (150-160 chars)',
                  },
                  maxLength: 160,
                },
                {
                  name: 'keywords',
                  type: 'text',
                  admin: {
                    description: 'Comma-separated keywords (optional, mainly for internal use)',
                  },
                },
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  admin: {
                    description: 'Social sharing image (recommended: 1200x630px)',
                  },
                },
                {
                  name: 'noIndex',
                  type: 'checkbox',
                  defaultValue: false,
                  admin: {
                    description: 'Prevent search engines from indexing this page',
                  },
                },
                {
                  name: 'canonical',
                  type: 'text',
                  validate: validateUrl,
                  admin: {
                    description: 'Canonical URL (leave empty to use default)',
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Advanced',
          fields: [
            {
              name: 'customCSS',
              type: 'code',
              access: {
                create: ({ req }) => !!req.user,
                update: ({ req }) => !!req.user,
              },
              admin: {
                language: 'css',
                description: '⚠️ ADMIN ONLY - Add custom CSS for this page. Use with caution.',
              },
            },
            {
              name: 'customJS',
              type: 'code',
              access: {
                create: ({ req }) => !!req.user,
                update: ({ req }) => !!req.user,
              },
              admin: {
                language: 'javascript',
                description: '⚠️ ADMIN ONLY - Add custom JavaScript for this page. XSS risk if misused.',
              },
            },
            {
              name: 'layout',
              type: 'select',
              defaultValue: 'default',
              options: [
                { label: 'Default', value: 'default' },
                { label: 'Wide', value: 'wide' },
                { label: 'Narrow', value: 'narrow' },
                { label: 'Full Width (No Container)', value: 'fullwidth' },
              ],
              admin: {
                description: 'Page layout variant',
              },
            },
          ],
        },
      ],
    },
  ],
}

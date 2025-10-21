import type { CollectionConfig } from 'payload'

export const Products: CollectionConfig = {
  slug: 'products',
  labels: {
    singular: 'Product',
    plural: 'Products',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'handle', 'status', 'updatedAt'],
    group: 'E-commerce',
  },
  access: {
    read: () => true, // Public read access for storefront
  },
  fields: [
    {
      name: 'medusaId',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Product ID from Medusa',
        readOnly: true,
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'Product title from Medusa',
      },
    },
    {
      name: 'handle',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-friendly product identifier',
      },
    },
    {
      name: 'description',
      type: 'richText',
      admin: {
        description: 'Product description - you can enhance this with rich content',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Proposed', value: 'proposed' },
        { label: 'Published', value: 'published' },
        { label: 'Rejected', value: 'rejected' },
      ],
      admin: {
        description: 'Product status from Medusa',
      },
    },
    {
      name: 'thumbnail',
      type: 'text',
      admin: {
        description: 'Main product image URL',
      },
    },
    {
      name: 'metadata',
      type: 'json',
      admin: {
        description: 'Additional product metadata from Medusa',
      },
    },
    // Enhanced CMS fields (not synced from Medusa)
    {
      name: 'seoTitle',
      type: 'text',
      admin: {
        description: 'Override SEO title (optional)',
      },
    },
    {
      name: 'seoDescription',
      type: 'textarea',
      admin: {
        description: 'Override SEO description (optional)',
      },
    },
    {
      name: 'additionalContent',
      type: 'richText',
      admin: {
        description: 'Additional editorial content (styling guides, care instructions, etc.)',
      },
    },
  ],
}

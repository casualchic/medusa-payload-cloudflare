import type { CollectionConfig } from 'payload'

export const ProductOptions: CollectionConfig = {
  slug: 'product-options',
  labels: {
    singular: 'Product Option',
    plural: 'Product Options',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'product', 'values', 'updatedAt'],
    group: 'E-commerce',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'medusaId',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Option ID from Medusa',
        readOnly: true,
      },
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      hasMany: false,
      admin: {
        description: 'Parent product',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'Option name (e.g., "Size", "Color")',
      },
    },
    {
      name: 'values',
      type: 'array',
      required: true,
      admin: {
        description: 'Available option values',
      },
      fields: [
        {
          name: 'value',
          type: 'text',
          required: true,
        },
        {
          name: 'medusaValueId',
          type: 'text',
          admin: {
            description: 'Option value ID from Medusa',
          },
        },
      ],
    },
    {
      name: 'metadata',
      type: 'json',
      admin: {
        description: 'Additional option metadata',
      },
    },
  ],
}

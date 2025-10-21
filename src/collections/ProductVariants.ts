import type { CollectionConfig } from 'payload'

export const ProductVariants: CollectionConfig = {
  slug: 'product-variants',
  labels: {
    singular: 'Product Variant',
    plural: 'Product Variants',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'sku', 'product', 'updatedAt'],
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
        description: 'Variant ID from Medusa',
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
        description: 'Variant title (e.g., "Small / Black")',
      },
    },
    {
      name: 'sku',
      type: 'text',
      admin: {
        description: 'Stock keeping unit',
      },
    },
    {
      name: 'barcode',
      type: 'text',
      admin: {
        description: 'Product barcode',
      },
    },
    {
      name: 'prices',
      type: 'json',
      admin: {
        description: 'Price data from Medusa',
      },
    },
    {
      name: 'options',
      type: 'json',
      admin: {
        description: 'Selected options (e.g., {Size: "M", Color: "Navy"})',
      },
    },
    {
      name: 'inventory',
      type: 'group',
      fields: [
        {
          name: 'manage_inventory',
          type: 'checkbox',
          defaultValue: true,
        },
        {
          name: 'allow_backorder',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
    {
      name: 'metadata',
      type: 'json',
      admin: {
        description: 'Additional variant metadata',
      },
    },
  ],
}

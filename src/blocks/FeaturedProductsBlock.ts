import type { Block } from 'payload'

// Shared helper to check if display mode is manual
const isManualMode = (data: any): boolean => data?.displayMode === 'manual'

export const FeaturedProductsBlock: Block = {
  slug: 'featuredProducts',
  interfaceName: 'FeaturedProductsBlock',
  labels: {
    singular: 'Featured Products',
    plural: 'Featured Products',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      admin: {
        description: 'Section heading (e.g., "New Arrivals", "Best Sellers")',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Optional section description',
      },
    },
    {
      name: 'displayMode',
      type: 'select',
      required: true,
      defaultValue: 'manual',
      options: [
        { label: 'Manual Selection', value: 'manual' },
        { label: 'Latest Products', value: 'latest' },
        { label: 'Random Products', value: 'random' },
      ],
      admin: {
        description: 'How to select products to display',
      },
    },
    {
      name: 'products',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      maxDepth: 1,
      validate: (value: unknown, { data }: { data: any }) => {
        if (isManualMode(data) && (!value || (Array.isArray(value) && value.length === 0))) {
          return 'Please select at least one product for manual display mode'
        }
        return true
      },
      admin: {
        condition: isManualMode,
        description: 'Required: Select at least one product to feature',
      },
    },
    {
      name: 'limit',
      type: 'number',
      min: 1,
      max: 12,
      defaultValue: 4,
      validate: (value: unknown, { data }: { data: any }) => {
        // Ignore validation in manual mode (field is hidden anyway)
        if (isManualMode(data)) {
          return true
        }
        if (!value || (typeof value === 'number' && (value < 1 || value > 12))) {
          return 'Limit must be between 1 and 12'
        }
        return true
      },
      admin: {
        condition: (data) => !isManualMode(data),
        description: 'Number of products to display (1-12)',
      },
    },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'grid',
      options: [
        { label: 'Grid', value: 'grid' },
        { label: 'Carousel', value: 'carousel' },
      ],
    },
    {
      name: 'columns',
      type: 'select',
      defaultValue: '4',
      options: [
        { label: '2 Columns', value: '2' },
        { label: '3 Columns', value: '3' },
        { label: '4 Columns', value: '4' },
      ],
      admin: {
        condition: (data) => data.layout === 'grid',
      },
    },
    {
      name: 'showPrice',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Display product prices',
      },
    },
    {
      name: 'showQuickView',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Enable quick view button on hover',
      },
    },
  ],
}

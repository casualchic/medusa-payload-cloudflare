import type { Block } from 'payload'

export const TestimonialsBlock: Block = {
  slug: 'testimonials',
  interfaceName: 'TestimonialsBlock',
  labels: {
    singular: 'Testimonials',
    plural: 'Testimonials',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      admin: {
        description: 'Section heading (e.g., "What Our Customers Say")',
      },
    },
    {
      name: 'testimonials',
      type: 'array',
      required: true,
      minRows: 1,
      maxRows: 12,
      fields: [
        {
          name: 'quote',
          type: 'textarea',
          required: true,
          admin: {
            description: 'Customer testimonial text',
          },
        },
        {
          name: 'customerName',
          type: 'text',
          required: true,
          admin: {
            description: 'Customer name',
          },
        },
        {
          name: 'customerTitle',
          type: 'text',
          admin: {
            description: 'Customer title or location (optional)',
          },
        },
        {
          name: 'customerImage',
          type: 'upload',
          relationTo: 'media',
          maxDepth: 1,
          admin: {
            description: 'Customer photo (optional)',
          },
        },
        {
          name: 'rating',
          type: 'number',
          min: 1,
          max: 5,
          admin: {
            description: 'Star rating (1-5, optional)',
          },
        },
      ],
      admin: {
        description: 'Add customer testimonials',
      },
    },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'grid',
      options: [
        { label: 'Grid', value: 'grid' },
        { label: 'Carousel', value: 'carousel' },
        { label: 'Single (Featured)', value: 'single' },
      ],
    },
    {
      name: 'columns',
      type: 'select',
      defaultValue: '3',
      options: [
        { label: '1 Column', value: '1' },
        { label: '2 Columns', value: '2' },
        { label: '3 Columns', value: '3' },
      ],
      admin: {
        condition: (data) => data.layout === 'grid',
      },
    },
    {
      name: 'showImages',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Display customer images',
      },
    },
    {
      name: 'showRatings',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Display star ratings',
      },
    },
    {
      name: 'backgroundColor',
      type: 'select',
      defaultValue: 'white',
      options: [
        { label: 'Transparent', value: 'transparent' },
        { label: 'White', value: 'white' },
        { label: 'Light Gray', value: 'gray-50' },
        { label: 'Brand Primary', value: 'brand-primary' },
      ],
      admin: {
        description: 'Section background color',
      },
    },
  ],
}

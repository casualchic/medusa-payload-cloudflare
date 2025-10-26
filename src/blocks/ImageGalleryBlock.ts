import type { Block } from 'payload'

export const ImageGalleryBlock: Block = {
  slug: 'imageGallery',
  interfaceName: 'ImageGalleryBlock',
  labels: {
    singular: 'Image Gallery',
    plural: 'Image Galleries',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      admin: {
        description: 'Optional gallery heading',
      },
    },
    {
      name: 'images',
      type: 'array',
      required: true,
      minRows: 1,
      maxRows: 12,
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
          maxDepth: 0,
        },
        {
          name: 'caption',
          type: 'text',
          admin: {
            description: 'Optional image caption',
          },
        },
      ],
      admin: {
        description: 'Add up to 12 images',
      },
    },
    {
      name: 'layout',
      type: 'select',
      required: true,
      defaultValue: 'grid',
      options: [
        { label: 'Grid', value: 'grid' },
        { label: 'Masonry', value: 'masonry' },
        { label: 'Carousel', value: 'carousel' },
      ],
    },
    {
      name: 'columns',
      type: 'select',
      defaultValue: '3',
      options: [
        { label: '2 Columns', value: '2' },
        { label: '3 Columns', value: '3' },
        { label: '4 Columns', value: '4' },
      ],
      admin: {
        condition: (data) => data.layout === 'grid' || data.layout === 'masonry',
      },
    },
    {
      name: 'aspectRatio',
      type: 'select',
      defaultValue: 'square',
      options: [
        { label: 'Square (1:1)', value: 'square' },
        { label: 'Landscape (4:3)', value: 'landscape' },
        { label: 'Portrait (3:4)', value: 'portrait' },
        { label: 'Wide (16:9)', value: 'wide' },
        { label: 'Original', value: 'original' },
      ],
      admin: {
        condition: (data) => data.layout === 'grid',
        description: 'Image aspect ratio for grid layout',
      },
    },
    {
      name: 'enableLightbox',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Allow clicking images to view full-size in lightbox',
      },
    },
    {
      name: 'gap',
      type: 'select',
      defaultValue: 'normal',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Small', value: 'small' },
        { label: 'Normal', value: 'normal' },
        { label: 'Large', value: 'large' },
      ],
      admin: {
        description: 'Spacing between images',
      },
    },
  ],
}

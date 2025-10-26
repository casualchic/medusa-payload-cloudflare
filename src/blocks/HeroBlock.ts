import type { Block } from 'payload'
import { validateUrl } from '@lib/util/validate-url'

export const HeroBlock: Block = {
  slug: 'hero',
  interfaceName: 'HeroBlock',
  labels: {
    singular: 'Hero',
    plural: 'Heroes',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      required: true,
      admin: {
        description: 'Main heading text',
      },
    },
    {
      name: 'subheading',
      type: 'text',
      admin: {
        description: 'Subheading or tagline',
      },
    },
    {
      name: 'backgroundImage',
      type: 'upload',
      relationTo: 'media',
      required: true,
      maxDepth: 1,
      admin: {
        description: 'Hero background image (recommended: 1920x1080px)',
      },
    },
    {
      name: 'overlayOpacity',
      type: 'number',
      min: 0,
      max: 100,
      defaultValue: 40,
      admin: {
        description: 'Dark overlay opacity (0-100%)',
      },
    },
    {
      name: 'textAlign',
      type: 'select',
      defaultValue: 'center',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ],
    },
    {
      name: 'height',
      type: 'select',
      defaultValue: 'large',
      options: [
        { label: 'Small (400px)', value: 'small' },
        { label: 'Medium (600px)', value: 'medium' },
        { label: 'Large (800px)', value: 'large' },
        { label: 'Full Screen', value: 'fullscreen' },
      ],
    },
    {
      name: 'cta',
      type: 'group',
      fields: [
        {
          name: 'text',
          type: 'text',
          admin: {
            description: 'Call-to-action button text',
          },
        },
        {
          name: 'link',
          type: 'text',
          validate: validateUrl,
          admin: {
            description: 'Button destination URL (absolute or relative)',
          },
        },
        {
          name: 'style',
          type: 'select',
          defaultValue: 'primary',
          options: [
            { label: 'Primary', value: 'primary' },
            { label: 'Secondary', value: 'secondary' },
            { label: 'Outline', value: 'outline' },
          ],
        },
      ],
    },
  ],
}

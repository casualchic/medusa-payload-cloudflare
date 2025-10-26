import type { Block } from 'payload'
import { validateUrl } from '@lib/util/validate-url'

export const CTABlock: Block = {
  slug: 'cta',
  interfaceName: 'CTABlock',
  labels: {
    singular: 'Call to Action',
    plural: 'Call to Actions',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      required: true,
      admin: {
        description: 'Main CTA heading',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Supporting text or description',
      },
    },
    {
      name: 'buttons',
      type: 'array',
      required: true,
      minRows: 1,
      maxRows: 3,
      fields: [
        {
          name: 'text',
          type: 'text',
          required: true,
        },
        {
          name: 'link',
          type: 'text',
          required: true,
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
            { label: 'Ghost', value: 'ghost' },
          ],
        },
        {
          name: 'openInNewTab',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
      admin: {
        description: 'Add up to 3 buttons',
      },
    },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'centered',
      options: [
        { label: 'Centered', value: 'centered' },
        { label: 'Left Aligned', value: 'left' },
        { label: 'Right Aligned', value: 'right' },
        { label: 'Split (Image + Text)', value: 'split' },
      ],
    },
    {
      name: 'backgroundImage',
      type: 'upload',
      relationTo: 'media',
      maxDepth: 1,
      admin: {
        description: 'Optional background image',
      },
    },
    {
      name: 'backgroundColor',
      type: 'select',
      defaultValue: 'gray-50',
      options: [
        { label: 'Transparent', value: 'transparent' },
        { label: 'White', value: 'white' },
        { label: 'Light Gray', value: 'gray-50' },
        { label: 'Dark', value: 'dark' },
        { label: 'Brand Primary', value: 'brand-primary' },
        { label: 'Brand Secondary', value: 'brand-secondary' },
      ],
      admin: {
        condition: (data) => !data.backgroundImage,
        description: 'Background color (when no image is set)',
      },
    },
    {
      name: 'overlayOpacity',
      type: 'number',
      min: 0,
      max: 100,
      defaultValue: 60,
      admin: {
        condition: (data) => !!data.backgroundImage,
        description: 'Background image overlay opacity (0-100%)',
      },
    },
    {
      name: 'padding',
      type: 'select',
      defaultValue: 'large',
      options: [
        { label: 'Small', value: 'small' },
        { label: 'Normal', value: 'normal' },
        { label: 'Large', value: 'large' },
        { label: 'Extra Large', value: 'xlarge' },
      ],
      admin: {
        description: 'Vertical padding',
      },
    },
  ],
}

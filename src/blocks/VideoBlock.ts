import type { Block } from 'payload'
import { validateUrl } from '@lib/util/validate-url'

export const VideoBlock: Block = {
  slug: 'video',
  interfaceName: 'VideoBlock',
  labels: {
    singular: 'Video',
    plural: 'Videos',
  },
  fields: [
    {
      name: 'videoType',
      type: 'select',
      required: true,
      defaultValue: 'youtube',
      options: [
        { label: 'YouTube', value: 'youtube' },
        { label: 'Vimeo', value: 'vimeo' },
        { label: 'Direct URL', value: 'direct' },
      ],
      admin: {
        description: 'Video source type',
      },
    },
    {
      name: 'videoId',
      type: 'text',
      required: true,
      admin: {
        condition: (data) => data.videoType === 'youtube' || data.videoType === 'vimeo',
        description: 'YouTube or Vimeo video ID',
      },
    },
    {
      name: 'videoUrl',
      type: 'text',
      required: true,
      validate: validateUrl,
      admin: {
        condition: (data) => data.videoType === 'direct',
        description: 'Direct video URL (MP4, WebM, etc.)',
      },
    },
    {
      name: 'posterImage',
      type: 'upload',
      relationTo: 'media',
      maxDepth: 1,
      admin: {
        description: 'Optional poster/thumbnail image',
      },
    },
    {
      name: 'aspectRatio',
      type: 'select',
      defaultValue: '16:9',
      options: [
        { label: '16:9 (Widescreen)', value: '16:9' },
        { label: '4:3 (Standard)', value: '4:3' },
        { label: '1:1 (Square)', value: '1:1' },
        { label: '9:16 (Vertical)', value: '9:16' },
      ],
    },
    {
      name: 'caption',
      type: 'text',
      admin: {
        description: 'Optional video caption',
      },
    },
    {
      name: 'autoplay',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Autoplay video (muted)',
      },
    },
    {
      name: 'loop',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Loop video playback',
      },
    },
    {
      name: 'controls',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Show video controls',
      },
    },
    {
      name: 'width',
      type: 'select',
      defaultValue: 'normal',
      options: [
        { label: 'Narrow', value: 'narrow' },
        { label: 'Normal', value: 'normal' },
        { label: 'Wide', value: 'wide' },
        { label: 'Full Width', value: 'full' },
      ],
      admin: {
        description: 'Video container width',
      },
    },
  ],
}

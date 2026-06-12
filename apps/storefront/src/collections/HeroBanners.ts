import { CollectionConfig } from 'payload'

export const HeroBanners: CollectionConfig = {
  slug: 'hero-banners',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'createdAt'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'subtitle',
      type: 'text',
    },
    {
      name: 'imageUrl',
      type: 'text',
      required: true,
      admin: {
        description: 'URL of the banner image',
      },
    },
    {
      name: 'ctaText',
      type: 'text',
      defaultValue: 'Shop Now',
    },
    {
      name: 'ctaLink',
      type: 'text',
      required: true,
    },
  ],
  timestamps: true,
}

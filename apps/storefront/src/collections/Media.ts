import { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    useAsTitle: 'alt',
  },
  access: {
    read: () => {
      return true
    },
    create: ({ req }) => {
      return !!req.user
    },
    update: ({ req }) => {
      return !!req.user
    },
    delete: ({ req }) => {
      return !!req.user
    },
  },
  upload: {
    staticDir: 'public/media',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
}

import { CollectionConfig } from 'payload'

export const Lookbooks: CollectionConfig = {
  slug: 'lookbooks',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'isActive', 'createdAt'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      fields: [
        {
          name: 'caption',
          type: 'text',
        },
        {
          name: 'imageUrl',
          type: 'text',
          required: true,
          admin: {
            description: 'URL of the lookbook image item',
          },
        },
        {
          name: 'productHandle',
          type: 'text',
          admin: {
            description: 'The Medusa handle of the featured apparel product',
          },
        },
        {
          name: 'linkType',
          type: 'select',
          required: true,
          options: [
            { label: 'Product', value: 'product' },
            { label: 'Collection', value: 'collection' },
          ],
          defaultValue: 'product',
        },
        {
          name: 'targetHandle',
          type: 'text',
          required: true,
        },
      ],
    },
  ],
  timestamps: true,
}

import { CollectionConfig, Block } from 'payload'
import { HeroBlockConfig } from './blocks/HeroConfig'
import { ProductGridConfig } from './blocks/ProductGridConfig'
import { ManifestoConfig } from './blocks/ManifestoConfig'

const AsymmetricalGridBlock: Block = {
  slug: 'asymmetrical-grid',
  labels: {
    singular: 'Asymmetrical Grid',
    plural: 'Asymmetrical Grids',
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
      name: 'items',
      type: 'array',
      minRows: 1,
      maxRows: 2,
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
          admin: {
            description: 'The Medusa handle for linking products/collections',
          },
        },
      ],
    },
  ],
}

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'createdAt'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL slug for this page (e.g. "home")',
      },
    },
    {
      name: 'layout',
      type: 'blocks',
      minRows: 1,
      blocks: [
        HeroBlockConfig,
        ProductGridConfig,
        ManifestoConfig,
        AsymmetricalGridBlock,
      ],
      admin: {
        description: 'Dynamic composition of layouts for this page',
      },
    },
  ],
  timestamps: true,
}

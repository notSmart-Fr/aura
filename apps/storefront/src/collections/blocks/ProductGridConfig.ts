import { Block } from 'payload'

export const ProductGridConfig: Block = {
  slug: 'productGrid',
  labels: {
    singular: 'Product Grid Block',
    plural: 'Product Grid Blocks',
  },
  fields: [
    {
      name: 'editorialTitle',
      type: 'text',
      defaultValue: 'The Essential Wardrobe',
    },
    {
      name: 'editorialText',
      type: 'textarea',
      defaultValue: 'A collection of foundation pieces designed to endure.',
    },
    {
      name: 'editorialLink',
      type: 'text',
      defaultValue: '/store',
    },
    {
      name: 'editorialLinkText',
      type: 'text',
      defaultValue: 'SHOP ALL ESSENTIALS',
    },
  ],
}

import { Block } from 'payload'

export const ManifestoConfig: Block = {
  slug: 'manifesto',
  labels: {
    singular: 'Manifesto Block',
    plural: 'Manifesto Blocks',
  },
  fields: [
    {
      name: 'subtitle',
      type: 'text',
      defaultValue: 'MANIFESTO',
    },
    {
      name: 'text',
      type: 'textarea',
      defaultValue: 'Design is the elimination of the unnecessary to reveal the essential.',
    },
  ],
}

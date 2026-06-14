import { CollectionConfig } from 'payload'

export const OTPs: CollectionConfig = {
  slug: 'otps',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'code', 'expiresAt'],
  },
  fields: [
    {
      name: 'email',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'code',
      type: 'text',
      required: true,
    },
    {
      name: 'expiresAt',
      type: 'number',
      required: true,
    },
  ],
  timestamps: true,
}

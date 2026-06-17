import {
  DefaultAuthenticationStrategy,
  dummyPaymentHandler,
  VendureConfig,
} from '@vendure/core';
import { VectorSearchPlugin } from './plugins/vector-search/vector-search.plugin';

export const config: VendureConfig = {
  apiOptions: {
    port: 3000,
    adminApiPath: 'admin-api',
    shopApiPath: 'shop-api',
  },
  authOptions: {
    tokenMethod: ['bearer', 'cookie'],
    superadminCredentials: {
      identifier: process.env.SUPERADMIN_USERNAME || 'superadmin',
      password: process.env.SUPERADMIN_PASSWORD || 'superadmin',
    },
    shopAuthenticationStrategy: [new DefaultAuthenticationStrategy()],
    adminAuthenticationStrategy: [new DefaultAuthenticationStrategy()],
  },
  paymentOptions: {
    paymentMethodHandlers: [dummyPaymentHandler],
  },
  dbConnectionOptions: {
    type: 'postgres',
    synchronize: false,
    logging: false,
    database: process.env.DB_NAME || 'vendure',
    schema: 'public',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  customFields: {
    Product: [
      {
        name: 'embedding',
        type: 'float',
        list: true,
        public: false,
      },
    ],
  },
  plugins: [
    VectorSearchPlugin,
  ],
};

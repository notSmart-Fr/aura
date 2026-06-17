import {
  DefaultSearchPlugin,
  dummyPaymentHandler,
  NativeAuthenticationStrategy,
  VendureConfig,
} from '@vendure/core';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import path from 'path';
import { BcryptjsPasswordHashingStrategy } from './custom-bcryptjs-strategy';
import { VectorSearchPlugin } from './plugins/vector-search/vector-search.plugin';

export const config: VendureConfig = {
  apiOptions: {
    port: 3000,
    adminApiPath: 'admin-api',
    shopApiPath: 'shop-api',
    adminApiPlayground: true,
    shopApiPlayground: true,
  },
  importExportOptions: {
    importAssetsDir: 'C:/Users/User/.gemini/antigravity-ide/brain/39fef00b-c9bb-454e-8bd0-0d74dc090cab',
  },
  authOptions: {
    tokenMethod: ['bearer', 'cookie'],
    superadminCredentials: {
      identifier: process.env.SUPERADMIN_USERNAME || 'superadmin',
      password: process.env.SUPERADMIN_PASSWORD || 'superadmin',
    },
    shopAuthenticationStrategy: [new NativeAuthenticationStrategy()],
    adminAuthenticationStrategy: [new NativeAuthenticationStrategy()],
    passwordHashingStrategy: new BcryptjsPasswordHashingStrategy(),
  },
  paymentOptions: {
    paymentMethodHandlers: [dummyPaymentHandler],
  },
  dbConnectionOptions: {
    type: 'postgres',
    synchronize: true,
    logging: false,
    database: process.env.DB_NAME || 'vendure',
    schema: 'public',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : false,
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
    DefaultSearchPlugin,
    VectorSearchPlugin,
    AssetServerPlugin.init({
      route: 'assets',
      assetUploadDir: path.join(__dirname, '../static/assets'),
      assetUrlPrefix: 'http://localhost:3000/assets/',
    }),
    AdminUiPlugin.init({
      route: 'admin',
      port: 3002,
    }),
  ],
};

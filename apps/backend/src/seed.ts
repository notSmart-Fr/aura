import 'dotenv/config';
import { bootstrap } from '@vendure/core';
import { populate } from '@vendure/core/cli/populate';
import { config } from './vendure-config';
import path from 'path';

const initialDataPath = path.join(__dirname, 'initial-data.json');
const productsCsvPath = path.join(__dirname, 'products.csv');

import { DataSource } from 'typeorm';

const bootstrapFn = () => bootstrap({
  ...config,
  apiOptions: {
    ...config.apiOptions,
    port: 3050,
  },
  dbConnectionOptions: {
    ...config.dbConnectionOptions,
    synchronize: true,
  }
});

console.log('Starting Vendure database seeding...');

(async () => {
  console.log('Resetting database schema to prevent duplicates...');
  const dataSource = new DataSource({
    ...config.dbConnectionOptions,
    synchronize: true,
  } as any);
  await dataSource.initialize();
  await dataSource.synchronize(true);
  await dataSource.destroy();
  console.log('Database schema reset completed.');

  populate(bootstrapFn, initialDataPath, productsCsvPath)
    .then(async (app) => {
      console.log('Database seeded successfully!');
      await app.close();
      process.exit(0);
    })
    .catch(err => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
})();

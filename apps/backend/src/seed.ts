import 'dotenv/config';
import { bootstrap } from '@vendure/core';
import { populate } from '@vendure/core/cli/populate';
import { config } from './vendure-config';
import path from 'path';
import { nativeGeminiClient } from './services/gemini.service';

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

async function applyVectorColumnAndEmbeddings() {
  const ds = new DataSource({ ...config.dbConnectionOptions } as any);
  await ds.initialize();
  await ds.query('CREATE EXTENSION IF NOT EXISTS vector');
  await ds.query(`ALTER TABLE product ALTER COLUMN "customFieldsEmbedding" TYPE vector(768) USING NULL`);
  await ds.query(`CREATE INDEX IF NOT EXISTS idx_product_embedding ON product USING hnsw ("customFieldsEmbedding" vector_cosine_ops)`);
  console.log('Vector column ready.');

  const products: Array<{ id: number; name: string; description: string }> = await ds.query(
    `SELECT p.id, pt.name, pt.description
     FROM product p
     JOIN product_translation pt ON pt."baseId" = p.id
     WHERE p."deletedAt" IS NULL`
  );

  console.log(`Generating embeddings for ${products.length} products...`);
  for (const product of products) {
    try {
      const text = `${product.name}. ${product.description}`;
      const embedding = await nativeGeminiClient.getEmbedding(text);
      const vectorLiteral = `[${embedding.join(',')}]`;
      await ds.query(
        `UPDATE product SET "customFieldsEmbedding" = $1::vector WHERE id = $2`,
        [vectorLiteral, product.id]
      );
      console.log(`  ✓ ${product.name}`);
    } catch (err) {
      console.warn(`  ✗ ${product.name} — embedding failed:`, err instanceof Error ? err.message : err);
    }
  }

  await ds.destroy();
  console.log('Product embeddings written.');
}

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
      await app.close();
      console.log('Database seeded successfully!');
      await applyVectorColumnAndEmbeddings();
      process.exit(0);
    })
    .catch(err => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
})();

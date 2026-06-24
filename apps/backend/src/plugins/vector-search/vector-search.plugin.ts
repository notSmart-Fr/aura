import { OnApplicationBootstrap } from '@nestjs/common';
import { PluginCommonModule, TransactionalConnection, VendurePlugin } from '@vendure/core';
import { gql } from 'graphql-tag';
import type { Pool } from 'pg';
import { VectorSearchResolver } from './vector-search.resolver';
import { VectorSearchService } from './vector-search.service';

const shopApiExtensions = gql`
  extend type Query {
    searchCatalog(input: SearchInput!): SearchCatalogResponse!
  }

  type SearchCatalogResponse {
    items: [SearchCatalogItem!]!
  }

  type SearchCatalogItem {
    productId: ID!
    productName: String!
    slug: String!
    description: String!
    productAsset: SearchCatalogAsset
  }

  type SearchCatalogAsset {
    preview: String
  }
`;

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [VectorSearchService],
  shopApiExtensions: {
    schema: shopApiExtensions,
    resolvers: [VectorSearchResolver],
  },
})
export class VectorSearchPlugin implements OnApplicationBootstrap {
  constructor(private readonly connection: TransactionalConnection) {}

  async onApplicationBootstrap(): Promise<void> {
    const pool = (this.connection.rawConnection.driver as any).master as Pool;
    const client = await pool.connect();
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS vector');
      const { rows } = await client.query<{ udt_name: string }>(
        `SELECT udt_name FROM information_schema.columns
         WHERE table_name = 'product' AND column_name = 'customFieldsEmbedding'`
      );
      if (rows[0]?.udt_name !== 'vector') {
        await client.query(
          `ALTER TABLE product ALTER COLUMN "customFieldsEmbedding" TYPE vector(768) USING NULL`
        );
        await client.query(
          `CREATE INDEX IF NOT EXISTS idx_product_embedding ON product USING hnsw ("customFieldsEmbedding" vector_cosine_ops)`
        );
        console.info('[VectorSearchPlugin] customFieldsEmbedding column converted to vector(768).');
      }
    } catch (err) {
      console.error('[VectorSearchPlugin] Failed to ensure vector column:', err);
    } finally {
      client.release();
    }
  }
}

import { Args, Query, Resolver } from '@nestjs/graphql';
import { TransactionalConnection } from '@vendure/core';
import { nativeGeminiClient } from '../../services/gemini.service';

@Resolver()
export class VectorSearchResolver {
  constructor(private connection: TransactionalConnection) {}

  @Query()
  async searchCatalog(
    @Args('input') input: { term: string; take?: number }
  ) {
    const limit = input.take || 5;
    const rawConnection = this.connection.rawConnection;

    // 1. Convert the text term into an array of floats via our Gemini Embedding service
    const embeddingVector = await nativeGeminiClient.getEmbedding(input.term); 
    
    // 2. Format the vector as a native Postgres array string literal
    const pgVectorString = `[${embeddingVector.join(',')}]`;

    // 3. Execute pgvector search directly on the product table using native vector casting
    const results = await rawConnection.query(
      `SELECT p.id, p.name, p.slug, p.description, p.featuredAssetId
       FROM product p
       WHERE p.deletedAt IS NULL
       ORDER BY p.customFieldsEmbedding <=> cast($1 as vector)
       LIMIT $2`,
      [pgVectorString, limit]
    );

    return {
      items: results.map((row: any) => ({
        productId: row.id,
        productName: row.name,
        slug: row.slug,
        description: row.description,
        productAsset: {
          preview: row.featuredAssetId ? `/assets/${row.featuredAssetId}` : null
        }
      }))
    };
  }
}

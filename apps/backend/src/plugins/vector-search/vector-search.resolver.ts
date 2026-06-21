import { Args, Query, Resolver } from '@nestjs/graphql';
import { nativeGeminiClient } from '../../services/gemini.service';
import { VectorSearchService } from './vector-search.service';

@Resolver()
export class VectorSearchResolver {
  constructor(private readonly vectorSearchService: VectorSearchService) {}

  @Query()
  async searchCatalog(
    @Args('input') input: { term: string; take?: number }
  ) {
    const limit = input.take || 5;

    // 1. Embed the search term via Gemini
    const embeddingVector = await nativeGeminiClient.getEmbedding(input.term);

    // 2. Delegate vector similarity search entirely to the Kysely service layer
    const results = await this.vectorSearchService.performSemanticSearch(
      embeddingVector,
      limit
    );

    return {
      items: results.map((row) => ({
        productId: row.id,
        productName: row.name,
        slug: row.slug,
        description: row.description,
        productAsset: {
          preview: row.featuredAssetId ? `/assets/${row.featuredAssetId}` : null,
        },
      })),
    };
  }
}
